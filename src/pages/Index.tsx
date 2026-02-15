import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Search, ChevronRight } from "lucide-react";
import ScanningAnimation from "@/components/ScanningAnimation";

const Index = () => {
  const [query, setQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = useCallback(() => {
    if (!query.trim()) return;
    setIsScanning(true);
    // TODO: trigger backend scan, then navigate to report
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleScan();
  };

  return (
    <>
      <AnimatePresence>
        {isScanning && (
          <ScanningAnimation
            serviceName={query}
            onComplete={() => setIsScanning(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background grid-bg">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />

        {/* Logo & Branding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 glow-blue">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
              Aegis <span className="text-gradient-blue">Insight</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-md text-center leading-relaxed">
            AI Security Intelligence. Deep-scan any AI service for vulnerabilities, bias, and competitive context.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-xl px-4"
        >
          <div className="glass-card glow-blue-strong p-1.5 flex items-center gap-2">
            <div className="pl-3">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter an AI service (e.g., OpenAI Sora, Midjourney...)"
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm py-3 px-2 font-mono"
            />
            <button
              onClick={handleScan}
              disabled={!query.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Scan
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex items-center gap-2 mt-4 justify-center flex-wrap">
            <span className="text-xs text-muted-foreground">Try:</span>
            {["ChatGPT", "Midjourney", "Claude", "Gemini"].map((name) => (
              <button
                key={name}
                onClick={() => setQuery(name)}
                className="text-xs px-3 py-1 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="absolute bottom-8 text-center"
        >
          <p className="text-xs text-muted-foreground">
            Powered by <span className="text-foreground font-medium">clarier.ai</span>
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default Index;
