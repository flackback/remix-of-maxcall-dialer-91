import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CallAnalysisList } from '@/components/calls/CallAnalysisList';
import { 
  Brain, 
  List, 
  MessageSquare, 
  Sparkles, 
  Loader2, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  ListChecks,
  TrendingUp
} from 'lucide-react';

interface AnalysisResult {
  sentiment: string;
  satisfaction_score?: number;
  quality_score: number;
  key_topics: string[];
  action_items: string[];
  summary: string;
}

export default function CallAnalysis() {
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!transcript.trim()) {
      toast.error('Forneça uma transcrição');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('call-analyzer', {
        body: { action: 'analyze', transcript }
      });

      if (error) throw error;

      if (data.success) {
        setAnalysis(data.analysis);
        toast.success('Análise concluída');
      } else {
        throw new Error(data.error || 'Falha na análise');
      }
    } catch (error: any) {
      if (error.message?.includes('429')) {
        toast.error('Limite de requisições excedido. Tente novamente em alguns minutos.');
      } else if (error.message?.includes('402')) {
        toast.error('Créditos de IA esgotados.');
      } else {
        toast.error(error.message || 'Erro ao analisar');
      }
    } finally {
      setLoading(false);
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return <ThumbsUp className="h-5 w-5 text-green-500" />;
      case 'negative': return <ThumbsDown className="h-5 w-5 text-red-500" />;
      default: return <Minus className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'negative': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análise de Chamadas com IA</h1>
        <p className="text-muted-foreground">
          Analise transcrições e extraia insights com inteligência artificial
        </p>
      </div>

      <Tabs defaultValue="analyze" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyze" className="gap-2">
            <Brain className="h-4 w-4" />
            Analisar Transcrição
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Chamadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Transcrição
              </CardTitle>
              <CardDescription>
                Cole a transcrição da chamada para análise com IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Cole aqui a transcrição da chamada..."
                className="min-h-[200px] font-mono text-sm"
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={loading || !transcript.trim()}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                Analisar com IA
              </Button>
            </CardContent>
          </Card>

          {analysis && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Sentimento</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getSentimentIcon(analysis.sentiment)}
                          <Badge className={getSentimentColor(analysis.sentiment)}>
                            {analysis.sentiment}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Score de Qualidade</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{analysis.quality_score}</span>
                        <span className="text-muted-foreground">/100</span>
                      </div>
                      <Progress value={analysis.quality_score} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Satisfação</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{analysis.satisfaction_score || '-'}</span>
                        <span className="text-muted-foreground">/10</span>
                      </div>
                      <Progress value={(analysis.satisfaction_score || 0) * 10} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {analysis.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Resumo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{analysis.summary}</p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.key_topics?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Tópicos Principais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analysis.key_topics.map((topic, i) => (
                          <Badge key={i} variant="secondary">{topic}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {analysis.action_items?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        Ações Identificadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.action_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-primary">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="list">
          <CallAnalysisList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
