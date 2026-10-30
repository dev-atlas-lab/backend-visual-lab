import { useState } from "react";
import { Link } from "react-router-dom";
import { validatedContentPack } from "../content";
import {
  loadProgressEnvelope,
  resetAllProgress,
} from "../engines/progress/progress-store";
import { RotateCcw, ArrowRight, Award, Zap } from "lucide-react";

export function ProgressPage() {
  const [envelope, setEnvelope] = useState(() => loadProgressEnvelope());
  const { modules } = validatedContentPack;

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all learning progress and quiz scores?")) {
      const cleared = resetAllProgress();
      setEnvelope(cleared);
    }
  };

  const totalModules = modules.length;
  const exploredModulesCount = Object.values(envelope.modules).filter(
    (m) => m.simulationStepsExplored > 0,
  ).length;

  return (
    <div style={{ maxWidth: "var(--lesson-reading-width)", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", marginBottom: "var(--space-1)" }}>
            Learning &amp; Simulation Progress Dashboard
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Interactive lab exploration and scenario assessment accuracy persisted securely in your local browser storage (<code>bvl.progress.v1</code>).
          </p>
        </div>
        <button onClick={handleReset} className="btn btn-danger" style={{ fontSize: "12px" }}>
          <RotateCcw size={14} /> Reset All Progress
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div style={{ padding: "var(--space-4)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Labs Explored
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--accent-primary)", marginTop: "4px" }}>
            {exploredModulesCount} / {totalModules}
          </div>
        </div>

        <div style={{ padding: "var(--space-4)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Total Simulation Steps Executed
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--status-ok)", marginTop: "4px" }}>
            {Object.values(envelope.modules).reduce((acc, m) => acc + m.simulationStepsExplored, 0)} steps
          </div>
        </div>
      </div>

      {/* Per Module Breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {modules.map((m) => {
          const entry = envelope.modules[m.slug];
          const hasExplored = (entry?.simulationStepsExplored ?? 0) > 0;
          const score = entry?.bestQuizAccuracyPercent ?? null;

          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-4)",
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--accent-subtle)",
                      color: "var(--accent-primary)",
                      fontWeight: "700",
                    }}
                  >
                    {m.domainId.toUpperCase()}
                  </span>
                  <strong style={{ fontSize: "15px" }}>{m.title}</strong>
                </div>

                <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Zap size={14} color={hasExplored ? "var(--status-ok)" : "var(--text-tertiary)"} />
                    Simulation: {entry?.simulationStepsExplored ?? 0} steps
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Award size={14} color={score !== null ? "var(--accent-primary)" : "var(--text-tertiary)"} />
                    Best Quiz Score: {score !== null ? `${score}%` : "Not attempted"}
                  </span>
                </div>
              </div>

              <Link to={`/domains/${m.domainId}/${m.slug}`} className="btn">
                Open Lab <ArrowRight size={14} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
