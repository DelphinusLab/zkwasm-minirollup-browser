import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { setProviderConfig, validateEnvConfig } from 'zkwasm-minirollup-browser';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Footer from "@/components/layout/Footer";

// Validate environment configuration
const validation = validateEnvConfig();
if (!validation.isValid) {
  console.warn('Environment validation failed:', validation.errors);
  console.warn('Please ensure all required environment variables are set');
}

// Configure the provider before using DelphinusReactProvider
setProviderConfig({ type: 'rainbow' });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in newer versions)
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Footer />
      </TooltipProvider>
    </QueryClientProvider>
);

export default App;
