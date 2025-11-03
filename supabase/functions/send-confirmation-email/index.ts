import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailData {
  email: string;
  planType: string;
  amountPaid: number;
  expiresAt: string;
  isNewUser: boolean;
  temporaryPassword?: string;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [SEND-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, planType, amountPaid, expiresAt, isNewUser, temporaryPassword }: EmailData = await req.json();
    
    logStep("Received email data", { email, planType, isNewUser, amountPaid });

    // Formatar data de expiração
    const expirationDate = new Date(expiresAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Formatar valor pago (convertendo de centavos para reais)
    const formattedAmount = (amountPaid / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // URL do site (obtém do environment ou usa fallback)
    const siteUrl = Deno.env.get("ALLOWED_ORIGIN") || "https://seu-site.lovable.app";
    
    logStep("Formatted data", { expirationDate, formattedAmount, siteUrl });

    // Nome do plano capitalizado
    const planName = planType.charAt(0).toUpperCase() + planType.slice(1);

    // Construir HTML do email
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
                
                <!-- Header com fundo verde -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Pagamento Confirmado!</h1>
                  </td>
                </tr>

                <!-- Conteúdo principal -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-top: 0;">
                      Olá! 🎉
                    </p>
                    <p style="color: #333333; font-size: 16px; line-height: 1.6;">
                      Seu pagamento foi confirmado com sucesso! Bem-vindo ao <strong>Plano ${planName}</strong>.
                    </p>

                    <!-- Box com detalhes do plano -->
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

                    ${isNewUser ? `
                    <!-- Credenciais de acesso (apenas para novos usuários) -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 18px;">🔐 Suas Credenciais de Acesso</h3>
                          <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 10px 0;">
                            <strong>Email:</strong> ${email}
                          </p>
                          <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 10px 0;">
                            <strong>Senha temporária:</strong> <code style="background-color: #fef3c7; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px; color: #92400e;">${temporaryPassword}</code>
                          </p>
                          <p style="color: #dc2626; font-size: 13px; line-height: 1.6; margin: 15px 0 0 0;">
                            ⚠️ <strong>IMPORTANTE:</strong> Altere sua senha no primeiro acesso!
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Próximos passos -->
                    <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">🚀 Próximos Passos:</h3>
                    <ol style="color: #666666; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                      <li>Acesse a área de cliente clicando no botão abaixo</li>
                      <li>${isNewUser ? 'Faça login com as credenciais fornecidas acima' : 'Faça login com seu email e senha'}</li>
                      <li>${isNewUser ? 'Complete seu cadastro com CPF e telefone' : 'Aproveite todos os benefícios do seu plano!'}</li>
                      ${isNewUser ? '<li>Altere sua senha temporária por uma senha segura</li>' : ''}
                    </ol>

                    <!-- Botão de ação -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${siteUrl}/auth" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
                            Acessar Área de Cliente
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                      Precisa de ajuda? Responda este email ou entre em contato conosco.
                    </p>

                    ${isNewUser ? `
                    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0; padding: 15px; background-color: #f9fafb; border-radius: 6px;">
                      💡 <strong>Dica:</strong> Se você não receber este email na sua caixa de entrada, verifique sua pasta de spam ou lixo eletrônico.
                    </p>
                    ` : ''}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 12px 12px;">
                    <p style="color: #999999; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} Corre Mais. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    logStep("Sending email via Resend");

    // Enviar email via Resend
    const emailResponse = await resend.emails.send({
      from: "Corre Mais <onboarding@resend.dev>",
      to: [email],
      subject: `✅ Pagamento Confirmado - Plano ${planName}`,
      html: emailHtml,
    });

    logStep("Email sent successfully", { messageId: emailResponse.id });

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR sending email", { 
      message: error.message, 
      stack: error.stack 
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
