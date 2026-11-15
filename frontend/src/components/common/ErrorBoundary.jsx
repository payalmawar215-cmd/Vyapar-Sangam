import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

/**
 * Global React ErrorBoundary component.
 * Prevents application-wide white/blank screen crashes when an unhandled runtime error occurs.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Vyapar Sangam caught runtime UI error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-2xl text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-5">
              <AlertCircle size={28} />
            </div>

            <span className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-2">
              Application Notice
            </span>

            <h1 className="font-display text-2xl font-light text-foreground mb-3">
              Something went wrong
            </h1>

            <p className="font-body text-xs text-muted-foreground leading-relaxed mb-6">
              We encountered a temporary rendering issue. You can refresh the page or return to the home page.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-accent text-accent-foreground font-body text-xs tracking-label uppercase font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                <RefreshCw size={14} /> Refresh
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border text-foreground hover:bg-secondary/60 font-body text-xs tracking-label uppercase font-medium transition-colors cursor-pointer"
              >
                <Home size={14} /> Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
