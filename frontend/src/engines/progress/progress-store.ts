import { z } from "zod";

export const PROGRESS_STORAGE_KEY = "bvl.progress.v1";

export const moduleProgressEntrySchema = z.object({
  moduleSlug: z.string().min(1),
  completedStages: z.array(z.string()),
  simulationStepsExplored: z.number().int().min(0),
  bestQuizAccuracyPercent: z.number().min(0).max(100).nullable(),
  lastAnswersByQuestionId: z.record(z.string(), z.array(z.string())),
  updatedAt: z.string(),
});

export type ModuleProgressEntry = z.infer<typeof moduleProgressEntrySchema>;

export const progressEnvelopeSchema = z.object({
  version: z.literal(1),
  modules: z.record(z.string(), moduleProgressEntrySchema),
});

export type ProgressEnvelope = z.infer<typeof progressEnvelopeSchema>;

let inMemoryFallback: ProgressEnvelope = {
  version: 1,
  modules: {},
};

export function loadProgressEnvelope(): ProgressEnvelope {
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      return inMemoryFallback;
    }
    const parsed = JSON.parse(raw);
    const validated = progressEnvelopeSchema.safeParse(parsed);
    if (!validated.success) {
      return inMemoryFallback;
    }
    inMemoryFallback = validated.data;
    return validated.data;
  } catch {
    return inMemoryFallback;
  }
}

export function saveProgressEnvelope(envelope: ProgressEnvelope): void {
  inMemoryFallback = envelope;
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Graceful degradation when localStorage is blocked
  }
}

export function recordSimulationInteraction(moduleSlug: string): ProgressEnvelope {
  const current = loadProgressEnvelope();
  const existing = current.modules[moduleSlug] ?? {
    moduleSlug,
    completedStages: [],
    simulationStepsExplored: 0,
    bestQuizAccuracyPercent: null,
    lastAnswersByQuestionId: {},
    updatedAt: new Date().toISOString(),
  };

  const updated: ProgressEnvelope = {
    version: 1,
    modules: {
      ...current.modules,
      [moduleSlug]: {
        ...existing,
        simulationStepsExplored: existing.simulationStepsExplored + 1,
        updatedAt: new Date().toISOString(),
      },
    },
  };
  saveProgressEnvelope(updated);
  return updated;
}

export function recordModuleQuizSubmission(
  moduleSlug: string,
  accuracyPercent: number,
  answersByQuestionId: Record<string, string[]>,
): ProgressEnvelope {
  const current = loadProgressEnvelope();
  const existing = current.modules[moduleSlug] ?? {
    moduleSlug,
    completedStages: [],
    simulationStepsExplored: 0,
    bestQuizAccuracyPercent: null,
    lastAnswersByQuestionId: {},
    updatedAt: new Date().toISOString(),
  };

  const best =
    existing.bestQuizAccuracyPercent === null
      ? accuracyPercent
      : Math.max(existing.bestQuizAccuracyPercent, accuracyPercent);

  const updated: ProgressEnvelope = {
    version: 1,
    modules: {
      ...current.modules,
      [moduleSlug]: {
        ...existing,
        bestQuizAccuracyPercent: best,
        lastAnswersByQuestionId: answersByQuestionId,
        updatedAt: new Date().toISOString(),
      },
    },
  };
  saveProgressEnvelope(updated);
  return updated;
}

export function resetAllProgress(): ProgressEnvelope {
  const empty: ProgressEnvelope = { version: 1, modules: {} };
  saveProgressEnvelope(empty);
  return empty;
}
