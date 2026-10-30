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
  const { domains, modules } = validatedContentPack;

  const totalInteractiveModules = modules.length;
  const exploredCount = Object.values(progress.modules).filter(
    (m) => m.simulationStepsExplored > 0,
  ).length;

  const filteredDomains =
    selectedFilter === "all"
      ? domains
      : domains.filter((d) => d.id === selectedFilter);

  return (
    <div className="catalog-page">
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

      {/* Filter Chips Bar */}
      <div className="filter-bar" role="tablist" aria-label="Domain Filter">
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
