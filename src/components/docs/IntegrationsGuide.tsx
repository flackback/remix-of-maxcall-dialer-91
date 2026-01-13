import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertTriangle, ExternalLink, Server, Cloud, Shield, Phone, Radio, Cpu, Zap } from 'lucide-react';

export function IntegrationsGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guia de Integrações</CardTitle>
          <CardDescription>
            Configure carriers de telefonia para conectar o Maxcall à rede PSTN
          </CardDescription>
        </CardHeader>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>
          É necessário configurar pelo menos um carrier de telefonia para fazer e receber chamadas.
          Recomendamos o Telnyx para a maioria dos casos de uso.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="telnyx" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="telnyx" className="gap-2">
            <Cloud className="h-4 w-4" />
            Telnyx
          </TabsTrigger>
          <TabsTrigger value="twilio" className="gap-2">
            <Phone className="h-4 w-4" />
            Twilio
          </TabsTrigger>
          <TabsTrigger value="zenvia" className="gap-2">
            <Zap className="h-4 w-4" />
            Zenvia
          </TabsTrigger>
          <TabsTrigger value="jambonz" className="gap-2">
            <Server className="h-4 w-4" />
            Jambonz
          </TabsTrigger>
          <TabsTrigger value="asterisk" className="gap-2">
            <Radio className="h-4 w-4" />
            Asterisk
          </TabsTrigger>
          <TabsTrigger value="freeswitch" className="gap-2">
            <Cpu className="h-4 w-4" />
            FreeSWITCH
          </TabsTrigger>
          <TabsTrigger value="elevenlabs" className="gap-2">
            ElevenLabs
          </TabsTrigger>
          <TabsTrigger value="openai" className="gap-2">
            OpenAI
          </TabsTrigger>
          <TabsTrigger value="vapi" className="gap-2">
            Vapi
          </TabsTrigger>
          <TabsTrigger value="n8n" className="gap-2">
            n8n
          </TabsTrigger>
        </TabsList>

        {/* Telnyx Integration */}
        <TabsContent value="telnyx" className="space-y-4">
          <Card className="bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Telnyx</CardTitle>
                <Badge className="bg-green-500">Recomendado</Badge>
              </div>
              <CardDescription>
                Carrier SIP com API moderna, WebRTC nativo e AMD integrado
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Sem necessidade de VPS
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    API REST moderna
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    WebRTC nativo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    AMD integrado
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Suporte global
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Requisitos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Conta Telnyx ativa</li>
                  <li>• DIDs (números) comprados</li>
                  <li>• API Key v2</li>
                  <li>• Connection ID configurado</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Estimado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Setup: Grátis</li>
                  <li>• DIDs: ~$1-2/mês</li>
                  <li>• Minutos: ~$0.01-0.02/min</li>
                  <li>• Pay-as-you-go</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: Configuração Telnyx</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    1
                  </div>
                  <h4 className="font-medium">Criar Conta no Telnyx</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Acesse <a href="https://telnyx.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">telnyx.com <ExternalLink className="h-3 w-3" /></a> e crie uma conta.</p>
                  <p>Complete a verificação de identidade (KYC) - necessário para comprar números.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    2
                  </div>
                  <h4 className="font-medium">Comprar DIDs (Números)</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No portal Telnyx, vá em <strong>Numbers → Search & Buy</strong></p>
                  <p>Recomendamos comprar números locais do Brasil para melhor taxa de atendimento.</p>
                  <p>Compre pelo menos 5-10 números para rotação efetiva.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    3
                  </div>
                  <h4 className="font-medium">Criar Credential Connection</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Vá em <strong>Voice → SIP Connections</strong></p>
                  <p>Clique em <strong>Add SIP Connection</strong> e selecione <strong>Credential</strong></p>
                  <p>Configure:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Name: "Maxcall Connection"</li>
                    <li>Username: seu_usuario</li>
                    <li>Password: sua_senha_forte</li>
                  </ul>
                  <p>Anote o <strong>Connection ID</strong> gerado.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    4
                  </div>
                  <h4 className="font-medium">Criar Outbound Voice Profile</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Vá em <strong>Voice → Outbound Voice Profiles</strong></p>
                  <p>Crie um perfil e associe à Connection criada.</p>
                  <p>Habilite AMD se desejar usar detecção nativa do Telnyx.</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    5
                  </div>
                  <h4 className="font-medium">Gerar API Key</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Vá em <strong>Auth → API Keys</strong></p>
                  <p>Crie uma nova API Key v2.</p>
                  <p><strong>Importante:</strong> Salve a key em local seguro, ela só é mostrada uma vez.</p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    6
                  </div>
                  <h4 className="font-medium">Configurar no Maxcall</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Integrações</strong></p>
                  <p>Configure o carrier Telnyx com:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>API Key</li>
                    <li>Connection ID</li>
                    <li>Outbound Profile ID (opcional)</li>
                  </ul>
                </div>
              </div>

              {/* Step 7 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    7
                  </div>
                  <h4 className="font-medium">Configurar Webhook</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No Telnyx, configure o webhook URL da Connection:</p>
                  <pre className="bg-muted p-2 rounded text-xs mt-2">
                    https://[PROJECT_ID].supabase.co/functions/v1/telnyx-handler
                  </pre>
                  <p className="mt-2">Eventos necessários: call.initiated, call.answered, call.hangup, call.machine.detection.ended</p>
                </div>
              </div>

              <Alert className="border-green-500/50 bg-green-500/5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Pronto!</AlertTitle>
                <AlertDescription>
                  Seu Telnyx está configurado. Adicione os números ao pool de Caller ID e crie uma campanha para testar.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Twilio Integration */}
        <TabsContent value="twilio" className="space-y-4">
          <Card className="bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Twilio</CardTitle>
                <Badge variant="outline" className="border-red-500 text-red-600">Popular</Badge>
              </div>
              <CardDescription>
                Plataforma de comunicação líder com API REST robusta e ampla documentação
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Documentação excelente
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    APIs bem testadas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Conta Trial gratuita
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Suporte global
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    SDKs para todas linguagens
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Requisitos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Conta Twilio ativa</li>
                  <li>• Account SID</li>
                  <li>• Auth Token</li>
                  <li>• Números verificados (Trial)</li>
                  <li>• DIDs comprados (Produção)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Estimado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• DIDs BR: ~$4/mês</li>
                  <li>• Outbound: $0.013/min</li>
                  <li>• Inbound: $0.0085/min</li>
                  <li>• Trial: $15 grátis</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Conta Trial</AlertTitle>
            <AlertDescription>
              Na conta Trial, você só pode ligar para números verificados. Verifique números em{' '}
              <strong>Phone Numbers → Verified Caller IDs</strong> para testes.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: Configuração Twilio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                  <h4 className="font-medium">Criar Conta no Twilio</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Acesse <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">twilio.com <ExternalLink className="h-3 w-3" /></a> e crie uma conta.</p>
                  <p>Você receberá $15 de créditos grátis para testes.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
                  <h4 className="font-medium">Obter Credenciais</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No Console Twilio, localize:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>Account SID:</strong> Identificador da conta</li>
                    <li><strong>Auth Token:</strong> Token de autenticação (clique para revelar)</li>
                  </ul>
                  <p className="mt-2 text-yellow-600">Guarde o Auth Token em local seguro!</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
                  <h4 className="font-medium">Comprar ou Verificar Números</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p><strong>Para Trial:</strong> Vá em <strong>Phone Numbers → Verified Caller IDs</strong></p>
                  <p>Adicione números para os quais deseja ligar durante testes.</p>
                  <p><strong>Para Produção:</strong> Vá em <strong>Phone Numbers → Buy a Number</strong></p>
                  <p>Compre DIDs brasileiros para usar como Caller ID.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">4</div>
                  <h4 className="font-medium">Configurar Webhook</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No número comprado, configure o webhook de voz:</p>
                  <pre className="bg-muted p-2 rounded text-xs mt-2">
                    https://tlpgpzguyliflibhrkxy.supabase.co/functions/v1/twilio-handler
                  </pre>
                  <p className="mt-2">Método: HTTP POST</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">5</div>
                  <h4 className="font-medium">Configurar no Maxcall</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Integrações → Carriers</strong></p>
                  <p>Adicione carrier Twilio com:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Account SID</li>
                    <li>Auth Token</li>
                    <li>Números do pool de Caller ID</li>
                  </ul>
                </div>
              </div>

              <Alert className="border-red-500/50 bg-red-500/5">
                <CheckCircle2 className="h-4 w-4 text-red-500" />
                <AlertTitle>Pronto!</AlertTitle>
                <AlertDescription>
                  Twilio configurado. Para produção, faça upgrade da conta e compre números brasileiros.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zenvia Integration */}
        <TabsContent value="zenvia" className="space-y-4">
          <Card className="bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Zenvia</CardTitle>
                <Badge className="bg-indigo-500">Brasil</Badge>
              </div>
              <CardDescription>
                Plataforma brasileira de comunicação com foco em SMS, WhatsApp e Voz
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Empresa brasileira
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Suporte em português
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Números brasileiros
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Faturamento em R$
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    WhatsApp integrado
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Requisitos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Conta Zenvia ativa</li>
                  <li>• Token de API</li>
                  <li>• Números contratados</li>
                  <li>• CNPJ (para números BR)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Estimado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• DIDs: ~R$50/mês</li>
                  <li>• Minutos: R$0.08-0.15/min</li>
                  <li>• Setup: variável</li>
                  <li>• Pacotes disponíveis</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: Configuração Zenvia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                  <h4 className="font-medium">Criar Conta na Zenvia</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Acesse <a href="https://www.zenvia.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">zenvia.com <ExternalLink className="h-3 w-3" /></a> e crie uma conta.</p>
                  <p>Complete o cadastro empresarial com CNPJ.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
                  <h4 className="font-medium">Contratar Serviço de Voz</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Entre em contato com comercial para:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Contratar canal de voz</li>
                    <li>Adquirir números (DIDs) brasileiros</li>
                    <li>Definir pacote de minutos</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
                  <h4 className="font-medium">Gerar Token de API</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No painel Zenvia, vá em <strong>Configurações → Tokens de API</strong></p>
                  <p>Crie um novo token com permissões de voz.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">4</div>
                  <h4 className="font-medium">Configurar Webhook</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Configure o webhook de eventos:</p>
                  <pre className="bg-muted p-2 rounded text-xs mt-2">
                    https://tlpgpzguyliflibhrkxy.supabase.co/functions/v1/zenvia-handler
                  </pre>
                  <p className="mt-2">Eventos: CALL_CONNECTED, CALL_ENDED, CALL_FAILED</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">5</div>
                  <h4 className="font-medium">Configurar no Maxcall</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Integrações → Carriers</strong></p>
                  <p>Adicione carrier Zenvia com o Token de API.</p>
                </div>
              </div>

              <Alert className="border-indigo-500/50 bg-indigo-500/5">
                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                <AlertTitle>Pronto!</AlertTitle>
                <AlertDescription>
                  Zenvia configurada. Ideal para operações focadas no mercado brasileiro com faturamento local.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jambonz Integration */}
        <TabsContent value="jambonz" className="space-y-4">
          <Card className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Jambonz</CardTitle>
                <Badge variant="outline">Open Source</Badge>
              </div>
              <CardDescription>
                Plataforma open-source para aplicações de voz. Requer infraestrutura própria.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Open source (gratuito)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Controle total
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Customização ilimitada
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Múltiplos SIP trunks
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Sem vendor lock-in
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Requisitos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• VPS Linux (Ubuntu 20.04+)</li>
                  <li>• 4GB RAM mínimo</li>
                  <li>• Docker instalado</li>
                  <li>• IP público fixo</li>
                  <li>• Conhecimento técnico</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Estimado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• VPS: $20-50/mês</li>
                  <li>• SIP Trunk: variável</li>
                  <li>• DIDs: ~$1-3/mês</li>
                  <li>• Minutos: $0.005-0.02/min</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              A configuração do Jambonz requer conhecimento técnico em Linux, Docker e telefonia VoIP.
              Recomendado apenas para equipes com experiência em infraestrutura.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: Configuração Jambonz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    1
                  </div>
                  <h4 className="font-medium">Provisionar VPS</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Crie uma VPS em um provedor cloud (DigitalOcean, AWS, Vultr, etc.)</p>
                  <p>Especificações mínimas:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Ubuntu 20.04 ou 22.04 LTS</li>
                    <li>4GB RAM, 2 vCPUs</li>
                    <li>40GB SSD</li>
                    <li>IP público fixo</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    2
                  </div>
                  <h4 className="font-medium">Instalar Docker</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose -y`}
                  </pre>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    3
                  </div>
                  <h4 className="font-medium">Instalar Jambonz</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Siga a documentação oficial: <a href="https://www.jambonz.org/docs/installation/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">jambonz.org <ExternalLink className="h-3 w-3" /></a></p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`# Clone o repositório
