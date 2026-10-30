import { useState } from "react";
import { Link } from "react-router-dom";
import { validatedContentPack } from "../content";
import { loadProgressEnvelope } from "../engines/progress/progress-store";
import {
  Database,
  Server,
  Cpu,
  Radio,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";

const domainIcons: Record<string, React.ReactNode> = {
  java: <Cpu size={22} />,
  messaging: <Radio size={22} />,
  caching: <Zap size={22} />,
  databases: <Database size={22} />,
  "distributed-systems": <Server size={22} />,
  "design-patterns": <Layers size={22} />,
  "system-design": <ShieldCheck size={22} />,
};

export function CatalogPage() {
  const [progress] = useState(() => loadProgressEnvelope());
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { domains, modules } = validatedContentPack;

  const totalInteractiveModules = modules.length;
  const exploredCount = Object.values(progress.modules).filter(
    (m) => m.simulationStepsExplored > 0,
  ).length;

  // Find most recently explored module
  const sortedExplored = Object.entries(progress.modules)
    .filter(([, data]) => (data.simulationStepsExplored ?? 0) > 0)
    .sort(
      ([, a], [, b]) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  const recentSlug = sortedExplored[0]?.[0];
  const resumeModule = recentSlug ? modules.find((m) => m.slug === recentSlug) : null;

  const filteredDomains = domains
    .filter((d) => selectedFilter === "all" || d.id === selectedFilter)
    .filter((d) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const domainMatches =
        d.title.toLowerCase().includes(q) ||
        d.tagline.toLowerCase().includes(q) ||
        d.topics.some((t) => t.toLowerCase().includes(q));
      const hasMatchingModule = modules.some(
        (m) => m.domainId === d.id && m.title.toLowerCase().includes(q)
      );
      return domainMatches || hasMatchingModule;
    });

  return (
    <div className="catalog-page">
      {/* Resume Card if any module was visited */}
      {resumeModule && (
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4) var(--space-5)",
            marginBottom: "var(--space-6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "0 0 10px var(--accent)",
              }}
            />
            <div>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Resume Active Simulation
              </span>
              <h2
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {resumeModule.title}
              </h2>
            </div>
          </div>
          <Link
            to={`/domains/${resumeModule.domainId}/${resumeModule.slug}`}
            className="btn btn-primary"
            style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span>Continue Workbench</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Hero Banner */}
      <section className="catalog-hero" aria-labelledby="hero-heading">
        <div className="hero-pill">
          <span className="hero-pill-dot" aria-hidden="true" />
          <span>Interactive Backend Systems Engineering</span>
        </div>

        <h1 id="hero-heading" className="hero-title">
          Master Backend Internals via{" "}
          <span className="hero-title-gradient">Direct Simulation</span>
        </h1>

        <p className="hero-desc">
          Step through deterministic visual state machines modeling real protocol behaviors:
          Kafka KIP-429 cooperative rebalances, PostgreSQL B-Tree &amp; MVCC visibility,
          Redis cache stampede mitigation, and Java 21 Virtual Thread scheduling.
        </p>

        <div className="hero-stats-grid">
          <div className="stat-item">
            <span className="stat-value">{domains.length}</span>
            <span className="stat-label">Core Domains</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{totalInteractiveModules}</span>
            <span className="stat-label">Simulation Engines</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">12+</span>
            <span className="stat-label">Failure Presets</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {exploredCount}/{totalInteractiveModules}
            </span>
            <span className="stat-label">Explored Labs</span>
          </div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-5)",
        }}
      >
        <div className="filter-bar" role="tablist" aria-label="Domain Filter" style={{ margin: 0 }}>
          <button
            type="button"
            className={`filter-chip ${selectedFilter === "all" ? "active" : ""}`}
            onClick={() => setSelectedFilter("all")}
            role="tab"
            aria-selected={selectedFilter === "all"}
          >
            <span>All Domains ({domains.length})</span>
          </button>
          {domains.map((domain) => (
            <button
              key={domain.id}
              type="button"
              className={`filter-chip ${selectedFilter === domain.id ? "active" : ""}`}
              onClick={() => setSelectedFilter(domain.id)}
              role="tab"
              aria-selected={selectedFilter === domain.id}
            >
              <span>{domain.title.split("&")[0].trim()}</span>
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--surface-1)",
            padding: "6px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            minWidth: "220px",
          }}
        >
          <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>Filter:</span>
          <input
            type="text"
            placeholder="Search topics, protocols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "var(--text-xs)",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Domain Cards Grid */}
      <div className="domain-grid">
        {filteredDomains.map((domain) => {
          const domainModules = modules.filter((m) => m.domainId === domain.id);
          const hasActiveLabs = domain.status === "Active Interactive Labs";

          return (
            <div key={domain.id} className="domain-card">
              <div className="domain-card-body">
                <div className="domain-card-header">
                  <div className="domain-card-brand">
                    <div className="domain-icon-wrapper">
                      {domainIcons[domain.id] || <Layers size={22} />}
                    </div>
                    <div className="domain-title-wrap">
                      <h2 className="domain-title">{domain.title}</h2>
                      <span className="domain-tagline">{domain.tagline}</span>
                    </div>
                  </div>

                  {hasActiveLabs && (
                    <span className="domain-badge-active">
                      <Sparkles size={11} />
                      Interactive Lab
                    </span>
                  )}
                </div>

                <div style={{ marginTop: "var(--space-4)" }}>
                  <p className="domain-desc">
                    {domain.descriptionEn || domain.description || domain.descriptionVi}
                  </p>
                </div>

                <div style={{ marginTop: "var(--space-4)" }}>
                  <p className="domain-topics-label">Core Curriculum Topics</p>
                  <div className="domain-topics-wrap">
                    {domain.topics.slice(0, 5).map((topic, idx) => (
                      <span key={idx} className="topic-tag">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Modules Section */}
              <div className="domain-modules-section">
                <div className="domain-modules-label">
                  <span>Available Simulation Labs ({domainModules.length})</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {domainModules.map((m) => {
                    const userProgress = progress.modules[m.slug];
                    const isExplored = (userProgress?.simulationStepsExplored ?? 0) > 0;

                    return (
                      <Link
                        key={m.slug}
                        to={`/domains/${domain.id}/${m.slug}`}
                        className="module-card-item"
                        title={`Open simulation: ${m.title}`}
                      >
                        <div className="module-item-info">
                          <span className="module-item-title">{m.title}</span>
                          <div className="module-item-meta">
                            <span className="module-item-badge">{m.difficulty}</span>
                            <span className="module-item-time">{m.estimatedMinutes} min</span>
                            {isExplored && (
                              <span
                                style={{
                                  fontSize: "0.6875rem",
                                  color: "var(--ok)",
                                  fontWeight: 600,
                                }}
                              >
                                &bull; Explored
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="module-item-arrow" aria-hidden="true">
                          <ArrowRight size={14} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
