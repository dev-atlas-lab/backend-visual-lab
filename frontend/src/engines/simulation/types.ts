import type { SimulationFidelityContract, SimulationId } from "../../domain";

export interface SimulationProtocolEvent {
  tick: number;
  actor: string;
  action: string;
  detail: string;
  tone: "info" | "ok" | "warn" | "danger";
}

export interface SimulationInvariantCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface SimulationStepFrame<TState> {
  tick: number;
  phase: string;
  title: string;
  state: TState;
  events: SimulationProtocolEvent[];
  invariants: SimulationInvariantCheck[];
  narration: {
    summaryVi: string;
    internalsNoteVi: string;
    productionWarningVi?: string;
  };
  metrics: Record<string, string | number>;
}

export interface SimulationPreset<TConfig, TCommand> {
  id: string;
  title: string;
  badge: string;
  descriptionVi: string;
  config: TConfig;
  scriptedCommands: TCommand[];
}

export interface SimulationEngineSpec<TConfig, TState, TCommand> {
  id: SimulationId;
  title: string;
  fidelity: SimulationFidelityContract;
  presets: SimulationPreset<TConfig, TCommand>[];
  createInitialFrame: (config: TConfig) => SimulationStepFrame<TState>;
  applyCommand: (
    currentFrame: SimulationStepFrame<TState>,
    command: TCommand,
    config: TConfig,
  ) => SimulationStepFrame<TState>;
}

export function buildPresetTape<TConfig, TState, TCommand>(
  engine: SimulationEngineSpec<TConfig, TState, TCommand>,
  preset: SimulationPreset<TConfig, TCommand>,
): SimulationStepFrame<TState>[] {
  const frames: SimulationStepFrame<TState>[] = [];
  let current = engine.createInitialFrame(preset.config);
  frames.push(current);

  for (const cmd of preset.scriptedCommands) {
    current = engine.applyCommand(current, cmd, preset.config);
    frames.push(current);
  }
  return frames;
}
