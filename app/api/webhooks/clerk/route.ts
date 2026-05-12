import type { UserJSON } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfigError } from "@/lib/config";
import { sendSignupToLoops } from "@/lib/loops";
import { createSupabaseAdmin } from "@/lib/supabase";

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

  if (!email) {
    return NextResponse.json({ received: true });
  }

  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const supabase = createSupabaseAdmin();
    await supabase.from("profiles").upsert({
      user_id: user.id,
      email,
      subscription_status: "none",
      updated_at: new Date().toISOString(),
    });

    await sendSignupToLoops({
      userId: user.id,
      email,
      firstName: user.first_name,
      lastName: user.last_name,
    });
  } catch (error) {
    console.error("Clerk webhook handling failed", error);
    return NextResponse.json({ error: "Clerk webhook handling failed." }, { status: 503 });
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
