import { StrictMode } from 'react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface FrontendErrorBoundaryState {
  error: Error | null;
}

class FrontendErrorBoundary extends Component<
  { children: ReactNode },
  FrontendErrorBoundaryState
> {
  state: FrontendErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): FrontendErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur lors du rendu de l’application ENP.', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
          <h1 className="text-xl font-bold text-enp-ink">La page n’a pas pu s’afficher</h1>
          <p className="max-w-lg text-sm text-enp-ink-soft">
            Une erreur est survenue pendant le chargement. Rechargez l’application pour réessayer.
          </p>
          <button
            className="rounded-lg bg-enp-primary px-4 py-2 text-sm font-semibold text-white hover:bg-enp-primary-dark"
            onClick={() => window.location.reload()}
            type="button"
          >
            Recharger la page
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <FrontendErrorBoundary>
      <App />
    </FrontendErrorBoundary>
  </StrictMode>
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => root.unmount());
}
