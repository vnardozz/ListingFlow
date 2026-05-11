import { NextResponse } from "next/server";
import type Stripe from "stripe";
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
  const supabase = createSupabaseAdmin();

  if (userId) {
    await supabase.from("profiles").upsert({
      user_id: userId,
      ...payload,
    });
    return;
  }

  if (customerId) {
    await supabase.from("profiles").update(payload).eq("stripe_customer_id", customerId);
  }
}

function customerToString(customer: string | Stripe.Customer | Stripe.DeletedCustomer) {
  return typeof customer === "string" ? customer : customer.id;
}
