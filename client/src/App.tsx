import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import RoundCerebrasGemini from "./pages/RoundCerebrasGemini";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import LegalPage from "./pages/LegalPage";
import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  const base = import.meta.env.BASE_URL;
  return (
    <WouterRouter base={base}>
    <Switch>
      {/* Rotas públicas (sem proteção) */}
      <Route path={"/auth"} component={AuthPage} />
      <Route path={"/auth/reset-password"} component={ResetPassword} />
      <Route path={"/auth/callback"} component={AuthCallbackPage} />
      <Route path={"/legal/terms"} component={() => <LegalPage document="terms" />} />
      <Route path={"/legal/privacy"} component={() => <LegalPage document="privacy" />} />
      <Route path={"/legal/clinical-ai"} component={() => <LegalPage document="clinical-ai" />} />
      
      {/* Rotas protegidas (requerem autenticação) */}
      <Route path={""} component={() => (
        <ProtectedRoute>
          <RoundCerebrasGemini />
        </ProtectedRoute>
      )} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
    </WouterRouter>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider
          defaultTheme="light"
          switchable
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
