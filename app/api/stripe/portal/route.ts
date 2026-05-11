import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { getProfile } from "@/lib/data";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer found." }, { status: 404 });
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: appUrl(),
  });

  return NextResponse.json({ url: session.url });
}
