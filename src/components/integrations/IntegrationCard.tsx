import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Settings, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationCardProps {
  provider: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  configured: boolean;
  verified: boolean;
  onConfigure: () => void;
  docsUrl?: string;
}

export function IntegrationCard({
  provider,
  title,
  description,
  icon,
  configured,
  verified,
  onConfigure,
  docsUrl
}: IntegrationCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-md",
      configured && verified && "border-green-500/30 bg-green-500/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              configured && verified ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
            )}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {configured ? (
              verified ? (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-500/30 bg-green-500/10">
                  <CheckCircle2 className="h-3 w-3" />
                  Configurado
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-500/30 bg-yellow-500/10">
                  <AlertCircle className="h-3 w-3" />
                  Verificar
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Não configurado
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {docsUrl && (
              <Button variant="ghost" size="icon" asChild>
                <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onConfigure}>
              <Settings className="h-4 w-4 mr-1" />
              Configurar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
