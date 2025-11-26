import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PartyPopper, MessageSquare, UserCircle, Rocket, ChevronRight } from "lucide-react";
import Logo from "@/components/Logo";
import { useConfetti } from "@/hooks/use-confetti";
import { markWelcomeAsSeen } from "@/lib/profile-utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const welcomeSteps = [
  {
    icon: PartyPopper,
    title: "Bem-vindo ao Corre Legal!",
    description: "Você agora faz parte da maior comunidade de proteção jurídica para entregadores",
    color: "text-primary",
  },
  {
    icon: MessageSquare,
    title: "Atendimento via WhatsApp",
    description: "Para iniciar um atendimento, basta contratar um plano e clicar no botão 'Iniciar Atendimento'",
    color: "text-emerald-500",
  },
  {
    icon: UserCircle,
    title: "Sua área exclusiva",
    description: "No 'Meu Corre' você gerencia seu plano, atualiza dados e acompanha tudo",
    color: "text-cyan-500",
  },
  {
    icon: Rocket,
    title: "Pronto para começar!",
    description: "Contrate seu plano e tenha acesso imediato a toda nossa rede de proteção",
    color: "text-purple-500",
  },
];

export default function Welcome() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();
  const { celebrate } = useConfetti();
  const { user } = useAuth();

  const currentStepData = welcomeSteps[currentStep];
  const isLastStep = currentStep === welcomeSteps.length - 1;
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = async () => {
    if (user) {
      setIsCompleting(true);
      await markWelcomeAsSeen(user.id);
      navigate("/meu-corre");
    }
  };

  const handleComplete = async () => {
    if (user) {
      setIsCompleting(true);
      celebrate();
      
      await markWelcomeAsSeen(user.id);
      
      toast.success("Bem-vindo! Vamos começar essa jornada juntos! 🚀");
      
      setTimeout(() => {
        navigate("/meu-corre");
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card" />
      
      <div className="w-full max-w-2xl relative z-10">
        <div className="flex justify-center mb-8 animate-in fade-in duration-500">
          <Logo size={80} />
        </div>

        <Card className="bg-card border border-border rounded-2xl shadow-elevated p-8 md:p-12 animate-in fade-in duration-700">
          <div className="text-center space-y-8">
            {/* Ícone animado */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className={`relative bg-card border-2 border-primary rounded-full p-6 ${currentStepData.color}`}>
                  <Icon className="h-16 w-16" />
                </div>
              </div>
            </div>

            {/* Conteúdo do step */}
            <div className="space-y-4 min-h-[200px] flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground animate-in fade-in duration-500">
                {currentStepData.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto animate-in fade-in duration-500 delay-100">
                {currentStepData.description}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 pt-4">
              {welcomeSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? "w-8 bg-primary"
                      : index < currentStep
                        ? "w-2 bg-primary/50"
                        : "w-2 bg-muted"
                  }`}
                  aria-label={`Ir para passo ${index + 1}`}
                />
              ))}
            </div>

            {/* Botões de navegação */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isCompleting}
                className="flex-1"
              >
                Pular
              </Button>
              <Button
                onClick={handleNext}
                disabled={isCompleting}
                className="flex-1 group"
              >
                {isCompleting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Aguarde...
                  </div>
                ) : isLastStep ? (
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    Começar a usar
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Próximo
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </Button>
            </div>

            {/* Contador de passos */}
            <p className="text-sm text-muted-foreground pt-4">
              Passo {currentStep + 1} de {welcomeSteps.length}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
