import { useParams, Link } from "react-router-dom";
import {
  getModuleBySlug,
  getQuestionsForModule,
  getSourceById,
} from "../content";
import { InteractiveWorkbench } from "../components/workbench/InteractiveWorkbench";
import { AssessmentRunner } from "../components/assessment/AssessmentRunner";
import {
  kafkaConsumerGroupSimulation,
  redisStampedeSimulation,
  postgresMvccBtreeSimulation,
} from "../engines/simulation";
import {
  projectKafkaFrameToLanes,
  projectRedisFrameToLanes,
  projectPostgresFrameToLanes,
} from "../engines/visualization/projectors";
import { recordSimulationInteraction } from "../engines/progress/progress-store";
import { ArrowLeft, Clock, ExternalLink, Zap } from "lucide-react";

export function ModuleReaderPage() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const moduleData = getModuleBySlug(moduleSlug ?? "");

  if (!moduleData) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
        <h2>Không tìm thấy Learning Module</h2>
        <p style={{ color: "var(--text-secondary)", margin: "var(--space-4) 0" }}>
          Module với slug "{moduleSlug}" không tồn tại hoặc chưa được xuất bản.
        </p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft size={16} /> Quay lại Danh mục Catalog
        </Link>
      </div>
    );
  }

  const questions = getQuestionsForModule(moduleData.id);

  const handleSimInteraction = () => {
    recordSimulationInteraction(moduleData.slug);
  };

  return (
    <article style={{ maxWidth: "var(--lesson-reading-width)", margin: "0 auto" }}>
      {/* Back Link & Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-3)",
          }}
        >
          <ArrowLeft size={14} /> Danh mục Modules
        </Link>

        <h1 style={{ fontSize: "28px", fontWeight: "800", lineHeight: "1.3", marginBottom: "var(--space-2)" }}>
          {moduleData.title}
        </h1>
        <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
          {moduleData.subtitle}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-subtle)",
              color: "var(--accent-primary)",
              fontWeight: "700",
            }}
          >
            {moduleData.domainId.toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
            }}
          >
            Độ khó: {moduleData.difficulty}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Clock size={12} /> {moduleData.estimatedMinutes} phút
          </span>
        </div>
      </div>

      {/* Key Terms */}
      <section
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
          Thuật ngữ chuyên ngành cốt lõi:
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          {moduleData.keyTerms.map((term, tIdx) => (
            <div key={tIdx} style={{ fontSize: "12px" }}>
              <strong style={{ color: "var(--accent-primary)" }}>{term.term}</strong>:{" "}
              <span style={{ color: "var(--text-secondary)" }}>{term.definitionVi}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stage 1: WHAT */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "var(--space-3)" }}>
          {moduleData.stages.what.heading}
        </h2>
        {moduleData.stages.what.paragraphs.map((p, pIdx) => (
          <p key={pIdx} style={{ marginBottom: "var(--space-3)", color: "var(--text-primary)", fontSize: "15px" }}>
            {p}
          </p>
        ))}
        {moduleData.stages.what.bulletPoints ? (
          <ul style={{ paddingLeft: "var(--space-4)", color: "var(--text-secondary)", fontSize: "14px" }}>
            {moduleData.stages.what.bulletPoints.map((b, bIdx) => (
              <li key={bIdx} style={{ marginBottom: "4px" }}>
                {b}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Stage 2: WHY */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "var(--space-3)" }}>
          {moduleData.stages.why.heading}
        </h2>
        {moduleData.stages.why.paragraphs.map((p, pIdx) => (
          <p key={pIdx} style={{ marginBottom: "var(--space-3)", color: "var(--text-primary)", fontSize: "15px" }}>
            {p}
          </p>
        ))}
        {moduleData.stages.why.callout ? (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--status-warn-subtle)",
              borderLeft: "4px solid var(--status-warn)",
              borderRadius: "var(--radius-sm)",
              margin: "var(--space-4) 0",
            }}
          >
            <div style={{ fontWeight: "700", color: "var(--status-warn)", fontSize: "13px" }}>
              {moduleData.stages.why.callout.title}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "4px" }}>
              {moduleData.stages.why.callout.body}
            </div>
          </div>
        ) : null}
      </section>

      {/* EMBEDDED INTERACTIVE SIMULATION WORKBENCH */}
      <div style={{ margin: "var(--space-8) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-2)" }}>
          <Zap size={18} color="var(--accent-primary)" />
          <h2 style={{ fontSize: "18px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Phòng Thí nghiệm Tương tác (Interactive Workbench)
          </h2>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
          Thực thi máy trạng thái thuần (Pure TypeScript State Machine). Nhấn Play hoặc từng bước Step Back/Forward để quan sát biến động state và các bất biến giao thức.
        </p>

        {moduleData.simulationId === "kafka-consumer-group" ? (
          <InteractiveWorkbench
            engine={kafkaConsumerGroupSimulation}
            projector={projectKafkaFrameToLanes}
            onCommandDispatched={handleSimInteraction}
            renderCustomControls={(dispatch, state) => (
              <>
                <button
                  onClick={() => dispatch({ type: "PRODUCE_AND_POLL", messagesPerPartition: 5 })}
                  className="btn"
                >
                  Gửi +5 Msg &amp; Poll
                </button>
                <button
                  onClick={() =>
                    dispatch({
                      type: "KILL_CONSUMER",
                      consumerId: "consumer-3",
                      reason: "heartbeat_timeout",
                    })
                  }
                  className="btn btn-danger"
                  disabled={!state.consumers.some((c) => c.id === "consumer-3" && c.status === "ACTIVE")}
                >
                  Kill Consumer C3
                </button>
                <button
                  onClick={() => dispatch({ type: "ADD_CONSUMER" })}
                  className="btn"
                  disabled={state.consumers.filter((c) => c.status === "ACTIVE").length >= 6}
                >
                  + Add Consumer
                </button>
                <button
                  onClick={() => dispatch({ type: "COORDINATOR_COMPLETE_JOIN_SYNC" })}
                  className="btn btn-primary"
                  disabled={state.groupState !== "PreparingRebalance"}
                >
                  Hoàn tất Join/Sync
                </button>
              </>
            )}
          />
        ) : null}

        {moduleData.simulationId === "redis-stampede" ? (
          <InteractiveWorkbench
            engine={redisStampedeSimulation}
            projector={projectRedisFrameToLanes}
            onCommandDispatched={handleSimInteraction}
            renderCustomControls={(dispatch, state) => (
              <>
                <button
                  onClick={() => dispatch({ type: "BURST_READ_REQUESTS" })}
                  className="btn btn-primary"
                >
                  Burst 8 Concurrent Reads
                </button>
                <button
                  onClick={() => dispatch({ type: "ADVANCE_TTL_TO_EXPIRY" })}
                  className="btn btn-danger"
                  disabled={state.ttlRemainingMs === 0}
                >
                  Expire TTL (0ms)
                </button>
                <button
                  onClick={() => dispatch({ type: "COMPLETE_DB_RECOMPUTE_AND_SET" })}
                  className="btn"
                  disabled={state.dbActiveConnections === 0}
                >
                  Refill Cache từ DB
                </button>
                <button
                  onClick={() =>
                    dispatch({
                      type: "SWITCH_STRATEGY",
                      strategy:
                        state.strategy === "naive-cache-aside"
                          ? "mutex-singleflight-lock"
                          : state.strategy === "mutex-singleflight-lock"
                            ? "logical-ttl-early-refresh"
                            : "naive-cache-aside",
                    })
                  }
                  className="btn"
                >
                  Đổi Chiến Lược ({state.strategy})
                </button>
              </>
            )}
          />
        ) : null}

        {moduleData.simulationId === "postgres-mvcc-btree" ? (
          <InteractiveWorkbench
            engine={postgresMvccBtreeSimulation}
            projector={projectPostgresFrameToLanes}
            onCommandDispatched={handleSimInteraction}
            renderCustomControls={(dispatch, state) => (
              <>
                <button
                  onClick={() => dispatch({ type: "EXECUTE_READER_SELECT" })}
                  className="btn btn-primary"
                >
                  Execute Reader SELECT
                </button>
                <button
                  onClick={() =>
                    dispatch({ type: "WRITER_UPDATE_ACCOUNT_BALANCE", newBalanceUsd: 950 })
                  }
                  className="btn btn-danger"
                  disabled={state.heapTuples.some((t) => t.ctid === "(0,3)")}
                >
                  Writer UPDATE balance = $950
                </button>
                <button
                  onClick={() => dispatch({ type: "WRITER_COMMIT_TRANSACTION" })}
                  className="btn"
                  disabled={state.writerCommitted || !state.heapTuples.some((t) => t.ctid === "(0,3)")}
                >
                  Writer COMMIT Tx 202
                </button>
                <button
                  onClick={() => dispatch({ type: "RUN_VACUUM_UPDATE_VISIBILITY_MAP" })}
                  className="btn"
                  disabled={!state.writerCommitted || state.visibilityMapAllVisible}
                >
                  Run VACUUM &amp; Update VM
                </button>
                <button
                  onClick={() =>
                    dispatch({
                      type: "SWITCH_ISOLATION_OR_SCAN",
                      isolationLevel:
                        state.isolationLevel === "READ COMMITTED" ? "REPEATABLE READ" : "READ COMMITTED",
                      scanType: state.scanType,
                    })
                  }
                  className="btn"
                >
                  Đổi Level ({state.isolationLevel})
                </button>
              </>
            )}
          />
        ) : null}
      </div>

      {/* Stage 3: HOW */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "var(--space-3)" }}>
          {moduleData.stages.how.heading}
        </h2>
        {moduleData.stages.how.paragraphs.map((p, pIdx) => (
          <p key={pIdx} style={{ marginBottom: "var(--space-3)", color: "var(--text-primary)", fontSize: "15px" }}>
            {p}
          </p>
        ))}
      </section>

      {/* Stage 4: INTERNALS */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "var(--space-3)" }}>
          {moduleData.stages.internals.heading}
        </h2>
        {moduleData.stages.internals.paragraphs.map((p, pIdx) => (
          <p key={pIdx} style={{ marginBottom: "var(--space-3)", color: "var(--text-primary)", fontSize: "15px" }}>
            {p}
          </p>
        ))}
        {moduleData.stages.internals.codeSnippet ? (
          <div style={{ margin: "var(--space-4) 0" }}>
            <div
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
                marginBottom: "4px",
              }}
            >
              {moduleData.stages.internals.codeSnippet.caption}:
            </div>
            <pre
              style={{
                background: "var(--surface-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-4)",
                overflowX: "auto",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              <code>{moduleData.stages.internals.codeSnippet.code}</code>
            </pre>
          </div>
        ) : null}
      </section>

      {/* Stage 5: TRADE-OFFS */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "var(--space-3)" }}>
          {moduleData.stages.tradeOffs.heading}
        </h2>
        {moduleData.stages.tradeOffs.paragraphs.map((p, pIdx) => (
          <p key={pIdx} style={{ marginBottom: "var(--space-3)", color: "var(--text-primary)", fontSize: "15px" }}>
            {p}
          </p>
        ))}
        {moduleData.stages.tradeOffs.bulletPoints ? (
          <ul style={{ paddingLeft: "var(--space-4)", color: "var(--text-secondary)", fontSize: "14px" }}>
            {moduleData.stages.tradeOffs.bulletPoints.map((b, bIdx) => (
              <li key={bIdx} style={{ marginBottom: "4px" }}>
                {b}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Stage 6: FAILURE SCENARIOS */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "var(--space-3)" }}>
          {moduleData.stages.failureScenarios.heading}
        </h2>
        {moduleData.stages.failureScenarios.paragraphs.map((p, pIdx) => (
          <p key={pIdx} style={{ marginBottom: "var(--space-3)", color: "var(--text-primary)", fontSize: "15px" }}>
            {p}
          </p>
        ))}
        {moduleData.stages.failureScenarios.callout ? (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--status-danger-subtle)",
              borderLeft: "4px solid var(--status-danger)",
              borderRadius: "var(--radius-sm)",
              margin: "var(--space-4) 0",
            }}
          >
            <div style={{ fontWeight: "700", color: "var(--status-danger)", fontSize: "13px" }}>
              {moduleData.stages.failureScenarios.callout.title}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "4px" }}>
              {moduleData.stages.failureScenarios.callout.body}
            </div>
          </div>
        ) : null}
      </section>

      {/* Stage 7: PRODUCTION ENGINEERING */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "var(--space-3)" }}>
          {moduleData.stages.productionEngineering.heading}
        </h2>
        {moduleData.stages.productionEngineering.paragraphs.map((p, pIdx) => (
          <p key={pIdx} style={{ marginBottom: "var(--space-3)", color: "var(--text-primary)", fontSize: "15px" }}>
            {p}
          </p>
        ))}
      </section>

      {/* Sources & Citations */}
      <section
        style={{
          padding: "var(--space-4)",
          background: "var(--surface-1)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          margin: "var(--space-6) 0",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
          Tài liệu &amp; Đặc tả Kỹ thuật Tham chiếu (Authoritative Sources):
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "var(--space-2)" }}>
          {moduleData.sourceIds.map((sid) => {
            const src = getSourceById(sid);
            if (!src) return null;
            return (
              <div key={src.id} style={{ fontSize: "12px" }}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  {src.title} ({src.publisher}) <ExternalLink size={12} />
                </a>
                <span style={{ color: "var(--text-secondary)", marginLeft: "6px" }}>
                  — {src.supports}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Assessment Question Bank */}
      <AssessmentRunner moduleSlug={moduleData.slug} questions={questions} />
    </article>
  );
}
