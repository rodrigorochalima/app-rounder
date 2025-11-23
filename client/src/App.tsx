import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import RoundGemini from "./pages/RoundGemini";
import RoundGroq from "./pages/RoundGroq";
import RoundGroqPaste from "./pages/RoundGroqPaste";
import RoundOpenAI from "./pages/RoundOpenAI";
import RoundCerebrasGemini from "./pages/RoundCerebrasGemini";
import AdminPanel from "./pages/AdminPanel";
import AuthPage from "./pages/AuthPage";
import APIKeysPage from "./pages/APIKeysPage";

function Router() {
  const base = import.meta.env.BASE_URL;
  return (
    <WouterRouter base={base}>
    <Switch>
      <Route path={"/"} component={RoundCerebrasGemini} />
      <Route path={"/auth"} component={AuthPage} />
      <Route path={"/api-keys"} component={APIKeysPage} />
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/openai"} component={RoundOpenAI} />
      <Route path={"/paste"} component={RoundGroqPaste} />
      <Route path={"/upload"} component={RoundGroq} />
      <Route path={"/gemini"} component={RoundGemini} />
      <Route path={"/whatsapp"} component={Home} />
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
