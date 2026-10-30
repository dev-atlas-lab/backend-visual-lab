import type { RefObject } from "react";
import { Link } from "react-router-dom";
import { Menu, Sun, Moon } from "lucide-react";

interface TopbarProps {
  navOpen: boolean;
  onOpenNav: () => void;
  toggleButtonRef: RefObject<HTMLButtonElement | null>;
  breadcrumbPrefix?: string;
  breadcrumbCurrent?: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function Topbar({
  navOpen,
  onOpenNav,
  toggleButtonRef,
  breadcrumbPrefix = "Backend Visual Lab",
  breadcrumbCurrent = "Catalog & Roadmap",
  theme,
  onToggleTheme,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-start">
        <button
          ref={toggleButtonRef}
          type="button"
          className="icon-button nav-toggle"
          aria-label="Open navigation"
          aria-expanded={navOpen}
          aria-controls="primary-navigation"
          onClick={onOpenNav}
        >
          <Menu size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <Link to="/" className="topbar-mark-link">
          <img
            className="topbar-mark"
            src="/brand/app-icon.svg"
            alt="Dev Atlas Lab"
            width={26}
            height={26}
            decoding="async"
          />
        </Link>

        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-prefix">
            {breadcrumbPrefix}
          </Link>
          <span className="breadcrumb-sep" aria-hidden="true">
            /
          </span>
          <span className="breadcrumb-current">{breadcrumbCurrent}</span>
        </nav>
      </div>

      <div className="topbar-end">
        {/* Engine mode pill */}
        <div className="engine-badge" title="Executing in Deterministic Client-side Browser Engine">
          <span className="engine-dot" aria-hidden="true" />
          <span className="engine-text">Simulation Mode: Offline</span>
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com/dev-atlas-lab/backend-visual-lab"
          target="_blank"
          rel="noreferrer"
          className="icon-button"
          aria-label="Open GitHub Repository"
          title="Open GitHub Repository"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </a>

        {/* Theme switcher */}
        <button
          type="button"
          className="icon-button theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? (
            <Sun size={16} strokeWidth={1.8} />
          ) : (
            <Moon size={16} strokeWidth={1.8} />
          )}
        </button>
      </div>
    </header>
  );
}
