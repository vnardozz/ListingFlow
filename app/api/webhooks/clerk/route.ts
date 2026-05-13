import type { UserJSON } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfigError } from "@/lib/config";
import { upsertProfile } from "@/lib/data";
import { sendSignupToLoops } from "@/lib/loops";

export async function POST(request: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "user.created") {
    return NextResponse.json({ received: true });
  }

  const user = event.data as UserJSON;
  const email = primaryEmail(user);

  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    await upsertProfile({
      userId: user.id,
      email,
      subscriptionStatus: "none",
    });

    if (email) {
      await sendSignupToLoops({
        userId: user.id,
        email,
        firstName: user.first_name,
        lastName: user.last_name,
      }).catch((error) => {
        console.error("Loops onboarding failed after profile creation", error);
      });
    }
  } catch (error) {
    console.error("Clerk webhook handling failed", error);
    return NextResponse.json({ error: "Could not create Supabase profile for Clerk user." }, { status: 503 });
  }

  return NextResponse.json({ received: true });
}

function primaryEmail(user: UserJSON) {
  return (
    user.email_addresses.find((email) => email.id === user.primary_email_address_id)?.email_address ??
    user.email_addresses[0]?.email_address ??
    null
  );
}
