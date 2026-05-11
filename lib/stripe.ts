import Stripe from "stripe";
import { requiredEnv } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function stripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
  }

  return stripeClient;
}

export function unixToIso(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}
