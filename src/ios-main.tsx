import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SaleesApp } from "./components/salees-app";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing root");

createRoot(root).render(
  <StrictMode>
    <SaleesApp />
  </StrictMode>,
);
