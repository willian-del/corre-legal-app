import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PartyPopper, MessageSquare, UserCircle, Rocket, ChevronRight, ChevronLeft, HeartHandshake, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { useConfetti } from "@/hooks/use-confetti";
import { markWelcomeAsSeen } from "@/lib/profile-utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const welcomeSteps = [
  {
    icon: PartyPopper,
    title: "Bem-vindo ao Corre Legal!",
    description: "Você agora faz parte da maior comunidade de proteção jurídica para entregadores e para motoristas de aplicativo.",
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
    title: "Quanto mais detalhes, melhor!",
    description: "Nos conte a sua dúvida ou descreva o seu problema. Não esqueça os detalhes: quando, como, onde e com quem?",
    color: "text-cyan-500",
  },
  {
    icon: HeartHandshake,
    title: "Estamos cuidando de você!",
    description: "Um de nossos especialistas entrará em contato com orientações sobre a sua dúvida ou problema. E fique tranquilo, que a partir de agora nós estamos cuidando de você.",
    color: "text-rose-500",
  },
  {
    icon: ShieldCheck,
    title: "Transparência e segurança para você!",
    description: "Caso nosso advogado identifique potencial para uma ação, os honorários serão negociados diretamente com você.",
    color: "text-amber-500",
  },
  {
    icon: Rocket,
    title: "Pronto para começar!",
    description: "Contrate seu plano e tenha acesso imediato a toda nossa rede de proteção",
    color: "text-purple-500",
  },
];

// Variantes de animação para transição entre steps
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.9,
    rotateY: direction > 0 ? 30 : -30,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.9,
    rotateY: direction < 0 ? 30 : -30,
  }),
};

// Variantes para o ícone com spring bounce
const iconVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: { 
    scale: 1, 
    rotate: 0,
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 200, 
      damping: 15,
      delay: 0.1
    }
  },
  exit: { scale: 0, rotate: 180, opacity: 0, transition: { duration: 0.2 } }
};

// Variantes para o pulse do background do ícone
const pulseVariants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Variantes para texto com stagger
const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

// Constantes para detectar swipe
const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export default function Welcome() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
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
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleDragEnd = (
    e: MouseEvent | TouchEvent | PointerEvent,
    { offset, velocity }: PanInfo
  ) => {
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      // Swipe para a esquerda → próximo step
      if (!isLastStep) {
        handleNext();
      }
    } else if (swipe > swipeConfidenceThreshold) {
      // Swipe para a direita → step anterior
      handlePrevious();
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

  const handleDotClick = (index: number) => {
    setDirection(index > currentStep ? 1 : -1);
    setCurrentStep(index);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 py-12 overflow-hidden">
      {/* Background animado com gradiente */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-background via-background to-card"
        animate={{ 
          backgroundPosition: ['0% 0%', '100% 100%']
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          repeatType: "reverse",
          ease: "linear"
        }}
      />
      
      <div className="w-full max-w-2xl relative z-10">
        <motion.div 
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Logo size={80} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-card border border-border rounded-2xl shadow-elevated p-8 md:p-12">
            <div className="text-center space-y-8">
              {/* Ícone animado com pulse */}
              <div className="flex justify-center">
                <div className="relative">
                  <motion.div 
                    className="absolute inset-0 bg-primary/20 rounded-full"
                    variants={pulseVariants}
                    animate="animate"
                  />
                  <motion.div 
                    className={`relative bg-card border-2 border-primary rounded-full p-6 ${currentStepData.color}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStep}
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        <Icon className="h-16 w-16" />
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>

              {/* Conteúdo do step com AnimatePresence */}
              <div className="space-y-4 min-h-[200px] flex flex-col justify-center">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={handleDragEnd}
                    transition={{ 
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.3 },
                      scale: { duration: 0.3 },
                      rotateY: { duration: 0.3 }
                    }}
                    className="space-y-4 cursor-grab active:cursor-grabbing"
                  >
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.h2 
                        variants={textVariants}
                        className="text-3xl md:text-4xl font-bold text-foreground"
                      >
                        {currentStepData.title}
                      </motion.h2>
                      <motion.p 
                        variants={textVariants}
                        className="text-lg text-muted-foreground max-w-lg mx-auto"
                      >
                        {currentStepData.description}
                      </motion.p>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress dots com layoutId morphing */}
              <div className="flex justify-center gap-2 pt-4">
                {welcomeSteps.map((_, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className="relative h-2 rounded-full transition-all duration-300"
                    style={{
                      width: index === currentStep ? 32 : 8,
                    }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label={`Ir para passo ${index + 1}`}
                  >
                    {index === currentStep ? (
                      <motion.div
                        layoutId="activeDot"
                        className="absolute inset-0 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    ) : (
                      <div 
                        className={`absolute inset-0 rounded-full ${
                          index < currentStep ? "bg-primary/50" : "bg-muted"
                        }`}
                      />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Botões de navegação com micro-interações */}
              <div className="flex flex-col sm:flex-row gap-4 pt-8">
                <motion.div
                  className="flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isCompleting}
                    className="w-full"
                  >
                    Pular
                  </Button>
                </motion.div>
                <motion.div
                  className="flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleNext}
                    disabled={isCompleting}
                    className="w-full group"
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
                        <motion.div
                          animate={{ x: [0, 3, 0] }}
                          transition={{ 
                            duration: 1, 
                            repeat: Infinity,
                            repeatType: "loop"
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </motion.div>
                      </div>
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Contador de passos */}
              <motion.p 
                className="text-sm text-muted-foreground pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Passo {currentStep + 1} de {welcomeSteps.length}
              </motion.p>

              {/* Indicador de swipe */}
              <motion.p 
                className="text-xs text-muted-foreground/50 pt-2 flex items-center justify-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <ChevronLeft className="h-3 w-3" />
                Deslize para navegar
                <ChevronRight className="h-3 w-3" />
              </motion.p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
