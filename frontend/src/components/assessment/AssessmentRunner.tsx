import { useState } from "react";
import type { ScenarioQuestion } from "../../domain";
import {
  evaluateScenarioQuestion,
  scoreModuleAssessment,
} from "../../engines/assessment/scorer";
import { recordModuleQuizSubmission } from "../../engines/progress/progress-store";
import { ShieldCheck, CheckCircle2, XCircle, RotateCcw, Send } from "lucide-react";

interface AssessmentRunnerProps {
  moduleSlug: string;
  questions: ScenarioQuestion[];
}

export function AssessmentRunner({ moduleSlug, questions }: AssessmentRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleToggleChoice = (question: ScenarioQuestion, choiceId: string) => {
    if (submitted) return; // Locked after submission until retry

    const current = answers[question.id] ?? [];
    if (question.type === "single-choice") {
      setAnswers((prev) => ({ ...prev, [question.id]: [choiceId] }));
    } else {
      // multiple-response
      const next = current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId];
      setAnswers((prev) => ({ ...prev, [question.id]: next }));
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const summary = scoreModuleAssessment(questions, answers);
    recordModuleQuizSubmission(moduleSlug, summary.accuracyPercent, answers);
  };

  const handleRetry = () => {
    setSubmitted(false);
    setAnswers({});
  };

  const summary = submitted ? scoreModuleAssessment(questions, answers) : null;

  return (
    <section className="assessment-container" aria-label="Production Scenario Knowledge Check">
      {/* Header */}
      <div className="assessment-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <ShieldCheck size={20} color="var(--accent)" />
            <h3 className="assessment-title">Production Scenario Knowledge Check</h3>
          </div>
          <p className="assessment-desc">
            Challenging architectural scenarios testing failure resilience, protocol semantics, and internal trade-offs.
          </p>
        </div>

        {submitted && summary ? (
          <div
            className={`score-badge ${
              summary.accuracyPercent >= 80 ? "score-badge-success" : "score-badge-warn"
            }`}
          >
            Accuracy Score: {summary.correctCount} / {summary.totalQuestions} ({summary.accuracyPercent}%)
          </div>
        ) : null}
      </div>

      {/* Questions List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {questions.map((q, qIdx) => {
          const selected = answers[q.id] ?? [];
          const evalResult = submitted ? evaluateScenarioQuestion(q, selected) : null;

          return (
            <div key={q.id} className="question-card">
              <div className="question-header">
                <span className="question-num">Scenario #{qIdx + 1}</span>
                <span className="question-badge">{q.type.replace("-", " ")}</span>
                {evalResult && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      color: evalResult.isCorrect ? "var(--ok)" : "var(--danger)",
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {evalResult.isCorrect ? (
                      <>
                        <CheckCircle2 size={14} /> Correct
                      </>
                    ) : (
                      <>
                        <XCircle size={14} /> Incorrect
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="question-stem">{q.stem}</div>

              <div className="choices-list">
                {q.choices.map((choice) => {
                  const isChecked = selected.includes(choice.id);
                  const isChoiceCorrect = q.correctChoiceIds.includes(choice.id);

                  let choiceClass = "choice-label";
                  if (isChecked) choiceClass += " selected";
                  if (submitted) {
                    if (isChoiceCorrect) {
                      choiceClass += " correct";
                    } else if (isChecked && !isChoiceCorrect) {
                      choiceClass += " incorrect";
                    }
                  }

                  return (
                    <label key={choice.id} className={choiceClass}>
                      <input
                        type={q.type === "single-choice" ? "radio" : "checkbox"}
                        name={q.id}
                        value={choice.id}
                        checked={isChecked}
                        disabled={submitted}
                        onChange={() => handleToggleChoice(q, choice.id)}
                        style={{ marginTop: "3px", cursor: submitted ? "not-allowed" : "pointer" }}
                      />
                      <div style={{ flex: "1 1 auto" }}>
                        <div className="choice-text">{choice.text}</div>
                        {submitted && (
                          <div className="choice-rationale">
                            <strong style={{ color: isChoiceCorrect ? "var(--ok)" : "var(--text-tertiary)" }}>
                              {isChoiceCorrect ? "Correct: " : "Analysis: "}
                            </strong>
                            {choice.explanationEn || choice.explanation || choice.explanationVi}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
        {submitted ? (
          <button onClick={handleRetry} className="btn">
            <RotateCcw size={15} /> Retake Assessment
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={Object.keys(answers).length === 0}
          >
            <Send size={15} /> Submit Answers for Evaluation
          </button>
        )}
      </div>
    </section>
  );
}
