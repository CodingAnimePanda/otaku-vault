import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import TierList from "@/pages/tier-list";
import Recommendations from "@/pages/recommendations";
import ToRead from "@/pages/to-read";
import Avoid from "@/pages/avoid";
import Updates from "@/pages/updates";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tierlist/:category" component={TierList} />
        <Route path="/recommended" component={Recommendations} />
        <Route path="/to-read" component={ToRead} />
        <Route path="/avoid" component={Avoid} />
        <Route path="/updates" component={Updates} />
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
