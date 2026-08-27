import {
  getRequestId,
  getSupabaseAdminClient,
  json,
  requireVerifiedUser,
} from "./lib/membership.js";

function safeErrorCode(error, fallback = "PRIMARY_LOGO_UPDATE_FAILED") {
  if (error?.code === "PGRST204" || /schema cache|logo_image_url|primary_logo/i.test(error?.message || "")) {
    return "PRIMARY_LOGO_SCHEMA_MISSING";
  }
  return error?.code || fallback;
}

export const handler = async (event) => {
  const requestId = getRequestId("primary_logo");

  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST to set a primary logo.",
      requestId,
    });
  }

  const auth = await requireVerifiedUser(event).catch((error) => ({
    error: {
      statusCode: 401,
      code: "AUTH_REQUIRED",
      message: error?.message || "Please log in again to continue.",
    },
  }));

  if (auth.error) {
    return json(auth.error.statusCode || 401, {
      ok: false,
      code: auth.error.code || "AUTH_REQUIRED",
      message: auth.error.message,
      requestId,
    });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    console.error("BrandThat primary logo failed", {
      requestId,
      stage: "initializing_supabase_admin",
      code: "SUPABASE_ADMIN_MISSING",
    });
    return json(500, {
      ok: false,
      code: "SUPABASE_ADMIN_MISSING",
      message: "Primary logo storage is not configured yet.",
      requestId,
    });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, {
      ok: false,
      code: "INVALID_JSON",
      message: "BrandThat could not read the logo request.",
      requestId,
    });
  }

  const workspaceId = String(body.workspaceId || "").trim();
  const assetId = String(body.assetId || "").trim();
  const requestedLogoUrl = String(body.logoImageUrl || "").trim();
  const logoMetadata = body.logoMetadata && typeof body.logoMetadata === "object" ? body.logoMetadata : {};

  if (!workspaceId || !assetId) {
    return json(400, {
      ok: false,
      code: "PRIMARY_LOGO_INPUT_MISSING",
      message: "Choose a saved logo concept before setting it as primary.",
      requestId,
    });
  }

  try {
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("brand_workspaces")
      .select("id,user_id,name")
      .eq("id", workspaceId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (workspaceError) throw workspaceError;
    if (!workspace) {
      return json(404, {
        ok: false,
        code: "WORKSPACE_NOT_FOUND",
        message: "BrandThat could not find that workspace for your account.",
        requestId,
      });
    }

    const { data: asset, error: assetError } = await supabaseAdmin
      .from("saved_generations")
      .select("id,user_id,workspace_id,tool,title,content,image_url")
      .eq("id", assetId)
      .eq("user_id", auth.user.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (assetError) throw assetError;
    if (!asset || asset.tool !== "logo") {
      return json(404, {
        ok: false,
        code: "LOGO_ASSET_NOT_FOUND",
        message: "BrandThat could not find that saved logo concept.",
        requestId,
      });
    }

    const logoImageUrl = asset.image_url || requestedLogoUrl;
    if (!logoImageUrl) {
      return json(400, {
        ok: false,
        code: "LOGO_IMAGE_MISSING",
        message: "This saved logo does not include a usable preview image.",
        requestId,
      });
    }

    const now = new Date().toISOString();
    const { data: updatedWorkspace, error: updateError } = await supabaseAdmin
      .from("brand_workspaces")
      .update({
        logo_image_url: logoImageUrl,
        primary_logo_asset_id: asset.id,
        primary_logo_updated_at: now,
        logo_metadata: {
          assetId: asset.id,
          assetTitle: asset.title || "Logo concept",
          ...logoMetadata,
        },
        updated_at: now,
      })
      .eq("id", workspaceId)
      .eq("user_id", auth.user.id)
      .select("id,logo_image_url,primary_logo_asset_id,primary_logo_updated_at,logo_metadata")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedWorkspace?.primary_logo_asset_id) {
      return json(500, {
        ok: false,
        code: "PRIMARY_LOGO_NOT_CONFIRMED",
        message: "BrandThat could not confirm the primary logo update.",
        requestId,
      });
    }

    return json(200, {
      ok: true,
      success: true,
      requestId,
      workspaceId: updatedWorkspace.id,
      logoImageUrl: updatedWorkspace.logo_image_url,
      primaryLogoAssetId: updatedWorkspace.primary_logo_asset_id,
      primaryLogoUpdatedAt: updatedWorkspace.primary_logo_updated_at,
      logoMetadata: updatedWorkspace.logo_metadata || {},
      workspace: updatedWorkspace,
    });
  } catch (error) {
    const code = safeErrorCode(error);
    console.error("BrandThat primary logo failed", {
      requestId,
      code,
      type: error?.name,
      statusCode: error?.statusCode,
      message: error?.message,
    });
    return json(500, {
      ok: false,
      code,
      message: code === "PRIMARY_LOGO_SCHEMA_MISSING"
        ? "Primary logo storage is not ready yet."
        : "Primary logo was not updated.",
      requestId,
    });
  }
};
