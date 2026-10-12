import { Component, type ReactNode } from "react";
import { logCritical } from "@shared/lib/errorLog";

/**
 * Ловит runtime-ошибки React и показывает fallback вместо белого экрана.
 */
class ErrorBoundary extends Component<{ children?: ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary:", error, info?.componentStack);
    logCritical(error?.message || "Render crash", { code: "render_crash" });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "var(--nur-bg, #f6f7f9)",
            color: "var(--nur-text, #0f172a)",
          }}
        >
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>
              Что-то пошло не так
            </h1>
            <p
              style={{
                color: "var(--nur-muted, #8a93a3)",
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              Произошла непредвиденная ошибка. Обновите страницу или вернитесь
              позже.
            </p>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={this.handleReload}
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
