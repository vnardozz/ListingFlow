import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripeConfigError, isClerkConfigured, isSupabaseConfigured } from "@/lib/config";
import { appUrl, requiredEnv } from "@/lib/env";
import { getProfile, upsertProfile } from "@/lib/data";
import { stripe } from "@/lib/stripe";
import type { SubscriptionStatus } from "@/lib/types";

export async function POST() {
  if (!isClerkConfigured()) {
    return NextResponse.json({ error: "Clerk authentication is not configured." }, { status: 503 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configError = getStripeConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    const profile = await getProfile(userId);
    const stripeCustomerId = profile?.stripeCustomerId ?? (await createStripeCustomer(userId, email));

    await saveStripeCustomer(userId, email, stripeCustomerId, profile?.subscriptionStatus ?? "none");

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: requiredEnv("STRIPE_PRICE_ID"),
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          clerkUserId: userId,
        },
      },
      allow_promotion_codes: false,
      success_url: `${appUrl()}/?billing=success`,
      cancel_url: `${appUrl()}/?billing=cancelled`,
      metadata: {
        clerkUserId: userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed", error);
    return NextResponse.json(
      { error: "Could not start the subscription checkout. Check Stripe and Supabase configuration." },
      { status: 503 },
    );
  }
}

async function createStripeCustomer(userId: string, email: string | null) {
  const customer = await stripe().customers.create({
    email: email ?? undefined,
    metadata: {
      clerkUserId: userId,
    },
  });

  return customer.id;
}

async function saveStripeCustomer(
  userId: string,
  email: string | null,
  stripeCustomerId: string,
  subscriptionStatus: SubscriptionStatus,
) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      ...user.privateMetadata,
      stripeCustomerId,
      subscriptionStatus,
    },
  });

  if (!isSupabaseConfigured()) {
    return;
  }

  await upsertProfile({
    userId,
    email,
    stripeCustomerId,
    subscriptionStatus,
  });
}
