import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Brain, Zap, TrendingUp, ArrowRight } from 'lucide-react';

interface AIRoutingCardProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  lastDecision?: {
    carrier_name: string;
    reasoning: string;
    timestamp: string;
  };
  stats?: {
    total_decisions: number;
    cost_savings: number;
    accuracy: number;
  };
}

export function AIRoutingCard({ enabled, onToggle, lastDecision, stats }: AIRoutingCardProps) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Roteamento Inteligente com IA
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  IA Integrada
                </Badge>
              </CardTitle>
              <CardDescription>
                IA analisa métricas em tempo real e escolhe o melhor carrier
              </CardDescription>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled && (
          <>
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-background/50 text-center">
                  <p className="text-2xl font-bold">{stats.total_decisions}</p>
                  <p className="text-xs text-muted-foreground">Decisões</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50 text-center">
                  <p className="text-2xl font-bold text-green-500">
                    R$ {stats.cost_savings.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Economia</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50 text-center">
                  <p className="text-2xl font-bold">{stats.accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Precisão</p>
                </div>
              </div>
            )}

            {/* Last Decision */}
            {lastDecision && (
              <div className="p-4 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Última Decisão da IA</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(lastDecision.timestamp).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Carrier selecionado:</span>
                  <Badge>{lastDecision.carrier_name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  "{lastDecision.reasoning}"
                </p>
              </div>
            )}

            {/* How it works */}
            <div className="p-4 rounded-lg border border-dashed">
              <p className="text-sm font-medium mb-3">Como funciona:</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">Chamada</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="outline">Análise IA</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="outline">Métricas</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="secondary">Melhor Carrier</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                A IA considera: custo/min, taxa de conexão, latência, capacidade disponível, 
                tipo de campanha e histórico de performance por DDD.
              </p>
            </div>
          </>
        )}

        {!enabled && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ative o roteamento inteligente para otimizar custos e performance automaticamente
          </p>
        )}
      </CardContent>
    </Card>
  );
}
