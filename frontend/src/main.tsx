import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

import { App } from "./App";
import { ToastProvider } from "./contexts/ToastContext";
import { DialogProvider } from "./contexts/DialogContext";
import { queryClient } from "./lib/queryClient";
import { useThemeStore } from "./store/themeStore";
import "./index.css";

useThemeStore.getState();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <DialogProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <App />
          </BrowserRouter>
        </DialogProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
