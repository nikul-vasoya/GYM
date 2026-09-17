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
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div role="alert" className="max-w-md space-y-4 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The page hit an unexpected error. Reloading usually fixes it.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
        </div>
      </div>
    );
  }
}
