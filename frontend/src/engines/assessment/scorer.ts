import type { ScenarioQuestion } from "../../domain";

export interface QuestionEvaluationResult {
  questionId: string;
  selectedChoiceIds: string[];
  correctChoiceIds: string[];
  isCorrect: boolean;
  isAnswered: boolean;
}

export interface ModuleAssessmentSummary {
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracyPercent: number;
  resultsByQuestionId: Record<string, QuestionEvaluationResult>;
}

export function evaluateScenarioQuestion(
  question: ScenarioQuestion,
  selectedChoiceIds: string[],
): QuestionEvaluationResult {
  const normalizedSelected = Array.from(new Set(selectedChoiceIds)).sort();
  const normalizedCorrect = Array.from(new Set(question.correctChoiceIds)).sort();

  const isAnswered = normalizedSelected.length > 0;
  const isCorrect =
    normalizedSelected.length === normalizedCorrect.length &&
    normalizedSelected.every((val, idx) => val === normalizedCorrect[idx]);

  return {
    questionId: question.id,
    selectedChoiceIds: normalizedSelected,
    correctChoiceIds: normalizedCorrect,
    isCorrect,
    isAnswered,
  };
}

export function scoreModuleAssessment(
  questions: ScenarioQuestion[],
  answersByQuestionId: Record<string, string[]>,
): ModuleAssessmentSummary {
  const resultsByQuestionId: Record<string, QuestionEvaluationResult> = {};
  let answeredCount = 0;
  let correctCount = 0;

  for (const q of questions) {
    const selected = answersByQuestionId[q.id] ?? [];
    const res = evaluateScenarioQuestion(q, selected);
    resultsByQuestionId[q.id] = res;
    if (res.isAnswered) {
      answeredCount++;
    }
    if (res.isCorrect) {
      correctCount++;
    }
  }

  const totalQuestions = questions.length;
  const accuracyPercent =
    totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);

  return {
    totalQuestions,
    answeredCount,
    correctCount,
    accuracyPercent,
    resultsByQuestionId,
  };
}
