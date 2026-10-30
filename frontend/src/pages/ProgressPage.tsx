import { useState } from "react";
import { Link } from "react-router-dom";
import { validatedContentPack } from "../content";
import {
  loadProgressEnvelope,
  resetAllProgress,
} from "../engines/progress/progress-store";
import { CompetencyRadar } from "../components/progress/CompetencyRadar";
import {
  RotateCcw,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Cpu,
  Database,
  Radio,
  Layers,
  Sparkles,
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

  // Compute Total Engineering Experience Points (XP)
  const totalXp = exploredModulesCount * 120 + totalSteps * 4 + (avgQuizScore ?? 0) * 4;

  let rankTitle = "Junior Systems Explorer";
  let rankBadge = "L1 APPRENTICE";
  let nextRankThreshold = 300;
  let prevThreshold = 0;

  if (totalXp >= 1000) {
    rankTitle = "Principal Systems Architect";
    rankBadge = "L4 ARCHITECT";
    nextRankThreshold = 2000;
    prevThreshold = 1000;
  } else if (totalXp >= 600) {
    rankTitle = "Senior Distributed Systems Engineer";
    rankBadge = "L3 SENIOR";
    nextRankThreshold = 1000;
    prevThreshold = 600;
  } else if (totalXp >= 250) {
    rankTitle = "Backend Systems Engineer";
    rankBadge = "L2 ENGINEER";
    nextRankThreshold = 600;
    prevThreshold = 250;
  }

  const rankProgressPercent = Math.min(
    100,
    Math.round(((totalXp - prevThreshold) / (nextRankThreshold - prevThreshold)) * 100),
  );

  // Helper to compute competency score for module slugs
  const getCompetencyScore = (slugs: string[]): number => {
    const scores = slugs.map((slug) => {
      const p = envelope.modules[slug];
      if (!p) return 15;
      let score = 15;
      if (p.simulationStepsExplored > 0) score += 40;
      if (p.bestQuizAccuracyPercent !== null && p.bestQuizAccuracyPercent !== undefined) {
        score += Math.round(p.bestQuizAccuracyPercent * 0.45);
      }
      return Math.min(100, score);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const radarDimensions = [
    {
      axis: "concurrency",
      label: "Concurrency & Locks",
      value: getCompetencyScore(["java-concurrency-jmm-locks", "java-virtual-threads-loom"]),
    },
    {
      axis: "memory",
      label: "Memory & GC",
      value: getCompetencyScore(["java-memory-heap-stack-gc"]),
    },
    {
      axis: "storage",
      label: "Databases & Storage",
      value: getCompetencyScore(["postgres-mvcc-btree"]),
    },
    {
      axis: "messaging",
      label: "Messaging & Streaming",
      value: getCompetencyScore(["kafka-consumer-group"]),
    },
    {
      axis: "caching",
      label: "Caching & Stampede",
      value: getCompetencyScore(["redis-stampede"]),
    },
    {
      axis: "internals",
      label: "Data Structures & Runtime",
      value: getCompetencyScore(["java-hashmap-treeification", "java-exceptions-stack-unwinding"]),
    },
  ];

  // Engineering Mastery Badges
  const badges = [
    {
      id: "lock-master",
      title: "Lock Master",
      desc: "Simulated HotSpot Mark Word lock inflation & JMM visibility",
      unlocked: (envelope.modules["java-concurrency-jmm-locks"]?.simulationStepsExplored ?? 0) > 0,
      icon: <Cpu size={18} />,
    },
    {
      id: "event-streamer",
      title: "Event Streamer",
      desc: "Observed Kafka Consumer Group rebalance & partition assignment",
      unlocked: (envelope.modules["kafka-consumer-group"]?.simulationStepsExplored ?? 0) > 0,
      icon: <Radio size={18} />,
    },
    {
      id: "cache-guardian",
      title: "Cache Guardian",
      desc: "Prevented dogpile stampede with distributed mutex (SET NX PX)",
      unlocked: (envelope.modules["redis-stampede"]?.simulationStepsExplored ?? 0) > 0,
      icon: <Zap size={18} />,
    },
    {
      id: "storage-veteran",
      title: "Storage Veteran",
      desc: "Inspected PostgreSQL heap pages, dead tuples & VACUUM",
      unlocked: (envelope.modules["postgres-mvcc-btree"]?.simulationStepsExplored ?? 0) > 0,
      icon: <Database size={18} />,
    },
    {
      id: "loom-pioneer",
      title: "Loom Pioneer",
      desc: "Witnessed virtual thread continuation yield & carrier pinning",
      unlocked: (envelope.modules["java-virtual-threads-loom"]?.simulationStepsExplored ?? 0) > 0,
      icon: <Layers size={18} />,
    },
    {
      id: "quiz-ace",
      title: "Production Ace",
      desc: "Achieved 100% accuracy on a scenario-based assessment",
      unlocked: quizScores.some((score) => score === 100),
      icon: <ShieldCheck size={18} />,
    },
  ];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
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
              Engineering Mastery &amp; Cockpit Telemetry
            </h1>
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
            Interactive simulation depth, verified competencies, and production scenario quiz scores stored locally in your browser.
          </p>
        </div>

        <button onClick={handleReset} className="btn btn-danger" style={{ fontSize: "var(--text-xs)" }}>
          <RotateCcw size={14} /> Reset All Progress
        </button>
      </div>

      {/* Systems Engineer Rank Card */}
      <section
        style={{
          background: "linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%)",
          border: "1px solid var(--border-bold)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          marginBottom: "var(--space-8)",
          boxShadow: "var(--shadow-md)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-6)",
        }}
      >
        <div style={{ flex: "1 1 300px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "var(--space-2)" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6875rem",
                fontWeight: 800,
                color: "var(--accent)",
                padding: "3px 8px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--accent-quiet)",
                border: "1px solid var(--accent-subtle)",
              }}
            >
              {rankBadge}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              TOTAL EXPERIENCE: {totalXp} XP
            </span>
          </div>

          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 800, margin: "0 0 var(--space-2) 0" }}>
            {rankTitle}
          </h2>

          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: "0 0 var(--space-4) 0" }}>
            Execute simulation steps and solve production scenario quizzes to advance toward Principal Systems Architect.
          </p>

          {/* Progress Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                flex: 1,
                height: "8px",
                backgroundColor: "var(--surface-3)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${rankProgressPercent}%`,
                  backgroundColor: "var(--accent)",
                  boxShadow: "0 0 10px var(--accent)",
                  transition: "width 0.4s ease-out",
                }}
              />
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {rankProgressPercent}%
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-strong)" }}>
              {exploredModulesCount}/{totalModules}
            </div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
              Labs Explored
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", fontWeight: 800, color: "var(--ok)" }}>
              {totalSteps}
            </div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
              Steps Executed
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", fontWeight: 800, color: "var(--accent)" }}>
              {avgQuizScore !== null ? `${avgQuizScore}%` : "—"}
            </div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
              Avg Accuracy
            </div>
          </div>
        </div>
      </section>

      {/* Competency Hexagon Radar & Achievements Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "var(--space-6)",
          marginBottom: "var(--space-10)",
        }}
      >
        {/* Radar Chart Card */}
        <div
          style={{
            padding: "var(--space-6)",
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={16} color="var(--accent)" />
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                Systems Competency Hexagon
              </h3>
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
              Normalized proficiency rating based on simulation depth and scenario evaluation.
            </p>
          </div>

          <CompetencyRadar dimensions={radarDimensions} size={300} />
        </div>

        {/* Engineering Achievements Card */}
        <div
          style={{
            padding: "var(--space-6)",
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-4)" }}>
            <Award size={18} color="var(--accent)" />
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
              Engineering Mastery Badges
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {badges.map((badge) => (
              <div
                key={badge.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: badge.unlocked ? "var(--surface-2)" : "var(--surface-inset)",
                  border: `1px solid ${badge.unlocked ? "var(--accent-subtle)" : "var(--border-subtle)"}`,
                  opacity: badge.unlocked ? 1 : 0.6,
                  transition: "all var(--duration-fast) var(--ease-out)",
                }}
              >
                <div
                  style={{
                    color: badge.unlocked ? "var(--accent-strong)" : "var(--text-tertiary)",
                    flex: "0 0 auto",
                  }}
                >
                  {badge.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
                      {badge.title}
                    </span>
                    {badge.unlocked ? (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.625rem",
                          fontWeight: 800,
                          color: "var(--ok)",
                          padding: "1px 6px",
                          borderRadius: "var(--radius-xs)",
                          backgroundColor: "var(--ok-quiet)",
                        }}
                      >
                        UNLOCKED
                      </span>
                    ) : (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.625rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        LOCKED
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                    {badge.desc}
                  </p>
                </div>
              </div>
            ))}
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
