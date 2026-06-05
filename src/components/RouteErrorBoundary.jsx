import { Component } from 'react';

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('[RouteErrorBoundary] route render failed', {
        message: error?.message || 'Unknown route render error',
        componentStack: errorInfo?.componentStack || ''
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign('/my-ifs');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="soft-card p-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">Page recovery</p>
          <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Something on this page did not load correctly.</h1>
          <p className="mt-3 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
            Something on this page did not load correctly. You can refresh or return to your IFS path.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={this.handleRefresh} className="btn-sanctuary-primary">Refresh</button>
            <a href="/my-ifs" className="btn-sanctuary-secondary">Go to My IFS Work</a>
            <a href="/home" className="btn-sanctuary-secondary">Go to Home</a>
            <a href="/tools" className="btn-sanctuary-secondary">Open Tools</a>
            <button type="button" onClick={this.handleBack} className="btn-sanctuary-secondary">Go Back</button>
          </div>
        </div>
      </div>
    );
  }
}
