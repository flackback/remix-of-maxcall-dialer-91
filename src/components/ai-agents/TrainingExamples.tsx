import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, ThumbsUp, ThumbsDown, MessageSquare, Star, Trash2, BookOpen } from 'lucide-react';

interface TrainingExample {
  id: string;
  agent_id: string | null;
  call_id: string | null;
  category: string;
  subcategory: string | null;
  transcript: string;
  expected_behavior: string | null;
  quality_score: number | null;
  is_positive_example: boolean;
  tags: string[];
  created_at: string;
}

interface Call {
  id: string;
  phone: string;
  transcript: string | null;
  ai_summary: string | null;
  ai_sentiment: string | null;
  duration: number | null;
  created_at: string;
  campaign?: { name: string } | null;
}

const CATEGORIES = [
  { value: 'abertura', label: 'Abertura de Ligação' },
  { value: 'objecao', label: 'Tratamento de Objeção' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechamento', label: 'Fechamento' },
  { value: 'agendamento', label: 'Agendamento' },
  { value: 'qualificacao', label: 'Qualificação' },
  { value: 'sucesso', label: 'Caso de Sucesso' },
  { value: 'falha', label: 'Caso de Falha' },
];

export function TrainingExamples() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [newExample, setNewExample] = useState({
    category: 'sucesso',
    subcategory: '',
    transcript: '',
    expected_behavior: '',
    quality_score: 5,
    is_positive_example: true,
    tags: [] as string[],
    call_id: null as string | null,
    agent_id: null as string | null
  });

  const { data: examples, isLoading } = useQuery({
    queryKey: ['training-examples', categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('ai_training_examples')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingExample[];
    }
  });

  const { data: recentCalls } = useQuery({
    queryKey: ['recent-transcribed-calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calls')
        .select(`
          id, phone, transcript, ai_summary, ai_sentiment, duration, created_at,
          campaign:campaigns(name)
        `)
        .not('transcript', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Call[];
    }
  });

  const { data: agents } = useQuery({
    queryKey: ['ai-voice-agents-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_voice_agents')
        .select('id, name');
      if (error) throw error;
      return data;
    }
  });

  const addExampleMutation = useMutation({
    mutationFn: async (example: typeof newExample) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .single();
      
      if (!profile?.account_id) throw new Error('Conta não encontrada');

      const { error } = await supabase.from('ai_training_examples').insert({
        ...example,
        account_id: profile.account_id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-examples'] });
      toast({ title: 'Exemplo adicionado!' });
      setAddDialogOpen(false);
      setNewExample({
        category: 'sucesso',
        subcategory: '',
        transcript: '',
        expected_behavior: '',
        quality_score: 5,
        is_positive_example: true,
        tags: [],
        call_id: null,
        agent_id: null
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  const deleteExampleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_training_examples')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-examples'] });
      toast({ title: 'Exemplo removido' });
    }
  });

  const useCallAsExample = (call: Call) => {
    setSelectedCall(call);
    setNewExample(prev => ({
      ...prev,
      transcript: call.transcript || '',
      call_id: call.id
    }));
    setAddDialogOpen(true);
  };

  const filteredExamples = examples?.filter(ex =>
    ex.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sucesso': return 'bg-green-500/10 text-green-500';
      case 'falha': return 'bg-red-500/10 text-red-500';
      case 'objecao': return 'bg-orange-500/10 text-orange-500';
      case 'negociacao': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="examples" className="space-y-4">
        <TabsList>
          <TabsTrigger value="examples" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Exemplos
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Ligações Transcritas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="examples" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar exemplos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Exemplo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Exemplo de Treinamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select
                        value={newExample.category}
                        onValueChange={(v) => setNewExample(prev => ({ ...prev, category: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Agente IA (opcional)</Label>
                      <Select
                        value={newExample.agent_id || 'none'}
                        onValueChange={(v) => setNewExample(prev => ({ ...prev, agent_id: v === 'none' ? null : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum (geral)</SelectItem>
                          {agents?.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Transcrição *</Label>
                    <Textarea
                      value={newExample.transcript}
                      onChange={(e) => setNewExample(prev => ({ ...prev, transcript: e.target.value }))}
                      placeholder="Cole ou digite a transcrição da ligação..."
                      rows={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Comportamento Esperado</Label>
                    <Textarea
                      value={newExample.expected_behavior}
                      onChange={(e) => setNewExample(prev => ({ ...prev, expected_behavior: e.target.value }))}
                      placeholder="Descreva o que o agente deveria fazer/falar nesta situação..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Qualidade (1-5)</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(score => (
                          <Button
                            key={score}
                            variant={newExample.quality_score === score ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setNewExample(prev => ({ ...prev, quality_score: score }))}
                          >
                            <Star className={`h-4 w-4 ${newExample.quality_score >= score ? 'fill-current' : ''}`} />
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Exemplo</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={newExample.is_positive_example ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewExample(prev => ({ ...prev, is_positive_example: true }))}
                          className="flex-1"
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Positivo
                        </Button>
                        <Button
                          variant={!newExample.is_positive_example ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => setNewExample(prev => ({ ...prev, is_positive_example: false }))}
                          className="flex-1"
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Negativo
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => addExampleMutation.mutate(newExample)}
                      disabled={addExampleMutation.isPending || !newExample.transcript}
                    >
                      {addExampleMutation.isPending ? 'Salvando...' : 'Salvar Exemplo'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-24 bg-muted/50" />
                </Card>
              ))}
            </div>
          ) : filteredExamples?.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum exemplo de treinamento</h3>
              <p className="text-muted-foreground mb-4">
                Adicione exemplos de ligações para treinar seus agentes IA
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredExamples?.map((example) => (
                <Card key={example.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(example.category)}>
                          {CATEGORIES.find(c => c.value === example.category)?.label || example.category}
                        </Badge>
                        {example.is_positive_example ? (
                          <ThumbsUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: example.quality_score || 0 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        ))}
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      {new Date(example.created_at).toLocaleString('pt-BR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm line-clamp-4">{example.transcript}</p>
                    {example.expected_behavior && (
                      <div className="p-2 bg-muted/50 rounded text-xs">
                        <strong>Esperado:</strong> {example.expected_behavior}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteExampleMutation.mutate(example.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ligações Transcritas Recentes</CardTitle>
              <CardDescription>
                Selecione ligações para usar como exemplos de treinamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {recentCalls?.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{call.phone}</span>
                          {call.campaign && (
                            <Badge variant="outline" className="text-xs">
                              {call.campaign.name}
                            </Badge>
                          )}
                          {call.ai_sentiment && (
                            <Badge
                              className={
                                call.ai_sentiment === 'positive' ? 'bg-green-500/10 text-green-500' :
                                call.ai_sentiment === 'negative' ? 'bg-red-500/10 text-red-500' :
                                'bg-muted text-muted-foreground'
                              }
                            >
                              {call.ai_sentiment}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {call.ai_summary || call.transcript?.slice(0, 150) || 'Sem resumo'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(call.created_at).toLocaleString('pt-BR')}
                          {call.duration && ` • ${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => useCallAsExample(call)}
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        Usar
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
