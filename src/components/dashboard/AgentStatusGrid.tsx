import { Agent, AgentStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Phone, Pause, Clock, Power, Headphones } from 'lucide-react';

interface AgentStatusGridProps {
  agents: Agent[];
  compact?: boolean;
}

const statusConfig: Record<AgentStatus, { label: string; variant: 'ready' | 'busy' | 'wrapup' | 'pause' | 'offline'; icon: React.ElementType }> = {
  READY: { label: 'Disponível', variant: 'ready', icon: Headphones },
  BUSY: { label: 'Em Ligação', variant: 'busy', icon: Phone },
  WRAPUP: { label: 'Wrap-up', variant: 'wrapup', icon: Clock },
  PAUSE: { label: 'Pausa', variant: 'pause', icon: Pause },
  OFFLINE: { label: 'Offline', variant: 'offline', icon: Power },
};

export function AgentStatusGrid({ agents, compact = false }: AgentStatusGridProps) {
  const groupedAgents = agents.reduce((acc, agent) => {
    if (!acc[agent.status]) acc[agent.status] = [];
    acc[agent.status].push(agent);
    return acc;
  }, {} as Record<AgentStatus, Agent[]>);

  const statusOrder: AgentStatus[] = ['BUSY', 'READY', 'WRAPUP', 'PAUSE', 'OFFLINE'];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {agents.slice(0, 20).map((agent) => {
          const config = statusConfig[agent.status];
          return (
            <div
              key={agent.id}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 hover:scale-110',
                agent.status === 'READY' && 'bg-status-ready/20 text-status-ready',
                agent.status === 'BUSY' && 'bg-status-busy/20 text-status-busy animate-pulse',
                agent.status === 'WRAPUP' && 'bg-status-wrapup/20 text-status-wrapup',
                agent.status === 'PAUSE' && 'bg-status-pause/20 text-status-pause',
                agent.status === 'OFFLINE' && 'bg-status-offline/20 text-status-offline'
              )}
              title={`${agent.name} - ${config.label}`}
            >
              {agent.name.split(' ').map(n => n[0]).join('')}
            </div>
          );
        })}
        {agents.length > 20 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            +{agents.length - 20}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusOrder.map((status) => {
        const agentsInStatus = groupedAgents[status] || [];
        const config = statusConfig[status];
        const Icon = config.icon;

        if (agentsInStatus.length === 0) return null;

        return (
          <div key={status}>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={config.variant} className="gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>
              <span className="text-sm text-muted-foreground">({agentsInStatus.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {agentsInStatus.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2 transition-all duration-200 hover:bg-card hover:shadow-sm',
                    status === 'BUSY' && 'border-status-busy/30'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      status === 'READY' && 'bg-status-ready/20 text-status-ready',
                      status === 'BUSY' && 'bg-status-busy/20 text-status-busy',
                      status === 'WRAPUP' && 'bg-status-wrapup/20 text-status-wrapup',
                      status === 'PAUSE' && 'bg-status-pause/20 text-status-pause',
                      status === 'OFFLINE' && 'bg-status-offline/20 text-status-offline'
                    )}
                  >
                    {agent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{agent.name}</p>
                    <p className="truncate text-xs text-muted-foreground">Ext. {agent.extension}</p>
                  </div>
                  {status === 'BUSY' && (
                    <div className="flex h-2 w-2 animate-pulse rounded-full bg-status-busy" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
