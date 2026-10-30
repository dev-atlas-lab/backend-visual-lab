import { useState, type RefObject } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Layers,
  BarChart3,
  BookOpen,
  Settings,
  Cpu,
  Radio,
  Zap,
  Database,
  X,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

interface SidebarProps {
  onClose: () => void;
  onNavigate: () => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
}

interface NavItem {
  to: string;
  title: string;
  badge: string;
}

interface DomainDocumentGroup {
  id: string;
  title: string;
  icon: typeof Cpu;
  badge: string;
  items: NavItem[];
}

const domainDocumentGroups: DomainDocumentGroup[] = [
  {
    id: "java",
    title: "Java Core & JVM",
    icon: Cpu,
    badge: "11 Labs",
    items: [
      {
        to: "/domains/java/java-memory-heap-stack-gc",
        title: "1. JVM Memory & GC",
        badge: "Young/Old",
      },
      {
        to: "/domains/java/java-exceptions-stack-unwinding",
        title: "2. Exceptions & Stack",
        badge: "Unwind",
      },
      {
        to: "/domains/java/java-hashmap-treeification",
        title: "3. HashMap Treeification",
        badge: "Red-Black",
      },
      {
        to: "/domains/java/java-concurrenthashmap-locking",
        title: "4. ConcurrentHashMap",
        badge: "CAS/BinLock",
      },
      {
        to: "/domains/java/java-optional-functional-patterns",
        title: "5. Java Optional",
        badge: "Null-Safe",
      },
      {
        to: "/domains/java/java-concurrency-jmm-locks",
        title: "6. JMM & Lock Upgrades",
        badge: "Volatile",
      },
      {
        to: "/domains/java/java-thread-pool-executor",
        title: "7. ThreadPoolExecutor",
        badge: "4-Step Policy",
      },
      {
        to: "/domains/java/java-streams-lazy-evaluation",
        title: "8. Stream API & Fusion",
        badge: "Lazy Sink",
      },
      {
        to: "/domains/java/java-virtual-threads-loom",
        title: "9. Virtual Threads",
        badge: "Loom J21",
      },
      {
        to: "/domains/java/java-completable-future-async",
        title: "10. CompletableFuture",
        badge: "Async DAG",
      },
      {
        to: "/domains/java/java-references-threadlocal-leaks",
        title: "11. References & ThreadLocal",
        badge: "WeakRef/Leak",
      },
    ],
  },
  {
    id: "messaging",
    title: "Messaging & Kafka",
    icon: Radio,
    badge: "1 Lab",
    items: [
      {
        to: "/domains/messaging/kafka-consumer-groups-rebalance",
        title: "Kafka Consumer Groups",
        badge: "KIP-429",
      },
    ],
  },
  {
    id: "databases",
    title: "Databases & Storage",
    icon: Database,
    badge: "1 Lab",
    items: [
      {
        to: "/domains/databases/postgres-btree-mvcc-visibility",
        title: "PostgreSQL Storage & MVCC",
        badge: "MVCC",
      },
    ],
  },
  {
    id: "caching",
    title: "Caching & Redis",
    icon: Zap,
    badge: "1 Lab",
    items: [
      {
        to: "/domains/caching/redis-cache-stampede-ttl",
        title: "Redis Stampede & TTL",
        badge: "Stampede",
      },
    ],
  },
];

export function Sidebar({ onClose, onNavigate, closeButtonRef }: SidebarProps) {
  const location = useLocation();

  // Manage open/collapse state per document group, persisted to localStorage
  const [userToggles, setUserToggles] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("bvl.sidebar.open-groups");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignored
    }
    return {};
  });

  const isGroupOpen = (groupId: string): boolean => {
    // If the user has explicitly toggled this group, honor their choice
    if (groupId in userToggles) {
      return userToggles[groupId];
    }
    // By default, all domain documents are open so learners discover all labs
    return true;
  };

  const toggleGroup = (groupId: string) => {
    setUserToggles((prev) => {
      const current = groupId in prev ? prev[groupId] : true;
      const next = { ...prev, [groupId]: !current };
      try {
        localStorage.setItem("bvl.sidebar.open-groups", JSON.stringify(next));
      } catch {
        // Ignored
      }
      return next;
    });
  };

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
          title="Collapse or close sidebar"
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
          <NavLink
            to="/knowledge"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <BookOpen size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Knowledge &amp; Assessment</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Settings size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Settings &amp; Shortcuts</span>
          </NavLink>
        </div>

        {/* Navigation Group: Major Engineering Documents & Labs */}
        <div className="nav-group">
          <div className="nav-heading-row">
            <p className="nav-heading">Engineering Documents</p>
            <span className="nav-heading-badge">4 Domains</span>
          </div>

          <div className="doc-groups-container">
            {domainDocumentGroups.map((group) => {
              const isOpen = isGroupOpen(group.id);
              const isCurrentDomain = location.pathname.includes(`/domains/${group.id}`);
              const Icon = group.icon;

              return (
                <div
                  key={group.id}
                  className={`doc-group ${isOpen ? "is-open" : "is-collapsed"} ${
                    isCurrentDomain ? "is-active-domain" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="doc-group-trigger"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    aria-controls={`doc-group-items-${group.id}`}
                    title={`${isOpen ? "Collapse" : "Expand"} ${group.title} domain`}
                  >
                    <div className="doc-group-title-wrap">
                      <Icon size={15} strokeWidth={1.9} className="doc-group-icon" aria-hidden="true" />
                      <span className="doc-group-title">{group.title}</span>
                    </div>
                    <div className="doc-group-meta">
                      <span className="doc-group-pill">{group.badge}</span>
                      <span className={`doc-chevron-icon ${isOpen ? "rotate-open" : ""}`} aria-hidden="true">
                        <ChevronDown size={14} strokeWidth={2} />
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      id={`doc-group-items-${group.id}`}
                      className="doc-group-items"
                      role="region"
                      aria-label={`${group.title} labs`}
                    >
                      {group.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) => `doc-item-link ${isActive ? "active" : ""}`}
                          onClick={onNavigate}
                        >
                          <span className="doc-item-bullet" aria-hidden="true" />
                          <div className="nav-link-content">
                            <span className="nav-link-title">{item.title}</span>
                            <span className="nav-link-badge">{item.badge}</span>
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
