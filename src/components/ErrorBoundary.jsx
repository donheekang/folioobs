import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { ThemeContext } from "../hooks/useTheme";
import { LOCALES } from "../hooks/useLocale";

class ErrorBoundary extends Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("FolioObs Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const t = this.context;
      let locale = 'ko';
      try { locale = localStorage.getItem('folioobs_lang') || 'ko'; } catch { /* ignore */ }
      const strings = LOCALES[locale] || LOCALES.ko;
      return (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto px-4">
            <div className="w-12 h-12 rounded-md flex items-center justify-center mx-auto mb-4"
              style={{ background: `${t.red}15` }}>
              <AlertTriangle size={24} style={{ color: t.red }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: t.text }}>
              {strings.error.pageError}
            </h3>
            <p className="text-sm mb-4" style={{ color: t.textMuted }}>
              {strings.error.pageErrorDesc}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="px-4 py-2 rounded text-sm font-medium transition-all hover:opacity-80"
              style={{ background: t.accentSolid, color: '#ffffff' }}>
              {strings.common.retry}
            </button>
            {this.props.showDetail && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs cursor-pointer" style={{ color: t.textMuted }}>
                  {strings.error.errorDetail}
                </summary>
                <pre className="text-xs mt-2 p-3 rounded overflow-x-auto"
                  style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: t.textSecondary }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
