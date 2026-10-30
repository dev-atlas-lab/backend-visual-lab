import { useState } from "react";
import { Link } from "react-router-dom";
import { validatedContentPack } from "../content";
import { loadProgressEnvelope } from "../engines/progress/progress-store";
import { Database, Server, Cpu, Network, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

const domainIcons: Record<string, React.ReactNode> = {
  messaging: <Network size={22} color="var(--accent-primary)" />,
  caching: <Zap size={22} color="var(--status-warn)" />,
  databases: <Database size={22} color="var(--status-ok)" />,
  "distributed-systems": <Server size={22} color="var(--status-info)" />,
  "design-patterns": <Cpu size={22} color="var(--text-secondary)" />,
  "system-design": <ShieldCheck size={22} color="var(--accent-hover)" />,
};

export function CatalogPage() {
  const [progress] = useState(() => loadProgressEnvelope());
  const { domains, modules } = validatedContentPack;

  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "var(--space-2)" }}>
          Backend Engineering Interactive Laboratory
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px", maxWidth: "800px" }}>
          Nền tảng học tập tương tác mô phỏng sâu cơ chế nội tại (Internals) của các hệ thống Backend phân tán
          theo triết lý 7 giai đoạn: <code>WHAT</code> &rarr; <code>WHY</code> &rarr; <code>HOW</code> &rarr;{" "}
          <code>INTERNALS</code> &rarr; <code>TRADE-OFFS</code> &rarr; <code>FAILURE SCENARIOS</code> &rarr;{" "}
          <code>PRODUCTION ENGINEERING</code>.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--space-6)" }}>
        {domains.map((domain) => {
          const domainModules = modules.filter((m) => m.domainId === domain.id);
          const hasActiveLabs = domain.status === "Active Interactive Labs";

          return (
            <div
              key={domain.id}
              style={{
                backgroundColor: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-6)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    {domainIcons[domain.id]}
                    <h2 style={{ fontSize: "18px", fontWeight: "700" }}>{domain.title}</h2>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "3px 8px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: hasActiveLabs ? "var(--status-ok-subtle)" : "var(--surface-2)",
                      color: hasActiveLabs ? "var(--status-ok)" : "var(--text-tertiary)",
                    }}
                  >
                    {domain.status}
                  </span>
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
                  {domain.descriptionVi}
                </p>

                <div style={{ marginBottom: "var(--space-4)" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
                    Các chủ đề nghiên cứu:
                  </span>
                  <ul style={{ paddingLeft: "var(--space-4)", marginTop: "var(--space-2)", fontSize: "12px", color: "var(--text-secondary)" }}>
                    {domain.topics.map((t, idx) => (
                      <li key={idx} style={{ marginBottom: "2px" }}>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                {domainModules.length > 0 ? (
                  <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-4)" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-primary)", textTransform: "uppercase" }}>
                      Interactive Labs khả dụng:
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                      {domainModules.map((m) => {
                        const userProgress = progress.modules[m.slug];
                        return (
                          <Link
                            key={m.id}
                            to={`/domains/${domain.id}/${m.slug}`}
                            className="btn btn-primary"
                            style={{ justifyContent: "space-between", padding: "8px 12px" }}
                          >
                            <span style={{ textAlign: "left", fontSize: "13px" }}>{m.title.split("—")[1] || m.title}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
                              {userProgress?.simulationStepsExplored ? <CheckCircle2 size={14} /> : null}
                              Khám phá <ArrowRight size={14} />
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)", color: "var(--text-tertiary)", fontSize: "12px" }}>
                    Chủ đề đang nằm trong kế hoạch mở rộng (Phase 6 - Phase 7).
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
