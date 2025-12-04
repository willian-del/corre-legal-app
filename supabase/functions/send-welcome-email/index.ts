import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();
    
    if (!email) {
      console.error("Missing email in request");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const firstName = name?.split(' ')[0] || 'Parceiro';
    console.log(`Sending welcome email to ${email} (${firstName})`);

    const emailResponse = await resend.emails.send({
      from: "Corre Legal <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 Bem-vindo ao Corre Legal!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">Corre Legal</h1>
            <p style="color: #6b7280; margin-top: 5px;">Proteção jurídica para quem faz o corre</p>
          </div>
          
          <h2 style="color: #1f2937; font-size: 22px;">Fala, ${firstName}! 👋</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Seja muito bem-vindo(a) ao <strong>Corre Legal</strong>!
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Agora você faz parte da comunidade que protege quem faz o corre acontecer. 
            Estamos aqui para te ajudar com:
          </p>
          
          <ul style="color: #4b5563; font-size: 16px; line-height: 1.8; padding-left: 20px;">
            <li>✅ Bloqueios injustos em apps</li>
            <li>✅ Problemas com multas de trânsito</li>
            <li>✅ Questões trabalhistas e acidentes</li>
            <li>✅ Compras e golpes online</li>
            <li>✅ E muito mais!</li>
          </ul>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <p style="color: #1f2937; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">📋 Próximos passos:</p>
            <ol style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Complete o tour de boas-vindas</li>
              <li>Escolha seu plano de proteção</li>
              <li>Comece a usar nossos serviços!</li>
            </ol>
          </div>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Qualquer dúvida, é só chamar no WhatsApp ou abrir um chamado na plataforma.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #1f2937; font-size: 16px; margin: 0;">
              <strong>Bora pro corre! 🚀</strong><br>
              <span style="color: #6b7280;">Equipe Corre Legal</span>
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Corre Legal. Todos os direitos reservados.</p>
          </div>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, id: emailResponse.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