git clone https://github.com/jambonz/jambonz-infrastructure.git
cd jambonz-infrastructure

# Configurar variáveis
cp .env.example .env
nano .env

# Iniciar
docker-compose up -d`}
                  </pre>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    4
                  </div>
                  <h4 className="font-medium">Configurar SIP Trunk</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No portal Jambonz (porta 3001), configure um SIP Trunk:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Adicione seu carrier SIP (Telnyx, Twilio, etc.)</li>
                    <li>Configure credenciais de autenticação</li>
                    <li>Defina codecs preferidos (OPUS, G.722)</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    5
                  </div>
                  <h4 className="font-medium">Criar Application</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Crie uma Application no Jambonz com webhook URL:</p>
                  <pre className="bg-muted p-2 rounded text-xs mt-2">
                    https://[PROJECT_ID].supabase.co/functions/v1/jambonz-handler
                  </pre>
                  <p className="mt-2">Anote o Application SID gerado.</p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    6
                  </div>
                  <h4 className="font-medium">Configurar no Maxcall</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Integrações</strong> e configure:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Jambonz API URL: http://[VPS_IP]:3000</li>
                    <li>Account SID</li>
                    <li>Application SID</li>
                    <li>API Key</li>
                  </ul>
                </div>
              </div>

              <Alert className="border-blue-500/50 bg-blue-500/5">
                <Shield className="h-4 w-4 text-blue-500" />
                <AlertTitle>Segurança</AlertTitle>
                <AlertDescription>
                  Configure firewall (UFW) permitindo apenas portas necessárias: 5060 (SIP), 10000-20000 (RTP), 3000-3001 (API).
                  Use HTTPS para todas as conexões de API.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asterisk AMI Integration */}
        <TabsContent value="asterisk" className="space-y-4">
          <Card className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Asterisk (AMI)</CardTitle>
                <Badge variant="outline" className="border-amber-500 text-amber-600">Self-Hosted</Badge>
              </div>
              <CardDescription>
                PBX open-source mais popular do mundo. Interface AMI para controle programático.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Open source gratuito
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Extremamente customizável
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Grande comunidade
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Múltiplos trunks SIP
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Dialplan programável
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Requisitos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• VPS Linux dedicada</li>
                  <li>• Asterisk 16+ instalado</li>
                  <li>• AMI habilitado</li>
                  <li>• IP público ou VPN</li>
                  <li>• Conhecimento avançado</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Estimado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Software: Grátis</li>
                  <li>• VPS: $10-40/mês</li>
                  <li>• SIP Trunk: variável</li>
                  <li>• Suporte: opcional</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Conhecimento Avançado</AlertTitle>
            <AlertDescription>
              A configuração do Asterisk requer conhecimento avançado em Linux, telefonia VoIP e segurança.
              Erros de configuração podem expor sua central a ataques.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: Configuração Asterisk AMI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                  <h4 className="font-medium">Instalar Asterisk</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Em um servidor Ubuntu 20.04+:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`# Instalar dependências
