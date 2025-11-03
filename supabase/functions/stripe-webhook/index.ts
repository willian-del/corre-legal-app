import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
};

const maskPriceId = (priceId: string): string => {
  return `price_***${priceId.slice(-4)}`;
};

const maskId = (id: string, prefix: string = ''): string => {
  return `${prefix}***${id.slice(-4)}`;
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Email validation functions
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'trashmail.com', 'yopmail.com', 'maildrop.cc'
];

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isDisposableEmail = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
};

const validateEmail = (email: string): { valid: boolean; reason?: string } => {
  if (!isValidEmail(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }
  if (isDisposableEmail(email)) {
    return { valid: false, reason: 'Disposable email addresses are not allowed' };
  }
  return { valid: true };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header found");
    }

    const body = await req.text();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { eventType: event.type });
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout.session.completed", { sessionId: session.id });

      const customerEmail = session.customer_email || session.customer_details?.email;
      if (!customerEmail) {
        throw new Error("No customer email found in session");
      }

      // Validate email
      const emailValidation = validateEmail(customerEmail);
      if (!emailValidation.valid) {
        logStep("Email validation failed", { 
          email: maskEmail(customerEmail), 
          reason: emailValidation.reason 
        });
        throw new Error(`Email validation failed: ${emailValidation.reason}`);
      }
      
      logStep("Email validated", { email: maskEmail(customerEmail) });

      // Get or create user by email
      const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
      if (userError) throw userError;

      let user = userData.users.find(u => u.email === customerEmail);
      
      if (!user) {
        logStep("User not found, creating new account", { email: maskEmail(customerEmail) });
        
        // Generate secure temporary password
        const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 12);
        
        // Create new user account
        const { data: newUserData, error: createError } = await supabaseClient.auth.admin.createUser({
          email: customerEmail,
          password: tempPassword,
          email_confirm: true,
        });
        
        if (createError || !newUserData.user) {
          logStep("ERROR creating user", { error: createError });
          throw new Error(`Failed to create user: ${createError?.message}`);
        }
        
        user = newUserData.user;
        const isNewUser = true;
        logStep("User account created", { userId: user.id, email: maskEmail(customerEmail) });
        
        // Send confirmation email with credentials for new users
        try {
          const emailData = {
            email: customerEmail,
            planType,
            amountPaid: amountTotal,
            expiresAt: expiresAt.toISOString(),
            isNewUser: true,
            temporaryPassword: tempPassword
          };

          logStep("Sending confirmation email for new user");
          const { error: emailError } = await supabaseClient.functions.invoke('send-confirmation-email', {
            body: emailData
          });

          if (emailError) {
            logStep("ERROR sending confirmation email", { error: emailError });
            // Don't fail the webhook if email fails, just log
          } else {
            logStep("Confirmation email sent successfully");
          }
        } catch (emailError) {
          logStep("EXCEPTION sending confirmation email", { error: emailError });
          // Continue even if email fails
        }
      } else {
        const isNewUser = false;
        logStep("Found existing user", { userId: user.id, email: maskEmail(customerEmail) });
      }

      // Get line items to determine plan type
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      
      // Get price IDs from environment variables to determine plan type
      const priceIds = {
        bronze: Deno.env.get("STRIPE_PRICE_BRONZE"),
        prata: Deno.env.get("STRIPE_PRICE_PRATA"),
        ouro: Deno.env.get("STRIPE_PRICE_OURO")
      };

      let planType = 'bronze'; // default
      if (priceId === priceIds.ouro) planType = 'ouro';
      else if (priceId === priceIds.prata) planType = 'prata';
      else if (priceId === priceIds.bronze) planType = 'bronze';

      const amountTotal = session.amount_total || 0;
      logStep("Determined plan type", { planType, priceId: maskPriceId(priceId || ''), amountTotal });

      // Check if this payment was already processed (idempotency)
      const { data: existingSubscription } = await supabaseClient
        .from('user_subscriptions')
        .select('id')
        .eq('stripe_payment_intent_id', session.payment_intent as string)
        .single();

      if (existingSubscription) {
        logStep("Subscription already processed (idempotent)", { 
          paymentIntent: maskId(session.payment_intent as string, 'pi_'),
          existingId: existingSubscription.id 
        });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Verify payment was completed
      if (session.payment_status !== 'paid') {
        logStep("Payment not completed", { 
          sessionId: session.id, 
          status: session.payment_status 
        });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Calculate expiration date (6 months from now)
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      // Insert subscription record
      const { error: insertError } = await supabaseClient
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_type: planType,
          status: 'active',
          stripe_customer_id: session.customer as string,
          stripe_payment_intent_id: session.payment_intent as string,
          amount_paid: (amountTotal / 100).toString(),
          currency: session.currency?.toUpperCase() || 'BRL',
          payment_method: session.payment_method_types?.[0] || 'credit_card',
          paid_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: expiresAt.toISOString(),
        });

      if (insertError) {
        logStep("Error inserting subscription", { error: insertError });
        throw insertError;
      }

      logStep("Subscription created successfully", { 
        userId: user.id, 
        planType, 
        expiresAt: expiresAt.toISOString() 
      });

      // Send confirmation email for existing users (renewal)
      const isExistingUser = userData.users.find(u => u.email === customerEmail) !== undefined;
      if (isExistingUser) {
        try {
          const emailData = {
            email: customerEmail,
            planType,
            amountPaid: amountTotal,
            expiresAt: expiresAt.toISOString(),
            isNewUser: false
          };

          logStep("Sending confirmation email for existing user");
          const { error: emailError } = await supabaseClient.functions.invoke('send-confirmation-email', {
            body: emailData
          });

          if (emailError) {
            logStep("ERROR sending confirmation email", { error: emailError });
            // Don't fail the webhook if email fails
          } else {
            logStep("Confirmation email sent successfully");
          }
        } catch (emailError) {
          logStep("EXCEPTION sending confirmation email", { error: emailError });
          // Continue even if email fails
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
