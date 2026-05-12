import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/config";
import { getHistory, getProfile } from "@/lib/data";
import ListingFlowApp from "@/app/listing-flow-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isClerkConfigured()) {
    return (
      <main className="page-shell">
        <StaticHeader />
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

  const { userId } = await auth();
  const { profile, history, setupError } = userId
    ? await loadDashboardData(userId)
    : { profile: null, history: [], setupError: null };

  return (
    <main className="page-shell">
      <Header userId={userId} />

      {userId ? (
        <ListingFlowApp initialHistory={history} initialProfile={profile} setupError={setupError} />
      ) : (
        <section className="hero">
          <h2>Generate polished listing campaigns in one click.</h2>
          <p>
            Enter the core property details and ListingFlow returns a 150-word MLS description,
            three social captions, and a five-email buyer follow-up sequence.
          </p>
          <div className="auth-actions" style={{ justifyContent: "center" }}>
            <SignUpButton mode="modal">
              <button className="button">Start 7-day free trial</button>
            </SignUpButton>
          </div>
        </section>
      )}
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

function Header({ userId }: { userId?: string | null }) {
  return (
    <header className="topbar">
      <div className="brand">
        <h1>ListingFlow</h1>
        <p>AI listing copy for real estate agents.</p>
      </div>
      {userId ? (
        <div className="auth-actions">
          <UserButton />
        </div>
      ) : (
        <div className="auth-actions">
          <SignInButton mode="modal">
            <button className="button secondary">Log in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="button">Start free trial</button>
          </SignUpButton>
        </div>
      )}
    </header>
  );
}

function StaticHeader() {
  return (
    <header className="topbar">
      <div className="brand">
        <h1>ListingFlow</h1>
        <p>AI listing copy for real estate agents.</p>
      </div>
    </header>
  );
}
