export function missingEnv(names: string[]) {
  return names.filter((name) => !process.env[name]);
}

export function isClerkConfigured() {
  return missingEnv(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]).length === 0;
}

export function getSupabaseConfigError() {
  const missing = missingEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

  if (!missing.length) {
    return null;
  }

  return `Supabase is not configured. Missing: ${missing.join(", ")}.`;
}

export function getStripeConfigError() {
  const missing = missingEnv(["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID"]);

  if (!missing.length) {
    return null;
  }

  return `Stripe billing is not configured. Missing: ${missing.join(", ")}.`;
}

export function getClaudeConfigError() {
  const missing = missingEnv(["ANTHROPIC_API_KEY"]);

  if (!missing.length) {
    return null;
  }

  return `Claude generation is not configured. Missing: ${missing.join(", ")}.`;
}
