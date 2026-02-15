import { motion } from "framer-motion";

interface TrustGaugeProps {
  score: number;
}

const TrustGauge = ({ score }: TrustGaugeProps) => {
  const radius = 70;
  const circumference = Math.PI * radius; // half circle
  const progress = (score / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 70) return "hsl(142 71% 45%)";
    if (s >= 40) return "hsl(48 96% 53%)";
    return "hsl(0 84% 60%)";
  };

  return (
    <svg width="180" height="100" viewBox="0 0 180 100">
      {/* Background arc */}
      <path
        d="M 10 90 A 70 70 0 0 1 170 90"
        fill="none"
        stroke="hsl(220 15% 16%)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Score arc */}
      <motion.path
        d="M 10 90 A 70 70 0 0 1 170 90"
        fill="none"
        stroke={getColor(score)}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - progress }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
  );
};

export default TrustGauge;
