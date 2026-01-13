import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Download, 
  Brain, 
  FileText, 
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Building,
  Phone,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CallAnalysisProps {
  call: {
    id: string;
    phone: string;
    direction: string;
    status: string;
    duration?: number;
    recording_url?: string;
    transcript?: string;
    ai_summary?: string;
    ai_sentiment?: string;
    ai_quality_score?: number;
    ai_key_topics?: string[];
    ai_action_items?: string[];
    ai_analyzed_at?: string;
    amd_result?: string;
    leads?: {
      first_name?: string;
      last_name?: string;
      company?: string;
      email?: string;
    };
    campaigns?: {
      name: string;
    };
    dispositions?: {
      name: string;
      category: string;
    };
  };
  onUpdate?: () => void;
}

export function CallAnalysisPanel({ call, onUpdate }: CallAnalysisProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const handlePlayPause = () => {
    if (!call.recording_url) {
      toast.error('Gravação não disponível');
      return;
    }

    if (!audioElement) {
      const audio = new Audio(call.recording_url);
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
      audio.addEventListener('loadedmetadata', () => setAudioDuration(audio.duration));
      audio.addEventListener('ended', () => setIsPlaying(false));
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('call-transcriber', {
        body: { call_id: call.id }
      });

      if (error) throw error;

      if (data.already_transcribed) {
        toast.info('Chamada já transcrita');
      } else {
        toast.success('Transcrição concluída');
        onUpdate?.();
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast.error('Erro ao transcrever: ' + error.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!call.transcript) {
      toast.error('Transcrição necessária antes da análise');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('call-analyzer', {
        body: { call_id: call.id, force_reanalyze: true }
      });

      if (error) throw error;

      toast.success('Análise concluída');
      onUpdate?.();
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Erro ao analisar: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'negative': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'mixed': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getQualityColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Análise da Chamada
          </CardTitle>
          <div className="flex items-center gap-2">
            {call.ai_analyzed_at && (
              <Badge variant="outline" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                Analisado
              </Badge>
            )}
            <Badge variant={call.direction === 'INBOUND' ? 'default' : 'secondary'}>
              {call.direction === 'INBOUND' ? 'Receptivo' : 'Ativo'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Call Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{call.phone}</span>
          </div>
          {call.leads && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{call.leads.first_name} {call.leads.last_name}</span>
            </div>
          )}
          {call.leads?.company && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{call.leads.company}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(call.duration || 0)}</span>
          </div>
        </div>

        {/* Recording Player */}
        {call.recording_url && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Gravação</span>
              <Button variant="ghost" size="sm" asChild>
                <a href={call.recording_url} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-full"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <Progress value={(currentTime / audioDuration) * 100 || 0} className="h-2" />
              </div>
              <span className="text-xs text-muted-foreground min-w-[60px]">
                {formatTime(currentTime)} / {formatTime(audioDuration || call.duration || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTranscribe}
            disabled={isTranscribing || !call.recording_url}
          >
            {isTranscribing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {call.transcript ? 'Re-transcrever' : 'Transcrever'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !call.transcript}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            {call.ai_analyzed_at ? 'Re-analisar' : 'Analisar com IA'}
          </Button>
        </div>

        {/* Analysis Results */}
        {call.ai_analyzed_at && (
          <Tabs defaultValue="summary" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="transcript">Transcrição</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="actions">Ações</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4 mt-4">
              {/* Quality Score */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="font-medium">Score de Qualidade</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${getQualityColor(call.ai_quality_score)}`}>
                    {call.ai_quality_score || 0}
                  </span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </div>

              {/* Sentiment */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sentimento:</span>
                <Badge className={getSentimentColor(call.ai_sentiment)}>
                  {call.ai_sentiment === 'positive' && 'Positivo'}
                  {call.ai_sentiment === 'negative' && 'Negativo'}
                  {call.ai_sentiment === 'neutral' && 'Neutro'}
                  {call.ai_sentiment === 'mixed' && 'Misto'}
                </Badge>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Resumo</span>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {call.ai_summary || 'Nenhum resumo disponível'}
                </p>
              </div>

              {/* Topics */}
              {call.ai_key_topics && call.ai_key_topics.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Tópicos Principais</span>
                  <div className="flex flex-wrap gap-2">
                    {call.ai_key_topics.map((topic, i) => (
                      <Badge key={i} variant="secondary">{topic}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transcript" className="mt-4">
              <ScrollArea className="h-[300px] rounded-lg border bg-muted/20 p-4">
                {call.transcript ? (
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {call.transcript}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2" />
                    <span>Nenhuma transcrição disponível</span>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4 mt-4">
              <div className="grid gap-3">
                {/* AMD Result */}
                {call.amd_result && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">Classificação AMD</span>
                      <p className="text-xs text-muted-foreground">{call.amd_result}</p>
                    </div>
                  </div>
                )}

                {/* Disposition */}
                {call.dispositions && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <span className="text-sm font-medium">Disposição</span>
                      <p className="text-xs text-muted-foreground">
                        {call.dispositions.name} ({call.dispositions.category})
                      </p>
                    </div>
                  </div>
                )}

                {/* Campaign */}
                {call.campaigns && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Building className="h-5 w-5 text-primary" />
                    <div>
                      <span className="text-sm font-medium">Campanha</span>
                      <p className="text-xs text-muted-foreground">{call.campaigns.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4 mt-4">
              {call.ai_action_items && call.ai_action_items.length > 0 ? (
                <div className="space-y-2">
                  {call.ai_action_items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mb-2" />
                  <span>Nenhuma ação pendente identificada</span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
