import React, { useState } from "react";
import { Link } from "react-router-dom";
import { validatedContentPack } from "../content";
import {
  loadProgressEnvelope,
  resetAllProgress,
} from "../engines/progress/progress-store";
import { CheckCircle2, RotateCcw, ArrowRight, Award, Zap } from "lucide-react";

export function ProgressPage() {
  const [envelope, setEnvelope] = useState(() => loadProgressEnvelope());
  const { modules } = validatedContentPack;

  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ học tập và kết quả bài kiểm tra?")) {
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
            Bảng Theo Dõi Tiến Độ Thực Chiến
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Tiến độ tương tác phòng thí nghiệm và độ chính xác kiểm tra kiến thức được lưu trữ an toàn trong trình duyệt (<code>bvl.progress.v1</code>).
          </p>
        </div>
        <button onClick={handleReset} className="btn btn-danger" style={{ fontSize: "12px" }}>
          <RotateCcw size={14} /> Reset Tiến Độ
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div style={{ padding: "var(--space-4)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Labs Đã Thực Hành
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--accent-primary)", marginTop: "4px" }}>
            {exploredModulesCount} / {totalModules}
          </div>
        </div>

        <div style={{ padding: "var(--space-4)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Tổng Số Bước Simulation Đã Khám Phá
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--status-ok)", marginTop: "4px" }}>
            {Object.values(envelope.modules).reduce((acc, m) => acc + m.simulationStepsExplored, 0)} bước
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
                    Mô phỏng: {entry?.simulationStepsExplored ?? 0} bước
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Award size={14} color={score !== null ? "var(--accent-primary)" : "var(--text-tertiary)"} />
                    Điểm Quiz cao nhất: {score !== null ? `${score}%` : "Chưa làm"}
                  </span>
                </div>
              </div>

              <Link to={`/domains/${m.domainId}/${m.slug}`} className="btn">
                Mở Lab <ArrowRight size={14} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
