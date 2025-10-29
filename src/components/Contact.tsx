import { MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const Contact = () => {
  const whatsappNumber = "5511999999999";
  const whatsappMessage = "Olá! Gostaria de saber mais sobre os serviços do Corre Legal.";

  const handleWhatsAppClick = () => {
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`,
      "_blank"
    );
  };

  return (
    <section id="contact" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Entre em <span className="text-primary">Contato</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Estamos prontos para atender você. Fale conosco via WhatsApp para um atendimento rápido e humanizado.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-card rounded-2xl p-8 border border-border">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">WhatsApp</h3>
                  <p className="text-muted-foreground mb-4">Atendimento rápido e direto</p>
                  <Button
                    onClick={handleWhatsAppClick}
                    className="bg-primary text-primary-foreground hover:bg-primary-glow"
                  >
                    Iniciar Conversa
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">E-mail</h3>
                  <p className="text-muted-foreground">contato@correlegal.com.br</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">Telefone</h3>
                  <p className="text-muted-foreground">(11) 99999-9999</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-glow rounded-2xl p-8 md:p-12 text-center shadow-glow">
            <h3 className="text-3xl md:text-4xl font-bold mb-4 text-background">
              Pronto para ter apoio jurídico completo?
            </h3>
            <p className="text-lg text-background/90 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de motoristas e entregadores que já contam com a gente.
            </p>
            <Button
              onClick={handleWhatsAppClick}
              size="lg"
              variant="secondary"
              className="bg-background text-foreground hover:bg-background/90 text-lg px-8 py-6"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Contrate Agora pelo WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
