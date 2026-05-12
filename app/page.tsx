import Image from "next/image";
import Link from "next/link";
import { isClerkConfigured } from "@/lib/config";
import { getHistory, getProfile } from "@/lib/data";
import ListingFlowApp from "@/app/listing-flow-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isClerkConfigured()) {
    return (
      <LandingPage
        setupMessage="Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in Vercel, then redeploy so agents can log in."
      />
    );
  }

  const [{ UserButton }, { auth }] = await Promise.all([
    import("@clerk/nextjs"),
    import("@clerk/nextjs/server"),
  ]);
  const { userId } = await auth();
  const { profile, history, setupError } = userId
    ? await loadDashboardData(userId)
    : { profile: null, history: [], setupError: null };

  if (!userId) {
    return <LandingPage />;
  }

  return (
    <main className="page-shell">
      <Header
        authComponents={{
          UserButton,
        }}
        userId={userId}
      />

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

type AuthComponents = {
  UserButton: React.ComponentType;
};

function LandingPage({
  setupMessage,
}: {
  setupMessage?: string;
}) {
  return (
    <main className="landing-shell">
      <section className="landing-hero" aria-label="ListingFlow homepage">
        <div className="landing-copy">
          <LogoMark />

          <div className="headline-block">
            <h1>
              Less typing.
              <span>More closing.</span>
            </h1>
            <p>
              AI-powered content for real estate agents. MLS listings, social captions, and buyer
              follow-up emails in <strong>30 seconds.</strong>
            </p>
          </div>

          {setupMessage ? (
            <div className="landing-alert">{setupMessage}</div>
          ) : (
            <div className="landing-actions">
              <Link className="button landing-primary" href="/sign-up">
                Start free trial
              </Link>
              <Link className="button landing-secondary" href="/sign-in">
                Log in
              </Link>
            </div>
          )}

          <div className="landing-features" aria-label="ListingFlow outputs">
            <FeatureCard
              icon={
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M6 3h8l4 4v14H6V3Z" />
                  <path d="M14 3v5h5" />
                  <path d="M9 13h6M9 17h5" />
                </svg>
              }
              title="MLS Listings"
              text="Ready to publish."
            />
            <FeatureCard
              icon={
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M5 5h14v10H9l-4 4V5Z" />
                  <path d="M8 10h.01M12 10h.01M16 10h.01" />
                </svg>
              }
              title="Social Captions"
              text="Engage and stand out."
            />
            <FeatureCard
              icon={
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M4 6h16v12H4V6Z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              }
              title="Buyer Emails"
              text="Nurture and close."
            />
          </div>
        </div>

        <MarketingVisual />
      </section>

      <div className="landing-wave" aria-hidden="true">
        <div className="wave-line one" />
        <div className="wave-line two" />
        <p>
          <span>Save hours every week.</span> Win more listings. Close more deals.
        </p>
      </div>
    </main>
  );
}

function LogoMark() {
  return (
    <div className="landing-logo" aria-label="ListingFlow">
      <span className="logo-icon" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <path d="M5 15 16 6l11 9v11H5V15Z" />
          <path d="M10 24c3-6 9-6 12 0" />
          <path d="M9 19c4-3 10-3 14 0" />
        </svg>
      </span>
      <span>
        Listing<span>Flow</span>
      </span>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="landing-feature">
      <span>{icon}</span>
      <strong>{title}</strong>
      <small>{text}</small>
    </div>
  );
}

function MarketingVisual() {
  return (
    <div className="marketing-visual">
      <Image
        alt="ListingFlow listing, social caption, and buyer email cards over a modern real estate scene"
        className="marketing-image"
        height={902}
        priority
        src="/marketing-visual.png"
        width={815}
      />
    </div>
  );
}

function Header({
  authComponents,
  userId,
}: {
  authComponents: AuthComponents;
  userId?: string | null;
}) {
  const { UserButton } = authComponents;

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
          <Link className="button secondary" href="/sign-in">
            Log in
          </Link>
          <Link className="button" href="/sign-up">
            Start free trial
          </Link>
        </div>
      )}
    </header>
  );
}

