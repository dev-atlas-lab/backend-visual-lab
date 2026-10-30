import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Layers, Moon, Sun, Terminal, CheckCircle2 } from "lucide-react";

export function AppShell() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const stored = localStorage.getItem("bvl.theme");
      return stored === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-theme-preference", theme);
    try {
      localStorage.setItem("bvl.theme", theme);
    } catch {
      // Ignored
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand-lockup">
          <Layers size={22} color="var(--accent-primary)" />
          <span>Backend Visual Lab</span>
          <span className="brand-badge">Antigravity Edition</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Catalog
          </NavLink>
          <NavLink
            to="/domains/messaging/kafka-consumer-groups-rebalance"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Kafka Lab
          </NavLink>
          <NavLink
            to="/domains/caching/redis-cache-stampede-ttl"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Redis Lab
          </NavLink>
          <NavLink
            to="/domains/databases/postgres-btree-mvcc-visibility"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            PostgreSQL Lab
          </NavLink>
          <NavLink
            to="/progress"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Progress
          </NavLink>

          <button
            onClick={toggleTheme}
            className="btn"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <p>
          Backend Visual Lab — Dev Atlas Lab (
          <a href="https://github.com/dev-atlas-lab/backend-visual-lab" target="_blank" rel="noreferrer">
            GitHub
          </a>
          ). 7-Stage Engineering Pedagogy &bull; Deterministic Browser Simulations &bull; Spring Boot Sandbox.
        </p>
      </footer>
    </div>
  );
}
