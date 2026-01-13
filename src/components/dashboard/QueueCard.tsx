import { Queue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Users, Clock, AlertTriangle, Phone, Bot } from 'lucide-react';

interface QueueCardProps {
  queue: Queue;
}

export function QueueCard({ queue }: QueueCardProps) {
  const slaColor =
    queue.stats.slaPercentage >= 90
      ? 'positive'
      : queue.stats.slaPercentage >= 75
      ? 'warning'
      : 'negative';

  const isAiQueue = queue.type === 'AI_TRIAGE';

  return (
    <Card variant="metric" className="group transition-all duration-300 hover:shadow-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAiQueue && (
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <CardTitle className="text-base font-semibold">{queue.name}</CardTitle>
          </div>
          <Badge
            variant={
              queue.type === 'INBOUND'
                ? 'neutral'
                : queue.type === 'OUTBOUND'
                ? 'positive'
                : queue.type === 'AI_TRIAGE'
                ? 'ai'
                : 'warning'
            }
            className="text-[10px]"
          >
            {queue.type === 'INBOUND'
              ? 'Entrada'
              : queue.type === 'OUTBOUND'
              ? 'Saída'
              : queue.type === 'AI_TRIAGE'
              ? 'IA'
              : 'Callback'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">Aguardando</span>
            </div>
            <p
              className={cn(
                'font-mono text-2xl font-bold',
                queue.stats.waiting > 5 ? 'text-metric-negative' : 'text-foreground'
              )}
            >
              {queue.stats.waiting}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">Ativas</span>
            </div>
            <p className="font-mono text-2xl font-bold text-metric-positive">{queue.stats.active}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">Agentes</span>
            </div>
            <p className="font-mono text-2xl font-bold">{queue.agents.length}</p>
          </div>
        </div>

        {/* SLA Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">SLA ({queue.slaTarget}s)</span>
            <span
              className={cn(
                'font-semibold',
                slaColor === 'positive' && 'text-metric-positive',
                slaColor === 'warning' && 'text-metric-warning',
                slaColor === 'negative' && 'text-metric-negative'
              )}
            >
              {queue.stats.slaPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={queue.stats.slaPercentage}
            className={cn(
              'h-2',
              slaColor === 'positive' && '[&>div]:bg-metric-positive',
              slaColor === 'warning' && '[&>div]:bg-metric-warning',
              slaColor === 'negative' && '[&>div]:bg-metric-negative'
            )}
          />
        </div>

        {/* Additional stats */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Espera média: {queue.stats.avgWaitTime}s</span>
          </div>
          {queue.stats.abandoned > 0 && (
            <div className="flex items-center gap-1 text-metric-negative">
              <AlertTriangle className="h-3 w-3" />
              <span>{queue.stats.abandoned} aband.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
