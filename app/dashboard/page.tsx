import ListingFlowApp from "@/app/listing-flow-app";
import { isClerkConfigured } from "@/lib/config";
import { getHistory, getProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<{
    billing?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  if (!isClerkConfigured()) {
    return (
      <main className="page-shell">
        <header className="topbar">
          <div className="brand">
            <h1>ListingFlow</h1>
            <p>AI listing copy for real estate agents.</p>
          </div>
        </header>
        <section className="hero">
          <h2>ListingFlow needs Clerk configuration.</h2>
          <p>
            Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel, then
            redeploy so agents can log in.
          </p>
        </section>
      </main>
    );
  }

  const [{ UserButton }, { auth }] = await Promise.all([
    import("@clerk/nextjs"),
    import("@clerk/nextjs/server"),
  ]);
  const { userId } = await auth.protect();

  const { profile, history, setupError } = await loadDashboardData(userId);
  const billingStatus = (await searchParams)?.billing;

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">
          <h1>ListingFlow</h1>
          <p>AI listing copy for real estate agents.</p>
        </div>
        <div className="auth-actions">
          <UserButton />
        </div>
      </header>

      <BillingNotice billingStatus={billingStatus} />
      <ListingFlowApp initialHistory={history} initialProfile={profile} setupError={setupError} />
    </main>
  );
}

function BillingNotice({ billingStatus }: { billingStatus?: string }) {
  if (billingStatus === "success") {
    return (
      <section className="app-wrap" style={{ marginBottom: 18 }}>
        <div className="notice success-notice">
          <strong>Welcome to ListingFlow.</strong>
          <span>Your free trial is active. You can now generate listing content.</span>
        </div>
      </section>
    );
  }

  if (billingStatus === "cancelled") {
    return (
      <section className="app-wrap" style={{ marginBottom: 18 }}>
        <div className="notice">
          <strong>Checkout cancelled.</strong>
          <span>You can start your 7-day free trial whenever you are ready.</span>
        </div>
      </section>
    );
  }

  return null;
}

async function loadDashboardData(userId: string) {
  try {
    const [profile, history] = await Promise.all([getProfile(userId), getHistory(userId)]);

    return { profile, history, setupError: null };
  } catch (error) {
    console.error("Failed to load dashboard data", error);

    return {
      profile: null,
      history: [],
      setupError:
        "ListingFlow could not load saved data. Check Supabase environment variables and run the database migration.",
    };
  }
}
