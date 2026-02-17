import { motion } from "framer-motion";

export default function AudioWaveform({ active }: { active: boolean }) {
  const barCount = 32;

  return (
    <div className="flex items-center justify-center gap-[2px] h-12 px-4">
      {Array.from({ length: barCount }).map((_, i) => {
        const baseDelay = i * 0.05;
        const baseDuration = 0.35 + Math.random() * 0.3;

        return (
          <motion.div
            key={i}
            className="w-[2.5px] rounded-full bg-primary/80"
            animate={
              active
                ? {
                    scaleY: [0.3, 0.6 + Math.random() * 0.4, 0.3],
                    opacity: [0.5, 1, 0.5],
                  }
                : { scaleY: 0.15, opacity: 0.2 }
            }
            transition={
              active
                ? {
                    duration: baseDuration,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: baseDelay,
                    ease: "easeInOut",
                  }
                : { duration: 0.4 }
            }
            style={{
              height: 40,
              transformOrigin: "center",
            }}
          />
        );
      })}
    </div>
  );
}
