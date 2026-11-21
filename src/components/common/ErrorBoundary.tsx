import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected application error',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Servexa UI ErrorBoundary caught:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950 px-4 py-12 text-zinc-900 dark:text-zinc-100">
          <div className="max-w-md w-full rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 shadow-xl text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold">কিছু একটা সমস্যা হয়েছে</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                পেজটি লোড করার সময় একটি অপ্রত্যাশিত ত্রুটি দেখা দিয়েছে। অনুগ্রহ করে রিলোড করুন অথবা হোমপেজে ফিরে যান।
              </p>
              {this.state.errorMessage && (
                <p className="text-xs font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-lg px-3 py-2 break-words">
                  {this.state.errorMessage}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                পুনরায় লোড করুন
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 font-semibold px-4 py-2.5 text-sm transition-colors"
              >
                <Home className="w-4 h-4" />
                হোমপেজ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
