"use client";

import React from "react";

interface Props {
  fallback: React.ReactNode;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-phase errors in its children (e.g. WebGL context
 * creation failure inside the 3D canvas) and swaps in `fallback`
 * instead of taking down the whole page.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}