sudo apt update
sudo apt install -y build-essential wget libssl-dev libncurses5-dev libnewt-dev libxml2-dev linux-headers-$(uname -r) libsqlite3-dev uuid-dev

# Baixar e compilar Asterisk
cd /usr/src
wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz
tar xzf asterisk-20-current.tar.gz
cd asterisk-20*/
./configure
make menuselect  # Selecione módulos
make && make install
make samples
make config`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
                  <h4 className="font-medium">Configurar AMI (manager.conf)</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Edite <code>/etc/asterisk/manager.conf</code>:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[maxcall]
secret = SenhaForte123!
deny = 0.0.0.0/0.0.0.0
permit = SEU_IP_DO_MAXCALL/255.255.255.255
read = all
write = all
writetimeout = 5000`}
                  </pre>
                  <p className="text-yellow-600 mt-2">Importante: Substitua SEU_IP_DO_MAXCALL pelo IP correto!</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
                  <h4 className="font-medium">Configurar SIP Trunk (pjsip.conf)</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Adicione ao <code>/etc/asterisk/pjsip.conf</code>:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`; Trunk para seu carrier
[carrier-trunk]
type = wizard
sends_auth = yes
sends_registrations = yes
remote_hosts = sip.seucarrier.com
outbound_auth/username = seu_usuario
outbound_auth/password = sua_senha
endpoint/context = from-carrier
endpoint/allow = !all,opus,alaw,ulaw`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">4</div>
                  <h4 className="font-medium">Criar Dialplan (extensions.conf)</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Adicione ao <code>/etc/asterisk/extensions.conf</code>:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`[outbound-maxcall]
exten => _X.,1,NoOp(Discando para \${EXTEN})
 same => n,Set(CALLERID(num)=\${CALLERID_NUM})
 same => n,Dial(PJSIP/\${EXTEN}@carrier-trunk,60,gU)
 same => n,Hangup()

[from-carrier]
exten => _X.,1,NoOp(Chamada recebida de \${CALLERID(num)})
 same => n,Answer()
 same => n,Wait(1)
 same => n,Hangup()`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">5</div>
                  <h4 className="font-medium">Configurar Firewall</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`# Portas necessárias
sudo ufw allow 5038/tcp   # AMI
sudo ufw allow 5060/udp   # SIP
sudo ufw allow 5061/tcp   # SIP TLS
sudo ufw allow 10000:20000/udp  # RTP`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">6</div>
                  <h4 className="font-medium">Configurar no Maxcall</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Integrações → Carriers</strong></p>
                  <p>Adicione carrier Asterisk AMI com:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>Host:</strong> IP do servidor Asterisk</li>
                    <li><strong>Port:</strong> 5038</li>
                    <li><strong>Username:</strong> maxcall</li>
                    <li><strong>Secret:</strong> SenhaForte123!</li>
                    <li><strong>Context:</strong> outbound-maxcall</li>
                  </ul>
                </div>
              </div>

              <Alert className="border-amber-500/50 bg-amber-500/5">
                <Shield className="h-4 w-4 text-amber-500" />
                <AlertTitle>Segurança</AlertTitle>
                <AlertDescription>
                  Configure fail2ban para proteger contra ataques de força bruta no AMI e SIP.
                  Use sempre senhas fortes e restrinja IPs de acesso.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FreeSWITCH ESL Integration */}
        <TabsContent value="freeswitch" className="space-y-4">
          <Card className="bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">FreeSWITCH (ESL)</CardTitle>
                <Badge variant="outline" className="border-cyan-500 text-cyan-600">Alta Performance</Badge>
              </div>
              <CardDescription>
                Softswitch de alta performance para aplicações de voz em grande escala
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-cyan-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Alta performance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Milhares de chamadas simultâneas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Transcodificação embutida
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    WebRTC nativo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Lua/JavaScript scripting
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Requisitos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• VPS Linux potente</li>
                  <li>• 8GB+ RAM recomendado</li>
                  <li>• FreeSWITCH 1.10+</li>
                  <li>• mod_event_socket</li>
                  <li>• Conhecimento avançado</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Estimado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Software: Grátis</li>
                  <li>• VPS: $20-100/mês</li>
                  <li>• SIP Trunk: variável</li>
                  <li>• Suporte: SignalWire</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Complexidade Alta</AlertTitle>
            <AlertDescription>
              FreeSWITCH é mais complexo que Asterisk. Recomendado para operações de grande escala
              que precisam de milhares de chamadas simultâneas.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: Configuração FreeSWITCH ESL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                  <h4 className="font-medium">Instalar FreeSWITCH</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Em Debian 11/12:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`# Adicionar repositório SignalWire
TOKEN=SEU_SIGNALWIRE_TOKEN

apt-get update && apt-get install -y gnupg2 wget lsb-release
wget --http-user=signalwire --http-password=$TOKEN \\
  -O /usr/share/keyrings/signalwire-freeswitch-repo.gpg \\
  https://freeswitch.signalwire.com/repo/deb/debian-release/signalwire-freeswitch-repo.gpg

echo "machine freeswitch.signalwire.com login signalwire password $TOKEN" > /etc/apt/auth.conf
chmod 600 /etc/apt/auth.conf

echo "deb [signed-by=/usr/share/keyrings/signalwire-freeswitch-repo.gpg] \\
  https://freeswitch.signalwire.com/repo/deb/debian-release/ $(lsb_release -sc) main" \\
  > /etc/apt/sources.list.d/freeswitch.list

apt-get update && apt-get install -y freeswitch-meta-all`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
                  <h4 className="font-medium">Configurar Event Socket (ESL)</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Edite <code>/etc/freeswitch/autoload_configs/event_socket.conf.xml</code>:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<configuration name="event_socket.conf" description="Socket Client">
  <settings>
    <param name="nat-map" value="false"/>
    <param name="listen-ip" value="0.0.0.0"/>
    <param name="listen-port" value="8021"/>
    <param name="password" value="SenhaForteESL123!"/>
    <param name="apply-inbound-acl" value="maxcall_acl"/>
  </settings>
