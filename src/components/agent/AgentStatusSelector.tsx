import { useState } from 'react';
import { AgentStatus, PauseReason } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Headphones, Phone, Clock, Pause, Power, ChevronDown, Coffee, Utensils, Users, GraduationCap, Wrench } from 'lucide-react';

interface AgentStatusSelectorProps {
  currentStatus: AgentStatus;
  pauseReason?: PauseReason;
  onStatusChange: (status: AgentStatus, pauseReason?: PauseReason) => void;
  disabled?: boolean;
}

const statusConfig: Record<AgentStatus, { label: string; icon: React.ElementType; variant: 'ready' | 'busy' | 'wrapup' | 'pause' | 'offline' }> = {
  READY: { label: 'Disponível', icon: Headphones, variant: 'ready' },
  BUSY: { label: 'Em Ligação', icon: Phone, variant: 'busy' },
  WRAPUP: { label: 'Wrap-up', icon: Clock, variant: 'wrapup' },
  PAUSE: { label: 'Pausa', icon: Pause, variant: 'pause' },
  OFFLINE: { label: 'Offline', icon: Power, variant: 'offline' },
};

const pauseReasons: { value: PauseReason; label: string; icon: React.ElementType }[] = [
  { value: 'break', label: 'Intervalo', icon: Coffee },
  { value: 'lunch', label: 'Almoço', icon: Utensils },
  { value: 'meeting', label: 'Reunião', icon: Users },
  { value: 'training', label: 'Treinamento', icon: GraduationCap },
  { value: 'technical', label: 'Problema Técnico', icon: Wrench },
  { value: 'bathroom', label: 'Banheiro', icon: Coffee },
];

export function AgentStatusSelector({ currentStatus, pauseReason, onStatusChange, disabled }: AgentStatusSelectorProps) {
  const config = statusConfig[currentStatus];
  const Icon = config.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={config.variant}
          size="lg"
          className={cn(
            'min-w-[180px] justify-between',
            currentStatus === 'BUSY' && 'animate-pulse-glow'
          )}
          disabled={disabled || currentStatus === 'BUSY'}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{config.label}</span>
            {currentStatus === 'PAUSE' && pauseReason && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {pauseReasons.find((p) => p.value === pauseReason)?.label}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Ready */}
        <DropdownMenuItem
          onClick={() => onStatusChange('READY')}
          className={cn(currentStatus === 'READY' && 'bg-status-ready/20')}
        >
          <Headphones className="mr-2 h-4 w-4 text-status-ready" />
          Disponível
        </DropdownMenuItem>

        {/* Pause options */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Pausas</DropdownMenuLabel>
        {pauseReasons.map((reason) => {
          const ReasonIcon = reason.icon;
          return (
            <DropdownMenuItem
              key={reason.value}
              onClick={() => onStatusChange('PAUSE', reason.value)}
              className={cn(currentStatus === 'PAUSE' && pauseReason === reason.value && 'bg-status-pause/20')}
            >
              <ReasonIcon className="mr-2 h-4 w-4 text-status-pause" />
              {reason.label}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        
        {/* Offline */}
        <DropdownMenuItem
          onClick={() => onStatusChange('OFFLINE')}
          className={cn(currentStatus === 'OFFLINE' && 'bg-status-offline/20')}
        >
          <Power className="mr-2 h-4 w-4 text-status-offline" />
          Encerrar Turno
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
