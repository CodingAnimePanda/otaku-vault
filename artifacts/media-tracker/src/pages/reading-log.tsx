import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SignIn, SignUp, useAuth } from "@clerk/clerk-react";
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
import FriendsPage from "@/pages/friends";
import ReviewsPage from "@/pages/reviews";
import StatsPage from "@/pages/stats";
import ReadingLogPage from "@/pages/reading-log";

const queryClient = new QueryClient();

function ProtectedRouter() {
  const { isLoaded, isSignedIn } = useAuth();
  const [location] = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (location === "/sign-in" || location.startsWith("/sign-in") || location === "/sign-up" || location.startsWith("/sign-up")) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        {location.startsWith("/sign-in") ? (
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/" />
        ) : (
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/" />
        )}
      </div>
    );
  }

  if (!isSignedIn) return <Redirect to="/sign-in" />;

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
        <Route path="/friends" component={FriendsPage} />
        <Route path="/reviews" component={ReviewsPage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/reading-log" component={ReadingLogPage} />
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
          <ProtectedRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;