</configuration>`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
                  <h4 className="font-medium">Configurar ACL</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Edite <code>/etc/freeswitch/autoload_configs/acl.conf.xml</code>:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<list name="maxcall_acl" default="deny">
  <node type="allow" cidr="SEU_IP_MAXCALL/32"/>
  <node type="allow" cidr="127.0.0.1/32"/>
</list>`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">4</div>
                  <h4 className="font-medium">Configurar SIP Gateway</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Crie <code>/etc/freeswitch/sip_profiles/external/carrier.xml</code>:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<include>
  <gateway name="carrier-principal">
    <param name="username" value="seu_usuario"/>
    <param name="password" value="sua_senha"/>
    <param name="realm" value="sip.seucarrier.com"/>
    <param name="proxy" value="sip.seucarrier.com"/>
    <param name="register" value="true"/>
    <param name="caller-id-in-from" value="true"/>
  </gateway>
</include>`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">5</div>
                  <h4 className="font-medium">Criar Dialplan</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>Crie <code>/etc/freeswitch/dialplan/default/maxcall.xml</code>:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<include>
  <extension name="maxcall-outbound">
    <condition field="context" expression="maxcall"/>
    <condition field="destination_number" expression="^(\\d+)$">
      <action application="set" data="effective_caller_id_number=\${caller_id_number}"/>
      <action application="bridge" data="sofia/gateway/carrier-principal/$1"/>
    </condition>
  </extension>
</include>`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">6</div>
                  <h4 className="font-medium">Configurar Firewall</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`# Portas FreeSWITCH
sudo ufw allow 8021/tcp   # ESL
sudo ufw allow 5060/udp   # SIP interno
sudo ufw allow 5080/udp   # SIP externo
sudo ufw allow 16384:32768/udp  # RTP`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">7</div>
                  <h4 className="font-medium">Configurar no Maxcall</h4>
                </div>
                <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Integrações → Carriers</strong></p>
                  <p>Adicione carrier FreeSWITCH ESL com:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>Host:</strong> IP do servidor FreeSWITCH</li>
                    <li><strong>Port:</strong> 8021</li>
                    <li><strong>Password:</strong> SenhaForteESL123!</li>
                    <li><strong>Context:</strong> maxcall</li>
                  </ul>
                </div>
              </div>

              <Alert className="border-cyan-500/50 bg-cyan-500/5">
                <Shield className="h-4 w-4 text-cyan-500" />
                <AlertTitle>Performance</AlertTitle>
                <AlertDescription>
                  FreeSWITCH pode lidar com milhares de chamadas. Para alta escala, considere
                  clustering com mod_verto para WebRTC ou mod_conference para conferências.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ElevenLabs Integration */}
        <TabsContent value="elevenlabs" className="space-y-4">
          <Card className="bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">ElevenLabs</CardTitle>
                <Badge className="bg-purple-500">Vozes Realistas</Badge>
              </div>
              <CardDescription>
                Agentes de voz conversacional com vozes ultra-realistas e baixa latência
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Vozes ultra-realistas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Conversação natural
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    29 idiomas suportados
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Client tools (funções)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    SDK React nativo
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Requisitos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Conta ElevenLabs ativa</li>
                  <li>• Plano Creator ou superior</li>
                  <li>• API Key</li>
                  <li>• Agent ID (criado no console)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Estimado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Starter: $5/mês</li>
                  <li>• Creator: $22/mês</li>
                  <li>• Pro: $99/mês</li>
                  <li>• Pay-per-use disponível</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: ElevenLabs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                  <h4 className="font-medium">Criar Conta no ElevenLabs</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>Acesse <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">elevenlabs.io <ExternalLink className="h-3 w-3" /></a> e crie uma conta.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
                  <h4 className="font-medium">Criar Agente Conversacional</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>No console, vá em <strong>Conversational AI → Create Agent</strong></p>
                  <p>Configure o prompt do sistema, voz e comportamento do agente.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
                  <h4 className="font-medium">Obter API Key</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>Vá em <strong>Profile → API Keys</strong> e gere uma nova key.</p>
                  <p>Copie também o <strong>Agent ID</strong> do agente criado.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">4</div>
                  <h4 className="font-medium">Configurar no Maxcall</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Integrações → ElevenLabs</strong></p>
                  <p>Insira a API Key e configure o Agent ID padrão.</p>
                </div>
              </div>

              <Alert className="border-purple-500/50 bg-purple-500/5">
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                <AlertTitle>Pronto!</AlertTitle>
                <AlertDescription>
                  Seu agente ElevenLabs está configurado. Associe-o a uma campanha para atendimento automatizado.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OpenAI Integration */}
        <TabsContent value="openai" className="space-y-4">
          <Card className="bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">OpenAI Realtime</CardTitle>
                <Badge className="bg-green-500">GPT-4o</Badge>
              </div>
              <CardDescription>
                Conversação em tempo real com GPT-4o para análise complexa e qualificação
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    GPT-4o multimodal
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Raciocínio avançado
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Function calling
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Baixa latência
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Requisitos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Conta OpenAI com créditos</li>
                  <li>• Acesso à API Realtime</li>
                  <li>• API Key</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Estimado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Input: $0.10/1K tokens</li>
                  <li>• Output: $0.30/1K tokens</li>
                  <li>• Audio: $0.06/min</li>
                  <li>• Pay-as-you-go</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: OpenAI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                  <h4 className="font-medium">Obter API Key</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>Acesse <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">platform.openai.com <ExternalLink className="h-3 w-3" /></a></p>
                  <p>Vá em <strong>API Keys</strong> e crie uma nova key.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
                  <h4 className="font-medium">Adicionar Créditos</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>Em <strong>Billing</strong>, adicione créditos à sua conta.</p>
                  <p>Recomendamos começar com $20-50 para testes.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
                  <h4 className="font-medium">Configurar no Maxcall</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Integrações → OpenAI</strong></p>
                  <p>Insira sua API Key e configure o modelo desejado.</p>
                </div>
              </div>

              <Alert className="border-green-500/50 bg-green-500/5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Pronto!</AlertTitle>
                <AlertDescription>
                  OpenAI configurado. Use para análise de chamadas, qualificação inteligente e suporte avançado.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vapi Integration */}
        <TabsContent value="vapi" className="space-y-4">
          <Card className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Vapi</CardTitle>
                <Badge className="bg-blue-500">Plataforma Completa</Badge>
              </div>
              <CardDescription>
                Plataforma all-in-one para agentes de voz com ferramentas integradas
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Setup simplificado
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Múltiplos LLMs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Webhooks nativos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Transcrição incluída
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Handoff para humanos
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Requisitos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Conta Vapi</li>
                  <li>• API Key</li>
                  <li>• Assistant configurado</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Estimado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• ~$0.05-0.15/min</li>
                  <li>• Inclui LLM + TTS + STT</li>
                  <li>• Pay-as-you-go</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: Vapi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                  <h4 className="font-medium">Criar Conta no Vapi</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>Acesse <a href="https://vapi.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">vapi.ai <ExternalLink className="h-3 w-3" /></a> e crie uma conta.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
                  <h4 className="font-medium">Criar Assistant</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>No dashboard, crie um novo Assistant.</p>
                  <p>Configure voz, modelo de linguagem e comportamento.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
                  <h4 className="font-medium">Obter API Key</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>Em <strong>Settings → API Keys</strong>, gere uma nova key.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">4</div>
                  <h4 className="font-medium">Configurar no Maxcall</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Integrações → Vapi</strong></p>
                  <p>Insira a API Key e configure o Assistant ID.</p>
                </div>
              </div>

              <Alert className="border-blue-500/50 bg-blue-500/5">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <AlertTitle>Pronto!</AlertTitle>
                <AlertDescription>
                  Vapi configurado. Ideal para quem quer uma solução completa sem gerenciar múltiplos providers.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* n8n Integration */}
        <TabsContent value="n8n" className="space-y-4">
          <Card className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">n8n</CardTitle>
                <Badge className="bg-orange-500">Automações</Badge>
              </div>
              <CardDescription>
                Plataforma de automação para criar workflows e integrar com centenas de serviços
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-orange-600">Vantagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    400+ integrações
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Visual workflow builder
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Self-hosted disponível
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    MCP Server nativo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Webhooks bidirecionais
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Casos de Uso</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Notificações Slack/Teams</li>
                  <li>• Sync com CRM</li>
                  <li>• Emails automáticos</li>
                  <li>• Atualizar planilhas</li>
                  <li>• Webhooks customizados</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Cloud: $20-50/mês</li>
                  <li>• Self-hosted: Grátis</li>
                  <li>• Enterprise: Sob consulta</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Passo a Passo: n8n</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                  <h4 className="font-medium">Habilitar MCP no n8n</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>No seu n8n, vá em <strong>Settings → MCP access</strong></p>
                  <p>Ative <strong>Enable MCP access</strong> (requer permissão de admin)</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
                  <h4 className="font-medium">Copiar URL do MCP</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>Copie a URL do MCP Server fornecida:</p>
                  <pre className="bg-muted p-2 rounded text-xs mt-2">
                    https://your-n8n.app.n8n.cloud/mcp-server/http
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
                  <h4 className="font-medium">Conectar no Maxcall</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p>No Maxcall, vá em <strong>Settings → Connectors → n8n</strong></p>
                  <p>Cole a URL do MCP Server e conecte.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">4</div>
                  <h4 className="font-medium">Expor Workflows</h4>
                </div>
                <div className="ml-11 text-sm text-muted-foreground">
                  <p><strong>Importante:</strong> Para cada workflow que deseja usar:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Abra o workflow no editor</li>
                    <li>Vá em <strong>Settings</strong> do workflow</li>
                    <li>Ative <strong>Available in MCP</strong></li>
                  </ul>
                </div>
              </div>

              <Alert className="border-orange-500/50 bg-orange-500/5">
                <CheckCircle2 className="h-4 w-4 text-orange-500" />
                <AlertTitle>Pronto!</AlertTitle>
                <AlertDescription>
                  n8n conectado via MCP. Seus workflows expostos agora podem ser executados pelo Maxcall automaticamente.
                </AlertDescription>
              </Alert>

              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Exemplos de Workflows</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <div className="border-l-4 border-orange-500 pl-3">
                    <h4 className="font-medium">Notificação de Venda</h4>
                    <p>Trigger: call.dispositioned (Venda) → Slack: enviar mensagem no canal #vendas</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-3">
                    <h4 className="font-medium">Sync com CRM</h4>
                    <p>Trigger: call.completed → HubSpot: criar/atualizar contato com notas da chamada</p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-3">
                    <h4 className="font-medium">Follow-up Email</h4>
                    <p>Trigger: call.dispositioned (Callback) → Gmail: enviar email de agradecimento</p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>Problemas comuns e soluções</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Chamadas não estão sendo realizadas</h4>
            <p className="text-sm text-muted-foreground">
              Verifique: credenciais do carrier, saldo na conta, números configurados no pool de Caller ID,
              webhook URL correto, firewall liberando tráfego SIP/RTP.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Áudio unidirecional ou sem áudio</h4>
            <p className="text-sm text-muted-foreground">
              Geralmente causado por NAT/firewall bloqueando RTP. Verifique se as portas 10000-20000 UDP 
              estão liberadas. Para WebRTC, certifique-se que TURN/STUN está configurado.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">AMD não está funcionando</h4>
            <p className="text-sm text-muted-foreground">
              Verifique se AMD está habilitado na campanha e no carrier. Para Telnyx, habilite AMD 
              no Outbound Voice Profile. O AMD interno requer que as chamadas estejam sendo conectadas.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Caller ID não está rotacionando</h4>
            <p className="text-sm text-muted-foreground">
              Verifique se há números ativos no pool, se os números não estão em cooldown,
              e se as regras de Caller ID estão configuradas para a campanha/DDD.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
