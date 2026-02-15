import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Terminal } from "lucide-react";

const SCAN_MESSAGES = [
  { text: "Initializing intelligence pipeline...", delay: 0 },
  { text: "Accessing arXiv research papers...", delay: 800 },
  { text: "Querying CVE vulnerability databases...", delay: 1800 },
  { text: "Scanning compliance & regulatory filings...", delay: 2800 },
  { text: "Analyzing market sentiment reports...", delay: 3800 },
  { text: "Cross-referencing competitor data...", delay: 4800 },
  { text: "Running bias & fairness assessments...", delay: 5800 },
  { text: "Synthesizing intelligence report...", delay: 6800 },
];

interface ScanningAnimationProps {
  serviceName: string;
  onComplete?: () => void;
}

const ScanningAnimation = ({ serviceName, onComplete }: ScanningAnimationProps) => {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    SCAN_MESSAGES.forEach((msg, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), msg.delay));
    });

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1.2;
      });
    }, 80);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background grid-bg"
    >
      {/* Pulsing shield icon */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mb-8"
      >
        <Shield className="h-16 w-16 text-primary" />
      </motion.div>

      <h2 className="font-display text-2xl font-bold text-foreground mb-2">
        Scanning <span className="text-gradient-blue">{serviceName}</span>
      </h2>
      <p className="text-muted-foreground text-sm mb-8">Deep intelligence analysis in progress</p>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-8 px-4">
        <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
        <p className="text-right text-xs text-muted-foreground font-mono mt-1">
          {Math.min(Math.round(progress), 100)}%
        </p>
      </div>

      {/* Terminal log */}
      <div className="glass-card w-full max-w-lg p-4 mx-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs text-muted-foreground">security-scan.log</span>
        </div>
        <div className="space-y-1.5 font-mono text-xs min-h-[200px]">
          <AnimatePresence>
            {SCAN_MESSAGES.slice(0, visibleLines).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-2"
              >
                <span className="text-primary shrink-0">▸</span>
                <span className="text-muted-foreground">{msg.text}</span>
                {i < visibleLines - 1 && (
                  <span className="ml-auto shrink-0" style={{ color: "hsl(142 71% 45%)" }}>✓</span>
                )}
                {i === visibleLines - 1 && (
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="ml-auto text-primary shrink-0"
                  >
                    ●
                  </motion.span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ScanningAnimation;
