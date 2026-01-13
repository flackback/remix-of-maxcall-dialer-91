import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Headphones, 
  PhoneCall, 
  Users, 
  Radio, 
  BarChart3, 
  Zap, 
  Settings,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';

export function UserManual() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual do Usuário</CardTitle>
          <CardDescription>
            Guia completo de todas as funcionalidades do Maxcall
          </CardDescription>
        </CardHeader>
      </Card>

      <Accordion type="multiple" className="space-y-4">
        {/* Dashboard */}
        <AccordionItem value="dashboard" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span className="font-semibold">Dashboard</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              O Dashboard apresenta uma visão geral em tempo real das operações do contact center.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Métricas em Tempo Real</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Chamadas ativas no momento</li>
                    <li>Agentes logados e disponíveis</li>
                    <li>Taxa de atendimento (ASR)</li>
                    <li>Tempo médio de atendimento (AHT)</li>
                    <li>Chamadas em fila</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Gráficos</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Volume de chamadas por hora</li>
                    <li>Distribuição por disposição</li>
                    <li>Performance de campanhas</li>
                    <li>Status dos agentes</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Agent Console */}
        <AccordionItem value="agent-console" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Headphones className="h-5 w-5 text-primary" />
              <span className="font-semibold">Console do Agente</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Interface principal do agente para receber e realizar chamadas.
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Softphone WebRTC</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Softphone integrado ao navegador com controles completos:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-500" />
                      <span>Atender chamada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneOff className="h-4 w-4 text-red-500" />
                      <span>Encerrar chamada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-muted-foreground" />
                      <span>Mudo on/off</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PauseCircle className="h-4 w-4 text-yellow-500" />
                      <span>Hold/Unhold</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      <span>Controle de volume</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span>Transferência</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Status do Agente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500">Available</Badge>
                      <span className="text-muted-foreground">Pronto para receber</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500">On Call</Badge>
                      <span className="text-muted-foreground">Em chamada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500">Wrap-up</Badge>
                      <span className="text-muted-foreground">Pós-atendimento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-500">Paused</Badge>
                      <span className="text-muted-foreground">Em pausa</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Disposições</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p className="mb-2">Após cada chamada, o agente deve selecionar uma disposição:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Contacto</strong> - Contato efetivo com o lead</li>
                    <li><strong>Não Atendeu</strong> - Sem resposta</li>
                    <li><strong>Ocupado</strong> - Linha ocupada</li>
                    <li><strong>Caixa Postal</strong> - Secretária eletrônica</li>
                    <li><strong>Número Inválido</strong> - Número incorreto</li>
                    <li><strong>Venda</strong> - Conversão realizada</li>
                    <li><strong>Callback</strong> - Agendamento de retorno</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Scripts</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Scripts dinâmicos que guiam o agente durante a chamada, 
                  com campos personalizados do lead e navegação por seções.
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Campaigns */}
        <AccordionItem value="campaigns" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <PhoneCall className="h-5 w-5 text-primary" />
              <span className="font-semibold">Campanhas</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Gerenciamento de campanhas de discagem com configurações avançadas.
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Modos de Discagem</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="border-l-4 border-primary pl-3">
                      <h4 className="font-medium">Preditivo</h4>
                      <p className="text-sm text-muted-foreground">
                        O sistema prediz quando agentes ficarão disponíveis e inicia 
                        chamadas antecipadamente para maximizar produtividade. 
                        Usa algoritmos para ajustar automaticamente a taxa de discagem.
                      </p>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-medium">Power</h4>
                      <p className="text-sm text-muted-foreground">
                        Disca múltiplas linhas simultaneamente para cada agente 
                        disponível. Taxa fixa configurável (ex: 3 chamadas por agente).
                      </p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-3">
                      <h4 className="font-medium">Preview</h4>
                      <p className="text-sm text-muted-foreground">
                        Agente visualiza informações do lead antes de iniciar a chamada. 
                        Ideal para vendas consultivas ou leads de alto valor.
                      </p>
                    </div>
                    <div className="border-l-4 border-yellow-500 pl-3">
                      <h4 className="font-medium">Manual</h4>
                      <p className="text-sm text-muted-foreground">
                        Agente disca manualmente os números. 
                        Máximo controle, menor produtividade.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Configurações de Campanha</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Dial Ratio</strong> - Proporção de chamadas por agente</li>
                    <li><strong>Drop Rate Target</strong> - Meta máxima de abandono</li>
                    <li><strong>Max Attempts</strong> - Tentativas máximas por lead</li>
                    <li><strong>Cooldown</strong> - Intervalo mínimo entre tentativas</li>
                    <li><strong>Work Days</strong> - Dias de funcionamento</li>
                    <li><strong>Start/End Time</strong> - Horário de operação</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Dialer */}
        <AccordionItem value="dialer" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Radio className="h-5 w-5 text-primary" />
              <span className="font-semibold">Discador Preditivo</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Motor de discagem preditiva com controles em tempo real.
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Controles do Discador</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-3 py-1.5 rounded-md">
                      <PlayCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Start</span>
                    </div>
                    <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-600 px-3 py-1.5 rounded-md">
                      <PauseCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Pause</span>
                    </div>
                    <div className="flex items-center gap-2 bg-red-500/10 text-red-600 px-3 py-1.5 rounded-md">
                      <StopCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Stop</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Métricas do Discador</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Calls Dialed</strong> - Total de chamadas iniciadas</li>
                    <li><strong>Calls Connected</strong> - Chamadas atendidas</li>
                    <li><strong>ASR</strong> - Answer Seizure Ratio</li>
                    <li><strong>Drop Rate</strong> - Taxa de abandono</li>
                    <li><strong>Current Dial Ratio</strong> - Proporção atual</li>
                    <li><strong>Agents Available</strong> - Agentes disponíveis</li>
                    <li><strong>Calls Ringing</strong> - Chamadas tocando</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Algoritmos Adaptativos</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Agent Wait Time</strong> - Baseado no tempo de espera do agente</li>
                    <li><strong>Drop Percentage</strong> - Mantém abandono abaixo do target</li>
                    <li><strong>Available Only</strong> - Disca apenas para agentes livres</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Supervision */}
        <AccordionItem value="supervision" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold">Supervisão</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Monitoramento em tempo real de agentes e chamadas.
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Modos de Monitoramento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="border-l-4 border-blue-500 pl-3">
                    <h4 className="font-medium">Listen (Escuta)</h4>
                    <p className="text-muted-foreground">
                      Supervisor ouve a chamada sem ser ouvido por nenhuma das partes.
                    </p>
                  </div>
                  <div className="border-l-4 border-yellow-500 pl-3">
                    <h4 className="font-medium">Whisper (Sussurro)</h4>
                    <p className="text-muted-foreground">
                      Supervisor fala apenas com o agente, cliente não ouve.
                    </p>
                  </div>
                  <div className="border-l-4 border-red-500 pl-3">
                    <h4 className="font-medium">Barge (Intervenção)</h4>
                    <p className="text-muted-foreground">
                      Supervisor entra na chamada e é ouvido por ambas as partes.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ações do Supervisor</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Forçar logout de agente</li>
                    <li>Alterar status do agente</li>
                    <li>Transferir chamada</li>
                    <li>Encerrar chamada</li>
                    <li>Enviar mensagem ao agente</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* AMD */}
        <AccordionItem value="amd" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-semibold">AMD (Answering Machine Detection)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Detecção automática de secretária eletrônica para otimizar tempo dos agentes.
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resultados de Detecção</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">Human</Badge>
                    <span className="text-muted-foreground">Pessoa atendeu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500">Machine</Badge>
                    <span className="text-muted-foreground">Secretária eletrônica</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500">Fax</Badge>
                    <span className="text-muted-foreground">Sinal de fax detectado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Unknown</Badge>
                    <span className="text-muted-foreground">Não foi possível determinar</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ações Automáticas</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Human</strong> → Conectar ao agente</li>
                    <li><strong>Machine</strong> → Deixar mensagem ou desligar</li>
                    <li><strong>Fax</strong> → Desligar e marcar número</li>
                    <li><strong>Unknown</strong> → Conectar ou reagendar</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Providers Suportados</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Internal</strong> - Detecção própria do Maxcall</li>
                    <li><strong>Telnyx</strong> - AMD nativo da operadora</li>
                    <li><strong>Jambonz</strong> - AMD via aplicação</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* AI Voice Agents */}
        <AccordionItem value="ai-agents" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Headphones className="h-5 w-5 text-primary" />
              <span className="font-semibold">Agentes de IA de Voz</span>
              <Badge className="bg-purple-500 text-xs ml-2">Novo</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Configure agentes de IA para atendimento automatizado 24/7 com vozes realistas e conversação natural.
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Providers Suportados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="border-l-4 border-purple-500 pl-3">
                    <h4 className="font-medium">ElevenLabs</h4>
                    <p className="text-sm text-muted-foreground">
                      Vozes ultra-realistas com conversação fluida. Ideal para atendimento premium 
                      e experiências de voz de alta qualidade. Suporta múltiplos idiomas.
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-3">
                    <h4 className="font-medium">OpenAI Realtime</h4>
                    <p className="text-sm text-muted-foreground">
                      GPT-4o com conversação em tempo real. Excelente para análise complexa, 
                      qualificação de leads e suporte técnico detalhado.
                    </p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-3">
                    <h4 className="font-medium">Vapi</h4>
                    <p className="text-sm text-muted-foreground">
                      Plataforma completa de agentes de voz com ferramentas integradas, 
                      transcrição e handoff para humanos. Fácil de configurar.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Como Configurar</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Acesse <strong>Integrações → Integrações de IA de Voz</strong></li>
                    <li>Clique em <strong>Configurar</strong> no provider desejado</li>
                    <li>Insira sua API Key obtida no portal do provider</li>
                    <li>O sistema verifica automaticamente a chave</li>
                    <li>Configure opções adicionais (Agent ID, Voice ID, etc.)</li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fluxo de Chamada com IA</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Chamada é atendida pelo agente de IA</li>
                    <li>IA conversa, qualifica e coleta informações</li>
                    <li>Se necessário, IA solicita handoff para humano</li>
                    <li>Sistema transfere para agente disponível</li>
                    <li>Agente recebe resumo da conversa da IA</li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Métricas de IA</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Chamadas atendidas por IA</strong> - Total automatizado</li>
                    <li><strong>Taxa de handoff</strong> - Transferências para humanos</li>
                    <li><strong>Duração média</strong> - Tempo de conversa com IA</li>
                    <li><strong>Satisfação</strong> - Score de qualidade da interação</li>
                    <li><strong>Sentimento</strong> - Análise emocional das conversas</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* n8n Automations */}
        <AccordionItem value="n8n" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-semibold">Automações (n8n)</span>
              <Badge variant="outline" className="text-xs ml-2">Integração</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Integre o Maxcall com n8n para criar automações poderosas e workflows personalizados.
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">O que é n8n?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>
                    n8n é uma plataforma de automação de workflows que conecta diferentes aplicações 
                    e serviços. Permite criar fluxos automatizados sem código, integrando o Maxcall 
                    com CRMs, email, Slack, Google Sheets e centenas de outros serviços.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Casos de Uso</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Enviar notificação no Slack quando venda é concluída</li>
                    <li>Criar/atualizar lead no CRM após chamada</li>
                    <li>Enviar email de follow-up automático</li>
                    <li>Registrar chamada em planilha Google</li>
                    <li>Sincronizar disposições com sistema externo</li>
                    <li>Gerar relatórios automáticos</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Como Conectar</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Acesse seu n8n e vá em <strong>Settings → MCP access</strong></li>
                    <li>Ative <strong>Enable MCP access</strong></li>
                    <li>Copie a URL do MCP Server</li>
                    <li>No Maxcall, vá em <strong>Settings → Connectors → n8n</strong></li>
                    <li>Cole a URL e conecte</li>
                    <li>Em cada workflow, ative <strong>Available in MCP</strong></li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Eventos Disponíveis</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>call.completed</strong> - Chamada finalizada</li>
                    <li><strong>call.dispositioned</strong> - Disposição registrada</li>
                    <li><strong>lead.converted</strong> - Lead convertido em venda</li>
                    <li><strong>agent.status_changed</strong> - Mudança de status</li>
                    <li><strong>campaign.started/stopped</strong> - Controle de campanha</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Caller ID */}
        <AccordionItem value="caller-id" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <span className="font-semibold">Caller ID Management</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Gerenciamento inteligente de números de origem para maximizar taxas de atendimento.
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pools de Números</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p className="mb-2">Agrupe números por região ou finalidade:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Pool São Paulo (DDDs 11, 12, 13...)</li>
                    <li>Pool Rio de Janeiro (DDDs 21, 22, 24)</li>
                    <li>Pool Nacional (0800, números móveis)</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Estratégias de Rotação</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Random</strong> - Seleção aleatória</li>
                    <li><strong>Round Robin</strong> - Sequencial circular</li>
                    <li><strong>Weighted</strong> - Baseado em peso configurado</li>
                    <li><strong>Least Used</strong> - Número menos usado</li>
                    <li><strong>Highest Health</strong> - Maior score de saúde</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Monitoramento de Saúde</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Taxa de atendimento por número</li>
                    <li>Detecção de marcação como spam</li>
                    <li>Reputação externa (carriers)</li>
                    <li>Cooldown automático para números problemáticos</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Reports */}
        <AccordionItem value="reports" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Relatórios</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Relatórios detalhados para análise de performance.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Relatórios Disponíveis</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Performance por Agente</li>
                    <li>Performance por Campanha</li>
                    <li>Distribuição de Disposições</li>
                    <li>Volume por Hora/Dia</li>
                    <li>Análise de AMD</li>
                    <li>Qualidade de Chamadas</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Exportação</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>CSV para análise em Excel</li>
                    <li>PDF para apresentações</li>
                    <li>Agendamento de relatórios</li>
                    <li>Envio automático por email</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Settings */}
        <AccordionItem value="settings" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <span className="font-semibold">Configurações</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <p className="text-muted-foreground">
              Configurações gerais do sistema.
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Configurações Disponíveis</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Configurações da conta</li>
                    <li>Gerenciamento de usuários e roles</li>
                    <li>Disposições personalizadas</li>
                    <li>Scripts de atendimento</li>
                    <li>Scorecards de QA</li>
                    <li>Webhooks e integrações</li>
                    <li>Logs de auditoria</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
