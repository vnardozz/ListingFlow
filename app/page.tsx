import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getHistory, getProfile } from "@/lib/data";
import ListingFlowApp from "@/app/listing-flow-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();
  const profile = userId ? await getProfile(userId) : null;
  const history = userId ? await getHistory(userId) : [];

  return (
    <main className="page-shell">
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

      {userId ? (
        <ListingFlowApp initialHistory={history} initialProfile={profile} />
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
