import { useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Menu, Sun, Moon, Volume2, VolumeX, Keyboard, Search, X } from "lucide-react";
import { isSoundEnabled, toggleSound, playClick } from "../../engines/audio/sound-fx";

interface TopbarProps {
  navOpen: boolean;
  onOpenNav: () => void;
  toggleButtonRef: RefObject<HTMLButtonElement | null>;
  breadcrumbPrefix?: string;
  breadcrumbCurrent?: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenCommandPalette?: () => void;
}

export function Topbar({
  navOpen,
  onOpenNav,
  toggleButtonRef,
  breadcrumbPrefix = "Backend Visual Lab",
  breadcrumbCurrent = "Catalog & Roadmap",
  theme,
  onToggleTheme,
  onOpenCommandPalette,
}: TopbarProps) {
  const [soundActive, setSoundActive] = useState(() => isSoundEnabled());
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundActive(next);
  };

  const handleOpenShortcuts = () => {
    playClick();
    setShowShortcutsModal(true);
  };

  return (
    <header className="topbar">
      <div className="topbar-start">
        <button
          ref={toggleButtonRef}
          type="button"
          className="icon-button nav-toggle"
          aria-label="Open navigation"
          title="Toggle navigation sidebar (Open / Collapse)"
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
        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            className="topbar-search-trigger"
            onClick={onOpenCommandPalette}
            title="Open Command Palette (Cmd+K / Ctrl+K)"
          >
            <Search size={14} aria-hidden="true" />
            <span className="topbar-search-text">Search Labs...</span>
            <kbd className="topbar-search-kbd">⌘K</kbd>
          </button>
        )}

        {/* Engine mode pill */}
        <div className="engine-badge" title="Executing in Deterministic Client-side Browser Engine">
          <span className="engine-dot" aria-hidden="true" />
          <span className="engine-text">Simulation Mode: Offline</span>
        </div>

        {/* Keyboard Shortcuts Button */}
        <button
          type="button"
          className="icon-button"
          onClick={handleOpenShortcuts}
          aria-label="Keyboard Shortcuts"
          title="Keyboard Shortcuts (Space, R, P, F, 1-3)"
        >
          <Keyboard size={16} strokeWidth={1.8} />
        </button>

        {/* Sound FX Toggle Button */}
        <button
          type="button"
          className="icon-button"
          onClick={handleToggleSound}
          aria-label={soundActive ? "Mute audio feedback" : "Enable audio feedback"}
          title={soundActive ? "Audio Feedback: ON (Click to Mute)" : "Audio Feedback: OFF (Click to Enable)"}
        >
          {soundActive ? (
            <Volume2 size={16} strokeWidth={1.8} color="var(--accent)" />
          ) : (
            <VolumeX size={16} strokeWidth={1.8} />
          )}
        </button>

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

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard Shortcuts"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: "var(--space-4)",
          }}
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            style={{
              backgroundColor: "var(--surface-1)",
              border: "1px solid var(--border-bold)",
              borderRadius: "var(--radius-xl)",
              maxWidth: "480px",
              width: "100%",
              padding: "var(--space-6)",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--space-4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Keyboard size={20} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700 }}>
                  Engineering Shortcuts HUD
                </h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowShortcutsModal(false)}
                aria-label="Close shortcuts modal"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
              Control any active simulation workbench using your keyboard like a native desktop observability cockpit:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {[
                { key: "Space", desc: "Step forward 1 tick in current simulation" },
                { key: "P", desc: "Play / Pause automatic tick stepping" },
                { key: "R", desc: "Reset simulation to initial state (Tick 1)" },
                { key: "F", desc: "Toggle Fullscreen Focus Lab Mode" },
                { key: "1 - 3", desc: "Instantly switch scenario fault presets" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: "var(--surface-2)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                    {item.desc}
                  </span>
                  <kbd
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      backgroundColor: "var(--surface-1)",
                      border: "1px solid var(--border-bold)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-xs)",
                      color: "var(--accent-strong)",
                    }}
                  >
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
