// src/components/ErrorBoundary.tsx
// C3 FIX: React Error Boundary — catches unhandled component throws and shows
// a recovery UI instead of a blank white screen. Without this, any null
// reference or network error during render silently unmounts the entire app.

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex p-4 bg-red-500/20 rounded-full mb-6">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              An unexpected error occurred. Your data is safe — this is a display error only.
            </p>
            {this.state.errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6 text-left">
                <p className="text-red-400 text-xs font-mono break-all">{this.state.errorMessage}</p>
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
