import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Variable, Sparkles } from 'lucide-react';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  system_prompt: string;
  variables: any[];
}

const COMMON_VARIABLES = [
  { name: 'nome_cliente', description: 'Nome do cliente' },
  { name: 'nome_empresa', description: 'Nome da empresa' },
  { name: 'valor_divida', description: 'Valor da dívida' },
  { name: 'dias_atraso', description: 'Dias em atraso' },
  { name: 'data_vencimento', description: 'Data de vencimento' },
  { name: 'numero_contrato', description: 'Número do contrato' },
  { name: 'cpf_cliente', description: 'CPF do cliente' },
  { name: 'telefone', description: 'Telefone do cliente' },
  { name: 'produto', description: 'Produto/Serviço' },
  { name: 'horario_atual', description: 'Horário atual' },
];

export function PromptEditor({ value, onChange }: PromptEditorProps) {
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompt_templates')
        .select('*')
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return data as PromptTemplate[];
    }
  });

  const insertVariable = (varName: string) => {
    const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + `{{${varName}}}` + value.slice(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
      }, 0);
    } else {
      onChange(value + `{{${varName}}}`);
    }
  };

  const applyTemplate = async (template: PromptTemplate) => {
    onChange(template.system_prompt);
    setTemplatesOpen(false);
    
    // Increment usage count
    await supabase
      .from('ai_prompt_templates')
      .update({ usage_count: (template as any).usage_count + 1 })
      .eq('id', template.id);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cobranca': return 'bg-red-500/10 text-red-500';
      case 'agendamento': return 'bg-blue-500/10 text-blue-500';
      case 'vendas': return 'bg-green-500/10 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'cobranca': return 'Cobrança';
      case 'agendamento': return 'Agendamento';
      case 'vendas': return 'Vendas';
      default: return category;
    }
  };

  // Highlight variables in the textarea
  const highlightedVariables = value.match(/\{\{(\w+)\}\}/g) || [];
  const uniqueVariables = [...new Set(highlightedVariables.map(v => v.replace(/[{}]/g, '')))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Templates de Prompt</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="grid gap-4">
                {templates?.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge className={getCategoryColor(template.category)}>
                          {getCategoryLabel(template.category)}
                        </Badge>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-32 overflow-y-auto">
                        {template.system_prompt.slice(0, 300)}
                        {template.system_prompt.length > 300 && '...'}
                      </pre>
                      {template.variables?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {template.variables.map((v: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {v.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-1">
          <Variable className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground mr-2">Variáveis:</span>
          {COMMON_VARIABLES.slice(0, 5).map((v) => (
            <Button
              key={v.name}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => insertVariable(v.name)}
              title={v.description}
            >
              {`{{${v.name}}}`}
            </Button>
          ))}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                + mais
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Variáveis Disponíveis</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_VARIABLES.map((v) => (
                  <Button
                    key={v.name}
                    variant="outline"
                    className="justify-start"
                    onClick={() => insertVariable(v.name)}
                  >
                    <span className="font-mono text-xs">{`{{${v.name}}}`}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{v.description}</span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Textarea
        id="prompt-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Exemplo:
Você é um agente de voz profissional da {{nome_empresa}}.

Seu objetivo é negociar o pagamento de dívidas de forma amigável.

Informações do cliente:
- Nome: {{nome_cliente}}
- Valor: R$ {{valor_divida}}

Diretrizes:
1. Seja cordial e empático
2. Ofereça opções de negociação
3. Nunca seja agressivo`}
        className="min-h-[400px] font-mono text-sm"
      />

      {uniqueVariables.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Variáveis usadas:</span>
          {uniqueVariables.map((v) => (
            <Badge key={v} variant="secondary" className="font-mono text-xs">
              {v}
            </Badge>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Dica:</strong> Use variáveis entre {`{{chaves}}`} para dados dinâmicos. 
          Elas serão substituídas automaticamente durante a ligação.
        </p>
      </div>
    </div>
  );
}
