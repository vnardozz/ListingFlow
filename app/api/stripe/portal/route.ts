import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripeConfigError, getSupabaseConfigError, isClerkConfigured } from "@/lib/config";
import { appUrl } from "@/lib/env";
import { getProfile } from "@/lib/data";
import { stripe } from "@/lib/stripe";

export async function POST() {
  if (!isClerkConfigured()) {
    return NextResponse.json({ error: "Clerk authentication is not configured." }, { status: 503 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configError = getStripeConfigError() ?? getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const profile = await getProfile(userId);
    if (!profile?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found." }, { status: 404 });
    }

    const session = await stripe().billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: appUrl(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal failed", error);
    return NextResponse.json(
      { error: "Could not open the billing portal. Check Stripe and Supabase configuration." },
      { status: 503 },
    );
  }
}
