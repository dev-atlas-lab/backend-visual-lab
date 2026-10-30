import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { CatalogPage } from "./pages/CatalogPage";
import { ModuleReaderPage } from "./pages/ModuleReaderPage";
import { ProgressPage } from "./pages/ProgressPage";

import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/workbench.css";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<CatalogPage />} />
          <Route path="domains/:domainId/:moduleSlug" element={<ModuleReaderPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <AppRouter />,
  );
}
