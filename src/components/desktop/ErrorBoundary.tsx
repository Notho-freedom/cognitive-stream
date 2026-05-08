import { Component, useEffect, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DesktopErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const label = this.props.label || 'DesktopErrorBoundary';
    // eslint-disable-next-line no-console
    console.error(`[${label}]`, error, info.componentStack);
    try {
      (window as any).__lastDesktopError = {
        label,
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        time: Date.now(),
      };
    } catch {}
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="fixed inset-0 flex items-center justify-center z-[9999]"
          style={{ background: 'hsl(220 20% 4% / 0.98)' }}
        >
          <div
            className="max-w-lg p-8 rounded-lg border border-red-500/40 shadow-2xl"
            style={{ background: 'hsl(220 24% 6%)' }}
          >
            <h2 className="text-red-400 font-light tracking-[0.2em] uppercase text-xs mb-3">
              ERREUR · {this.props.label || 'SYSTÈME'}
            </h2>
            <p className="text-[hsl(220,15%,75%)] text-xs font-light mb-4 break-words">
              {this.state.error?.message || 'Une erreur inattendue est survenue.'}
            </p>
            {this.state.error?.stack && (
              <pre className="text-[10px] text-[hsl(220,15%,55%)] font-mono mb-4 max-h-40 overflow-auto whitespace-pre-wrap">
                {this.state.error.stack.split('\n').slice(0, 6).join('\n')}
              </pre>
            )}
            <div className="flex gap-2">
              <button
                onClick={this.reset}
                className="px-4 py-1.5 text-xs font-light tracking-wider uppercase rounded border border-[hsl(187,85%,53%)]/40 text-[hsl(187,85%,53%)] hover:bg-[hsl(187,85%,53%)]/10 transition-colors"
              >
                Réessayer
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-1.5 text-xs font-light tracking-wider uppercase rounded border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
              >
                Recharger
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Mounts global error / unhandledrejection listeners with a [DESKTOP-CRASH] prefix. */
export function GlobalErrorTracer() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.error('[DESKTOP-CRASH] error', e.message, e.error?.stack || '', e.filename, e.lineno);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error('[DESKTOP-CRASH] unhandledrejection', e.reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
