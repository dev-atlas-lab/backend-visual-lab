import { useId, useState, useEffect } from "react";
import {
  type SimulationEngineSpec,
  type SimulationStepFrame,
  buildPresetTape,
} from "../../engines/simulation";
import type { VisualLaneProjection } from "../../engines/visualization/projectors";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Activity,
} from "lucide-react";

interface InteractiveWorkbenchProps<TConfig, TState, TCommand> {
  engine: SimulationEngineSpec<TConfig, TState, TCommand>;
  projector: (frame: SimulationStepFrame<TState>) => VisualLaneProjection[];
  onCommandDispatched?: (cmd: TCommand) => void;
  renderCustomControls?: (
    dispatch: (cmd: TCommand) => void,
    currentState: TState,
  ) => React.ReactNode;
}

export function InteractiveWorkbench<TConfig, TState, TCommand>({
  engine,
  projector,
  onCommandDispatched,
  renderCustomControls,
}: InteractiveWorkbenchProps<TConfig, TState, TCommand>) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    engine.presets[0]?.id ?? "",
  );
  const [frames, setFrames] = useState<SimulationStepFrame<TState>[]>(() => {
    const preset =
      engine.presets.find((p) => p.id === selectedPresetId) ?? engine.presets[0];
    return preset
      ? buildPresetTape(engine, preset)
      : [engine.createInitialFrame({} as TConfig)];
  });
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    "invariants" | "events" | "fidelity" | "state"
  >("invariants");

  const selectId = useId();
  const currentFrame = frames[currentIndex] || frames[0];
  const lanes = projector(currentFrame);

  // Playback Auto-Stepper
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev < frames.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, 1800);
    return () => clearInterval(timer);
  }, [isPlaying, frames.length]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setIsPlaying(false);
    const preset = engine.presets.find((p) => p.id === presetId);
    if (preset) {
      const tape = buildPresetTape(engine, preset);
      setFrames(tape);
      setCurrentIndex(0);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(frames.length - 1, prev + 1));
  };

  const handleDispatchCommand = (cmd: TCommand) => {
    setIsPlaying(false);
    const activePreset =
      engine.presets.find((p) => p.id === selectedPresetId) ?? engine.presets[0];
    const newFrame = engine.applyCommand(currentFrame, cmd, activePreset.config);
    const newTape = [...frames.slice(0, currentIndex + 1), newFrame];
    setFrames(newTape);
    setCurrentIndex(newTape.length - 1);
    if (onCommandDispatched) {
      onCommandDispatched(cmd);
    }
  };

  return (
    <section className="workbench-container" aria-label="Interactive Simulation Lab Workbench">
      {/* 1. Header & Transport Toolbar */}
      <div className="workbench-toolbar">
        <div className="toolbar-group">
          <label htmlFor={selectId} className="metric-label" style={{ fontWeight: 700 }}>
            SCENARIO:
          </label>
          <select
            id={selectId}
            value={selectedPresetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="select-input"
          >
            {engine.presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.title}
              </option>
            ))}
          </select>
        </div>

        {/* Playback Controls */}
        <div className="toolbar-group">
          <button
            onClick={handleReset}
            className="btn"
            title="Reset to initial state (Tick 1)"
            aria-label="Reset to initial state"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
          <button
            onClick={handleStepBack}
            className="btn"
            disabled={currentIndex === 0}
            title="Step Back"
            aria-label="Step Back"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn btn-primary"
            title={isPlaying ? "Pause simulation" : "Auto-play simulation steps"}
            aria-label={isPlaying ? "Pause simulation" : "Auto-play simulation steps"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>
          <button
            onClick={handleStepForward}
            className="btn"
            disabled={currentIndex === frames.length - 1}
            title="Step Forward"
            aria-label="Step Forward"
          >
            <span>Step</span>
            <ChevronRight size={16} />
          </button>
          <span className="step-indicator">
            Tick {currentIndex + 1} / {frames.length}
          </span>
        </div>
      </div>

      {/* Custom Interactive Chaos / Fault Controls */}
      {renderCustomControls ? (
        <div
          style={{
            padding: "var(--space-2) var(--space-5)",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Sliders size={13} color="var(--accent)" />
            State Mutation:
          </span>
          {renderCustomControls(handleDispatchCommand, currentFrame.state)}
        </div>
      ) : null}

      {/* 2. Visual Stage */}
      <div className="workbench-stage">
        {/* Step Narration */}
        <div className="narration-callout">
          <div className="narration-title">
            <Activity size={16} color="var(--accent)" />
            <span>{currentFrame.title}</span>
          </div>
          <div className="narration-summary">
            {currentFrame.narration.summaryEn ||
              currentFrame.narration.summary ||
              currentFrame.narration.summaryVi}
          </div>
          <div className="narration-internals">
            {currentFrame.narration.internalsNoteEn ||
              currentFrame.narration.internalsNote ||
              currentFrame.narration.internalsNoteVi}
          </div>
          {currentFrame.narration.productionWarningEn ||
          currentFrame.narration.productionWarning ||
          currentFrame.narration.productionWarningVi ? (
            <div className="narration-warning">
              <AlertTriangle size={14} />
              <span>
                {currentFrame.narration.productionWarningEn ||
                  currentFrame.narration.productionWarning ||
                  currentFrame.narration.productionWarningVi}
              </span>
            </div>
          ) : null}
        </div>

        {/* Visual Topology Lanes */}
        <div className="lanes-grid">
          {lanes.map((lane) => (
            <div key={lane.laneId} className="lane-block">
              <div className="lane-header">
                <span>{lane.laneTitle}</span>
                <span style={{ fontSize: "0.625rem", color: "var(--text-tertiary)" }}>
                  {lane.cards.length} {lane.cards.length === 1 ? "unit" : "units"}
                </span>
              </div>
              <div className="cards-container">
                {lane.cards.map((card) => (
                  <div key={card.id} className={`visual-card card-${card.tone}`}>
                    <div className="card-header-row">
                      <span className="card-title">{card.title}</span>
                      <span className={`card-badge card-badge-${card.tone}`}>
                        {card.badgeText}
                      </span>
                    </div>
                    <div className="card-subtitle">{card.subtitle}</div>
                    <div>
                      {card.details.map((d, dIdx) => (
                        <div key={dIdx} className="card-detail-item">
                          &bull; {d}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. State & Fidelity Inspector */}
      <div className="workbench-inspector">
        {/* Metrics Telemetry Bar */}
        <div className="metrics-row">
          {Object.entries(currentFrame.metrics).map(([key, val]) => (
            <div key={key} className="metric-pill">
              <span className="metric-label">{key}:</span>
              <span className="metric-value">{String(val)}</span>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="inspector-tabs">
          <button
            onClick={() => setActiveInspectorTab("invariants")}
            className={`inspector-tab-btn ${activeInspectorTab === "invariants" ? "active" : ""}`}
          >
            Invariants &amp; Verification
          </button>
          <button
            onClick={() => setActiveInspectorTab("events")}
            className={`inspector-tab-btn ${activeInspectorTab === "events" ? "active" : ""}`}
          >
            Protocol Events ({currentFrame.events.length})
          </button>
          <button
            onClick={() => setActiveInspectorTab("fidelity")}
            className={`inspector-tab-btn ${activeInspectorTab === "fidelity" ? "active" : ""}`}
          >
            Fidelity &amp; Assumptions
          </button>
          <button
            onClick={() => setActiveInspectorTab("state")}
            className={`inspector-tab-btn ${activeInspectorTab === "state" ? "active" : ""}`}
          >
            Raw State Frame
          </button>
        </div>

        {/* Tab 1: Invariants */}
        {activeInspectorTab === "invariants" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {currentFrame.invariants.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {inv.passed ? (
                  <CheckCircle size={16} color="var(--ok)" />
                ) : (
                  <AlertTriangle size={16} color="var(--danger)" />
                )}
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    minWidth: "220px",
                    color: "var(--text-primary)",
                  }}
                >
                  {inv.label}:
                </span>
                <span
                  style={{
                    color: inv.passed ? "var(--text-secondary)" : "var(--danger)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {inv.detail}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Tab 2: Wire Protocol Events */}
        {activeInspectorTab === "events" ? (
          <div
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
            }}
          >
            {currentFrame.events.map((ev, eIdx) => (
              <div
                key={eIdx}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-2)",
                  borderLeft: `3px solid var(--status-${ev.tone})`,
                }}
              >
                <span style={{ color: "var(--accent)", marginRight: "8px" }}>
                  [Tick #{ev.tick}]
                </span>
                <span style={{ fontWeight: 700, color: "var(--text-primary)", marginRight: "8px" }}>
                  {ev.actor}:
                </span>
                <span style={{ color: "var(--text-secondary)", marginRight: "8px" }}>
                  {ev.action}
                </span>
                <span style={{ color: "var(--text-tertiary)" }}>— {ev.detail}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Tab 3: Fidelity Contract */}
        {activeInspectorTab === "fidelity" ? (
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
              lineHeight: "var(--leading-relaxed)",
            }}
          >
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Authoritative Specification:</strong>{" "}
              <code>{engine.fidelity.realWorldReference}</code>
            </div>
            <div>
              <strong style={{ color: "var(--ok)" }}>&check; Faithfully Simulated Behaviors:</strong>
              <ul style={{ paddingLeft: "20px", marginTop: "4px" }}>
                {engine.fidelity.accurateBehaviors.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ color: "var(--warn)" }}>&bull; Educational Simplifications:</strong>
              <ul style={{ paddingLeft: "20px", marginTop: "4px" }}>
                {engine.fidelity.simplifications.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ color: "var(--danger)" }}>&times; Out-of-Scope Failure Modes:</strong>
              <ul style={{ paddingLeft: "20px", marginTop: "4px" }}>
                {engine.fidelity.unsupportedEdgeCases.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* Tab 4: Raw State Frame */}
        {activeInspectorTab === "state" ? (
          <pre className="inspector-code-block">
            {JSON.stringify(currentFrame.state, null, 2)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
