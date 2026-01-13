import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Brain, 
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Call {
  id: string;
  phone: string;
  direction: string;
  duration: number;
  ai_sentiment: string | null;
  ai_quality_score: number | null;
  ai_summary: string | null;
  ai_analyzed_at: string | null;
  started_at: string;
  transcript: string | null;
}

export function CallAnalysisList() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);

  useEffect(() => {
    fetchCalls();
  }, []);

  async function fetchCalls() {
    setLoading(true);
    const { data, error } = await supabase
      .from('calls')
      .select('id, phone, direction, duration, ai_sentiment, ai_quality_score, ai_summary, ai_analyzed_at, started_at, transcript')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      toast.error('Erro ao carregar chamadas');
    } else {
      setCalls(data || []);
    }
    setLoading(false);
  }

  async function handleBatchAnalyze() {
    if (selectedCalls.length === 0) {
      toast.error('Selecione chamadas para analisar');
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('call-analyzer', {
        body: { action: 'batch_analyze', call_ids: selectedCalls }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${data.analyzed} chamadas analisadas, ${data.failed} falharam`);
        fetchCalls();
        setSelectedCalls([]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro na análise em lote');
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleSelect(callId: string) {
    setSelectedCalls(prev => 
      prev.includes(callId) 
        ? prev.filter(id => id !== callId)
        : [...prev, callId]
    );
  }

  function toggleSelectAll() {
    const unanalyzedCalls = calls.filter(c => c.transcript && !c.ai_analyzed_at);
    if (selectedCalls.length === unanalyzedCalls.length) {
      setSelectedCalls([]);
    } else {
      setSelectedCalls(unanalyzedCalls.map(c => c.id));
    }
  }

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <ThumbsDown className="h-4 w-4 text-red-500" />;
      case 'neutral': return <Minus className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getQualityColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const unanalyzedCount = calls.filter(c => c.transcript && !c.ai_analyzed_at).length;
  const analyzedCount = calls.filter(c => c.ai_analyzed_at).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{calls.length}</div>
            <p className="text-xs text-muted-foreground">Total de Chamadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{analyzedCount}</div>
            <p className="text-xs text-muted-foreground">Analisadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{unanalyzedCount}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {analyzedCount > 0 
                ? Math.round(calls.filter(c => c.ai_quality_score).reduce((sum, c) => sum + (c.ai_quality_score || 0), 0) / analyzedCount)
                : '-'
              }
            </div>
            <p className="text-xs text-muted-foreground">Score Médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchCalls} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            onClick={handleBatchAnalyze} 
            disabled={analyzing || selectedCalls.length === 0}
            className="gap-2"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            Analisar Selecionadas ({selectedCalls.length})
          </Button>
        </div>
        {selectedCalls.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedCalls([])}>
            Limpar seleção
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedCalls.length > 0 && selectedCalls.length === unanalyzedCount}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Sentimento</TableHead>
                <TableHead>Qualidade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map(call => (
                <TableRow key={call.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedCalls.includes(call.id)}
                      onCheckedChange={() => toggleSelect(call.id)}
                      disabled={!call.transcript || !!call.ai_analyzed_at}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{call.phone}</TableCell>
                  <TableCell>
                    {format(new Date(call.started_at), 'dd/MM HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSentimentIcon(call.ai_sentiment)}
                      <span className="text-sm capitalize">{call.ai_sentiment || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {call.ai_quality_score ? (
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getQualityColor(call.ai_quality_score)}`}>
                          {call.ai_quality_score}
                        </span>
                        <Progress value={call.ai_quality_score} className="w-16 h-2" />
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {call.ai_analyzed_at ? (
                      <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                        <CheckCircle className="h-3 w-3" />
                        Analisada
                      </Badge>
                    ) : call.transcript ? (
                      <Badge variant="outline" className="gap-1 text-yellow-500 border-yellow-500/30">
                        Pendente
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        Sem transcrição
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
