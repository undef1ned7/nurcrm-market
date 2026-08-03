import "@app/styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "@app/App.jsx";
import "@shared/config/i18n";
import store from "@app/store";
import { Provider } from "react-redux";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
