// supabase/functions/cancel-stripe-subscription/index.ts
// A3 FIX: Called by AuthContext.deleteAccount() to cancel Stripe before wiping profile.
// Also callable from admin panel for manual cancellations.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user via Supabase (signature-verified, not manual decode)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { subscription_id } = body;

    if (!subscription_id) {
      return new Response(JSON.stringify({ success: true, message: 'No subscription ID — nothing to cancel' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) throw new Error('Stripe secret key not configured');

    // Cancel the Stripe subscription immediately
    const stripeRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!stripeRes.ok) {
      const stripeError = await stripeRes.json();
      // If already cancelled, treat as success
      if (stripeError?.error?.code === 'resource_missing') {
        return new Response(JSON.stringify({ success: true, message: 'Subscription already cancelled or not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Stripe error: ${stripeError?.error?.message || 'Unknown Stripe error'}`);
    }

    const cancelled = await stripeRes.json();
    console.log(`Subscription ${subscription_id} cancelled for user ${user.id}. Status: ${cancelled.status}`);

    return new Response(
      JSON.stringify({ success: true, subscription_status: cancelled.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('cancel-stripe-subscription error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
