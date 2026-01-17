import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Sessions from "./pages/Sessions";
import LiveMonitor from "./pages/LiveMonitor";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import VideoSources from "./pages/VideoSources";
import PhoneCamera from "./pages/PhoneCamera";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sessions" component={Sessions} />
      <Route path="/monitor/:sessionId" component={LiveMonitor} />
      <Route path="/analytics/:sessionId" component={Analytics} />
      <Route path="/analytics-overview" component={Analytics} />
      <Route path="/sources" component={VideoSources} />
      <Route path="/phone-camera" component={PhoneCamera} />
      <Route path="/team" component={Sessions} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
