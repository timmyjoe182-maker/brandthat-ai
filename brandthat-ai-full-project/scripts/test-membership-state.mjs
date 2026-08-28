import assert from "node:assert/strict";
import { getMembershipCtaState } from "../src/membershipState.js";

const states = [
  {
    name: "account loading",
    input: { user: null, authStatus: "loading", userPlan: "free", membershipLoading: true },
    expected: { label: "Checking membership...", disabled: true, nextAction: "wait" },
  },
  {
    name: "logged out",
    input: { user: null, authStatus: "logged_out", userPlan: "free" },
    expected: { label: "Create Account", disabled: false, nextAction: "signup" },
  },
  {
    name: "email unverified",
    input: { user: { email: "test@example.com" }, authStatus: "email_not_verified", userPlan: "free" },
    expected: { label: "Verify Email", disabled: false, nextAction: "verify" },
  },
  {
    name: "verified without subscription",
    input: { user: { email: "test@example.com" }, authStatus: "logged_in", userPlan: "free" },
    expected: { label: "Start Membership", disabled: false, nextAction: "checkout" },
  },
  {
    name: "checkout request loading",
    input: { user: { email: "test@example.com" }, authStatus: "logged_in", userPlan: "free", checkoutStatus: "loading" },
    expected: { label: "Opening secure checkout...", disabled: true, nextAction: "wait" },
  },
  {
    name: "checkout redirecting",
    input: { user: { email: "test@example.com" }, authStatus: "logged_in", userPlan: "free", checkoutStatus: "redirecting" },
    expected: { label: "Redirecting to checkout...", disabled: true, nextAction: "wait" },
  },
  {
    name: "active subscriber",
    input: { user: { email: "test@example.com" }, authStatus: "logged_in", userPlan: "member" },
    expected: { label: "Open Workspace", disabled: false, nextAction: "workspace" },
  },
  {
    name: "subscription lookup failure",
    input: { user: { email: "test@example.com" }, authStatus: "logged_in", userPlan: "free", membershipLookupFailed: true },
    expected: { label: "Retry account check", disabled: false, nextAction: "recover" },
  },
  {
    name: "checkout canceled",
    input: { user: { email: "test@example.com" }, authStatus: "logged_in", userPlan: "free", checkoutStatus: "idle" },
    expected: { label: "Start Membership", disabled: false, nextAction: "checkout" },
  },
  {
    name: "stale session appears logged out",
    input: { user: null, authStatus: "logged_out", userPlan: "free", checkoutStatus: "idle" },
    expected: { label: "Create Account", disabled: false, nextAction: "signup" },
  },
];

for (const test of states) {
  const actual = getMembershipCtaState(test.input);
  assert.equal(actual.label, test.expected.label, `${test.name} label`);
  assert.equal(actual.disabled, test.expected.disabled, `${test.name} disabled`);
  assert.equal(actual.nextAction, test.expected.nextAction, `${test.name} next action`);
}

const doubleClickState = getMembershipCtaState({
  user: { email: "test@example.com" },
  authStatus: "logged_in",
  userPlan: "free",
  checkoutStatus: "loading",
});
assert.equal(doubleClickState.disabled, true, "double-clicking Start Membership should be disabled while loading");

console.log("Membership CTA state tests passed.");
