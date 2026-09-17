import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function App() {
  return (
    <div className="min-h-screen bg-background p-10">
      <Card className="elevated max-w-sm">
        <CardHeader>
          <CardTitle>Theme check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Muted body copy.</p>
          <Button onClick={() => document.documentElement.classList.toggle('dark')}>
            Toggle theme
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
