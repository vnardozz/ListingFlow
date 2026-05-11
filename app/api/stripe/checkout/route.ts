import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appUrl, requiredEnv } from "@/lib/env";
import { getProfile } from "@/lib/data";
import { createSupabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const profile = await getProfile(userId);
  const stripeCustomerId = profile?.stripeCustomerId ?? (await createStripeCustomer(userId, email));

  const supabase = createSupabaseAdmin();
  await supabase.from("profiles").upsert({
    user_id: userId,
    email,
    stripe_customer_id: stripeCustomerId,
    subscription_status: profile?.subscriptionStatus ?? "none",
    updated_at: new Date().toISOString(),
  });

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
