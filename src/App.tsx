import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tools from "./pages/Tools";
import Requests from "./pages/Requests";
import Vendors from "./pages/Vendors";
import Compliance from "./pages/Compliance";
import Maturity from "./pages/Maturity";
import Admin from "./pages/Admin";
import Report from "./pages/Report";
import ReportsHistory from "./pages/ReportsHistory";
import CompliancePlan from "./pages/CompliancePlan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/tools" element={<ProtectedRoute><AppLayout><Tools /></AppLayout></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><AppLayout><Requests /></AppLayout></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><AppLayout><Vendors /></AppLayout></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute><AppLayout><Compliance /></AppLayout></ProtectedRoute>} />
            <Route path="/maturity" element={<ProtectedRoute><AppLayout><Maturity /></AppLayout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AppLayout><Admin /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><AppLayout><ReportsHistory /></AppLayout></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute><AppLayout><Report /></AppLayout></ProtectedRoute>} />
            <Route path="/report/:id" element={<ProtectedRoute><AppLayout><Report /></AppLayout></ProtectedRoute>} />
            <Route path="/compliance/plans/:id" element={<ProtectedRoute><AppLayout><CompliancePlan /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
