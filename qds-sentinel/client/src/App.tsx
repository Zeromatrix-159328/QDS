import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import NotificationCenterDrawer from "./components/NotificationCenterDrawer";

import { SentinelProvider } from "./lib/SentinelContext";

const getBase = () => {
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    if (pathname.toLowerCase().startsWith("/qds")) {
      return "/QDS";
    }
  }
  return "";
};

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Component />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <SentinelProvider>
              <Toaster />
              <WouterRouter base={getBase()}>
                <NotificationCenterDrawer />
                <Switch>
                  <Route path="/login" component={LoginPage} />
                  <Route path="/" component={Home} />
                  <Route path="/home" component={Home} />
                  <Route path="/demonstration" component={() => <ProtectedRoute component={Home} />} />
                  <Route path="/monitoring" component={() => <ProtectedRoute component={Home} />} />
                  <Route path="/attack-sandbox" component={() => <ProtectedRoute component={Home} />} />
                  <Route path="/transfer" component={() => <ProtectedRoute component={Home} />} />
                  <Route path="/database" component={() => <ProtectedRoute component={Home} />} />
                  <Route path="/chat" component={() => <ProtectedRoute component={ChatPage} />} />
                  <Route path="/404" component={NotFound} />
                  <Route component={NotFound} />
                </Switch>
              </WouterRouter>
            </SentinelProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
