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

  const { ClerkProvider } = await import("@clerk/nextjs");

  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signInUrl="/sign-in"
      signUpFallbackRedirectUrl="/dashboard"
      signUpUrl="/sign-up"
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
