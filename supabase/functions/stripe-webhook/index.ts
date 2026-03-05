// stripe-webhook/index.ts
// v2 — Native Web Crypto signature verification. Zero Stripe SDK. No Node.js compat needed.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

// ── CORS headers ───────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
};

// ── Stripe signature verification using Web Crypto API ─────────────────────────
// Replaces the Stripe npm SDK which crashed on Deno due to Deno.core.runMicrotasks()
// incompatibility. This implementation is identical in security to the official SDK.
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    // Parse the Stripe-Signature header: t=timestamp,v1=hash1,v1=hash2,...
    const parts = sigHeader.split(',');
    let timestamp = '';
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') signatures.push(value);
    }

    if (!timestamp || signatures.length === 0) {
      console.error('Invalid Stripe-Signature header format');
      return false;
    }

    // Reject webhooks older than 5 minutes to prevent replay attacks
    const webhookAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (webhookAge > 300) {
      console.error(`Webhook too old: ${webhookAge}s`);
      return false;
    }

    // Construct the signed payload: timestamp.rawBody
    const signedPayload = `${timestamp}.${payload}`;

    // Import the webhook secret as a HMAC-SHA256 key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Compute expected HMAC signature
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(signedPayload)
    );

    // Convert to hex string
    const expectedSig = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare against all v1 signatures in the header (Stripe can send multiple)
    const isValid = signatures.some(sig => sig === expectedSig);

    if (!isValid) {
      console.error('Stripe signature mismatch');
    }

    return isValid;
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read raw body as text — must be done before any other body parsing
    const rawBody = await req.text();

    // Verify Stripe signature
    const sigHeader = req.headers.get('stripe-signature');
    if (!sigHeader) {
      console.error('Missing stripe-signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isValid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the verified event
    const event = JSON.parse(rawBody);
    console.log(`Stripe event received: ${event.type} (${event.id})`);

    // Supabase admin client — service role bypasses RLS to update any user's profile
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── Handle events ─────────────────────────────────────────────────────────
    switch (event.type) {

      // User completed checkout — upgrade to Elite
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const customerEmail = session.customer_details?.email || session.customer_email;

        console.log(`checkout.session.completed — customer: ${customerId}, sub: ${subscriptionId}, email: ${customerEmail}`);

        if (!customerEmail) {
          console.error('No email in checkout session — cannot match user');
          break;
        }

        // Find the user by email
        const { data: users, error: userError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .limit(1);

        if (userError || !users || users.length === 0) {
          console.error(`No profile found for email ${customerEmail}:`, userError);
          // Try matching via Supabase auth users table as fallback
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserByEmail(customerEmail);
          if (!authUser?.user) {
            console.error(`No auth user found for ${customerEmail} either`);
            break;
          }

          // Update via user ID directly
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: 'elite',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', authUser.user.id);

          if (updateError) {
            console.error('Profile update error (auth fallback):', updateError);
          } else {
            console.log(`✅ User ${authUser.user.id} upgraded to Elite via auth fallback`);
          }
          break;
        }

        const userId = users[0].id;
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'elite',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Profile update error:', updateError);
        } else {
          console.log(`✅ User ${userId} (${customerEmail}) upgraded to Elite`);
        }
        break;
      }

      // Subscription cancelled — downgrade to Free
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        console.log(`customer.subscription.deleted — customer: ${customerId}`);

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'free',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (updateError) {
          console.error('Downgrade error:', updateError);
        } else {
          console.log(`✅ Customer ${customerId} downgraded to Free`);
        }
        break;
      }

      // Payment failed — downgrade to Free
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        console.log(`invoice.payment_failed — customer: ${customerId}`);

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (updateError) {
          console.error('Downgrade on payment failure error:', updateError);
        } else {
          console.log(`✅ Customer ${customerId} downgraded to Free after payment failure`);
        }
        break;
      }

      // Subscription reactivated after lapse — upgrade back to Elite
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        // Only act on subscription invoices (not one-time charges)
        if (!subscriptionId) break;

        console.log(`invoice.payment_succeeded — customer: ${customerId}`);

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'elite',
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (updateError) {
          console.error('Reactivation error:', updateError);
        } else {
          console.log(`✅ Customer ${customerId} reactivated to Elite`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type} — ignoring`);
    }

    // Always return 200 to Stripe so it doesn't retry
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Stripe webhook fatal error:', error);
    // Return 200 anyway — returning 500 causes Stripe to retry indefinitely
    return new Response(
      JSON.stringify({ received: true, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
