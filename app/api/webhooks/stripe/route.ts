import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isSupabaseConfigured } from "@/lib/config";
import { requiredEnv } from "@/lib/env";
import { createSupabaseAdmin } from "@/lib/supabase";
import { stripe, unixToIso } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe().webhooks.constructEvent(
      await request.text(),
      signature,
      requiredEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await upsertSubscription(event.data.object as Stripe.Subscription);
    }
  } catch (error) {
    console.error("Stripe webhook handling failed", error);
    return NextResponse.json({ error: "Stripe webhook handling failed." }, { status: 503 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (typeof session.subscription !== "string") {
    return;
  }

  const subscription = await stripe().subscriptions.retrieve(session.subscription);
  await upsertSubscription(subscription);
}

async function upsertSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.clerkUserId;
  const customerId = customerToString(subscription.customer);
  const firstItem = subscription.items.data[0];
  const payload = {
    stripe_customer_id: customerId,
    subscription_status: subscription.status,
    trial_ends_at: unixToIso(subscription.trial_end),
    current_period_end: unixToIso(firstItem?.current_period_end),
    updated_at: new Date().toISOString(),
  };

  if (userId) {
    await updateClerkSubscription(userId, payload);
    await upsertSupabaseSubscription(userId, payload);
    return;
  }

  if (customerId) {
    await updateSupabaseSubscriptionByCustomer(customerId, payload);
  }
}

function customerToString(customer: string | Stripe.Customer | Stripe.DeletedCustomer) {
  return typeof customer === "string" ? customer : customer.id;
}

async function updateClerkSubscription(userId: string, payload: SubscriptionPayload) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      ...user.privateMetadata,
      stripeCustomerId: payload.stripe_customer_id,
      subscriptionStatus: payload.subscription_status,
      trialEndsAt: payload.trial_ends_at,
      currentPeriodEnd: payload.current_period_end,
    },
  });
}

async function upsertSupabaseSubscription(userId: string, payload: SubscriptionPayload) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("profiles").upsert({
    user_id: userId,
    ...payload,
  });

  if (error) {
    console.error("Could not persist Stripe subscription in Supabase", error);
  }
}

async function updateSupabaseSubscriptionByCustomer(customerId: string, payload: SubscriptionPayload) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("profiles").update(payload).eq("stripe_customer_id", customerId);

  if (error) {
    console.error("Could not update Stripe subscription in Supabase", error);
  }
}

type SubscriptionPayload = {
  stripe_customer_id: string;
  subscription_status: Stripe.Subscription.Status;
  trial_ends_at: string | null;
  current_period_end: string | null;
  updated_at: string;
};
