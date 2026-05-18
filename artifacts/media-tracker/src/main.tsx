import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) setBaseUrl(apiUrl);

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

// Inner component so we can use the useAuth hook inside ClerkProvider
function AuthTokenSync() {
  const { getToken } = useAuth();
  setAuthTokenGetter(() => getToken());
  return null;
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey}>
    <AuthTokenSync />
    <App />
  </ClerkProvider>
);