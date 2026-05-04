import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('[DesktopErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'hsl(220 20% 4%)' }}>
          <div className="max-w-md p-8 rounded-lg border border-red-500/30" style={{ background: 'hsl(220 24% 6% / 0.95)' }}>
            <h2 className="text-red-400 font-light tracking-wider uppercase text-sm mb-3">ERREUR SYSTÈME</h2>
            <p className="text-[hsl(220,15%,65%)] text-xs font-light mb-4">
              {this.state.error?.message || 'Une erreur inattendue est survenue.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-1.5 text-xs font-light tracking-wider uppercase rounded border border-[hsl(187,85%,53%)]/30 text-[hsl(187,85%,53%)] hover:bg-[hsl(187,85%,53%)]/10 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
