// artifacts/media-tracker/src/App.tsx
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import TierList from "@/pages/tier-list";
import Recommendations from "@/pages/recommendations";
import ToRead from "@/pages/to-read";
import ToWatch from "@/pages/to-watch";
import Avoid from "@/pages/avoid";
import BLVault from "@/pages/bl-vault";
import NormiePage from "@/pages/normie";
import MomentsPage from "@/pages/moments";
import QuotesPage from "@/pages/quotes";

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();

  const isNormiePage = location.startsWith("/normie");

  if (isNormiePage) {
    return (
      <Switch>
        <Route path="/normie" component={NormiePage} />
        <Route path="/normie/tierlist/:type" component={NormiePage} />
        <Route path="/normie/recommended" component={NormiePage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tierlist/:category" component={TierList} />
        <Route path="/recommended" component={Recommendations} />
        <Route path="/to-read" component={ToRead} />
        <Route path="/to-watch" component={ToWatch} />
        <Route path="/avoid" component={Avoid} />
        <Route path="/bl-vault" component={BLVault} />
        <Route path="/moments" component={MomentsPage} />
        <Route path="/quotes" component={QuotesPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;