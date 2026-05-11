import type {
  DripEmail,
  GenerationRecord,
  SocialCaptions,
  SubscriptionStatus,
  UserProfile,
} from "@/lib/types";
import { createSupabaseAdmin } from "@/lib/supabase";

type ProfileRow = {
  user_id: string;
  email: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

type GenerationRow = {
  id: string;
  created_at: string;
  property_address: string;
  bedrooms: string;
  bathrooms: string;
  price: string;
  features: string[];
  target_buyer_type: string;
  listing_description: string;
  social_captions: SocialCaptions;
  drip_sequence: DripEmail[];
};

export function mapProfile(row: ProfileRow | null): UserProfile | null {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    subscriptionStatus: row.subscription_status ?? "none",
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
  };
}

export function mapGeneration(row: GenerationRow): GenerationRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    propertyAddress: row.property_address,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    price: row.price,
    features: normalizeFeatures(row.features),
    targetBuyerType: row.target_buyer_type,
    listingDescription: row.listing_description,
    socialCaptions: row.social_captions,
    dripSequence: row.drip_sequence,
  };
}

export async function getProfile(userId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id,email,stripe_customer_id,subscription_status,trial_ends_at,current_period_end",
    )
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return mapProfile(data);
}

export async function getHistory(userId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("generations")
    .select(
      "id,created_at,property_address,bedrooms,bathrooms,price,features,target_buyer_type,listing_description,social_captions,drip_sequence",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25)
    .returns<GenerationRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapGeneration);
}

function normalizeFeatures(features: string[]): [string, string, string] {
  return [
    features[0] ?? "",
    features[1] ?? "",
    features[2] ?? "",
  ];
}
