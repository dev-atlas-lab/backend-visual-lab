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
  javaMemoryGcSimulation,
  javaHashMapSimulation,
  javaVirtualThreadsSimulation,
  javaExceptionsSimulation,
  javaConcurrencySimulation,
} from "../engines/simulation";
import {
  projectKafkaFrameToLanes,
  projectRedisFrameToLanes,
  projectPostgresFrameToLanes,
  projectJavaMemoryFrameToLanes,
  projectJavaHashMapFrameToLanes,
  projectJavaVirtualThreadsFrameToLanes,
  projectJavaExceptionsFrameToLanes,
  projectJavaConcurrencyFrameToLanes,
} from "../engines/visualization/projectors";
import { recordSimulationInteraction } from "../engines/progress/progress-store";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Zap,
} from "lucide-react";

export function ModuleReaderPage() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const moduleData = getModuleBySlug(moduleSlug ?? "");

  if (!moduleData) {
    return (
      <div style={{ padding: "var(--space-12) var(--space-4)", textAlign: "center" }}>
        <h2 style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-3)" }}>
          Learning Module Not Found
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
          The requested module with slug "{moduleSlug}" was not found or has not been published yet.
        </p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft size={16} /> Return to Catalog
        </Link>
      </div>
    );
  }

  const questions = getQuestionsForModule(moduleData.id);

  const handleSimInteraction = () => {
    recordSimulationInteraction(moduleData.slug);
  };

  const domainName =
    moduleData.domainId === "messaging"
      ? "Messaging & Event Streaming"
      : moduleData.domainId === "databases"
      ? "Databases & Storage Internals"
      : moduleData.domainId === "caching"
      ? "Caching & Redis Internals"
      : moduleData.domainId === "java"
      ? "Java Core & JVM Internals"
      : moduleData.domainId.toUpperCase();

  return (
    <article style={{ maxWidth: "var(--lesson-column)", margin: "0 auto" }}>
      {/* Header */}
      <header className="module-header">
        <Link to="/" className="module-back-link">
          <ArrowLeft size={14} /> Back to Catalog &amp; Roadmap
        </Link>

        <h1 className="module-title">{moduleData.title}</h1>
        <p className="module-subtitle">{moduleData.subtitle}</p>

        <div className="module-meta-chips">
          <span className="module-chip module-chip-accent">{domainName}</span>
          <span className="module-chip">Difficulty: {moduleData.difficulty}</span>
          <span className="module-chip" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Clock size={12} /> {moduleData.estimatedMinutes} mins
          </span>
          <span className="module-chip" style={{ color: "var(--ok)", borderColor: "var(--ok-quiet)" }}>
            &bull; Verified Curriculum
          </span>
        </div>
      </header>

      {/* 7-Stage Pedagogy Stepper Strip */}
      <nav className="pedagogy-stepper" aria-label="7-Stage Pedagogy Progression">
        <div className="pedagogy-stepper-item active">
          <span>1. WHAT</span>
        </div>
        <span className="pedagogy-stepper-sep">&rarr;</span>
        <div className="pedagogy-stepper-item active">
          <span>2. WHY</span>
        </div>
        <span className="pedagogy-stepper-sep">&rarr;</span>
        <div className="pedagogy-stepper-item active">
          <span>3. SIMULATION</span>
        </div>
        <span className="pedagogy-stepper-sep">&rarr;</span>
        <div className="pedagogy-stepper-item active">
          <span>4. HOW</span>
        </div>
        <span className="pedagogy-stepper-sep">&rarr;</span>
        <div className="pedagogy-stepper-item active">
          <span>5. INTERNALS</span>
        </div>
        <span className="pedagogy-stepper-sep">&rarr;</span>
        <div className="pedagogy-stepper-item active">
          <span>6. TRADE-OFFS</span>
        </div>
        <span className="pedagogy-stepper-sep">&rarr;</span>
        <div className="pedagogy-stepper-item active">
          <span>7. PRODUCTION</span>
        </div>
      </nav>

      {/* Essential Key Terms */}
      <section className="key-terms-section" aria-labelledby="key-terms-heading">
        <div className="section-label" id="key-terms-heading">
          Essential Domain Terminology
        </div>
        <div className="key-terms-grid">
          {moduleData.keyTerms.map((term, tIdx) => (
            <div key={tIdx} className="key-term-card">
              <div className="key-term-title">{term.term}</div>
              <p className="key-term-def">
                {term.definitionEn || term.definition || term.definitionVi}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stage 1: WHAT */}
      <section className="pedagogy-stage-card">
        <h2 className="stage-heading">{moduleData.stages.what.heading}</h2>
        {moduleData.stages.what.paragraphs.map((p, pIdx) => (
          <p key={pIdx} className="stage-paragraph">
            {p}
          </p>
        ))}
        {moduleData.stages.what.bulletPoints ? (
          <ul className="stage-bullets">
            {moduleData.stages.what.bulletPoints.map((b, bIdx) => (
              <li key={bIdx}>{b}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Stage 2: WHY */}
      <section className="pedagogy-stage-card">
        <h2 className="stage-heading">{moduleData.stages.why.heading}</h2>
        {moduleData.stages.why.paragraphs.map((p, pIdx) => (
          <p key={pIdx} className="stage-paragraph">
            {p}
          </p>
        ))}
        {moduleData.stages.why.callout ? (
          <div className="callout-box callout-tip">
            <div className="callout-title">{moduleData.stages.why.callout.title}</div>
            <p className="callout-body">{moduleData.stages.why.callout.body}</p>
          </div>
        ) : null}
      </section>

      {/* EMBEDDED INTERACTIVE SIMULATION WORKBENCH */}
      {moduleData.simulationId ? (
        <section style={{ margin: "var(--space-8) 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-2)" }}>
            <Zap size={20} color="var(--accent)" />
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Interactive Simulation Workbench
            </h2>
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
            Pure deterministic TypeScript state machine. Step forward/back or auto-play to inspect state mutations, wire-protocol frames, and invariant assertions.
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
                    Produce +5 Msgs &amp; Poll
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
                    Crash Consumer C3
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
                    Complete Join/Sync
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
                    onClick={() => dispatch({ type: "BURST_CONCURRENT_READS" })}
                    className="btn btn-primary"
                  >
                    Burst 8 Concurrent Reads
                  </button>
                  <button
                    onClick={() => dispatch({ type: "EXPIRE_TTL_IMMEDIATELY" })}
                    className="btn btn-danger"
                    disabled={state.ttlRemainingMs === 0}
                  >
                    Expire TTL (0ms)
                  </button>
                  <button
                    onClick={() => dispatch({ type: "COMPLETE_DB_RECOMPUTE_AND_SET_CACHE" })}
                    className="btn"
                    disabled={state.dbActiveConnections === 0}
                  >
                    Recompute &amp; Refill Cache
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
                    Toggle Strategy ({state.strategy})
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
                    Toggle Isolation ({state.isolationLevel})
                  </button>
                </>
              )}
            />
          ) : null}

          {moduleData.simulationId === "java-memory-gc" ? (
            <InteractiveWorkbench
              engine={javaMemoryGcSimulation}
              projector={projectJavaMemoryFrameToLanes}
              onCommandDispatched={handleSimInteraction}
              renderCustomControls={(dispatch, state) => (
                <>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "ALLOCATE_OBJECT",
                        className: "OrderPayload",
                        varName: "order",
                      })
                    }
                    className="btn btn-primary"
                    disabled={state.isOutOfMemory}
                  >
                    + Allocate new Order()
                  </button>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "PUSH_STACK_FRAME",
                        methodName: "orderService.process()",
                      })
                    }
                    className="btn"
                  >
                    Push Frame (Method Call)
                  </button>
                  <button
                    onClick={() => dispatch({ type: "POP_STACK_FRAME" })}
                    className="btn"
                    disabled={state.threadStack.length <= 1}
                  >
                    Pop Frame (Method Return)
                  </button>
                  <button
                    onClick={() => dispatch({ type: "TRIGGER_MINOR_GC" })}
                    className="btn"
                    disabled={state.isOutOfMemory}
                  >
                    Trigger Minor GC
                  </button>
                  <button
                    onClick={() => dispatch({ type: "TRIGGER_MAJOR_GC" })}
                    className="btn btn-danger"
                    disabled={state.isOutOfMemory}
                  >
                    Major / Full GC
                  </button>
                </>
              )}
            />
          ) : null}

          {moduleData.simulationId === "java-hashmap-treeification" ? (
            <InteractiveWorkbench
              engine={javaHashMapSimulation}
              projector={projectJavaHashMapFrameToLanes}
              onCommandDispatched={handleSimInteraction}
              renderCustomControls={(dispatch, state) => (
                <>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "PUT",
                        key: `user_${state.size + 1}`,
                        value: `data_${state.size + 1}`,
                      })
                    }
                    className="btn btn-primary"
                  >
                    + Put Entry
                  </button>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "BURST_COLLIDING_KEYS",
                        count: 5,
                        targetBucketIndex: 3,
                      })
                    }
                    className="btn btn-danger"
                  >
                    Collide +5 Keys (Bucket #3)
                  </button>
                  <button
                    onClick={() => dispatch({ type: "TRIGGER_RESIZE_DOUBLING" })}
                    className="btn"
                  >
                    Resize Doubling x2
                  </button>
                </>
              )}
            />
          ) : null}

          {moduleData.simulationId === "java-virtual-threads" ? (
            <InteractiveWorkbench
              engine={javaVirtualThreadsSimulation}
              projector={projectJavaVirtualThreadsFrameToLanes}
              onCommandDispatched={handleSimInteraction}
              renderCustomControls={(dispatch) => (
                <>
                  <button
                    onClick={() => dispatch({ type: "SPAWN_TASKS", count: 6 })}
                    className="btn"
                  >
                    + Spawn 6 Virtual Threads
                  </button>
                  <button
                    onClick={() => dispatch({ type: "STEP_EXECUTION" })}
                    className="btn btn-primary"
                  >
                    Step Execution (Mount Carrier)
                  </button>
                  <button
                    onClick={() => dispatch({ type: "TRIGGER_BLOCKING_IO" })}
                    className="btn"
                  >
                    Blocking I/O (Unmount &amp; Yield)
                  </button>
                  <button
                    onClick={() => dispatch({ type: "TRIGGER_SYNCHRONIZED_PINNING" })}
                    className="btn btn-danger"
                  >
                    Pinning synchronized!
                  </button>
                  <button
                    onClick={() => dispatch({ type: "RESOLVE_IO_COMPLETION" })}
                    className="btn"
                  >
                    Resolve I/O Completion
                  </button>
                </>
              )}
            />
          ) : null}

          {moduleData.simulationId === "java-exceptions-stack-unwinding" ? (
            <InteractiveWorkbench
              engine={javaExceptionsSimulation}
              projector={projectJavaExceptionsFrameToLanes}
              onCommandDispatched={handleSimInteraction}
              renderCustomControls={(dispatch, state) => (
                <>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "INVOKE_METHOD",
                        className: "PaymentGatewayClient",
                        methodName: "authorizeTransaction()",
                        hasCatch: false,
                      })
                    }
                    className="btn"
                    disabled={state.callStack.length >= 5 || state.activeThrowable !== null}
                  >
                    + Push Call Frame
                  </button>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "THROW_EXCEPTION",
                        category: "CheckedException",
                        className: "PaymentTimeoutException",
                        message: "Socket read timeout connecting to Visa Gateway after 5000ms",
                      })
                    }
                    className="btn btn-danger"
                    disabled={state.activeThrowable !== null || state.callStack.length === 0}
                  >
                    Throw Checked Exception
                  </button>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "THROW_EXCEPTION",
                        category: "UncheckedException",
                        className: "NullPointerException",
                        message: "Cannot invoke Account.getBalance() because account is null",
                      })
                    }
                    className="btn btn-danger"
                    disabled={state.activeThrowable !== null || state.callStack.length === 0}
                  >
                    Throw Unchecked RuntimeException
                  </button>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "THROW_EXCEPTION",
                        category: "Error",
                        className: "OutOfMemoryError",
                        message: "Java heap space exhausted: requested 64MB array allocation",
                      })
                    }
                    className="btn btn-danger"
                    disabled={state.activeThrowable !== null || state.callStack.length === 0}
                  >
                    Throw Fatal Error!
                  </button>
                  <button
                    onClick={() => dispatch({ type: "STEP_UNWIND" })}
                    className="btn btn-primary"
                    disabled={state.activeThrowable === null && !state.unhandledEscaped}
                  >
                    Step Stack Unwind (athrow)
                  </button>
                </>
              )}
            />
          ) : null}

          {moduleData.simulationId === "java-concurrency-jmm-locks" ? (
            <InteractiveWorkbench
              engine={javaConcurrencySimulation}
              projector={projectJavaConcurrencyFrameToLanes}
              onCommandDispatched={handleSimInteraction}
              renderCustomControls={(dispatch, state) => (
                <>
                  <button
                    onClick={() =>
                      dispatch({ type: "THREAD_ACQUIRE_LOCK", threadId: "thread-1" })
                    }
                    className="btn btn-primary"
                    disabled={state.markWord.ownerThreadId === "thread-1"}
                  >
                    T1 Acquire Lock
                  </button>
                  <button
                    onClick={() =>
                      dispatch({ type: "THREAD_ACQUIRE_LOCK", threadId: "thread-2" })
                    }
                    className="btn"
                    disabled={state.markWord.ownerThreadId === "thread-2"}
                  >
                    T2 Acquire (Contend)
                  </button>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "THREAD_RELEASE_LOCK",
                        threadId: state.markWord.ownerThreadId ?? "thread-1",
                      })
                    }
                    className="btn"
                    disabled={state.markWord.ownerThreadId === null}
                  >
                    Release Lock ({state.markWord.ownerThreadId ?? "None"})
                  </button>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "WRITE_SHARED_VARIABLE",
                        threadId: "thread-1",
                        newValue: state.sharedMainMemoryValue + 1,
                      })
                    }
                    className="btn"
                  >
                    T1 Write (+1)
                  </button>
                  <button
                    onClick={() =>
                      dispatch({ type: "READ_SHARED_VARIABLE", threadId: "thread-2" })
                    }
                    className="btn"
                  >
                    T2 Read Cache
                  </button>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "TOGGLE_VOLATILE",
                        isVolatile: !state.isVolatileVariable,
                      })
                    }
                    className="btn"
                  >
                    Toggle Volatile ({state.isVolatileVariable ? "ON" : "OFF"})
                  </button>
                  <button
                    onClick={() =>
                      dispatch({ type: "SIMULATE_CONTENTION", threadCount: 3 })
                    }
                    className="btn btn-danger"
                  >
                    Heavy Contention (Inflate Mutex)
                  </button>
                </>
              )}
            />
          ) : null}
        </section>
      ) : null}

      {/* Stage 3: HOW */}
      <section className="pedagogy-stage-card">
        <h2 className="stage-heading">{moduleData.stages.how.heading}</h2>
        {moduleData.stages.how.paragraphs.map((p, pIdx) => (
          <p key={pIdx} className="stage-paragraph">
            {p}
          </p>
        ))}
      </section>

      {/* Stage 4: INTERNALS */}
      <section className="pedagogy-stage-card">
        <h2 className="stage-heading">{moduleData.stages.internals.heading}</h2>
        {moduleData.stages.internals.paragraphs.map((p, pIdx) => (
          <p key={pIdx} className="stage-paragraph">
            {p}
          </p>
        ))}
        {moduleData.stages.internals.codeSnippet ? (
          <div style={{ margin: "var(--space-4) 0" }}>
            <div
              style={{
                fontSize: "var(--text-xs)",
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-1)",
              }}
            >
              {moduleData.stages.internals.codeSnippet.caption}:
            </div>
            <pre className="inspector-code-block">
              <code>{moduleData.stages.internals.codeSnippet.code}</code>
            </pre>
          </div>
        ) : null}
      </section>

      {/* Stage 5: TRADE-OFFS */}
      <section className="pedagogy-stage-card">
        <h2 className="stage-heading">{moduleData.stages.tradeOffs.heading}</h2>
        {moduleData.stages.tradeOffs.paragraphs.map((p, pIdx) => (
          <p key={pIdx} className="stage-paragraph">
            {p}
          </p>
        ))}
        {moduleData.stages.tradeOffs.bulletPoints ? (
          <ul className="stage-bullets">
            {moduleData.stages.tradeOffs.bulletPoints.map((b, bIdx) => (
              <li key={bIdx}>{b}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Stage 6: FAILURE SCENARIOS */}
      <section className="pedagogy-stage-card">
        <h2 className="stage-heading">{moduleData.stages.failureScenarios.heading}</h2>
        {moduleData.stages.failureScenarios.paragraphs.map((p, pIdx) => (
          <p key={pIdx} className="stage-paragraph">
            {p}
          </p>
        ))}
        {moduleData.stages.failureScenarios.callout ? (
          <div className="callout-box callout-warning">
            <div className="callout-title">{moduleData.stages.failureScenarios.callout.title}</div>
            <p className="callout-body">{moduleData.stages.failureScenarios.callout.body}</p>
          </div>
        ) : null}
      </section>

      {/* Stage 7: PRODUCTION ENGINEERING */}
      <section className="pedagogy-stage-card">
        <h2 className="stage-heading">{moduleData.stages.productionEngineering.heading}</h2>
        {moduleData.stages.productionEngineering.paragraphs.map((p, pIdx) => (
          <p key={pIdx} className="stage-paragraph">
            {p}
          </p>
        ))}
      </section>

      {/* Sources & Citations */}
      <section className="sources-container">
        <div className="sources-title">
          Authoritative Specifications &amp; Architecture References
        </div>
        <div>
          {moduleData.sourceIds.map((sid) => {
            const src = getSourceById(sid);
            if (!src) return null;
            return (
              <div key={src.id} className="source-item">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="source-link"
                >
                  {src.title} ({src.publisher}) <ExternalLink size={12} />
                </a>
                <span style={{ color: "var(--text-secondary)" }}>
                  {src.supports}
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
