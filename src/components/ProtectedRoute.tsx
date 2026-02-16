import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Shield className="h-12 w-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
