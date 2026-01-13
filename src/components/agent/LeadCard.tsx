import { Lead } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  Clock,
  Tag,
  History,
  Edit,
  Ban,
} from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onEdit?: () => void;
  onDnc?: () => void;
}

export function LeadCard({ lead, onEdit, onDnc }: LeadCardProps) {
  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
              {lead.firstName[0]}{lead.lastName[0]}
            </div>
            <div>
              <CardTitle className="text-lg">
                {lead.firstName} {lead.lastName}
              </CardTitle>
              {lead.company && (
                <p className="text-sm text-muted-foreground">{lead.company}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={onDnc}>
              <Ban className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{lead.phone}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{lead.email}</span>
            </div>
          )}
          {(lead.city || lead.state) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Tags & Score */}
        <div className="flex flex-wrap items-center gap-2">
          {lead.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              <Tag className="mr-1 h-3 w-3" />
              {tag}
            </Badge>
          ))}
          {lead.score !== undefined && (
            <Badge
              variant={lead.score >= 70 ? 'positive' : lead.score >= 40 ? 'warning' : 'negative'}
              className="text-xs"
            >
              Score: {lead.score}
            </Badge>
          )}
        </div>

        {/* Attempt History */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <History className="h-3 w-3" />
            <span>Histórico de Tentativas</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{lead.attempts}</p>
              <p className="text-xs text-muted-foreground">tentativas</p>
            </div>
            {lead.lastAttemptAt && (
              <div className="text-right">
                <p className="text-sm font-medium">Última tentativa</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(lead.lastAttemptAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* DNC Warning */}
        {lead.isDnc && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
            <Ban className="h-4 w-4" />
            <span className="text-sm font-medium">Este contato está na lista DNC</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
