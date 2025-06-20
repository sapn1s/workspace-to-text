// src/components/common/DependencyGraphErrorBoundary.js
import React from 'react';

class DependencyGraphErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    console.error('Dependency Graph Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
              <h1 className="text-xl font-bold text-red-400 mb-4">
                Dependency Graph Error
              </h1>
              
              <p className="text-gray-300 mb-4">
                Something went wrong while rendering the dependency graph. This could be due to:
              </p>
              
              <ul className="list-disc list-inside text-gray-400 mb-6 space-y-1">
                <li>Corrupted or incomplete dependency data</li>
                <li>Very large datasets causing memory issues</li>
                <li>Network connectivity problems</li>
                <li>Browser compatibility issues</li>
              </ul>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-medium"
                >
                  Reload Page
                </button>
                
                <button
                  onClick={() => window.close()}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white"
                >
                  Close Window
                </button>
              </div>
              
              {/* Error Details (for debugging) */}
              {this.state.error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-800 rounded text-xs font-mono text-gray-300 overflow-auto max-h-40">
                    <div className="text-red-400 mb-2">Error:</div>
                    <div className="mb-4">{this.state.error.toString()}</div>
                    
                    {this.state.errorInfo && (
                      <>
                        <div className="text-red-400 mb-2">Stack Trace:</div>
                        <div className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</div>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DependencyGraphErrorBoundary;