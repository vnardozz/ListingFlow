import { redirect } from "next/navigation";
import ListingFlowApp from "@/app/listing-flow-app";
import { isClerkConfigured } from "@/lib/config";
import { getHistory, getProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { profile, history, setupError } = await loadDashboardData(userId);

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

      <ListingFlowApp initialHistory={history} initialProfile={profile} setupError={setupError} />
    </main>
  );
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
