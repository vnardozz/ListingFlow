import { requiredEnv } from "@/lib/env";

type LoopsContact = {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

const LOOPS_API_BASE = "https://app.loops.so/api/v1";

export async function sendSignupToLoops(contact: LoopsContact) {
  const apiKey = requiredEnv("LOOPS_API_KEY");
  const eventName = process.env.LOOPS_ONBOARDING_EVENT ?? "listingflow_signup";

  await loopsRequest("/contacts/create", apiKey, {
    email: contact.email,
    userId: contact.userId,
    firstName: contact.firstName ?? undefined,
    lastName: contact.lastName ?? undefined,
    source: "ListingFlow",
  });

  await loopsRequest("/events/send", apiKey, {
    email: contact.email,
    userId: contact.userId,
    eventName,
  });
}

async function loopsRequest(path: string, apiKey: string, body: Record<string, unknown>) {
  const response = await fetch(`${LOOPS_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Loops request failed: ${message}`);
  }
}
