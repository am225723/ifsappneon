import { Component } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Grid3X3, Home, RefreshCw, Sparkles } from 'lucide-react';

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[RouteErrorBoundary] route render failed', {
        message: error?.message || 'Unknown route render error',
        componentStack: info?.componentStack || '',
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
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-6 py-12">
        <div className="soft-card w-full p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">
            <Sparkles className="h-7 w-7" />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">Page recovery</p>
          <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Something on this page did not load correctly.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
            You can refresh or return to your IFS path.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={this.handleRefresh} className="btn-sanctuary-primary">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <Link to="/my-ifs" className="btn-sanctuary-secondary">
              <Sparkles className="h-4 w-4" /> Go to My IFS Work
            </Link>
            <Link to="/" className="btn-sanctuary-secondary">
              <Home className="h-4 w-4" /> Go to Home
            </Link>
            <Link to="/tools" className="btn-sanctuary-secondary">
              <Grid3X3 className="h-4 w-4" /> Open Tools
            </Link>
            <button onClick={this.handleBack} className="btn-sanctuary-secondary">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }
}
