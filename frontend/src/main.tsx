import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { IdentityProvider } from "./state/identity";
import "katex/dist/katex.min.css";
import "./styles.css";

const client = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 10000 },
    mutations: { retry: false },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <IdentityProvider>
        <App />
      </IdentityProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
