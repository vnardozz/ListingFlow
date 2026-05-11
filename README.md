# ListingFlow

ListingFlow is a minimal Next.js MVP for real estate agents. Authenticated agents enter property details and generate:

1. A 150-word MLS-ready listing description
2. Instagram, Facebook, and LinkedIn captions
3. A 5-email buyer follow-up drip sequence

## Stack

- Next.js App Router for the Vercel frontend
- Clerk authentication
- Stripe subscriptions at $49/month with a 7-day free trial
- Supabase storage for profiles, subscription status, and generated history
- Claude API model `claude-sonnet-4-20250514`
- Loops.so signup onboarding via Clerk webhook

## Environment

Copy `.env.example` to `.env.local` and fill in all values.

Create a recurring monthly Stripe Price for $49 and set `STRIPE_PRICE_ID` to that price ID. Configure webhooks for:

- `/api/webhooks/stripe`
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- `/api/webhooks/clerk`
  - `user.created`

Run the Supabase migration in `supabase/migrations/001_initial_schema.sql` before using the app.

## Development

```bash
npm install
npm run dev
```