import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DeskProvider } from "./lib/store";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DeskProvider>
      <App />
    </DeskProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A PWA that can't install is still a working web app; failing quietly
      // here matters more than surfacing it to a user who can't act on it.
    });
  });
}
