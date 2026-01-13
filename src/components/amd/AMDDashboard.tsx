import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone,
  Bot,
  User,
  FileText,
  HelpCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AMDStats {
  campaign_id: string;
  campaign_name?: string;
  total_detections: number;
  human_detections: number;
  machine_detections: number;
  fax_detections: number;
  unknown_detections: number;
  avg_detection_time_ms: number;
  avg_confidence: number;
  messages_left: number;
}

interface Campaign {
  id: string;
  name: string;
}

export function AMDDashboard() {
  const [stats, setStats] = useState<AMDStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [recentResults, setRecentResults] = useState<Array<{
    id: string;
    detection_result: string;
    confidence_score: number;
    detection_time_ms: number;
    created_at: string;
    action_taken: string;
  }>>([]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchStats();
      fetchRecentResults();
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('status', 'ACTIVE')
        .order('name');

      if (error) throw error;
      setCampaigns(data || []);
      
      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('amd_statistics')
        .select('*')
        .eq('campaign_id', selectedCampaign)
        .eq('date', today);

      if (error) throw error;

      // Aggregate hourly stats
      if (data && data.length > 0) {
        const aggregated = data.reduce((acc, curr) => ({
          campaign_id: curr.campaign_id,
          total_detections: (acc.total_detections || 0) + (curr.total_detections || 0),
          human_detections: (acc.human_detections || 0) + (curr.human_detections || 0),
          machine_detections: (acc.machine_detections || 0) + (curr.machine_detections || 0),
          fax_detections: (acc.fax_detections || 0) + (curr.fax_detections || 0),
          unknown_detections: (acc.unknown_detections || 0) + (curr.unknown_detections || 0),
          avg_detection_time_ms: Math.round(
            ((acc.avg_detection_time_ms || 0) + (curr.avg_detection_time_ms || 0)) / 2
          ),
          avg_confidence: Math.round(
            (((acc.avg_confidence || 0) + (curr.avg_confidence || 0)) / 2) * 100
          ) / 100,
          messages_left: (acc.messages_left || 0) + (curr.messages_left || 0),
        }), {} as AMDStats);

        setStats(aggregated);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('Error fetching AMD stats:', error);
    }
  };

  const fetchRecentResults = async () => {
    try {
      const { data, error } = await supabase
        .from('amd_results')
        .select('id, detection_result, confidence_score, detection_time_ms, created_at, action_taken')
        .eq('campaign_id', selectedCampaign)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentResults(data || []);
    } catch (error) {
      console.error('Error fetching recent results:', error);
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'human':
        return <User className="h-4 w-4 text-green-500" />;
      case 'machine':
        return <Bot className="h-4 w-4 text-orange-500" />;
      case 'fax':
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'human':
        return 'default';
      case 'machine':
        return 'secondary';
      case 'fax':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const humanRate = stats ? Math.round((stats.human_detections / stats.total_detections) * 100) || 0 : 0;
  const machineRate = stats ? Math.round((stats.machine_detections / stats.total_detections) * 100) || 0 : 0;

  return (
    <div className="space-y-6">
      {/* Campaign Selector */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchRecentResults(); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Detecções</CardDescription>
            <CardTitle className="text-3xl">{stats?.total_detections || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>Hoje</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa de Humanos</CardDescription>
            <CardTitle className="text-3xl text-green-500">{humanRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={humanRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.human_detections || 0} detecções
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa de Máquinas</CardDescription>
            <CardTitle className="text-3xl text-orange-500">{machineRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={machineRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.machine_detections || 0} detecções • {stats?.messages_left || 0} mensagens deixadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tempo Médio de Detecção</CardDescription>
            <CardTitle className="text-3xl">{stats?.avg_detection_time_ms || 0}ms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Confiança média: {stats?.avg_confidence || 0}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detection Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribuição de Resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-500" />
                  <span>Humano</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.human_detections || 0}</span>
                  <Badge variant="default">{humanRate}%</Badge>
                </div>
              </div>
              <Progress value={humanRate} className="h-3 bg-muted" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-orange-500" />
                  <span>Secretária Eletrônica</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.machine_detections || 0}</span>
                  <Badge variant="secondary">{machineRate}%</Badge>
                </div>
              </div>
              <Progress value={machineRate} className="h-3 bg-muted" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span>Fax</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.fax_detections || 0}</span>
                  <Badge variant="outline">
                    {stats ? Math.round((stats.fax_detections / stats.total_detections) * 100) || 0 : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Desconhecido</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.unknown_detections || 0}</span>
                  <Badge variant="destructive">
                    {stats ? Math.round((stats.unknown_detections / stats.total_detections) * 100) || 0 : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detecções Recentes</CardTitle>
            <CardDescription>Últimas 10 detecções da campanha</CardDescription>
          </CardHeader>
          <CardContent>
            {recentResults.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma detecção registrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {getResultIcon(result.detection_result)}
                      <div>
                        <span className="font-medium capitalize">{result.detection_result}</span>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(result.created_at), 'HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getResultColor(result.detection_result)}>
                        {Math.round(result.confidence_score)}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.detection_time_ms}ms
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
