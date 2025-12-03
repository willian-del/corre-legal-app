import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getLevelName, getLevelImage } from '@/lib/referral-levels';
import { useConfetti } from '@/hooks/use-confetti';

interface LevelUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newLevel: number;
}

export const LevelUpDialog = ({
  open,
  onOpenChange,
  newLevel,
}: LevelUpDialogProps) => {
  const { fireConfetti } = useConfetti();

  useEffect(() => {
    if (open) {
      // Fire confetti when dialog opens
      setTimeout(() => {
        fireConfetti();
      }, 300);
    }
  }, [open, fireConfetti]);

  const levelName = getLevelName(newLevel);
  const levelImage = getLevelImage(newLevel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-none bg-gradient-to-br from-primary/20 via-background to-accent/20">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-4xl"
              >
                🔥
              </motion.div>

              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-center"
              >
                Parabéns!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-center"
              >
                Você subiu para o nível
              </motion.p>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <img
                  src={levelImage}
                  alt={levelName}
                  className="w-40 h-40 object-contain relative z-10"
                />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-xl font-bold text-primary text-center"
              >
                {levelName}
              </motion.h3>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <Button onClick={() => onOpenChange(false)} className="mt-4">
                  Continuar
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
