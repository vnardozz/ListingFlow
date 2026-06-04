import { clerkClient } from "@clerk/nextjs/server";
import { getStripeConfigError, isSupabaseConfigured } from "@/lib/config";
import { getProfile, upsertProfile } from "@/lib/data";
import { stripe, unixToIso } from "@/lib/stripe";
import type { SubscriptionStatus, UserProfile } from "@/lib/types";

const PREFERRED_STATUSES: SubscriptionStatus[] = ["trialing", "active"];

export async function syncStripeSubscriptionStatus(userId: string): Promise<UserProfile | null> {
  const profile = await getProfile(userId);

  if (!profile?.stripeCustomerId || getStripeConfigError()) {
    return profile;
  }

  const subscription = await latestSubscriptionForCustomer(profile.stripeCustomerId);
  if (!subscription) {
    return profile;
  }

  const firstItem = subscription.items.data[0];
  const refreshedProfile = {
    ...profile,
    subscriptionStatus: subscription.status as SubscriptionStatus,
    trialEndsAt: unixToIso(subscription.trial_end),
    currentPeriodEnd: unixToIso(firstItem?.current_period_end),
  };

  await updateClerkSubscription(userId, refreshedProfile);

  if (isSupabaseConfigured()) {
    await upsertProfile(refreshedProfile).catch((error) => {
      console.error("Could not sync Stripe subscription to Supabase profile", error);
    });
  }

  return refreshedProfile;
}

async function latestSubscriptionForCustomer(customerId: string) {
  const subscriptions = await stripe().subscriptions.list({
    customer: customerId,
    limit: 10,
    status: "all",
  });

  return (
    subscriptions.data.find((subscription) =>
      PREFERRED_STATUSES.includes(subscription.status as SubscriptionStatus),
    ) ?? subscriptions.data[0] ?? null
  );
}

async function updateClerkSubscription(userId: string, profile: UserProfile) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      ...user.privateMetadata,
      stripeCustomerId: profile.stripeCustomerId,
      subscriptionStatus: profile.subscriptionStatus,
      trialEndsAt: profile.trialEndsAt,
      currentPeriodEnd: profile.currentPeriodEnd,
    },
  });
}
