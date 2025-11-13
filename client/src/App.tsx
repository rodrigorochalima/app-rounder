import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import RoundGemini from "./pages/RoundGemini";
import RoundGroq from "./pages/RoundGroq";
import RoundGroqPaste from "./pages/RoundGroqPaste";

function Router() {
  const base = import.meta.env.BASE_URL;
  return (
    <WouterRouter base={base}>
    <Switch>
      <Route path={"/"} component={RoundGroqPaste} />
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
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
