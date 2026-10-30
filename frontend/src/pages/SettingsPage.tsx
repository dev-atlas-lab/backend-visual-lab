import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Settings,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Keyboard,
  Download,
  RotateCcw,
  ShieldCheck,
  Check,
  AlertTriangle,
} from "lucide-react";
import { isSoundEnabled, toggleSound, playClick } from "../engines/audio/sound-fx";
import { loadProgressEnvelope, resetAllProgress } from "../engines/progress/progress-store";

interface SettingsPageProps {
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

export function SettingsPage(props: SettingsPageProps) {
  const context = useOutletContext<{ theme: "dark" | "light"; onToggleTheme: () => void } | null>();
  const theme = props.theme ?? context?.theme ?? "dark";
  const onToggleTheme = props.onToggleTheme ?? context?.onToggleTheme ?? (() => {});

  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleSoundToggle = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  const handleExportData = () => {
    playClick();
    const data = loadProgressEnvelope();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backend-visual-lab-progress-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopyStatus("Exported successfully!");
    setTimeout(() => setCopyStatus(null), 3000);
  };

  const handleConfirmReset = () => {
    playClick();
    resetAllProgress();
    setResetConfirmOpen(false);
    setCopyStatus("Learning progress reset to fresh state.");
    setTimeout(() => setCopyStatus(null), 3000);
  };

  return (
    <div className="settings-page" style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-2)" }}>
          <Settings size={22} color="var(--accent)" />
          <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: 700 }}>
            Workbench Settings &amp; Preferences
          </h1>
        </div>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
          Configure appearance, synthesizer audio, shortcuts, and persistent engineering telemetry.
        </p>
      </div>

      {copyStatus && (
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-5)",
            borderRadius: "var(--radius-md)",
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            fontSize: "var(--text-xs)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Check size={14} />
          <span>{copyStatus}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {/* Section 1: Appearance & Theme */}
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-5)",
          }}
        >
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 var(--space-2) 0" }}>
            Visual Appearance &amp; Adaptive Theme
          </h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: "0 0 var(--space-4) 0" }}>
            Backend Visual Lab features true adaptive themes for engineering workspaces. Dark mode is optimized for
            prolonged lab sessions; Light mode provides high-contrast documentation clarity.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div
              onClick={() => {
                if (theme !== "dark") onToggleTheme();
              }}
              style={{
                border: `2px solid ${theme === "dark" ? "var(--accent)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                background: "#0f172a",
                color: "#f8fafc",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Moon size={20} color="var(--accent)" />
              <div>
                <strong style={{ display: "block", fontSize: "var(--text-xs)" }}>Dark Obsidian Workbench</strong>
                <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>Layered slate surfaces</span>
              </div>
            </div>

            <div
              onClick={() => {
                if (theme !== "light") onToggleTheme();
              }}
              style={{
                border: `2px solid ${theme === "light" ? "var(--accent)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                background: "#ffffff",
                color: "#0f172a",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Sun size={20} color="#b05a26" />
              <div>
                <strong style={{ display: "block", fontSize: "var(--text-xs)" }}>Light Documentation Aesthetic</strong>
                <span style={{ fontSize: "0.6875rem", color: "#64748b" }}>Crisp high-contrast borders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Audio Synthesizer */}
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 4px 0" }}>
                Web Audio Micro-Synthesizer
              </h2>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: 0 }}>
                Synthesizes subtle mechanical clicks, simulation step ticks, mission success chimes, and alert tones.
              </p>
            </div>
            <button
              type="button"
              className={`btn ${soundOn ? "btn-primary" : "btn-secondary"}`}
              onClick={handleSoundToggle}
              style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: "6px" }}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundOn ? "Sound FX: ON" : "Sound FX: MUTED"}</span>
            </button>
          </div>
        </div>

        {/* Section 3: Keyboard Shortcuts HUD */}
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-3)" }}>
            <Keyboard size={18} color="var(--accent)" />
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
              Engineering Keyboard Shortcuts
            </h2>
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: "0 0 var(--space-4) 0" }}>
            Operate the entire platform and simulation timeline without taking your hands off the keyboard.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
            {[
              { key: "Cmd + K / Ctrl + K", desc: "Open Global Command Palette" },
              { key: "Space", desc: "Step forward by 1 discrete tick" },
              { key: "P", desc: "Toggle automated playback loop" },
              { key: "R", desc: "Reset simulation to initial state" },
              { key: "F", desc: "Toggle Fullscreen workbench" },
              { key: "1 / 2 / 3", desc: "Quick-load incident scenario presets" },
              { key: "Esc", desc: "Close open modal, palette, or drawer" },
            ].map((s) => (
              <div
                key={s.key}
                style={{
                  background: "var(--surface-2)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <kbd style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  {s.key}
                </kbd>
                <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)" }}>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Data Management & Persistence */}
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-5)",
          }}
        >
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 var(--space-2) 0" }}>
            Telemetry &amp; Local Persistence
          </h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: "0 0 var(--space-4) 0" }}>
            All your competency points, completed lab missions, and quiz scores are stored locally in your browser
            using zero third-party telemetry tracking.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportData}
              style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Download size={14} />
              <span>Export Progress JSON</span>
            </button>

            {!resetConfirmOpen ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResetConfirmOpen(true)}
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={14} />
                <span>Reset Learning Data...</span>
              </button>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--danger-quiet)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--danger)",
                }}
              >
                <AlertTriangle size={14} color="var(--danger)" />
                <span style={{ fontSize: "0.6875rem", color: "var(--danger)", fontWeight: 600 }}>
                  Are you sure? This erases all XP and badges.
                </span>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmReset}
                  style={{ fontSize: "0.6875rem", padding: "2px 8px" }}
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetConfirmOpen(false)}
                  style={{ fontSize: "0.6875rem", padding: "2px 8px" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Dual Execution Architecture Status */}
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-2)" }}>
            <ShieldCheck size={18} color="var(--ok)" />
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
              Execution Engine Status
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "var(--text-xs)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Primary Engine Mode:</span>
              <strong style={{ color: "var(--ok)", fontFamily: "var(--font-mono)" }}>
                Mode A: Deterministic In-Browser State Machine
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Offline Capability:</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                100% Offline Functional (Zero Network Required)
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Live Infrastructure Sandbox (Mode B):</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                Ready (Java 21 Spring Boot 3 + KRaft Kafka 3.8 + PG 17 + Redis 7.4)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
