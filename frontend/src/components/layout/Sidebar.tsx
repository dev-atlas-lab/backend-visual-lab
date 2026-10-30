import type { RefObject } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Layers,
  BarChart3,
  Cpu,
  Radio,
  Zap,
  Database,
  X,
  ExternalLink,
} from "lucide-react";

interface SidebarProps {
  onClose: () => void;
  onNavigate: () => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
}

export function Sidebar({ onClose, onNavigate, closeButtonRef }: SidebarProps) {
  return (
    <aside className="app-sidebar" id="primary-navigation" aria-label="Primary Navigation">
      <div className="sidebar-top">
        <Link to="/" className="brand" onClick={onNavigate}>
          <img
            className="brand-mark"
            src="/brand/app-icon.svg"
            alt="Dev Atlas Lab Icon"
            width={34}
            height={34}
            decoding="async"
          />
          <div className="brand-copy">
            <span className="brand-name">Backend Visual Lab</span>
            <span className="brand-sub">DEV ATLAS LAB</span>
          </div>
        </Link>
        <button
          ref={closeButtonRef}
          type="button"
          className="icon-button sidebar-close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Curriculum and Modules">
        {/* Navigation Group: Architecture & Curriculum */}
        <div className="nav-group">
          <p className="nav-heading">Curriculum</p>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Layers size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Catalog &amp; Roadmap</span>
          </NavLink>
          <NavLink
            to="/progress"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <BarChart3 size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Progress &amp; Mastery</span>
          </NavLink>
        </div>

        {/* Navigation Group: Core Engineering Domains */}
        <div className="nav-group">
          <p className="nav-heading">Engineering Labs</p>

          <NavLink
            to="/domains/messaging/kafka-consumer-groups-rebalance"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Radio size={16} strokeWidth={1.8} aria-hidden="true" />
            <div className="nav-link-content">
              <span className="nav-link-title">Kafka Streaming</span>
              <span className="nav-link-badge">KIP-429</span>
            </div>
          </NavLink>

          <NavLink
            to="/domains/databases/postgres-btree-mvcc-visibility"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Database size={16} strokeWidth={1.8} aria-hidden="true" />
            <div className="nav-link-content">
              <span className="nav-link-title">PostgreSQL Storage</span>
              <span className="nav-link-badge">MVCC</span>
            </div>
          </NavLink>

          <NavLink
            to="/domains/caching/redis-cache-stampede-ttl"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Zap size={16} strokeWidth={1.8} aria-hidden="true" />
            <div className="nav-link-content">
              <span className="nav-link-title">Redis &amp; Caching</span>
              <span className="nav-link-badge">Stampede</span>
            </div>
          </NavLink>

          <NavLink
            to="/domains/java/java-memory-heap-stack-gc"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Cpu size={16} strokeWidth={1.8} aria-hidden="true" />
            <div className="nav-link-content">
              <span className="nav-link-title">1. JVM Memory &amp; GC</span>
              <span className="nav-link-badge">Young/Old</span>
            </div>
          </NavLink>

          <NavLink
            to="/domains/java/java-exceptions-stack-unwinding"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Cpu size={16} strokeWidth={1.8} aria-hidden="true" />
            <div className="nav-link-content">
              <span className="nav-link-title">2. Exceptions &amp; Stack</span>
              <span className="nav-link-badge">Unwind</span>
            </div>
          </NavLink>

          <NavLink
            to="/domains/java/java-hashmap-treeification"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Cpu size={16} strokeWidth={1.8} aria-hidden="true" />
            <div className="nav-link-content">
              <span className="nav-link-title">3. HashMap Treeification</span>
              <span className="nav-link-badge">Red-Black</span>
            </div>
          </NavLink>

          <NavLink
            to="/domains/java/java-concurrency-jmm-locks"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Cpu size={16} strokeWidth={1.8} aria-hidden="true" />
            <div className="nav-link-content">
              <span className="nav-link-title">4. JMM &amp; Lock Upgrades</span>
              <span className="nav-link-badge">Volatile</span>
            </div>
          </NavLink>

          <NavLink
            to="/domains/java/java-virtual-threads-loom"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Cpu size={16} strokeWidth={1.8} aria-hidden="true" />
            <div className="nav-link-content">
              <span className="nav-link-title">5. Virtual Threads</span>
              <span className="nav-link-badge">Loom J21</span>
            </div>
          </NavLink>
        </div>

        {/* Navigation Group: Pedagogy & Architecture */}
        <div className="nav-group">
          <p className="nav-heading">Pedagogy Flow</p>
          <div className="pedagogy-chip-list">
            <span className="pedagogy-step">WHAT</span>
            <span className="pedagogy-arrow">&rarr;</span>
            <span className="pedagogy-step">WHY</span>
            <span className="pedagogy-arrow">&rarr;</span>
            <span className="pedagogy-step">HOW</span>
            <span className="pedagogy-arrow">&rarr;</span>
            <span className="pedagogy-step">INTERNALS</span>
          </div>
          <p className="pedagogy-subtext">
            7-Stage Pedagogy &bull; Deterministic Browser State Machines
          </p>
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot-pulse" aria-hidden="true" />
          <span className="status-label">Mode A: Offline Browser Engine</span>
        </div>
        <p className="sidebar-meta">
          Java 21 &bull; Postgres 17 &bull; Redis 7.4 &bull; Kafka 3.8
        </p>
        <a
          href="https://github.com/dev-atlas-lab/backend-visual-lab"
          target="_blank"
          rel="noreferrer"
          className="sidebar-link-external"
        >
          <span>GitHub Repository</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </aside>
  );
}
