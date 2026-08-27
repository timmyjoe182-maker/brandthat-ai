export function getMembershipCtaState({
  user,
  userPlan = "free",
  authStatus = "logged_out",
  checkoutStatus = "idle",
  loggedOutLabel = "Create Account",
  verifiedLabel = "Start Membership",
} = {}) {
  const isBusy = checkoutStatus === "loading" || checkoutStatus === "redirecting";
  const isMember = userPlan === "member" || userPlan === "starter" || userPlan === "pro";

  if (isMember) {
    return {
      label: "Open Workspace",
      disabled: false,
      busy: false,
      statusMessage: "Your complete Brand Workspace is unlocked.",
      nextAction: "workspace",
    };
  }

  if (isBusy) {
    return {
      label: checkoutStatus === "redirecting" ? "Redirecting to checkout..." : "Opening secure checkout...",
      disabled: true,
      busy: true,
      statusMessage: "",
      nextAction: "wait",
    };
  }

  if (authStatus === "email_not_verified") {
    return {
      label: "Verify Email",
      disabled: false,
      busy: false,
      statusMessage: "Verify your email before starting membership. The sign-in panel includes a resend button.",
      nextAction: "verify",
    };
  }

  if (user?.email) {
    return {
      label: verifiedLabel,
      disabled: false,
      busy: false,
      statusMessage: "",
      nextAction: "checkout",
    };
  }

  return {
    label: loggedOutLabel,
    disabled: false,
    busy: false,
    statusMessage: "",
    nextAction: "signup",
  };
}
