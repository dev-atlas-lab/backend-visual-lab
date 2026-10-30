import { useState } from "react";
import { Link } from "react-router-dom";
import { validatedContentPack } from "../content";
import {
  loadProgressEnvelope,
  resetAllProgress,
} from "../engines/progress/progress-store";
import {
  RotateCcw,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

export function ProgressPage() {
  const [envelope, setEnvelope] = useState(() => loadProgressEnvelope());
  const { modules } = validatedContentPack;

  const handleReset = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all learning progress, simulation history, and quiz scores?",
      )
    ) {
      const cleared = resetAllProgress();
      setEnvelope(cleared);
    }
  };

  const totalModules = modules.length;
  const exploredModulesCount = Object.values(envelope.modules).filter(
    (m) => m.simulationStepsExplored > 0,
  ).length;

  const quizScores = Object.values(envelope.modules)
    .map((m) => m.bestQuizAccuracyPercent)
    .filter((s): s is number => s !== null && s !== undefined);

  const avgQuizScore =
    quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : null;

  const totalSteps = Object.values(envelope.modules).reduce(
    (acc, m) => acc + m.simulationStepsExplored,
    0,
  );

  return (
    <div style={{ maxWidth: "var(--lesson-column)", margin: "0 auto" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
          paddingBottom: "var(--space-6)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "var(--space-2)",
            }}
          >
            <BarChart3 size={24} color="var(--accent)" />
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "800", margin: 0 }}>
              Learning &amp; Simulation Mastery
            </h1>
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
            Interactive simulation depth and production scenario quiz scores stored locally in your browser (<code>bvl.progress.v1</code>).
          </p>
        </div>

        <button onClick={handleReset} className="btn btn-danger" style={{ fontSize: "var(--text-xs)" }}>
          <RotateCcw size={14} /> Reset All Progress
        </button>
      </div>

      {/* Summary KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <div
          style={{
            padding: "var(--space-5)",
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
            }}
          >
            Simulation Labs Explored
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--accent-strong)",
              marginTop: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {exploredModulesCount} / {totalModules}
          </div>
        </div>

        <div
          style={{
            padding: "var(--space-5)",
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
            }}
          >
            Simulation Steps Executed
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--ok)",
              marginTop: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {totalSteps} steps
          </div>
        </div>

        <div
          style={{
            padding: "var(--space-5)",
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
            }}
          >
            Average Scenario Accuracy
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: avgQuizScore !== null ? "var(--accent)" : "var(--text-tertiary)",
              marginTop: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {avgQuizScore !== null ? `${avgQuizScore}%` : "No Quizzes Yet"}
          </div>
        </div>
      </div>

      {/* Module Progress Breakdown */}
      <section>
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "700",
            marginBottom: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Award size={18} color="var(--accent)" />
          <span>Curriculum Modules Breakdown</span>
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {modules.map((m) => {
            const modProgress = envelope.modules[m.slug];
            const steps = modProgress?.simulationStepsExplored ?? 0;
            const score = modProgress?.bestQuizAccuracyPercent ?? null;
            const completed = steps > 0 && score !== null && score >= 75;

            return (
              <div
                key={m.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-4) var(--space-5)",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                  gap: "var(--space-4)",
                }}
              >
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.625rem",
                        padding: "1px 6px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface-2)",
                        color: "var(--text-tertiary)",
                        textTransform: "uppercase",
                      }}
                    >
                      {m.domainId}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "var(--text-sm)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {m.title}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <span>
                      Simulation: <strong style={{ color: steps > 0 ? "var(--ok)" : "inherit" }}>{steps} steps</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Quiz Accuracy:{" "}
                      <strong style={{ color: score !== null && score >= 75 ? "var(--ok)" : "inherit" }}>
                        {score !== null ? `${score}%` : "Not Attempted"}
                      </strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  {completed ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.6875rem",
                        fontFamily: "var(--font-mono)",
                        color: "var(--ok)",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--ok-quiet)",
                      }}
                    >
                      <CheckCircle2 size={13} /> MASTERED
                    </span>
                  ) : null}

                  <Link
                    to={`/domains/${m.domainId}/${m.slug}`}
                    className="btn"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    Launch Lab <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
