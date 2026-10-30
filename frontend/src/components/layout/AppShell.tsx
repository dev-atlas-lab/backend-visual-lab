import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { ErrorBoundary } from "./ErrorBoundary";
import { getModuleBySlug } from "../../content";

export function AppShell() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("bvl.sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

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

  const handleCloseSidebar = () => {
    setNavOpen(false);
    setSidebarCollapsed(true);
    try {
      localStorage.setItem("bvl.sidebar-collapsed", "true");
    } catch {
      // Ignored
    }
  };

  const handleOpenSidebar = () => {
    setNavOpen(true);
    setSidebarCollapsed(false);
    try {
      localStorage.setItem("bvl.sidebar-collapsed", "false");
    } catch {
      // Ignored
    }
  };

  // Close mobile drawer on navigation
  const handleNavigate = () => {
    setNavOpen(false);
  };

  // Mobile drawer keyboard focus trap and Escape handler
  useEffect(() => {
    if (!navOpen) return;

    wasOpenRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const sidebar = document.getElementById("primary-navigation");
      const focusable = Array.from(
        sidebar?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !navOpen) {
      wasOpenRef.current = false;
      toggleButtonRef.current?.focus();
    }
  }, [navOpen]);

  // Compute breadcrumbs
  const getBreadcrumb = () => {
    const pathname = location.pathname;
    if (pathname === "/" || pathname === "") {
      return { prefix: "Backend Visual Lab", current: "Catalog & Roadmap" };
    }
    if (pathname.startsWith("/progress")) {
      return { prefix: "Learning Dashboard", current: "Progress & Mastery" };
    }
    if (pathname.startsWith("/knowledge")) {
      return { prefix: "Knowledge Base", current: "Terms & Assessments" };
    }
    if (pathname.startsWith("/settings")) {
      return { prefix: "Workbench", current: "Settings & Preferences" };
    }
    if (pathname.includes("/domains/")) {
      const parts = pathname.split("/");
      const moduleSlug = parts[parts.length - 1];
      const domainId = parts[2];
      const mod = getModuleBySlug(moduleSlug);
      const domainName =
        domainId === "messaging"
          ? "Messaging & Streaming"
          : domainId === "databases"
          ? "Databases & Storage"
          : domainId === "caching"
          ? "Caching & Redis"
          : domainId === "java"
          ? "Java Core & JVM"
          : domainId;

      return {
        prefix: domainName,
        current: mod ? mod.title.split("—")[0].trim() : "Interactive Lab",
      };
    }
    return { prefix: "Backend Visual Lab", current: "Interactive Engineering" };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <div
      className={`app-shell ${navOpen ? "nav-is-open" : ""} ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      {/* Sidebar Drawer Backdrop (Mobile only) */}
      {navOpen && (
        <div
          className="drawer-backdrop"
          onClick={handleCloseSidebar}
          aria-hidden="true"
        />
      )}

      {/* Primary Sidebar */}
      <Sidebar
        onClose={handleCloseSidebar}
        onNavigate={handleNavigate}
        closeButtonRef={closeButtonRef}
      />

      {/* Main Content Scaffold */}
      <div className="app-main">
        <Topbar
          navOpen={navOpen || !sidebarCollapsed}
          onOpenNav={handleOpenSidebar}
          toggleButtonRef={toggleButtonRef}
          breadcrumbPrefix={breadcrumb.prefix}
          breadcrumbCurrent={breadcrumb.current}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenCommandPalette={() => setCmdPaletteOpen(true)}
        />

        <main className="main-content" id="main-content">
          <ErrorBoundary>
            <Outlet context={{ theme, onToggleTheme: toggleTheme }} />
          </ErrorBoundary>
        </main>

        <CommandPalette
          isOpen={cmdPaletteOpen}
          onClose={() => setCmdPaletteOpen(false)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <footer className="footer">
          <div className="footer-content">
            <p className="footer-title">
              <strong>Backend Visual Lab</strong> &bull; Dev Atlas Lab
            </p>
            <p className="footer-desc">
              Deterministic Simulation &bull; 7-Stage Engineering Pedagogy &bull; Mode A Offline Browser + Mode B Spring Boot Sandbox
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
