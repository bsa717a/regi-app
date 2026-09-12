"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { FeatureErrorFallback } from "@/components/sentry/FeatureErrorFallback";
import { captureException } from "@/lib/sentry/report";

export type FeatureErrorBoundaryProps = {
  feature: string;
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = {
  error: Error | null;
};

export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    captureException(error, {
      tags: { feature: this.props.feature },
      extras: { componentStack: info.componentStack },
    });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <FeatureErrorFallback
          feature={this.props.feature}
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}
