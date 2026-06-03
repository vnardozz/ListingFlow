import type { Metadata } from "next";
import { isClerkConfigured } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "ListingFlow",
  description: "Generate MLS listings, social captions, and buyer follow-up emails.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isClerkConfigured()) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  const [{ ClerkProvider }, { ui }] = await Promise.all([
    import("@clerk/nextjs"),
    import("@clerk/ui"),
  ]);
  const legacyRedirectProps = {
    afterSignInUrl: "/dashboard",
    afterSignUpUrl: "/dashboard",
  } as Record<string, string>;

  return (
    <ClerkProvider
      {...legacyRedirectProps}
      signInFallbackRedirectUrl="/dashboard"
      signInForceRedirectUrl="/dashboard"
      signInUrl="/sign-in"
      signUpFallbackRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
      signUpUrl="/sign-up"
      ui={ui}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
