import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// O Share Target e a experiência offline dependem de um worker efetivamente
// registrado na aplicação ativa. Falhas não impedem a utilização normal online.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.warn('Não foi possível registrar os recursos PWA:', error);
    });
  });
}
