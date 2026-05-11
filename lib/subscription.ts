import type { SubscriptionStatus, UserProfile } from "@/lib/types";

const ACCESS_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

export function hasSubscriptionAccess(profile: Pick<UserProfile, "subscriptionStatus"> | null) {
  return Boolean(profile && ACCESS_STATUSES.includes(profile.subscriptionStatus));
}

export function readableSubscriptionStatus(status: SubscriptionStatus) {
  if (status === "trialing") {
    return "Free trial";
  }

  if (status === "active") {
    return "Active";
  }

  return "No active subscription";
}
