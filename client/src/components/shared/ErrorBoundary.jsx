import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Catches render-time crashes so a component bug shows a recovery screen
 * rather than a white page.
 *
 * Must be a class — React has no hook equivalent for error boundaries.
 */
export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="relative grid min-h-screen place-items-center px-4">
        <div aria-hidden className="aura-wash grain pointer-events-none fixed inset-0" />

        <div role="alert" className="relative max-w-md space-y-5 text-center">
          <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/25">
            <span aria-hidden className="absolute inset-0 rounded-2xl bg-destructive/15 blur-xl" />
            <AlertTriangle className="relative size-7" />
          </span>

          <div className="space-y-2">
            <p className="eyebrow">Unexpected error</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              The page hit an unexpected error. Reloading usually fixes it.
            </p>
          </div>

          <div className="rule mx-auto w-24" />

          <Button onClick={() => window.location.reload()}>Reload the page</Button>
        </div>
      </div>
    );
  }
}
