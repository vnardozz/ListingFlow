import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generateListingContent } from "@/lib/claude";
import { getClaudeConfigError, getSupabaseConfigError, isClerkConfigured } from "@/lib/config";
import { getProfile, mapGeneration } from "@/lib/data";
import { createSupabaseAdmin } from "@/lib/supabase";
import { hasSubscriptionAccess } from "@/lib/subscription";
import type { ListingFormInput } from "@/lib/types";

export async function POST(request: Request) {
  if (!isClerkConfigured()) {
    return NextResponse.json({ error: "Clerk authentication is not configured." }, { status: 503 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configError = getSupabaseConfigError() ?? getClaudeConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = validateInput(body);
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  try {
    const profile = await getProfile(userId);
    if (!hasSubscriptionAccess(profile)) {
      return NextResponse.json(
        { error: "Start your ListingFlow subscription trial before generating content." },
        { status: 402 },
      );
    }

    const content = await generateListingContent(input.data);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        property_address: input.data.propertyAddress,
        bedrooms: input.data.bedrooms,
        bathrooms: input.data.bathrooms,
        price: input.data.price,
        features: input.data.features,
        target_buyer_type: input.data.targetBuyerType,
        listing_description: content.listingDescription,
        social_captions: content.socialCaptions,
        drip_sequence: content.dripSequence,
      })
      .select(
        "id,created_at,property_address,bedrooms,bathrooms,price,features,target_buyer_type,listing_description,social_captions,drip_sequence",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: "Could not save generated content." }, { status: 503 });
    }

    return NextResponse.json({ generation: mapGeneration(data) });
  } catch (error) {
    console.error("Generation route failed", error);
    return NextResponse.json(
      { error: "ListingFlow could not generate content right now. Check service configuration." },
      { status: 503 },
    );
  }
}

function validateInput(payload: unknown): { ok: true; data: ListingFormInput } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = payload as Record<string, unknown>;
  const fields = {
    propertyAddress: toCleanString(body.propertyAddress),
    bedrooms: toCleanString(body.bedrooms),
    bathrooms: toCleanString(body.bathrooms),
    price: toCleanString(body.price),
    targetBuyerType: toCleanString(body.targetBuyerType),
  };
  const features = Array.isArray(body.features)
    ? body.features.map(toCleanString).slice(0, 3)
    : [];

  if (
    !fields.propertyAddress ||
    !fields.bedrooms ||
    !fields.bathrooms ||
    !fields.price ||
    !fields.targetBuyerType ||
    features.length !== 3 ||
    features.some((feature) => !feature)
  ) {
    return { ok: false, error: "Complete every field before generating." };
  }

  return {
    ok: true,
    data: {
      ...fields,
      features: [features[0], features[1], features[2]],
    },
  };
}

function toCleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
