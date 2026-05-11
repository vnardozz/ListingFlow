export type ListingFormInput = {
  propertyAddress: string;
  bedrooms: string;
  bathrooms: string;
  price: string;
  features: [string, string, string];
  targetBuyerType: string;
};

export type SocialCaptions = {
  instagram: string;
  facebook: string;
  linkedin: string;
};

export type DripEmail = {
  subject: string;
  body: string;
};

export type GeneratedContent = {
  listingDescription: string;
  socialCaptions: SocialCaptions;
  dripSequence: DripEmail[];
};

export type GenerationRecord = GeneratedContent & {
  id: string;
  createdAt: string;
  propertyAddress: string;
  bedrooms: string;
  bathrooms: string;
  price: string;
  features: [string, string, string];
  targetBuyerType: string;
};

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | "none";

export type UserProfile = {
  userId: string;
  email: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};
