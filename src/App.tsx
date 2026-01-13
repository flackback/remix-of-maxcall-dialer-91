import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Campaigns from "./pages/Campaigns";
import Agents from "./pages/Agents";
import Queues from "./pages/Queues";
import AgentConsole from "./pages/AgentConsole";
import Reports from "./pages/Reports";
import QA from "./pages/QA";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import Supervisor from "./pages/Supervisor";
import Telephony from "./pages/Telephony";
import CallerIdManagement from "./pages/CallerIdManagement";
import Conference from "./pages/Conference";
import AMD from "./pages/AMD";
import Dialer from "./pages/Dialer";
import CallAnalysis from "./pages/CallAnalysis";
import Documentation from "./pages/Documentation";
import AIAgents from "./pages/AIAgents";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Index />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/queues" element={<Queues />} />
                  <Route path="/agent-console" element={<AgentConsole />} />
                  <Route path="/agent" element={<Navigate to="/agent-console" replace />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/qa" element={<QA />} />
                  <Route path="/integrations" element={<Integrations />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/supervisor" element={<Supervisor />} />
                  <Route path="/telephony" element={<Telephony />} />
                  <Route path="/caller-id" element={<CallerIdManagement />} />
                  <Route path="/conference" element={<Conference />} />
                  <Route path="/amd" element={<AMD />} />
                  <Route path="/dialer" element={<Dialer />} />
                  <Route path="/call-analysis" element={<CallAnalysis />} />
                  <Route path="/ai-agents" element={<AIAgents />} />
                  <Route path="/docs" element={<Documentation />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
