import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, CheckCircle2, XCircle, TrendingUp, TrendingDown } from "lucide-react";

export function CallerIdHealthDashboard() {
  const { data: healthSummary, isLoading } = useQuery({
    queryKey: ['caller-id-health-summary'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('caller_id_health')
        .select(`
          health_score,
          flagged_as_spam,
          calls_attempted,
          calls_connected,
          calls_blocked,
          answer_rate
        `)
        .eq('date', today);
      
      if (error) throw error;

      // Calculate aggregates
      const totalNumbers = data?.length || 0;
      const healthyNumbers = data?.filter(h => h.health_score >= 80 && !h.flagged_as_spam).length || 0;
      const warningNumbers = data?.filter(h => h.health_score >= 50 && h.health_score < 80).length || 0;
      const criticalNumbers = data?.filter(h => h.health_score < 50 || h.flagged_as_spam).length || 0;
      const spamFlagged = data?.filter(h => h.flagged_as_spam).length || 0;

      const totalAttempted = data?.reduce((sum, h) => sum + (h.calls_attempted || 0), 0) || 0;
      const totalConnected = data?.reduce((sum, h) => sum + (h.calls_connected || 0), 0) || 0;
      const totalBlocked = data?.reduce((sum, h) => sum + (h.calls_blocked || 0), 0) || 0;

      const avgHealthScore = totalNumbers > 0
        ? Math.round(data!.reduce((sum, h) => sum + h.health_score, 0) / totalNumbers)
        : 100;

      const overallAnswerRate = totalAttempted > 0
        ? ((totalConnected / totalAttempted) * 100).toFixed(1)
        : 0;

      const blockRate = totalAttempted > 0
        ? ((totalBlocked / totalAttempted) * 100).toFixed(1)
        : 0;

      return {
        totalNumbers,
        healthyNumbers,
        warningNumbers,
        criticalNumbers,
        spamFlagged,
        avgHealthScore,
        totalAttempted,
        totalConnected,
        totalBlocked,
        overallAnswerRate,
        blockRate
      };
    },
    refetchInterval: 30000
  });

  const { data: recentAlerts } = useQuery({
    queryKey: ['caller-id-recent-alerts'],
    queryFn: async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('caller_id_health')
        .select(`
          *,
          number:caller_id_numbers(phone_number, friendly_name)
        `)
        .eq('flagged_as_spam', true)
        .gte('flagged_at', yesterday)
        .order('flagged_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Health Score Médio</p>
                <p className="text-3xl font-bold">{healthSummary?.avgHealthScore || 0}</p>
              </div>
              <div className={`p-3 rounded-full ${
                (healthSummary?.avgHealthScore || 0) >= 80 ? 'bg-green-500/20' :
                (healthSummary?.avgHealthScore || 0) >= 50 ? 'bg-yellow-500/20' :
                'bg-red-500/20'
              }`}>
                <Activity className={`h-6 w-6 ${
                  (healthSummary?.avgHealthScore || 0) >= 80 ? 'text-green-500' :
                  (healthSummary?.avgHealthScore || 0) >= 50 ? 'text-yellow-500' :
                  'text-red-500'
                }`} />
              </div>
            </div>
            <Progress 
              value={healthSummary?.avgHealthScore || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Atendimento</p>
                <p className="text-3xl font-bold">{healthSummary?.overallAnswerRate}%</p>
              </div>
              <div className="p-3 rounded-full bg-primary/20">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {healthSummary?.totalConnected} de {healthSummary?.totalAttempted} chamadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Bloqueio</p>
                <p className="text-3xl font-bold text-destructive">{healthSummary?.blockRate}%</p>
              </div>
              <div className="p-3 rounded-full bg-destructive/20">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {healthSummary?.totalBlocked} chamadas bloqueadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Números Flagged</p>
                <p className="text-3xl font-bold text-destructive">{healthSummary?.spamFlagged || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-destructive/20">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Marcados como spam
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Number Health Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Saúde dos Números</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Saudáveis (≥80)</span>
                </div>
                <Badge className="bg-green-500">{healthSummary?.healthyNumbers || 0}</Badge>
              </div>
              <Progress value={
                healthSummary?.totalNumbers ? 
                  (healthSummary.healthyNumbers / healthSummary.totalNumbers) * 100 : 0
              } className="h-2" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Atenção (50-79)</span>
                </div>
                <Badge className="bg-yellow-500">{healthSummary?.warningNumbers || 0}</Badge>
              </div>
              <Progress value={
                healthSummary?.totalNumbers ? 
                  (healthSummary.warningNumbers / healthSummary.totalNumbers) * 100 : 0
              } className="h-2" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Críticos (&lt;50)</span>
                </div>
                <Badge variant="destructive">{healthSummary?.criticalNumbers || 0}</Badge>
              </div>
              <Progress value={
                healthSummary?.totalNumbers ? 
                  (healthSummary.criticalNumbers / healthSummary.totalNumbers) * 100 : 0
              } className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Spam Alerts */}
      {recentAlerts && recentAlerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertas Recentes de Spam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAlerts.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <div>
                    <p className="font-medium">{alert.number?.phone_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.number?.friendly_name || 'Sem nome'}
                    </p>
                  </div>
                  <Badge variant="destructive">SPAM</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
