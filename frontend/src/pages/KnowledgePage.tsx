import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  HelpCircle,
  Bookmark,
  ExternalLink,
  Search,
  CheckCircle2,
} from "lucide-react";
import { learningModules } from "../content/modules";
import { questionBank } from "../content/questions";
import { authoritativeSources } from "../content/sources";
import { playClick } from "../engines/audio/sound-fx";

export function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<"terms" | "questions" | "sources">("terms");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");

  // State for interactive practice in questions tab
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    questionBank[0]?.id || ""
  );
  const [userSelectedChoices, setUserSelectedChoices] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Collect all key terms across all 14 modules
  const allTerms = learningModules.flatMap((m) =>
    m.keyTerms.map((k) => ({
      ...k,
      moduleId: m.id,
      moduleSlug: m.slug,
      moduleTitle: m.title,
      domainId: m.domainId,
    }))
  );

  const filteredTerms = allTerms.filter((term) => {
    const def = term.definition || term.definitionEn || "";
    const matchesDomain = selectedDomain === "all" || term.domainId === selectedDomain;
    const matchesQuery =
      !searchTerm.trim() ||
      term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.moduleTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDomain && matchesQuery;
  });

  const activeQuestion = questionBank.find((q) => q.id === selectedQuestionId);

  const handleChoiceToggle = (choiceId: string, isSingleChoice: boolean) => {
    if (isSubmitted) return;
    playClick();
    if (isSingleChoice) {
      setUserSelectedChoices([choiceId]);
    } else {
      setUserSelectedChoices((prev) =>
        prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId]
      );
    }
  };

  const handleQuestionSubmit = () => {
    playClick();
    setIsSubmitted(true);
  };

  const handleQuestionReset = (nextQId: string) => {
    playClick();
    setSelectedQuestionId(nextQId);
    setUserSelectedChoices([]);
    setIsSubmitted(false);
  };

  return (
    <div className="knowledge-page" style={{ maxWidth: "var(--max-content-width)", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-2)" }}>
          <BookOpen size={22} color="var(--accent)" />
          <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: 700 }}>
            Knowledge Base &amp; Assessment Library
          </h1>
        </div>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-sm)", maxWidth: "72ch" }}>
          Reference index for backend systems internals, key architectural terms, authoritative protocol
          specifications, and scenario assessment challenges.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "var(--space-6)",
        }}
      >
        <button
          type="button"
          className={`btn ${activeTab === "terms" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            playClick();
            setActiveTab("terms");
          }}
          style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Bookmark size={14} />
          <span>Key Technical Terms ({allTerms.length})</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "questions" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            playClick();
            setActiveTab("questions");
          }}
          style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <HelpCircle size={14} />
          <span>Scenario Assessment Bank ({questionBank.length})</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "sources" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            playClick();
            setActiveTab("sources");
          }}
          style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <ExternalLink size={14} />
          <span>Authoritative Sources &amp; Specs ({authoritativeSources.length})</span>
        </button>
      </div>

      {/* Tab 1: Key Terms */}
      {activeTab === "terms" && (
        <div>
          {/* Filter Bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-3)",
              alignItems: "center",
              marginBottom: "var(--space-5)",
              background: "var(--surface-1)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 240px" }}>
              <Search size={16} color="var(--text-tertiary)" />
              <input
                type="text"
                placeholder="Search key terms (e.g. MVCC, KIP-429, CAS, JMM)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-sm)",
                  width: "100%",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              {["all", "java", "messaging", "databases", "caching"].map((dom) => (
                <button
                  key={dom}
                  type="button"
                  className={`btn ${selectedDomain === dom ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setSelectedDomain(dom)}
                  style={{
                    fontSize: "var(--text-xs)",
                    padding: "3px 10px",
                    textTransform: "capitalize",
                  }}
                >
                  {dom === "all" ? "All Domains" : dom}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Key Terms */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            {filteredTerms.map((t, idx) => (
              <div
                key={`${t.term}-${idx}`}
                style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-4)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "var(--text-base)",
                        fontWeight: 700,
                        color: "var(--accent)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {t.term}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.625rem",
                        fontFamily: "var(--font-mono)",
                        padding: "1px 6px",
                        borderRadius: "var(--radius-full)",
                        background: "var(--surface-3)",
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                      }}
                    >
                      {t.domainId}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--text-xs)",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {t.definition || t.definitionEn || t.definitionVi || ""}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "var(--space-3)",
                    paddingTop: "var(--space-2)",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  <Link
                    to={`/domains/${t.domainId}/${t.moduleSlug}`}
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--text-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>View in {t.moduleTitle.split("—")[0].trim()}</span>
                    <ExternalLink size={10} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Scenario Assessment Bank */}
      {activeTab === "questions" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) 1fr", gap: "var(--space-5)" }}>
          {/* Question List Sidebar */}
          <div
            style={{
              background: "var(--surface-1)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              padding: "var(--space-3)",
              maxHeight: "75vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <p
              style={{
                margin: "0 0 var(--space-2) 0",
                fontSize: "0.6875rem",
                fontWeight: 700,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}
            >
              Select Question ({questionBank.length})
            </p>
            {questionBank.map((q, idx) => {
              const isSelected = q.id === selectedQuestionId;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleQuestionReset(q.id)}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: isSelected ? "var(--accent-subtle)" : "transparent",
                    border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                    color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "var(--text-xs)",
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", fontWeight: 700 }}>
                      Q{idx + 1} &bull; {q.domainId.toUpperCase()}
                    </span>
                    <span style={{ fontSize: "0.625rem", color: "var(--text-tertiary)" }}>
                      {q.type === "single-choice" ? "1 Choice" : "Multi-Choice"}
                    </span>
                  </div>
                  <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {q.stem}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Question Card */}
          {activeQuestion && (
            <div
              style={{
                background: "var(--surface-1)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                padding: "var(--space-5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "var(--space-3)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    color: "var(--accent)",
                    fontWeight: 700,
                  }}
                >
                  Scenario Challenge &bull; {activeQuestion.domainId.toUpperCase()}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.625rem",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--surface-3)",
                  }}
                >
                  {activeQuestion.type === "single-choice" ? "Single Answer" : "Select All Correct"}
                </span>
              </div>

              <h2 style={{ fontSize: "var(--text-md)", fontWeight: 600, margin: "0 0 var(--space-4) 0", lineHeight: 1.5 }}>
                {activeQuestion.stem}
              </h2>

              {/* Choices */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                {activeQuestion.choices.map((c) => {
                  const isChecked = userSelectedChoices.includes(c.id);
                  const isCorrect = activeQuestion.correctChoiceIds.includes(c.id);

                  let borderColor = "var(--border-subtle)";
                  let bgColor = "var(--surface-2)";

                  if (isSubmitted) {
                    if (isCorrect) {
                      borderColor = "var(--ok)";
                      bgColor = "var(--ok-quiet)";
                    } else if (isChecked && !isCorrect) {
                      borderColor = "var(--danger)";
                      bgColor = "var(--danger-quiet)";
                    }
                  } else if (isChecked) {
                    borderColor = "var(--accent)";
                    bgColor = "var(--accent-subtle)";
                  }

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleChoiceToggle(c.id, activeQuestion.type === "single-choice")}
                      style={{
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${borderColor}`,
                        background: bgColor,
                        cursor: isSubmitted ? "default" : "pointer",
                        transition: "all var(--duration-fast) var(--ease-out)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <span
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: activeQuestion.type === "single-choice" ? "50%" : "4px",
                            border: `1px solid ${isChecked ? "var(--accent)" : "var(--border-strong)"}`,
                            display: "grid",
                            placeItems: "center",
                            fontSize: "0.6875rem",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            background: isChecked ? "var(--accent)" : "transparent",
                            color: isChecked ? "var(--surface-0)" : "var(--text-secondary)",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        >
                          {c.id.toUpperCase()}
                        </span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "var(--text-xs)", lineHeight: 1.5, color: "var(--text-primary)" }}>
                            {c.text}
                          </span>
                          {isSubmitted && (
                            <div
                              style={{
                                marginTop: "var(--space-2)",
                                fontSize: "0.6875rem",
                                color: isCorrect ? "var(--ok)" : "var(--text-tertiary)",
                                lineHeight: 1.4,
                              }}
                            >
                              <strong>{isCorrect ? "Correct: " : "Analysis: "}</strong>
                              {c.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions & Explanations */}
              {!isSubmitted ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleQuestionSubmit}
                  disabled={userSelectedChoices.length === 0}
                  style={{ fontSize: "var(--text-xs)" }}
                >
                  Submit Answer for Evaluation
                </button>
              ) : (
                <div
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-3)",
                    border: "1px solid var(--border-strong)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <CheckCircle2 size={16} color="var(--ok)" />
                    <strong style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}>
                      Authoritative Explanation:
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {activeQuestion.correctExplanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Authoritative Sources */}
      {activeTab === "sources" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
          {authoritativeSources.map((s) => (
            <div
              key={s.id}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.625rem",
                      padding: "1px 6px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--surface-3)",
                      color: "var(--accent)",
                      fontWeight: 700,
                    }}
                  >
                    {s.publisher}
                  </span>
                  <span style={{ fontSize: "0.625rem", color: "var(--text-tertiary)" }}>
                    Verified Spec
                  </span>
                </div>
                <h3 style={{ margin: "0 0 var(--space-2) 0", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
                  {s.title}
                </h3>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Supports: {s.supports}
                </p>
              </div>

              <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--border-subtle)" }}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontWeight: 600,
                  }}
                >
                  <span>Official Specification Reference</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
