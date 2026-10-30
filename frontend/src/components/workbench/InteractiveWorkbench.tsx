import { useId, useState, useEffect, useCallback } from "react";
import {
  type SimulationEngineSpec,
  type SimulationStepFrame,
  buildPresetTape,
} from "../../engines/simulation";
import type { VisualLaneProjection } from "../../engines/visualization/projectors";
import { getMissionsForSimulation } from "../../content/missions";
import {
  playClick,
  playStep,
  playSuccess,
  playAlert,
} from "../../engines/audio/sound-fx";
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
  Maximize2,
  Minimize2,
  Target,
  CheckCircle2,
  Circle,
  HelpCircle,
  X,
  Compass,
  Lightbulb,
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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    "invariants" | "events" | "fidelity" | "state"
  >("invariants");
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showWelcomeTip, setShowWelcomeTip] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bvl.lab.hide_welcome") !== "true";
  });

  const selectId = useId();

  // Reset tape and state cleanly if engine instance changes (adjust state during render)
  const [prevEngineId, setPrevEngineId] = useState(engine.id);
  if (prevEngineId !== engine.id) {
    setPrevEngineId(engine.id);
    setSelectedPresetId(engine.presets[0]?.id ?? "");
    const preset = engine.presets[0];
    const tape = preset
      ? buildPresetTape(engine, preset)
      : [engine.createInitialFrame({} as TConfig)];
    setFrames(tape);
    setCurrentIndex(0);
    setIsPlaying(false);
  }

  const currentFrame = frames[currentIndex] || frames[0];
  const lanes = projector(currentFrame);
  const missions = getMissionsForSimulation(engine.id);

  const handleDismissWelcome = () => {
    setShowWelcomeTip(false);
    localStorage.setItem("bvl.lab.hide_welcome", "true");
  };

  // Check mission completion
  useEffect(() => {
    if (missions.length === 0) return;
    missions.forEach((m) => {
      if (
        !completedMissionIds.includes(m.id) &&
        m.checkCompleted(currentFrame.state as unknown as Record<string, unknown>)
      ) {
        setCompletedMissionIds((prev) => [...prev, m.id]);
        playSuccess();
      }
    });
  }, [currentFrame.state, missions, completedMissionIds]);

  // Check for any failing invariants to trigger subtle alert
  useEffect(() => {
    const hasFailures = currentFrame.invariants.some((inv) => !inv.passed);
    if (hasFailures) {
      playAlert();
    }
  }, [currentFrame.invariants]);

  // Playback Auto-Stepper
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev < frames.length - 1) {
          playStep();
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, 1800);
    return () => clearInterval(timer);
  }, [isPlaying, frames.length]);

  const handleSelectPreset = useCallback((presetId: string) => {
    playClick();
    setSelectedPresetId(presetId);
    setIsPlaying(false);
    const preset = engine.presets.find((p) => p.id === presetId);
    if (preset) {
      const tape = buildPresetTape(engine, preset);
      setFrames(tape);
      setCurrentIndex(0);
    }
  }, [engine]);

  const handleReset = useCallback(() => {
    playClick();
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const handleStepBack = useCallback(() => {
    playClick();
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleStepForward = useCallback(() => {
    playStep();
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(frames.length - 1, prev + 1));
  }, [frames.length]);

  const handleTogglePlay = useCallback(() => {
    playClick();
    setIsPlaying((prev) => !prev);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    playClick();
    setIsFullscreen((prev) => !prev);
  }, []);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        handleStepForward();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleReset();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (["1", "2", "3"].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (engine.presets[idx]) {
          handleSelectPreset(engine.presets[idx].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleStepForward, handleTogglePlay, handleReset, handleToggleFullscreen, handleSelectPreset, engine.presets]);

  const handleDispatchCommand = (cmd: TCommand) => {
    playStep();
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
    <section
      className={`workbench-container ${isFullscreen ? "is-fullscreen" : ""}`}
      aria-label="Interactive Simulation Lab Workbench"
    >
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
            title="Reset to initial state (Tick 1) [R]"
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
            onClick={handleTogglePlay}
            className="btn btn-primary"
            title={isPlaying ? "Pause simulation [P]" : "Auto-play simulation steps [P]"}
            aria-label={isPlaying ? "Pause simulation" : "Auto-play simulation steps"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>
          <button
            onClick={handleStepForward}
            className="btn"
            disabled={currentIndex === frames.length - 1}
            title="Step Forward [Space]"
            aria-label="Step Forward"
          >
            <span>Step</span>
            <ChevronRight size={16} />
          </button>
          <span className="step-indicator">
            Tick {currentIndex + 1} / {frames.length}
          </span>
          <button
            onClick={handleToggleFullscreen}
            className="btn"
            title={isFullscreen ? "Exit Fullscreen [F]" : "Enter Fullscreen Lab Mode [F]"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Lab Mode"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? "Exit Full" : "Fullscreen"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClick();
              setShowGuideModal(true);
            }}
            className="btn btn-guide"
            style={{
              backgroundColor: "var(--accent-quiet)",
              borderColor: "var(--accent-subtle)",
              color: "var(--accent-strong)",
              fontWeight: 600,
            }}
            title="Open comprehensive visual guide on how to interact with this lab"
          >
            <HelpCircle size={14} />
            <span>How to Use?</span>
          </button>
        </div>
      </div>

      {/* 2. Welcome First-Time User Onboarding Strip */}
      {showWelcomeTip ? (
        <div className="lab-welcome-callout">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1 }}>
            <Compass size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "var(--text-xs)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text-primary)" }}>New to this simulation workbench?</strong>{" "}
              <span style={{ color: "var(--text-secondary)" }}>
                <strong>1.</strong> Select a <em>Scenario</em> for predefined incident tapes &bull;{" "}
                <strong>2.</strong> Press <em>Step (Space)</em> or <em>Play (P)</em> to advance discrete ticks &bull;{" "}
                <strong>3.</strong> Use <em>Actions &amp; Fault Injection</em> controls below to test system invariants.
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                playClick();
                setShowGuideModal(true);
              }}
              className="btn"
              style={{ fontSize: "var(--text-xs)", padding: "2px 8px" }}
            >
              View Guide
            </button>
            <button
              type="button"
              onClick={handleDismissWelcome}
              className="icon-button"
              style={{ width: "24px", height: "24px" }}
              title="Dismiss this hint"
              aria-label="Dismiss guide hint"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : null}

      {/* 2. Interactive Mission Challenges HUD */}
      {missions.length > 0 ? (
        <div className="workbench-mission-strip">
          <div className="mission-strip-label">
            <Target size={14} color="var(--accent)" />
            <span>LAB MISSIONS:</span>
          </div>
          <div className="mission-badges-wrap">
            {missions.map((m) => {
              const isDone = completedMissionIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  className={`mission-badge ${isDone ? "is-completed" : ""}`}
                  title={`${m.goal} (Hint: ${m.hint})`}
                >
                  {isDone ? (
                    <CheckCircle2 size={13} className="mission-icon-done" />
                  ) : (
                    <Circle size={13} className="mission-icon-pending" />
                  )}
                  <span className="mission-title">{m.title}</span>
                  {isDone ? <span className="mission-tag-done">SOLVED</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

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

      {/* 4. Interactive Lab Field Guide Modal */}
      {showGuideModal ? (
        <div
          className="lab-guide-modal-backdrop"
          onClick={() => setShowGuideModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lab-guide-title"
        >
          <div
            className="lab-guide-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "var(--space-3)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Compass size={20} color="var(--accent)" />
                <h3
                  id="lab-guide-title"
                  style={{
                    margin: 0,
                    fontSize: "var(--text-md)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Interactive Simulation Field Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="icon-button"
                title="Close guide"
                aria-label="Close guide modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="lab-guide-grid">
              {/* Card 1 */}
              <div className="lab-guide-card">
                <div className="lab-guide-card-title">
                  <Sliders size={16} color="var(--accent)" />
                  <span>1. Controls &amp; Shortcuts</span>
                </div>
                <div className="lab-guide-card-body">
                  <span>Control the simulation timeline with discrete precision:</span>
                  <ul>
                    <li><code>Space</code> / <strong>Next</strong>: Advance by 1 state frame.</li>
                    <li><code>P</code> / <strong>Play</strong>: Toggle automated playback loop.</li>
                    <li><code>R</code> / <strong>Reset</strong>: Revert to initial steady state.</li>
                    <li><code>F</code>: Toggle Fullscreen workbench.</li>
                    <li>Number keys <code>1</code>, <code>2</code>, <code>3</code>: Quick-select incident presets.</li>
                  </ul>
                </div>
              </div>

              {/* Card 2 */}
              <div className="lab-guide-card">
                <div className="lab-guide-card-title">
                  <Activity size={16} color="var(--ok)" />
                  <span>2. Visual Tones &amp; System Health</span>
                </div>
                <div className="lab-guide-card-body">
                  <span>Visual tones across lanes faithfully reflect real system conditions:</span>
                  <ul>
                    <li><strong style={{ color: "var(--ok)" }}>Green (Normal)</strong>: Stable processing, committed state, cache hit.</li>
                    <li><strong style={{ color: "var(--warn)" }}>Amber (Warning)</strong>: Dirty buffer, rebalancing, cache miss, pending.</li>
                    <li><strong style={{ color: "var(--danger)" }}>Red (Danger)</strong>: Lock contention, starvation, unhandled exception, leak.</li>
                    <li><strong style={{ color: "var(--accent)" }}>Blue (Active)</strong>: Currently inspected node or pointer.</li>
                  </ul>
                </div>
              </div>

              {/* Card 3 */}
              <div className="lab-guide-card">
                <div className="lab-guide-card-title">
                  <Lightbulb size={16} color="var(--accent)" />
                  <span>3. Actions &amp; Fault Injection</span>
                </div>
                <div className="lab-guide-card-body">
                  <span>Proactively interact with the system via domain controls below:</span>
                  <ul>
                    <li>Produce messages, crash consumers, flush buffers, commit transactions.</li>
                    <li>Every action dispatches an explicit Command into the State Machine.</li>
                    <li>Inspect immediate consequences in the <strong>Protocol Events</strong> and <strong>Invariants</strong> tabs.</li>
                  </ul>
                </div>
              </div>

              {/* Card 4 */}
              <div className="lab-guide-card">
                <div className="lab-guide-card-title">
                  <Target size={16} color="var(--ok)" />
                  <span>4. Hands-on Lab Missions</span>
                </div>
                <div className="lab-guide-card-body">
                  <span>Build real architectural intuition through targeted challenges:</span>
                  <ul>
                    <li>Review the challenge goal on the <strong>LAB MISSIONS</strong> bar.</li>
                    <li>Manipulate the system into the target state (e.g. trigger rebalance storm, deadlock).</li>
                    <li>When invariants are satisfied, the mission badge unlocks as <code>[SOLVED]</code>!</li>
                  </ul>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "var(--space-5)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setShowGuideModal(false);
                }}
                className="btn btn-primary"
                style={{ fontSize: "var(--text-xs)" }}
              >
                Got it, let's explore!
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
