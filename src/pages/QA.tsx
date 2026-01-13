import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { mockCalls, mockAgents, mockCampaigns } from '@/data/mockData';
import { Play, Pause, Search, Star, MessageSquare, Check, X } from 'lucide-react';

// Mock QA Data
const mockQAReviews = [
  { id: '1', callId: 'call-1', agentName: 'Ana Silva', score: 92, reviewer: 'QA Maria', date: new Date(), status: 'completed' },
  { id: '2', callId: 'call-2', agentName: 'Bruno Costa', score: 78, reviewer: 'QA Maria', date: new Date(), status: 'completed' },
  { id: '3', callId: 'call-3', agentName: 'Carla Santos', score: 85, reviewer: 'QA João', date: new Date(), status: 'pending' },
];

const scorecardCriteria = [
  { id: 'greeting', name: 'Saudação', description: 'Saudou corretamente o cliente', weight: 10 },
  { id: 'identification', name: 'Identificação', description: 'Identificou-se corretamente', weight: 10 },
  { id: 'needs', name: 'Levantamento de Necessidades', description: 'Identificou as necessidades do cliente', weight: 20 },
  { id: 'presentation', name: 'Apresentação', description: 'Apresentou a solução adequadamente', weight: 20 },
  { id: 'objections', name: 'Tratamento de Objeções', description: 'Tratou objeções profissionalmente', weight: 15 },
  { id: 'closing', name: 'Fechamento', description: 'Realizou o fechamento adequado', weight: 15 },
  { id: 'farewell', name: 'Despedida', description: 'Encerrou a ligação corretamente', weight: 10 },
];

export default function QA() {
  const { toast } = useToast();
  const [selectedCall, setSelectedCall] = useState<typeof mockCalls[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');

  const pendingCalls = mockCalls.filter(c => c.status === 'COMPLETED' && c.recordingUrl);

  const handleScore = (criterionId: string, value: number) => {
    setScores({ ...scores, [criterionId]: value });
  };

  const totalScore = Object.values(scores).reduce((acc, val) => acc + val, 0);
  const maxScore = scorecardCriteria.reduce((acc, c) => acc + c.weight, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const handleSubmitReview = () => {
    toast({
      title: 'Avaliação registrada',
      description: `Score: ${percentage}%`,
    });
    setSelectedCall(null);
    setScores({});
    setFeedback('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">156</p>
            <p className="text-sm text-muted-foreground">Avaliações este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-metric-positive">87%</p>
            <p className="text-sm text-muted-foreground">Score médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">12</p>
            <p className="text-sm text-muted-foreground">Coaching agendados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="evaluate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="evaluate">Avaliar</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações</TabsTrigger>
          <TabsTrigger value="scorecards">Scorecards</TabsTrigger>
        </TabsList>

        {/* Evaluate Tab */}
        <TabsContent value="evaluate" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Call List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Chamadas Pendentes</CardTitle>
                <CardDescription>Selecione uma chamada para avaliar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar..." className="pl-10" />
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {pendingCalls.slice(0, 15).map((call) => {
                      const agent = mockAgents.find(a => a.id === call.agentId);
                      return (
                        <div
                          key={call.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedCall?.id === call.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-secondary/50'
                          }`}
                          onClick={() => setSelectedCall(call)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{agent?.name}</p>
                              <p className="text-sm text-muted-foreground font-mono">{call.phone}</p>
                            </div>
                            <Badge variant="outline">{call.direction}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '--:--'}</span>
                            <span>•</span>
                            <span>{call.startedAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Evaluation Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Formulário de Avaliação</CardTitle>
                <CardDescription>
                  {selectedCall 
                    ? `Avaliando chamada ${selectedCall.id}` 
                    : 'Selecione uma chamada para avaliar'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCall ? (
                  <div className="space-y-6">
                    {/* Audio Player Mock */}
                    <Card className="bg-secondary/30">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setIsPlaying(!isPlaying)}
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <div className="flex-1">
                            <Progress value={isPlaying ? 35 : 0} className="h-2" />
                          </div>
                          <span className="text-sm font-mono">
                            {isPlaying ? '1:24' : '0:00'} / 4:12
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Score Current */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                      <span className="font-medium">Score Atual</span>
                      <span className={`text-2xl font-bold ${
                        percentage >= 85 ? 'text-metric-positive' : 
                        percentage >= 70 ? 'text-metric-warning' : 'text-metric-negative'
                      }`}>
                        {percentage}%
                      </span>
                    </div>

                    {/* Criteria */}
                    <div className="space-y-4">
                      {scorecardCriteria.map((criterion) => (
                        <div key={criterion.id} className="space-y-2">
                          <div className="flex justify-between">
                            <div>
                              <Label>{criterion.name}</Label>
                              <p className="text-xs text-muted-foreground">{criterion.description}</p>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {scores[criterion.id] || 0}/{criterion.weight}
                            </span>
                          </div>
                          <Slider
                            value={[scores[criterion.id] || 0]}
                            onValueChange={([v]) => handleScore(criterion.id, v)}
                            max={criterion.weight}
                            step={1}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Feedback */}
                    <div className="space-y-2">
                      <Label>Feedback para o Agente</Label>
                      <Textarea 
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Pontos positivos e oportunidades de melhoria..."
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={handleSubmitReview}>
                        <Check className="mr-2 h-4 w-4" />
                        Salvar Avaliação
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedCall(null)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecione uma chamada na lista para iniciar a avaliação</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agente</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Avaliador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockQAReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">{review.agentName}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${
                          review.score >= 85 ? 'text-metric-positive' : 
                          review.score >= 70 ? 'text-metric-warning' : 'text-metric-negative'
                        }`}>
                          {review.score}%
                        </span>
                      </TableCell>
                      <TableCell>{review.reviewer}</TableCell>
                      <TableCell>{review.date.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={review.status === 'completed' ? 'default' : 'secondary'}>
                          {review.status === 'completed' ? 'Concluído' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scorecards Tab */}
        <TabsContent value="scorecards">
          <Card>
            <CardHeader>
              <CardTitle>Scorecards Configurados</CardTitle>
              <CardDescription>Critérios de avaliação por campanha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scorecardCriteria.map((criterion) => (
                  <div key={criterion.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{criterion.name}</p>
                      <p className="text-sm text-muted-foreground">{criterion.description}</p>
                    </div>
                    <Badge variant="outline">Peso: {criterion.weight}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}