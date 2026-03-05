// v2 - Handles both signup flow (email in body) and logged-in upgrade flow (JWT auth)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-11-20.acacia',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { email, promo_code } = body;

    let profileData: any = null;

    if (email) {
      // SIGNUP FLOW: email passed directly in body (user just created account)
      console.info(`[SignupCheckout] Signup flow for email: ${email}`);
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, stripe_customer_id, pending_tier, subscription_tier')
        .eq('email', email)
        .single();

      if (error || !data) {
        console.error('[SignupCheckout] Profile not found by email:', error);
        throw new Error('Profile not found');
      }
      profileData = data;
    } else {
      // UPGRADE FLOW: existing logged-in user, identify via JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('No authorization');

      const supabaseForAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user: callingUser }, error: authError } = await supabaseForAuth.auth.getUser();
      if (authError || !callingUser) throw new Error('Invalid session');

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, stripe_customer_id, pending_tier, subscription_tier')
        .eq('id', callingUser.id)
        .single();

      if (error || !data) throw new Error('Profile not found');
      profileData = data;
    }

    if (profileData.subscription_tier === 'elite') {
      throw new Error('Already on Elite tier');
    }

    // Set pending_tier so AuthConfirmPage can route correctly after email verification
    await supabaseAdmin
      .from('profiles')
      .update({ pending_tier: 'elite' })
      .eq('id', profileData.id);

    console.info(`[SignupCheckout] Set pending_tier=elite for user ${profileData.id}`);

    // Create or reuse Stripe customer
    let customerId = profileData.stripe_customer_id;
    if (!customerId) {
      console.info(`[SignupCheckout] Creating Stripe customer for ${profileData.id}`);
      const customer = await stripe.customers.create({
        email: profileData.email,
        metadata: { supabase_user_id: profileData.id },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', profileData.id);

      console.info(`[SignupCheckout] Created Stripe customer: ${customerId}`);
    }

    // Use STRIPE_PRICE_ID_ELITE (matches your existing Supabase secret name)
    const elitePriceId = Deno.env.get('STRIPE_PRICE_ID_ELITE') ?? 'price_1T0MNyRqinDwGWvkbHRuJs7N';

    // Handle promo code if provided
    let discounts: any[] = [];
    if (promo_code) {
      try {
        const { data: promoData } = await supabaseAdmin
          .from('promo_codes')
          .select('stripe_coupon_id, active')
          .eq('code', promo_code.toUpperCase())
          .single();

        if (promoData?.active && promoData?.stripe_coupon_id) {
          discounts = [{ coupon: promoData.stripe_coupon_id }];
          console.info(`[SignupCheckout] Applied promo: ${promo_code}`);
        }
      } catch {
        console.warn('[SignupCheckout] Promo code lookup failed, continuing without discount');
      }
    }

    const origin = req.headers.get('origin') || 'https://www.nxxtfutures.com';

    const sessionParams: any = {
      customer: customerId,
      line_items: [{ price: elitePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: profileData.id,
        tier: 'elite',
      },
    };

    if (discounts.length > 0) sessionParams.discounts = discounts;

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.info(`[SignupCheckout] Created checkout session: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SignupCheckout] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
