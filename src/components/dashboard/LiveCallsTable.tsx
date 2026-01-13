import { Call } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Phone, Headphones, Bot, Clock, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockAgents, mockLeads } from '@/data/mockData';

interface LiveCallsTableProps {
  calls: Call[];
}

function formatDuration(startedAt: Date, connectedAt?: Date): string {
  const start = connectedAt || startedAt;
  const seconds = Math.floor((Date.now() - start.getTime()) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function LiveCallsTable({ calls }: LiveCallsTableProps) {
  const activeCalls = calls.filter((c) => ['CONNECTED', 'RINGING', 'DIALING', 'ON_HOLD'].includes(c.status));

  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-2 w-2 animate-pulse rounded-full bg-status-ready" />
            <h3 className="font-semibold">Chamadas Ativas</h3>
            <Badge variant="secondary" className="text-xs">
              {activeCalls.length}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        {activeCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Phone className="mb-2 h-8 w-8 opacity-50" />
            <p>Nenhuma chamada ativa</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">Contato</th>
                <th className="px-4 py-2 font-medium">Agente</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Duração</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {activeCalls.map((call) => {
                const agent = mockAgents.find((a) => a.id === call.agentId);
                const lead = mockLeads.find((l) => l.id === call.leadId);

                return (
                  <tr
                    key={call.id}
                    className={cn(
                      'border-b border-border/30 transition-colors hover:bg-muted/30',
                      call.status === 'CONNECTED' && 'bg-status-ready/5'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {call.isAiHandled && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20">
                            <Bot className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {lead ? `${lead.firstName} ${lead.lastName}` : 'Desconhecido'}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">{call.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {agent ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                            {agent.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">Ext. {agent.extension}</p>
                          </div>
                        </div>
                      ) : call.isAiHandled ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-primary">IA Triagem</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          call.status === 'CONNECTED'
                            ? 'ready'
                            : call.status === 'RINGING'
                            ? 'warning'
                            : call.status === 'ON_HOLD'
                            ? 'pause'
                            : 'neutral'
                        }
                      >
                        {call.status === 'CONNECTED'
                          ? 'Conectado'
                          : call.status === 'RINGING'
                          ? 'Tocando'
                          : call.status === 'ON_HOLD'
                          ? 'Espera'
                          : call.status === 'DIALING'
                          ? 'Discando'
                          : call.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatDuration(call.startedAt, call.connectedAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={call.direction === 'OUTBOUND' ? 'positive' : 'neutral'}>
                        {call.direction === 'OUTBOUND' ? 'Saída' : 'Entrada'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Headphones className="mr-2 h-4 w-4" />
                            Monitorar
                          </DropdownMenuItem>
                          <DropdownMenuItem>Sussurrar</DropdownMenuItem>
                          <DropdownMenuItem>Intervir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
