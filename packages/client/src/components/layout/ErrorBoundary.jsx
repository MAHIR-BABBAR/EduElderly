import { Component } from 'react';

/**
 * Last line of defence. A render crash in an app aimed at older learners must
 * not leave a blank white page with no way forward — it shows plain language,
 * a reload button, and a link home. The technical detail is available but
 * folded away, so it helps a developer without alarming a learner.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[client] render error', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface px-4 py-12">
        <div className="card-surface w-full max-w-lg text-center">
          <h1 className="font-display text-2xl text-brand-primary-dark">Something went wrong</h1>
          <p className="mt-3 text-brand-muted">
            Sorry about that. Reloading the page usually fixes it. Nothing you have completed has been lost.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-touch inline-flex items-center justify-center rounded-md bg-brand-primary px-6 font-semibold text-white hover:bg-brand-primary-dark"
            >
              Reload the page
            </button>
            <a
              href="/"
              className="btn-touch inline-flex items-center justify-center rounded-md border-2 border-brand-primary px-6 font-semibold text-brand-primary hover:bg-brand-primary-soft"
            >
              Go to the home page
            </a>
          </div>
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-brand-muted">Technical details</summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-brand-surface-sunken p-3 text-xs text-brand-text">
              {String(error?.message || error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
