import { useState } from "react";
import type { ScenarioQuestion } from "../../domain";
import {
  evaluateScenarioQuestion,
  scoreModuleAssessment,
} from "../../engines/assessment/scorer";
import { recordModuleQuizSubmission } from "../../engines/progress/progress-store";
import { CheckCircle2, AlertCircle, HelpCircle, ArrowRight } from "lucide-react";

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
    <section
      style={{
        backgroundColor: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        marginTop: "var(--space-8)",
      }}
      aria-label="Kiểm tra kiến thức kịch bản thực chiến"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "700" }}>Kiểm tra Kiến thức Thực chiến</h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Câu hỏi tình huống kỹ thuật chuẩn quốc tế (tiếng Anh) kết hợp giải thích chi tiết từng lựa chọn (tiếng Việt).
          </p>
        </div>
        {submitted && summary ? (
          <div
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-mono)",
              fontWeight: "700",
              backgroundColor: summary.accuracyPercent >= 80 ? "var(--status-ok-subtle)" : "var(--status-warn-subtle)",
              color: summary.accuracyPercent >= 80 ? "var(--status-ok)" : "var(--status-warn)",
            }}
          >
            Độ chính xác: {summary.correctCount} / {summary.totalQuestions} ({summary.accuracyPercent}%)
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {questions.map((q, qIdx) => {
          const selected = answers[q.id] ?? [];
          const evalResult = submitted ? evaluateScenarioQuestion(q, selected) : null;

          return (
            <div
              key={q.id}
              style={{
                background: "var(--surface-2)",
                padding: "var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "var(--space-2)" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    fontWeight: "700",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-subtle)",
                    color: "var(--accent-primary)",
                  }}
                >
                  Q{qIdx + 1} &bull; {q.type === "single-choice" ? "Single Choice" : "Multiple Response"}
                </span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{q.stem}</span>
              </div>

              {/* Choices */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "var(--space-3)" }}>
                {q.choices.map((choice) => {
                  const isChecked = selected.includes(choice.id);
                  let choiceBorder = "var(--border-subtle)";
                  let choiceBg = "var(--surface-1)";

                  if (submitted) {
                    if (q.correctChoiceIds.includes(choice.id)) {
                      choiceBorder = "var(--status-ok)";
                      choiceBg = "var(--status-ok-subtle)";
                    } else if (isChecked && !q.correctChoiceIds.includes(choice.id)) {
                      choiceBorder = "var(--status-danger)";
                      choiceBg = "var(--status-danger-subtle)";
                    }
                  } else if (isChecked) {
                    choiceBorder = "var(--accent-primary)";
                    choiceBg = "var(--accent-subtle)";
                  }

                  return (
                    <div
                      key={choice.id}
                      onClick={() => handleToggleChoice(q, choice.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${choiceBorder}`,
                        backgroundColor: choiceBg,
                        cursor: submitted ? "default" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type={q.type === "single-choice" ? "radio" : "checkbox"}
                          name={q.id}
                          checked={isChecked}
                          onChange={() => handleToggleChoice(q, choice.id)}
                          disabled={submitted}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                          <strong>({choice.id.toUpperCase()})</strong> {choice.text}
                        </span>
                      </div>

                      {/* Post-submit Choice Explanation */}
                      {submitted ? (
                        <div
                          style={{
                            marginTop: "6px",
                            paddingLeft: "26px",
                            fontSize: "12px",
                            color: q.correctChoiceIds.includes(choice.id) ? "var(--status-ok)" : "var(--text-secondary)",
                          }}
                        >
                          &bull; {choice.explanationVi}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Correct Overall Explanation */}
              {submitted && evalResult ? (
                <div
                  style={{
                    marginTop: "var(--space-3)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: evalResult.isCorrect ? "var(--status-ok-subtle)" : "var(--status-warn-subtle)",
                    fontSize: "12px",
                  }}
                >
                  <strong style={{ color: evalResult.isCorrect ? "var(--status-ok)" : "var(--status-warn)" }}>
                    {evalResult.isCorrect ? "CHÍNH XÁC: " : "GIẢI THÍCH CHUYÊN SÂU: "}
                  </strong>
                  <span style={{ color: "var(--text-primary)" }}>{q.correctExplanationVi}</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)" }}>
        {!submitted ? (
          <button onClick={handleSubmit} className="btn btn-primary" style={{ padding: "8px 20px" }}>
            Nộp bài &amp; Xem lời giải
          </button>
        ) : (
          <button onClick={handleRetry} className="btn" style={{ padding: "8px 20px" }}>
            Làm lại bài kiểm tra
          </button>
        )}
      </div>
    </section>
  );
}
