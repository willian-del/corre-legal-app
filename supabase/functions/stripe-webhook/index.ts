import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

// Email validation functions - Comprehensive disposable email domain list
const DISPOSABLE_EMAIL_DOMAINS = [
  // Common disposable email services
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'trashmail.com', 'yopmail.com', 'maildrop.cc',
  
  // Additional popular disposable domains
  'temp-mail.org', 'getnada.com', '33mail.com', 'emailondeck.com',
  'fakeinbox.com', 'tmpmail.net', 'mintemail.com', 'sharklasers.com',
  'guerrillamail.info', 'grr.la', 'guerrillamail.biz', 'guerrillamail.de',
  'spam4.me', 'getairmail.com', 'dispostable.com', 'emailsensei.com',
  'tempr.email', 'mohmal.com', 'crazymailing.com', 'mailcatch.com',
  'mytrashmail.com', 'mailnesia.com', 'spamgourmet.com', 'incognitomail.org',
  'anonymbox.com', 'dodgit.com', 'emltmp.com', 'spambox.us',
  'mail-temporaire.fr', 'jetable.org', 'fakemail.net', 'throwawaymail.com',
  
  // Numbered variations
  '10minutemail.net', '10minutemail.co.uk', '20minutemail.com',
  '30minutemail.com', '60minutemail.com',
  
  // TLD variations of common services
  'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.com',
  'mailinator.net', 'mailinator.org', 'safetymail.info',
  
  // Other known services
  'zoemail.org', 'haltospam.com', 'spamfree24.org', 'spamfree24.com',
  'spamfree24.eu', 'trillianpro.com', 'bobmail.info', 'mail.by',
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
      logStep("Webhook signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      // SECURITY: Log failed signature verification attempts for monitoring
      const errorDetails = {
        error: err instanceof Error ? err.message : String(err),
        signature: signature?.substring(0, 20) + '...',
        timestamp: new Date().toISOString(),
        attempt: 'signature_verification_failed'
      };
      logStep("⚠️ SECURITY ALERT: Webhook signature verification failed", errorDetails);
      
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
        // SECURITY: Log email validation failures for monitoring
        logStep("⚠️ SECURITY: Email validation failed", { 
          email: maskEmail(customerEmail), 
          reason: emailValidation.reason,
          eventId: event.id,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Email validation failed: ${emailValidation.reason}`);
      }
      
      logStep("Email validated successfully", { 
        email: maskEmail(customerEmail),
        domain: customerEmail.split('@')[1] 
      });

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
        logStep("User account created", { userId: user.id, email: maskEmail(customerEmail) });
        
        // Note: Email will be sent after subscription is created with all details
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

      // Send confirmation email directly (for both new and existing users)
      try {
        const isNewUser = !userData.users.find(u => u.email === customerEmail);
        const tempPassword = isNewUser ? Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 12) : undefined;

        logStep(isNewUser ? "Sending confirmation email for new user" : "Sending confirmation email for existing user");

        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
        const siteUrl = Deno.env.get("ALLOWED_ORIGIN") || "https://seu-site.lovable.app";
        
        // Format data for display
        const expirationDate = expiresAt.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const formattedAmount = (amountTotal / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        });
        const planName = planType.charAt(0).toUpperCase() + planType.slice(1);

        // Build email HTML
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pagamento Confirmado</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Pagamento Confirmado!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-top: 0;">Olá! 🎉</p>
                        <p style="color: #333333; font-size: 16px; line-height: 1.6;">Seu pagamento foi confirmado com sucesso! Bem-vindo ao <strong>Plano ${planName}</strong>.</p>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 8px; margin: 30px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 18px;">📋 Detalhes do Seu Plano</h3>
                              <table width="100%" cellpadding="5" cellspacing="0">
                                <tr>
                                  <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Plano:</strong></td>
                                  <td style="color: #333333; font-size: 14px; padding: 5px 0; text-align: right;">${planName}</td>
                                </tr>
                                <tr>
                                  <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Valor pago:</strong></td>
                                  <td style="color: #333333; font-size: 14px; padding: 5px 0; text-align: right;">${formattedAmount}</td>
                                </tr>
                                <tr>
                                  <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Válido até:</strong></td>
                                  <td style="color: #333333; font-size: 14px; padding: 5px 0; text-align: right;">${expirationDate}</td>
                                </tr>
                                <tr>
                                  <td style="color: #666666; font-size: 14px; padding: 5px 0;"><strong>Cobertura:</strong></td>
                                  <td style="color: #333333; font-size: 14px; padding: 5px 0; text-align: right;">6 meses</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        ${isNewUser && tempPassword ? `
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 30px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <h3 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 18px;">🔐 Suas Credenciais de Acesso</h3>
                              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 10px 0;"><strong>Email:</strong> ${customerEmail}</p>
                              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 10px 0;"><strong>Senha temporária:</strong> <code style="background-color: #fef3c7; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px; color: #92400e;">${tempPassword}</code></p>
                              <p style="color: #dc2626; font-size: 13px; line-height: 1.6; margin: 15px 0 0 0;">⚠️ <strong>IMPORTANTE:</strong> Altere sua senha no primeiro acesso!</p>
                            </td>
                          </tr>
                        </table>
                        ` : ''}
                        <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">🚀 Próximos Passos:</h3>
                        <ol style="color: #666666; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                          <li>Acesse a área de cliente clicando no botão abaixo</li>
                          <li>${isNewUser ? 'Faça login com as credenciais fornecidas acima' : 'Faça login com seu email e senha'}</li>
                          <li>${isNewUser ? 'Complete seu cadastro com CPF e telefone' : 'Aproveite todos os benefícios do seu plano!'}</li>
                          ${isNewUser ? '<li>Altere sua senha temporária por uma senha segura</li>' : ''}
                        </ol>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <a href="${siteUrl}/auth" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">Acessar Área de Cliente</a>
                            </td>
                          </tr>
                        </table>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">Precisa de ajuda? Responda este email ou entre em contato conosco.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 12px 12px;">
                        <p style="color: #999999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Corre Mais. Todos os direitos reservados.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        await resend.emails.send({
          from: "Corre Mais <onboarding@resend.dev>",
          to: [customerEmail],
          subject: `✅ Pagamento Confirmado - Plano ${planName}`,
          html: emailHtml,
        });

        logStep("Confirmation email sent successfully");
      } catch (emailError) {
        logStep("ERROR sending confirmation email", { error: emailError });
        // Continue even if email fails - don't block webhook
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
