import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Zap, Phone, Users, Settings, Database, Shield } from 'lucide-react';

export function QuickStartGuide() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-6 w-6 text-primary" />
            <Badge variant="secondary">v1.0</Badge>
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao Maxcall</CardTitle>
          <CardDescription className="text-base">
            O Maxcall é uma plataforma completa de Contact Center com discador preditivo, 
            WebRTC softphone, AMD (Answering Machine Detection), e muito mais.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* System Overview */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Visão Geral do Sistema
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Discador Preditivo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Algoritmos avançados que predizem a disponibilidade de agentes e ajustam 
              automaticamente a taxa de discagem para maximizar produtividade.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">WebRTC Softphone</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Softphone integrado ao navegador, sem necessidade de instalação. 
              Suporte a chamadas de voz com qualidade HD.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">AMD Inteligente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Detecção de secretária eletrônica com múltiplos providers 
              (interno, Telnyx, Jambonz) e configuração por campanha.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Caller ID Rotation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Gerenciamento de pools de números, rotação inteligente e 
              monitoramento de saúde para maximizar taxas de atendimento.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Supervisão em Tempo Real</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Dashboard de supervisão com métricas em tempo real, 
              listen/whisper/barge e controle de agentes.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Análise por IA</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Transcrição automática, análise de sentimento, 
              extração de tópicos e scoring de qualidade.
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                Agentes de IA de Voz
                <Badge className="bg-purple-500 text-xs">Novo</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Atendimento automatizado 24/7 com ElevenLabs, OpenAI ou Vapi.
              Configure agentes conversacionais que atendem e qualificam leads.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Automações (n8n)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Integre com n8n para automações: notificações, CRM, 
              webhooks e workflows personalizados.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Requirements */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Requisitos do Sistema
        </h2>
        
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-medium mb-3">Navegador</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Google Chrome 90+ (recomendado)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Microsoft Edge 90+
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Firefox 88+
                  </li>
                  <li className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-yellow-500" />
                    Safari 14+ (suporte limitado)
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Hardware</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Headset USB ou Bluetooth
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Conexão de internet estável (mínimo 1 Mbps)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Permissão de microfone no navegador
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Setup Steps */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Configuração Inicial
        </h2>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  1
                </div>
                <CardTitle className="text-lg">Configurar Carrier de Telefonia</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground ml-11">
              <p className="mb-2">
                Acesse <strong>Integrações</strong> e configure seu carrier preferido:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Telnyx</strong> - Recomendado, sem necessidade de VPS</li>
                <li><strong>Jambonz</strong> - Open-source, requer VPS própria</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  2
                </div>
                <CardTitle className="text-lg">Criar Pool de Caller IDs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground ml-11">
              <p className="mb-2">
                Acesse <strong>Caller ID</strong> para criar pools de números:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Adicione números comprados do seu carrier</li>
                <li>Configure estratégia de rotação</li>
                <li>Defina limites de uso por hora</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  3
                </div>
                <CardTitle className="text-lg">Criar Filas e Agentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground ml-11">
              <p className="mb-2">
                Configure suas filas de atendimento e cadastre agentes:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Crie filas em <strong>Filas</strong></li>
                <li>Cadastre agentes em <strong>Agentes</strong></li>
                <li>Associe agentes às filas por skill</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  4
                </div>
                <CardTitle className="text-lg">Criar Campanha</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground ml-11">
              <p className="mb-2">
                Em <strong>Campanhas</strong>, crie sua primeira campanha:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Escolha o modo de discagem (Preditivo, Power, Preview)</li>
                <li>Configure AMD e ações automáticas</li>
                <li>Importe lista de leads</li>
                <li>Associe à fila de atendimento</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  5
                </div>
                <CardTitle className="text-lg">Configurar Agente de IA (Opcional)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground ml-11">
              <p className="mb-2">
                Em <strong>Integrações</strong>, configure um agente de voz:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>ElevenLabs</strong> - Vozes realistas e conversação natural</li>
                <li><strong>OpenAI</strong> - GPT-4o para conversação em tempo real</li>
                <li><strong>Vapi</strong> - Plataforma completa de agentes de voz</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white font-bold">
                  ✓
                </div>
                <CardTitle className="text-lg text-green-600">Pronto para Discar!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground ml-11">
              Inicie a campanha em <strong>Discador</strong> e acompanhe as métricas 
              em tempo real no <strong>Dashboard</strong>.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* User Roles */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Perfis de Usuário
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Admin</CardTitle>
                <Badge>Acesso Total</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Acesso completo ao sistema: configurações, integrações, 
              telefonia, gerenciamento de usuários e todas as funcionalidades.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Supervisor</CardTitle>
                <Badge variant="secondary">Gestão</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Supervisão de agentes, campanhas, discador, relatórios 
              e monitoramento em tempo real.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">QA</CardTitle>
                <Badge variant="outline">Qualidade</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Avaliação de chamadas, scorecards, feedback para agentes 
              e relatórios de qualidade.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Agente</CardTitle>
                <Badge variant="outline">Atendimento</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Console de atendimento, softphone, scripts, 
              disposições e visualização de métricas pessoais.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
