import "@app/styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "@app/App";
import "@shared/config/i18n";
import store from "@app/store";
import { Provider } from "react-redux";
import { applyAuthHandoffFromUrl } from "@shared/lib/crossAppAuth";
import { installErrorCapture } from "@shared/lib/errorLog";

// Токены из основного приложения нужно принять до первого рендера
applyAuthHandoffFromUrl();
// Журнал ошибок: обрывы связи, ошибки скриптов (Помощь → Журнал ошибок)
installErrorCapture();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
