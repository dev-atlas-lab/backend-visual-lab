import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "var(--space-10) var(--space-4)",
            maxWidth: "600px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--status-danger-subtle)",
              color: "var(--danger)",
              marginBottom: "var(--space-4)",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 800, marginBottom: "var(--space-2)" }}>
            {this.props.fallbackTitle ?? "Simulation Rendering Recovery"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)" }}>
            A rendering frame error was intercepted. Click below to recover the simulation state.
          </p>
          <button onClick={this.handleReset} className="btn btn-primary">
            <RotateCcw size={14} /> Recover &amp; Reload Lab
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
