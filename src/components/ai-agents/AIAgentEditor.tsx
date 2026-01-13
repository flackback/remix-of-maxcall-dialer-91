import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Bot, Wand2, Save, History, FileText } from 'lucide-react';
import { PromptEditor } from './PromptEditor';

interface AIVoiceAgent {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  is_active: boolean;
  language: string | null;
  voice_name: string | null;
  voice_id: string | null;
  system_prompt: string | null;
  first_message: string | null;
  agent_id: string | null;
  tools_config: any;
  overrides_config: any;
}

interface AIAgentEditorProps {
  agent: AIVoiceAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAgentEditor({ agent, open, onOpenChange }: AIAgentEditorProps) {
  const queryClient = useQueryClient();
  const isEditing = !!agent;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: 'elevenlabs',
    language: 'pt-BR',
    voice_name: '',
    voice_id: '',
    agent_id: '',
    system_prompt: '',
    first_message: 'Olá! Como posso ajudá-lo hoje?',
    is_active: true,
    tools_config: [] as any[],
    overrides_config: {} as any
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        description: agent.description || '',
        provider: agent.provider || 'elevenlabs',
        language: agent.language || 'pt-BR',
        voice_name: agent.voice_name || '',
        voice_id: agent.voice_id || '',
        agent_id: agent.agent_id || '',
        system_prompt: agent.system_prompt || '',
        first_message: agent.first_message || 'Olá! Como posso ajudá-lo hoje?',
        is_active: agent.is_active,
        tools_config: agent.tools_config || [],
        overrides_config: agent.overrides_config || {}
      });
    } else {
      setFormData({
        name: '',
        description: '',
        provider: 'elevenlabs',
        language: 'pt-BR',
        voice_name: '',
        voice_id: '',
        agent_id: '',
        system_prompt: '',
        first_message: 'Olá! Como posso ajudá-lo hoje?',
        is_active: true,
        tools_config: [],
        overrides_config: {}
      });
    }
  }, [agent]);

  const { data: promptVersions } = useQuery({
    queryKey: ['prompt-versions', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('ai_prompt_versions')
        .select('*')
        .eq('agent_id', agent.id)
        .order('version', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!agent?.id
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .single();
      
      if (!profile?.account_id) throw new Error('Conta não encontrada');

      const payload = {
        ...data,
        account_id: profile.account_id,
        tools_config: data.tools_config,
        overrides_config: data.overrides_config
      };

      if (isEditing && agent) {
        const { error } = await supabase
          .from('ai_voice_agents')
          .update(payload)
          .eq('id', agent.id);
        if (error) throw error;

        // Save prompt version
        if (data.system_prompt !== agent.system_prompt) {
          const { data: latestVersion } = await supabase
            .from('ai_prompt_versions')
            .select('version')
            .eq('agent_id', agent.id)
            .order('version', { ascending: false })
            .limit(1)
            .single();

          await supabase.from('ai_prompt_versions').insert({
            account_id: profile.account_id,
            agent_id: agent.id,
            version: (latestVersion?.version || 0) + 1,
            system_prompt: data.system_prompt,
            is_active: true
          });
        }
      } else {
        const { data: newAgent, error } = await supabase
          .from('ai_voice_agents')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        // Create first prompt version
        if (data.system_prompt) {
          await supabase.from('ai_prompt_versions').insert({
            account_id: profile.account_id,
            agent_id: newAgent.id,
            version: 1,
            system_prompt: data.system_prompt,
            is_active: true
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-voice-agents'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-versions'] });
      toast({ title: isEditing ? 'Agente atualizado!' : 'Agente criado!' });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  const generatePromptMutation = useMutation({
    mutationFn: async () => {
      if (!agent?.id) throw new Error('Salve o agente primeiro');
      
      const { data, error } = await supabase.functions.invoke('ai-prompt-generator', {
        body: { agent_id: agent.id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.generated_prompt) {
        setFormData(prev => ({ ...prev, system_prompt: data.generated_prompt }));
        toast({ title: 'Prompt gerado!', description: 'Revise e salve as alterações.' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao gerar prompt', description: error.message, variant: 'destructive' });
    }
  });

  const restoreVersion = (version: any) => {
    setFormData(prev => ({ ...prev, system_prompt: version.system_prompt }));
    toast({ title: `Versão ${version.version} restaurada`, description: 'Salve para aplicar.' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {isEditing ? 'Editar Agente' : 'Novo Agente IA'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="voice">Voz</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Agente *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Agente de Cobrança"
                />
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, provider: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="vapi">Vapi</SelectItem>
                    <SelectItem value="openai">OpenAI Realtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o propósito deste agente..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select
                  value={formData.language}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, language: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="es-ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ID do Agente (Provider)</Label>
                <Input
                  value={formData.agent_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, agent_id: e.target.value }))}
                  placeholder="ID do agente no provider"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mensagem Inicial</Label>
              <Textarea
                value={formData.first_message}
                onChange={(e) => setFormData(prev => ({ ...prev, first_message: e.target.value }))}
                placeholder="Primeira mensagem do agente ao atender..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Agente Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Permite que o agente atenda chamadas
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="prompt" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">System Prompt</h3>
                <p className="text-sm text-muted-foreground">
                  Define o comportamento e personalidade do agente
                </p>
              </div>
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={() => generatePromptMutation.mutate()}
                  disabled={generatePromptMutation.isPending}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  {generatePromptMutation.isPending ? 'Gerando...' : 'Gerar com IA'}
                </Button>
              )}
            </div>

            <PromptEditor
              value={formData.system_prompt}
              onChange={(v) => setFormData(prev => ({ ...prev, system_prompt: v }))}
            />
          </TabsContent>

          <TabsContent value="voice" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Voz</Label>
                <Input
                  value={formData.voice_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, voice_name: e.target.value }))}
                  placeholder="Ex: Rachel, Bella..."
                />
              </div>
              <div className="space-y-2">
                <Label>ID da Voz</Label>
                <Input
                  value={formData.voice_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, voice_id: e.target.value }))}
                  placeholder="ID da voz no provider"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Vozes Populares por Provider</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>ElevenLabs:</strong> Rachel, Domi, Bella, Antoni, Elli, Josh, Arnold</p>
                <p><strong>Vapi:</strong> Configurar no painel Vapi</p>
                <p><strong>OpenAI:</strong> alloy, echo, fable, onyx, nova, shimmer</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Histórico de Versões do Prompt</h3>
            </div>

            {promptVersions?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma versão salva ainda
              </p>
            ) : (
              <div className="space-y-2">
                {promptVersions?.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Versão {version.version}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(version.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreVersion(version)}
                    >
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending || !formData.name}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
