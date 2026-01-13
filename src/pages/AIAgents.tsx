import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Bot, Plus, Settings, Brain, BarChart3, BookOpen, Search, Mic, Phone, Zap } from 'lucide-react';
import { AIAgentEditor } from '@/components/ai-agents/AIAgentEditor';
import { TrainingExamples } from '@/components/ai-agents/TrainingExamples';
import { AgentPerformanceDashboard } from '@/components/ai-agents/AgentPerformanceDashboard';

interface AIVoiceAgent {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  is_active: boolean;
  language: string | null;
  voice_name: string | null;
  voice_id: string | null;
  total_calls: number | null;
  avg_satisfaction: number | null;
  system_prompt: string | null;
  first_message: string | null;
  agent_id: string | null;
  tools_config: any;
  overrides_config: any;
}

export default function AIAgents() {
  const [selectedAgent, setSelectedAgent] = useState<AIVoiceAgent | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-voice-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_voice_agents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AIVoiceAgent[];
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ai_voice_agents')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-voice-agents'] });
      toast({ title: 'Status atualizado' });
    }
  });

  const filteredAgents = agents?.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'elevenlabs': return <Mic className="h-4 w-4" />;
      case 'vapi': return <Phone className="h-4 w-4" />;
      case 'openai': return <Zap className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'elevenlabs': return 'bg-purple-500/10 text-purple-500';
      case 'vapi': return 'bg-blue-500/10 text-blue-500';
      case 'openai': return 'bg-green-500/10 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agentes IA de Voz</h1>
          <p className="text-muted-foreground">
            Gerencie, treine e monitore seus agentes de voz inteligentes
          </p>
        </div>
        <Button onClick={() => { setSelectedAgent(null); setIsEditorOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agente
        </Button>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents" className="gap-2">
            <Bot className="h-4 w-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-2">
            <Brain className="h-4 w-4" />
            Treinamento
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar agentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-32 bg-muted/50" />
                </Card>
              ))}
            </div>
          ) : filteredAgents?.length === 0 ? (
            <Card className="p-12 text-center">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum agente encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro agente de voz IA para começar
              </p>
              <Button onClick={() => { setSelectedAgent(null); setIsEditorOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Agente
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAgents?.map((agent) => (
                <Card key={agent.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getProviderColor(agent.provider)}`}>
                          {getProviderIcon(agent.provider)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {agent.provider.toUpperCase()} • {agent.language || 'pt-BR'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                        {agent.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {agent.description || 'Sem descrição'}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Ligações</p>
                        <p className="font-semibold">{agent.total_calls || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Satisfação</p>
                        <p className="font-semibold">
                          {agent.avg_satisfaction ? `${(agent.avg_satisfaction * 100).toFixed(0)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setSelectedAgent(agent); setIsEditorOpen(true); }}
                      >
                        <Settings className="mr-2 h-3 w-3" />
                        Configurar
                      </Button>
                      <Button
                        variant={agent.is_active ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ id: agent.id, is_active: !agent.is_active })}
                      >
                        {agent.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="training">
          <TrainingExamples />
        </TabsContent>

        <TabsContent value="performance">
          <AgentPerformanceDashboard />
        </TabsContent>
      </Tabs>

      {isEditorOpen && (
        <AIAgentEditor
          agent={selectedAgent}
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
        />
      )}
    </div>
  );
}
