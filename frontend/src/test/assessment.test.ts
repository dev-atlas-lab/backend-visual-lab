import { describe, it, expect, beforeEach } from "vitest";
import {
  scoreModuleAssessment,
  evaluateScenarioQuestion,
} from "../engines/assessment/scorer";
import {
  loadProgressEnvelope,
  recordSimulationInteraction,
  recordModuleQuizSubmission,
  resetAllProgress,
} from "../engines/progress/progress-store";
import { questionBank } from "../content/questions";

describe("Assessment Scorer Engine", () => {
  const singleChoiceQ = questionBank.find((q) => q.type === "single-choice")!;
  const multiResponseQ = questionBank.find((q) => q.type === "multiple-response")!;

  it("scores single-choice question accurately", () => {
    const correctRes = evaluateScenarioQuestion(singleChoiceQ, singleChoiceQ.correctChoiceIds);
    expect(correctRes.isCorrect).toBe(true);

    const wrongRes = evaluateScenarioQuestion(singleChoiceQ, ["wrong-choice-id"]);
    expect(wrongRes.isCorrect).toBe(false);
  });

  it("enforces exact-set match for multiple-response questions", () => {
    // Exact match
    const exactRes = evaluateScenarioQuestion(multiResponseQ, multiResponseQ.correctChoiceIds);
    expect(exactRes.isCorrect).toBe(true);

    // Partial match (fails exact-set)
    const partialRes = evaluateScenarioQuestion(multiResponseQ, [multiResponseQ.correctChoiceIds[0]]);
    expect(partialRes.isCorrect).toBe(false);
  });

  it("computes overall accuracy percentage", () => {
    const summary = scoreModuleAssessment([singleChoiceQ, multiResponseQ], {
      [singleChoiceQ.id]: singleChoiceQ.correctChoiceIds,
      [multiResponseQ.id]: multiResponseQ.correctChoiceIds,
    });
    expect(summary.totalQuestions).toBe(2);
    expect(summary.correctCount).toBe(2);
    expect(summary.accuracyPercent).toBe(100);
  });
});

describe("Progress Persistence Store", () => {
  beforeEach(() => {
    resetAllProgress();
  });

  it("tracks simulation step exploration", () => {
    recordSimulationInteraction("kafka-consumer-groups-rebalance");
    recordSimulationInteraction("kafka-consumer-groups-rebalance");
    const progress = loadProgressEnvelope();
    expect(progress.modules["kafka-consumer-groups-rebalance"].simulationStepsExplored).toBe(2);
  });

  it("records quiz accuracy and updates best score", () => {
    recordModuleQuizSubmission("kafka-consumer-groups-rebalance", 50, {});
    let progress = loadProgressEnvelope();
    expect(progress.modules["kafka-consumer-groups-rebalance"].bestQuizAccuracyPercent).toBe(50);

    recordModuleQuizSubmission("kafka-consumer-groups-rebalance", 100, {});
    progress = loadProgressEnvelope();
    expect(progress.modules["kafka-consumer-groups-rebalance"].bestQuizAccuracyPercent).toBe(100);
  });
});
