import Link from "next/link";
import { isClerkConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (!isClerkConfigured()) {
    return <AuthSetupMessage />;
  }

  const { SignUp } = await import("@clerk/nextjs");

  return (
    <main className="auth-page">
      <Link className="auth-logo" href="/">
        Listing<span>Flow</span>
      </Link>
      <SignUp
        fallbackRedirectUrl="/dashboard"
        forceRedirectUrl="/dashboard"
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </main>
  );
}

function AuthSetupMessage() {
  return (
    <main className="auth-page">
      <section className="auth-message">
        <h1>ListingFlow needs Clerk configuration.</h1>
        <p>
          Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel, then redeploy
          so agents can log in.
        </p>
      </section>
    </main>
  );
}
