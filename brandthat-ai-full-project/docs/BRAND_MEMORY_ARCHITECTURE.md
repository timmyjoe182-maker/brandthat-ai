# BrandThat Semantic Brand Memory

## Status

Foundation plus private pilot controls. Production retrieval remains disabled unless the server-only environment variable `BRAND_MEMORY_ENABLED=true` is set and the authenticated user's Supabase UUID is included in `BRAND_MEMORY_TEST_USER_IDS`.

Do not enable the flag for all users. Keep the allowlist narrow until tenant-isolation tests, retrieval evaluation, and deletion behavior have been verified for the pilot.

## Existing context

BrandThat already stores structured workspace information such as thesis, audience, positioning, voice, visual direction, colors, typography, roadmap data, saved generations, and a primary logo. Structured fields remain the source of truth.

Semantic memory supplements that data. It does not replace structured Brand DNA.

## Data flow

1. A verified user opens a selected Brand Workspace.
2. The server verifies that the authenticated user owns the workspace.
3. The server verifies that `BRAND_MEMORY_ENABLED=true` and the user UUID is in `BRAND_MEMORY_TEST_USER_IDS`.
4. The user can refresh memory for the selected workspace.
5. Approved structured workspace facts are normalized, capped, hashed, deduplicated, and embedded.
6. Content and embedding are stored in `brand_memories`.
7. The Caption Generator can embed its request and retrieve only relevant memories from the same user and workspace.
8. Retrieved memories are advisory context; current form inputs and structured workspace fields remain authoritative.

## Security

- Row Level Security is enabled on `brand_memories`.
- Client policies require both `user_id = auth.uid()` and ownership through `brand_workspaces.user_id`.
- The client RPC is security-invoker and repeats user/workspace filters.
- The server-only RPC is executable only by `service_role` and requires an explicit matching user/workspace relationship.
- The Netlify endpoint derives user identity from the bearer token.
- Pilot access is checked server-side against Supabase UUIDs, never emails and never client-provided flags.
- Service-role and OpenAI keys remain server-only.
- Raw private brand content must not be written to logs.

## Memory lifecycle

Initial eligible memories:

- Brand name and business description
- Industry/category
- Target audiences
- Brand thesis and positioning
- Voice traits and personality/style
- Visual direction and color system
- Approved primary-logo metadata
- Products/services
- Customer problems and desired outcomes
- Explicit user preferences and exclusions
- Explicitly saved or favorited outputs in a later phase

Transient unsaved generations are not memories.

Updated facts should deactivate or replace stale memories. User-facing controls in a later phase must support viewing, deactivating, deleting, and rebuilding memory.

## Embeddings

Default: `text-embedding-3-small`, 1,536 dimensions.

Server configuration:

- `BRAND_MEMORY_ENABLED=false`
- `BRAND_MEMORY_TEST_USER_IDS=` comma-separated Supabase user UUIDs for the private pilot
- `BRAND_MEMORY_EMBEDDING_MODEL=text-embedding-3-small`
- Existing `OPENAI_API_KEY`
- Existing `SUPABASE_URL`
- Existing `SUPABASE_SERVICE_ROLE_KEY`

Do not expose `BRAND_MEMORY_ENABLED` or `BRAND_MEMORY_TEST_USER_IDS` through `VITE_*` variables or client code.

Changing embedding models requires a controlled re-embedding migration. Vectors created by different models must not be compared silently.

## Deployment

1. Apply `20260828050000_add_semantic_brand_memories.sql` to a Supabase preview/staging database.
2. Verify the existing `brand_workspaces` table contains `id` and `user_id` with the expected UUID types.
3. Run RLS tests with two users and two workspaces.
4. Deploy with `BRAND_MEMORY_ENABLED=false`.
5. Configure `BRAND_MEMORY_TEST_USER_IDS` only in the server/runtime environment for the approved tester UUIDs.
6. Verify existing workspace and generator flows are unchanged.
7. Enable the server-only flag for the private pilot only after explicit approval.
8. Do not connect non-caption generators to memory until a separate rollout is approved.

## Test Environment

Run `npm run test:brand-memory` before applying the migration to production. The command always runs the static migration/security contract. It also runs the database integration harness when these safe-project variables are present:

- `BRAND_MEMORY_TEST_SUPABASE_URL`
- `BRAND_MEMORY_TEST_SERVICE_ROLE_KEY`
- `BRAND_MEMORY_TEST_ANON_KEY`

The integration harness creates disposable verified users, workspaces, and memories in the configured project, then deletes them. It refuses to run against the known production Supabase project unless `BRAND_MEMORY_TEST_ALLOW_PRODUCTION=true` is explicitly set. Do not use that override for PR validation.

The integration assertions cover:

- User A cannot read User B's memories.
- One User A workspace cannot retrieve another User A workspace's memories.
- Inactive and deleted memories are excluded.
- Duplicate active content is rejected.
- Updating content replaces the hash and embedding.
- `BRAND_MEMORY_ENABLED=false` short-circuits without writing memories.
- `BRAND_MEMORY_ENABLED=true` still short-circuits for users outside `BRAND_MEMORY_TEST_USER_IDS`.

## Rollback

With the feature flag disabled, application behavior falls back to the existing structured-context flow. If schema rollback is necessary, first disable the flag and retain the table for investigation. Dropping the table destroys user memory and requires a separately approved destructive migration.

## Phase 2

- Seed memories from approved structured Brand DNA and saved/favorited assets.
- Add a private Brand Memory settings screen.
- Inject top relevant memories into generator prompts.
- Show which memories influenced an output.
- Record explicit rejections as negative preferences.
- Add evaluation fixtures and retrieval telemetry without storing raw prompts.

## Evaluation

Track:

- Relevant-memory precision
- Cross-brand leakage rate
- Repeated-input reduction
- Saved/favorited output rate
- User edits after generation
- Generator latency and embedding cost
- Memory deletion correctness
