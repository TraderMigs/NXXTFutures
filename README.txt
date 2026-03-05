# NXXT Futures — Elite Signup Flow Update

## Files in this zip

### GitHub — replace existing files:
- src/App.tsx
- src/contexts/AuthContext.tsx
- src/pages/SignupPage.tsx
- src/pages/PricingPage.tsx
- src/pages/PaymentSuccessPage.tsx

### GitHub — create new file:
- src/pages/AuthConfirmPage.tsx

### Supabase Edge Function — deploy new function named "create-signup-checkout":
- supabase/functions/create-signup-checkout/index.ts

---

## Supabase Steps (do these BEFORE deploying)

### 1. SQL — Add pending_tier column:
https://supabase.com/dashboard/project/gqbuyjzvbutoqgaydckc/sql/new

Paste ONLY this line:
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_tier text DEFAULT NULL;

### 2. Auth URL — Add redirect URL:
https://supabase.com/dashboard/project/gqbuyjzvbutoqgaydckc/auth/url-configuration

Under "Redirect URLs" add:
  https://www.nxxtfutures.com/auth/confirm

### 3. Email Template — Update confirmation URL:
https://supabase.com/dashboard/project/gqbuyjzvbutoqgaydckc/auth/templates

In "Confirm signup" template, set the confirmation link to:
  {{ .SiteURL }}/auth/confirm#access_token={{ .Token }}&refresh_token={{ .RefreshToken }}&type=signup

### 4. Deploy Edge Function:
https://supabase.com/dashboard/project/gqbuyjzvbutoqgaydckc/functions

Deploy new function named exactly: create-signup-checkout
Paste contents of supabase/functions/create-signup-checkout/index.ts

No new secrets needed — uses existing STRIPE_PRICE_ID_ELITE and STRIPE_SECRET_KEY.

---

## New User Flow (Elite)
1. Click "Start Elite Trader" → /signup?tier=elite
2. Fill form → "Create Account & Continue to Payment" button
3. Account created → Stripe checkout launches immediately
4. Pay on Stripe → /payment-success (shows success + "verify email" notice)
5. User checks email → clicks confirmation link → /auth/confirm
6. AuthConfirmPage reads pending_tier + stripe_customer_id from DB
7. Routes to /app (Elite active) or /payment-success (webhook still processing)
8. User enters app as Elite Trader
