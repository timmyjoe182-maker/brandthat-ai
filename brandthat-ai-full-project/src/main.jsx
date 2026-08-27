import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./workspace-upgrades.css";
import "./globalQualityGuard.js";
import App from "./App.jsx";

class BrandThatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("BrandThat React error", {
      message: error?.message,
      stack: String(error?.stack || "").split("\n").slice(0, 8).join("\n"),
      componentStack: String(info?.componentStack || "").split("\n").slice(0, 8).join("\n"),
    });
  }

  retry = () => {
    this.setState({ error: null });
  };

  returnToWorkspace = () => {
    window.history.pushState({}, "", "/#workspace");
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
        background: "#f7f2ea",
        color: "#11110f",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <section role="alert" aria-live="assertive" style={{
          width: "min(560px, 100%)",
          background: "#fffdf8",
          border: "1px solid rgba(17,17,15,.12)",
          borderRadius: "24px",
          padding: "28px",
          boxShadow: "0 24px 80px rgba(17,17,15,.12)",
        }}>
          <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase", color: "#806546" }}>
            BrandThat
          </p>
          <h1 style={{ margin: "0 0 12px", fontSize: "clamp(34px, 8vw, 56px)", lineHeight: ".95", letterSpacing: "-.06em" }}>
            Something went wrong.
          </h1>
          <p style={{ margin: "0 0 22px", fontSize: "18px", lineHeight: 1.45, color: "#5f5750" }}>
            BrandThat hit an unexpected app error, but your account and saved workspace data are still protected.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={this.retry} style={{
              border: "1px solid #11110f",
              borderRadius: "999px",
              background: "#11110f",
              color: "#fffdf8",
              padding: "12px 18px",
              fontWeight: 850,
              cursor: "pointer",
            }}>
              Retry
            </button>
            <button type="button" onClick={this.returnToWorkspace} style={{
              border: "1px solid rgba(17,17,15,.16)",
              borderRadius: "999px",
              background: "#fffdf8",
              color: "#11110f",
              padding: "12px 18px",
              fontWeight: 850,
              cursor: "pointer",
            }}>
              Return to Workspace
            </button>
          </div>
        </section>
      </main>
    );
  }
}

createRoot(document.getElementById("root")).render(
  <BrandThatErrorBoundary>
    <App />
  </BrandThatErrorBoundary>
);
