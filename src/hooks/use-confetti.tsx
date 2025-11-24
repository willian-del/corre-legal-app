import { useCallback } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  disableForReducedMotion?: boolean;
}

export const useConfetti = () => {
  const fireConfetti = useCallback((options: ConfettiOptions = {}) => {
    // Respeitar preferência de animação reduzida
    if (
      options.disableForReducedMotion !== false &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const defaults = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      ...options,
    };

    confetti(defaults);
  }, []);

  // Celebração completa (múltiplos disparos)
  const celebrate = useCallback(() => {
    // Respeitar preferência de animação reduzida
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    
    const colors = ['#10b981', '#22c55e', '#34d399']; // Cores primary/green

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    // Explosão inicial do centro
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
    });

    // Continuar com confete dos lados
    frame();
  }, []);

  return { fireConfetti, celebrate };
};
