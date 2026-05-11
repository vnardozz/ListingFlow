import Anthropic from "@anthropic-ai/sdk";
import { requiredEnv } from "@/lib/env";
import type { GeneratedContent, ListingFormInput } from "@/lib/types";

const MODEL = "claude-sonnet-4-20250514";

export async function generateListingContent(input: ListingFormInput): Promise<GeneratedContent> {
  const anthropic = new Anthropic({
    apiKey: requiredEnv("ANTHROPIC_API_KEY"),
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2400,
    temperature: 0.7,
    system:
      "You are ListingFlow, a precise real estate marketing assistant. Return only valid JSON matching the requested schema. Do not include markdown fences or commentary.",
    messages: [
      {
        role: "user",
        content: buildPrompt(input),
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return parseGeneratedContent(text);
}

function buildPrompt(input: ListingFormInput) {
  return `Create marketing copy for this property.

Property address: ${input.propertyAddress}
Bedrooms: ${input.bedrooms}
Bathrooms: ${input.bathrooms}
Price: ${input.price}
Key features:
1. ${input.features[0]}
2. ${input.features[1]}
3. ${input.features[2]}
Target buyer type: ${input.targetBuyerType}

Return JSON with exactly this shape:
{
  "listingDescription": "MLS-ready listing description, exactly 150 words",
  "socialCaptions": {
    "instagram": "caption",
    "facebook": "caption",
    "linkedin": "caption"
  },
  "dripSequence": [
    { "subject": "email subject", "body": "email body" },
    { "subject": "email subject", "body": "email body" },
    { "subject": "email subject", "body": "email body" },
    { "subject": "email subject", "body": "email body" },
    { "subject": "email subject", "body": "email body" }
  ]
}`;
}

function parseGeneratedContent(text: string): GeneratedContent {
  const parsed = JSON.parse(stripJsonFence(text)) as Partial<GeneratedContent>;

  if (
    !parsed.listingDescription ||
    !parsed.socialCaptions?.instagram ||
    !parsed.socialCaptions.facebook ||
    !parsed.socialCaptions.linkedin ||
    !Array.isArray(parsed.dripSequence) ||
    parsed.dripSequence.length !== 5 ||
    parsed.dripSequence.some((email) => !email.subject || !email.body)
  ) {
    throw new Error("Claude returned an invalid ListingFlow payload.");
  }

  return {
    listingDescription: parsed.listingDescription,
    socialCaptions: {
      instagram: parsed.socialCaptions.instagram,
      facebook: parsed.socialCaptions.facebook,
      linkedin: parsed.socialCaptions.linkedin,
    },
    dripSequence: parsed.dripSequence.map((email) => ({
      subject: email.subject,
      body: email.body,
    })),
  };
}

function stripJsonFence(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}
