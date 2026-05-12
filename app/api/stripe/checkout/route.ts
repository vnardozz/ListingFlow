import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripeConfigError, isClerkConfigured, isSupabaseConfigured } from "@/lib/config";
import { appUrl, requiredEnv } from "@/lib/env";
import { getProfile } from "@/lib/data";
import { createSupabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

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
    const profile = await getProfile(userId).catch((error) => {
      console.error("Could not load profile before checkout", error);
      return null;
    });
    const startingCustomerId = profile?.stripeCustomerId ?? (await createStripeCustomer(userId, email));

    const { session, stripeCustomerId } = await createCheckoutSession(startingCustomerId, userId, email);

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await saveStripeCustomer(userId, email, stripeCustomerId, profile?.subscriptionStatus ?? "none").catch(
      (error) => {
        console.error("Could not persist Stripe customer after checkout session creation", error);
      },
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed", error);
    return NextResponse.json({ error: checkoutErrorMessage(error) }, { status: 503 });
  }
}

async function createCheckoutSession(stripeCustomerId: string, userId: string, email: string | null) {
  try {
    return {
      session: await createCheckoutSessionForCustomer(stripeCustomerId, userId),
      stripeCustomerId,
    };
  } catch (error) {
    if (!isMissingStripeCustomerError(error)) {
      throw error;
    }

    const customerId = await createStripeCustomer(userId, email);
    return {
      session: await createCheckoutSessionForCustomer(customerId, userId),
      stripeCustomerId: customerId,
    };
  }
}

async function createCheckoutSessionForCustomer(stripeCustomerId: string, userId: string) {
  return stripe().checkout.sessions.create({
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
    success_url: `${appUrl()}/dashboard?billing=success`,
    cancel_url: `${appUrl()}/dashboard?billing=cancelled`,
    metadata: {
      clerkUserId: userId,
    },
  });
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
  subscriptionStatus: string,
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

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("profiles").upsert({
    user_id: userId,
    email,
    stripe_customer_id: stripeCustomerId,
    subscription_status: subscriptionStatus,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Could not persist Stripe customer in Supabase", error);
  }
}

function checkoutErrorMessage(error: unknown) {
  const message = errorMessage(error);
  const type = errorType(error);

  if (type === "StripeAuthenticationError") {
    return "Stripe rejected the secret key. Check STRIPE_SECRET_KEY in Vercel.";
  }

  if (message.includes("No such price") || (errorCode(error) === "resource_missing" && message.includes("price"))) {
    return "Stripe price not found. Check STRIPE_PRICE_ID in Vercel and make sure it is a recurring $49/month price.";
  }

  if (message.toLowerCase().includes("recurring")) {
    return "The configured Stripe price must be a recurring subscription price.";
  }

  if (message) {
    return `Stripe checkout failed: ${message}`;
  }

  return "Could not start the subscription checkout. Check Stripe configuration.";
}

function isMissingStripeCustomerError(error: unknown) {
  return errorCode(error) === "resource_missing" && errorMessage(error).includes("No such customer");
}

function errorMessage(error: unknown) {
  return typeof error === "object" && error && "message" in error && typeof error.message === "string"
    ? error.message
    : "";
}

function errorType(error: unknown) {
  return typeof error === "object" && error && "type" in error && typeof error.type === "string"
    ? error.type
    : "";
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error && typeof error.code === "string"
    ? error.code
    : "";
}
