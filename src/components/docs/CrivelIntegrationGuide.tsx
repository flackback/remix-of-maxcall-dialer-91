import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Phone, 
  Shield, 
  Server, 
  Network, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Globe,
  Lock,
  Headphones,
  Code,
  FileText,
  HelpCircle
} from 'lucide-react';

export function CrivelIntegrationGuide() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="outline" className="text-primary border-primary">
            Documento Técnico
          </Badge>
          <Badge variant="secondary">v1.0</Badge>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Integração SIP/WebRTC - Crivel Telecom
        </h1>
        <p className="text-muted-foreground text-lg">
          Documentação técnica para integração do sistema Maxcall com infraestrutura SIP da Crivel Telecom
        </p>
      </div>

      {/* Quick Summary Alert */}
      <Alert className="border-primary/50 bg-primary/5">
        <HelpCircle className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary">Resumo Rápido</AlertTitle>
        <AlertDescription className="text-foreground/80">
          O Maxcall utiliza <strong>SIP.js via WebSocket (WSS)</strong> para comunicação de voz. 
          Para integração, é necessário que o servidor SIP da Crivel suporte <strong>SIP over WebSocket (RFC 7118)</strong>.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="requirements">Requisitos</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="flow">Fluxo SIP</TabsTrigger>
          <TabsTrigger value="examples">Exemplos</TabsTrigger>
          <TabsTrigger value="troubleshoot">Troubleshooting</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Arquitetura do Sistema
              </CardTitle>
              <CardDescription>
                Como o Maxcall se comunica com servidores SIP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Architecture Diagram */}
              <div className="bg-muted/50 rounded-lg p-6 font-mono text-sm">
                <pre className="text-foreground whitespace-pre-wrap">
{`┌─────────────────┐     WSS (443)      ┌─────────────────┐     SIP UDP/TCP     ┌─────────────────┐
│                 │ ◄─────────────────► │                 │ ◄─────────────────► │                 │
│   Navegador     │   SIP over WS       │  Servidor SIP   │                     │     PSTN        │
│   (SIP.js)      │                     │  (Asterisk/FS)  │                     │   (Operadoras)  │
│                 │ ◄─────────────────► │                 │ ◄─────────────────► │                 │
└─────────────────┘     WebRTC/SRTP     └─────────────────┘        RTP          └─────────────────┘
                        (Áudio)                                   (Áudio)`}
                </pre>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Vantagens do WebRTC
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                      Funciona direto no navegador, sem softphone
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                      Atravessa NAT/firewalls facilmente
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                      Criptografia de ponta a ponta (SRTP)
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                      Menor latência que SIP tradicional
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Diferenças do ViciDial
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-yellow-500" />
                      ViciDial usa SIP UDP/TCP tradicional
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-yellow-500" />
                      Maxcall usa SIP over WebSocket (WSS)
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-yellow-500" />
                      Requer configuração adicional no Asterisk
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technologies Used */}
          <Card>
            <CardHeader>
              <CardTitle>Tecnologias Utilizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>Tecnologia</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Função</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Cliente SIP</TableCell>
                    <TableCell>SIP.js</TableCell>
                    <TableCell>0.21.2</TableCell>
                    <TableCell>Sinalização SIP no navegador</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Transporte</TableCell>
                    <TableCell>WebSocket Secure (WSS)</TableCell>
                    <TableCell>RFC 7118</TableCell>
                    <TableCell>Tunelamento SIP sobre TLS</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Mídia</TableCell>
                    <TableCell>WebRTC</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>Áudio/vídeo em tempo real</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Codec Preferencial</TableCell>
                    <TableCell>OPUS</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>Alta qualidade, baixa latência</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Codecs Alternativos</TableCell>
                    <TableCell>PCMU/PCMA</TableCell>
                    <TableCell>G.711</TableCell>
                    <TableCell>Compatibilidade com PSTN</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Requisitos do Servidor SIP
              </CardTitle>
              <CardDescription>
                O que o servidor SIP da Crivel precisa suportar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Must Have */}
              <div className="space-y-4">
                <h4 className="font-semibold text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Obrigatório
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 rounded-lg p-4">
                    <h5 className="font-medium mb-2">WebSocket Server (WSS)</h5>
                    <p className="text-sm text-muted-foreground">
                      Endpoint WebSocket seguro na porta 443 ou outra porta TLS.
                      Deve suportar <strong>RFC 7118</strong> (SIP over WebSocket).
                    </p>
                  </div>
                  <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 rounded-lg p-4">
                    <h5 className="font-medium mb-2">Certificado TLS/SSL</h5>
                    <p className="text-sm text-muted-foreground">
                      Certificado válido (não self-signed em produção).
                      Let's Encrypt ou certificado comercial.
                    </p>
                  </div>
                  <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 rounded-lg p-4">
                    <h5 className="font-medium mb-2">Digest Authentication</h5>
                    <p className="text-sm text-muted-foreground">
                      Autenticação SIP padrão conforme <strong>RFC 2617</strong>.
                      Usuário e senha por ramal.
                    </p>
                  </div>
                  <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 rounded-lg p-4">
                    <h5 className="font-medium mb-2">Codecs Suportados</h5>
                    <p className="text-sm text-muted-foreground">
                      Pelo menos um: <strong>OPUS</strong> (preferencial), 
                      <strong>PCMU</strong> (G.711 μ-law) ou <strong>PCMA</strong> (G.711 a-law).
                    </p>
                  </div>
                </div>
              </div>

              {/* Nice to Have */}
              <div className="space-y-4">
                <h4 className="font-semibold text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recomendado
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 rounded-lg p-4">
                    <h5 className="font-medium mb-2">STUN/TURN Server</h5>
                    <p className="text-sm text-muted-foreground">
                      Para traversal de NAT em redes complexas.
                      Pode usar servidores públicos ou próprios.
                    </p>
                  </div>
                  <div className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 rounded-lg p-4">
                    <h5 className="font-medium mb-2">ICE Support</h5>
                    <p className="text-sm text-muted-foreground">
                      Interactive Connectivity Establishment para 
                      estabelecimento de mídia otimizado.
                    </p>
                  </div>
                </div>
              </div>

              {/* Ports */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  Portas de Firewall
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Porta</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Direção</TableHead>
                      <TableHead>Função</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono">443</TableCell>
                      <TableCell>TCP (WSS)</TableCell>
                      <TableCell>Outbound</TableCell>
                      <TableCell>Sinalização SIP (WebSocket)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono">8443</TableCell>
                      <TableCell>TCP (WSS)</TableCell>
                      <TableCell>Outbound</TableCell>
                      <TableCell>Porta alternativa WSS</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono">3478</TableCell>
                      <TableCell>UDP/TCP</TableCell>
                      <TableCell>Outbound</TableCell>
                      <TableCell>STUN (NAT traversal)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono">10000-20000</TableCell>
                      <TableCell>UDP</TableCell>
                      <TableCell>Bidirectional</TableCell>
                      <TableCell>RTP/SRTP (mídia de áudio)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Compatible Servers */}
          <Card>
            <CardHeader>
              <CardTitle>Servidores SIP Compatíveis</CardTitle>
              <CardDescription>
                Servidores que suportam WebSocket nativamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead>WebSocket</TableHead>
                    <TableHead>Módulo/Config</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Asterisk 13+</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">Nativo</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">pjsip.conf: transport=wss</TableCell>
                    <TableCell>Requer PJSIP (não chan_sip)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">FreeSWITCH</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">Nativo</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">mod_verto ou mod_sofia</TableCell>
                    <TableCell>Verto é WebRTC nativo</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Kamailio</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">Nativo</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">websocket module</TableCell>
                    <TableCell>Proxy SIP com WebSocket</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">OpenSIPS</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">Nativo</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">proto_wss module</TableCell>
                    <TableCell>SIP proxy escalável</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Dados de Configuração
              </CardTitle>
              <CardDescription>
                Informações que a Crivel precisa fornecer para configurar o Maxcall
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo</TableHead>
                    <TableHead>Exemplo</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">WebSocket URL</TableCell>
                    <TableCell className="font-mono text-xs">wss://webrtc.crivel.com.br</TableCell>
                    <TableCell><Badge variant="destructive">Sim</Badge></TableCell>
                    <TableCell>Endpoint WSS do servidor SIP</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Realm / Domínio</TableCell>
                    <TableCell className="font-mono text-xs">crivel.com.br</TableCell>
                    <TableCell><Badge variant="destructive">Sim</Badge></TableCell>
                    <TableCell>Domínio SIP para autenticação</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Usuário (Ramal)</TableCell>
                    <TableCell className="font-mono text-xs">1001</TableCell>
                    <TableCell><Badge variant="destructive">Sim</Badge></TableCell>
                    <TableCell>Número do ramal/extensão</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Senha SIP</TableCell>
                    <TableCell className="font-mono text-xs">********</TableCell>
                    <TableCell><Badge variant="destructive">Sim</Badge></TableCell>
                    <TableCell>Senha de autenticação do ramal</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Outbound Proxy</TableCell>
                    <TableCell className="font-mono text-xs">sip:proxy.crivel.com.br</TableCell>
                    <TableCell><Badge variant="outline">Opcional</Badge></TableCell>
                    <TableCell>Proxy de saída (se diferente)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">STUN Server</TableCell>
                    <TableCell className="font-mono text-xs">stun:stun.crivel.com.br</TableCell>
                    <TableCell><Badge variant="outline">Opcional</Badge></TableCell>
                    <TableCell>Servidor STUN para NAT</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">TURN Server</TableCell>
                    <TableCell className="font-mono text-xs">turn:turn.crivel.com.br</TableCell>
                    <TableCell><Badge variant="outline">Opcional</Badge></TableCell>
                    <TableCell>Servidor TURN (relay)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Configuration Example in Maxcall */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Exemplo de Configuração no Maxcall
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-foreground">
{`// Configuração do Carrier no Maxcall
{
  "name": "Crivel Telecom",
  "type": "sip_webrtc",
  "is_active": true,
  "config_json": {
    "wsServer": "wss://webrtc.crivel.com.br",
    "realm": "crivel.com.br",
    "sipUser": "1001",
    "sipPassword": "sua_senha_aqui",
    "outboundProxy": null,  // opcional
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" },
      { "urls": "stun:stun.crivel.com.br:3478" }  // se disponível
    ]
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Asterisk Config Example */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Exemplo de Configuração Asterisk (PJSIP)
              </CardTitle>
              <CardDescription>
                Configuração necessária no lado da Crivel (se usar Asterisk)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h5 className="font-medium">pjsip.conf - Transport WSS</h5>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-foreground">
{`[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
cert_file=/etc/asterisk/keys/asterisk.crt
priv_key_file=/etc/asterisk/keys/asterisk.key
method=tlsv1_2`}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-medium">pjsip.conf - Endpoint WebRTC</h5>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-foreground">
{`[1001]
type=endpoint
context=from-internal
disallow=all
allow=opus
allow=ulaw
allow=alaw
transport=transport-wss
webrtc=yes
dtls_auto_generate_cert=yes
media_encryption=dtls
ice_support=yes
use_avpf=yes
aors=1001
auth=1001

[1001]
type=aor
max_contacts=5
remove_existing=yes

[1001]
type=auth
auth_type=userpass
username=1001
password=senha_do_ramal`}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-medium">http.conf - Habilitar WebSocket</h5>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-foreground">
{`[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/asterisk/keys/asterisk.crt
tlsprivatekey=/etc/asterisk/keys/asterisk.key`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SIP Flow Tab */}
        <TabsContent value="flow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Fluxo de Autenticação (REGISTER)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-6 font-mono text-xs overflow-x-auto">
                <pre className="text-foreground">
{`┌──────────┐                                    ┌──────────────┐
│  SIP.js  │                                    │ Servidor SIP │
│ (Browser)│                                    │   (Crivel)   │
└────┬─────┘                                    └──────┬───────┘
     │                                                 │
     │  1. REGISTER (sem auth)                         │
     │ ───────────────────────────────────────────────►│
     │                                                 │
     │  2. 401 Unauthorized + WWW-Authenticate         │
     │ ◄───────────────────────────────────────────────│
     │     (nonce, realm, algorithm)                   │
     │                                                 │
     │  3. REGISTER (com Authorization header)         │
     │ ───────────────────────────────────────────────►│
     │     (username, nonce, response hash)            │
     │                                                 │
     │  4. 200 OK                                      │
     │ ◄───────────────────────────────────────────────│
     │     (Contact, Expires: 300)                     │
     │                                                 │
     ▼                                                 ▼`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" />
                Fluxo de Chamada (INVITE)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-6 font-mono text-xs overflow-x-auto">
                <pre className="text-foreground">
{`┌──────────┐                    ┌──────────────┐                    ┌──────────┐
│  SIP.js  │                    │ Servidor SIP │                    │  Destino │
│ (Agente) │                    │   (Crivel)   │                    │  (PSTN)  │
└────┬─────┘                    └──────┬───────┘                    └────┬─────┘
     │                                 │                                 │
     │  1. INVITE (SDP offer)          │                                 │
     │ ───────────────────────────────►│                                 │
     │                                 │                                 │
     │  2. 100 Trying                  │                                 │
     │ ◄───────────────────────────────│                                 │
     │                                 │  3. INVITE                      │
     │                                 │ ───────────────────────────────►│
     │                                 │                                 │
     │                                 │  4. 180 Ringing                 │
     │  5. 180 Ringing                 │ ◄───────────────────────────────│
     │ ◄───────────────────────────────│                                 │
     │                                 │                                 │
     │                                 │  6. 200 OK (SDP answer)         │
     │  7. 200 OK (SDP answer)         │ ◄───────────────────────────────│
     │ ◄───────────────────────────────│                                 │
     │                                 │                                 │
     │  8. ACK                         │                                 │
     │ ───────────────────────────────►│  9. ACK                         │
     │                                 │ ───────────────────────────────►│
     │                                 │                                 │
     │  ═══════════ RTP/SRTP (Áudio Bidirecional) ═══════════════════   │
     │                                 │                                 │
     │  10. BYE                        │                                 │
     │ ───────────────────────────────►│  11. BYE                        │
     │                                 │ ───────────────────────────────►│
     │                                 │                                 │
     │                                 │  12. 200 OK                     │
     │  13. 200 OK                     │ ◄───────────────────────────────│
     │ ◄───────────────────────────────│                                 │
     ▼                                 ▼                                 ▼`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* SIP Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Métodos SIP Utilizados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Quando Usado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono font-medium">REGISTER</TableCell>
                    <TableCell>Registrar ramal no servidor</TableCell>
                    <TableCell>Login do agente</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">INVITE</TableCell>
                    <TableCell>Iniciar chamada</TableCell>
                    <TableCell>Discar para lead</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">ACK</TableCell>
                    <TableCell>Confirmar estabelecimento</TableCell>
                    <TableCell>Após 200 OK do INVITE</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">BYE</TableCell>
                    <TableCell>Encerrar chamada</TableCell>
                    <TableCell>Desligar</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">CANCEL</TableCell>
                    <TableCell>Cancelar chamada não atendida</TableCell>
                    <TableCell>Cancelar durante ring</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">Re-INVITE</TableCell>
                    <TableCell>Modificar sessão</TableCell>
                    <TableCell>Hold/Unhold</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">INFO</TableCell>
                    <TableCell>Informações mid-dialog</TableCell>
                    <TableCell>Enviar DTMF</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">REFER</TableCell>
                    <TableCell>Transferência de chamada</TableCell>
                    <TableCell>Transferir para outro ramal</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Exemplos de Mensagens SIP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* REGISTER Example */}
              <div className="space-y-2">
                <h5 className="font-medium flex items-center gap-2">
                  <Badge>REGISTER</Badge>
                  Requisição de Registro
                </h5>
                <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                  <pre className="text-foreground">
{`REGISTER sip:crivel.com.br SIP/2.0
Via: SIP/2.0/WSS df7jal23ls.invalid;branch=z9hG4bK-524287-1
Max-Forwards: 70
From: <sip:1001@crivel.com.br>;tag=abc123
To: <sip:1001@crivel.com.br>
Call-ID: 1234567890@df7jal23ls.invalid
CSeq: 1 REGISTER
Contact: <sip:1001@df7jal23ls.invalid;transport=ws>
Expires: 300
Allow: INVITE,ACK,CANCEL,BYE,REFER,INFO,NOTIFY
User-Agent: SIP.js/0.21.2
Content-Length: 0`}
                  </pre>
                </div>
              </div>

              {/* REGISTER with Auth */}
              <div className="space-y-2">
                <h5 className="font-medium flex items-center gap-2">
                  <Badge>REGISTER</Badge>
                  Com Autenticação
                </h5>
                <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                  <pre className="text-foreground">
{`REGISTER sip:crivel.com.br SIP/2.0
Via: SIP/2.0/WSS df7jal23ls.invalid;branch=z9hG4bK-524287-2
Max-Forwards: 70
From: <sip:1001@crivel.com.br>;tag=abc123
To: <sip:1001@crivel.com.br>
Call-ID: 1234567890@df7jal23ls.invalid
CSeq: 2 REGISTER
Contact: <sip:1001@df7jal23ls.invalid;transport=ws>
Expires: 300
Authorization: Digest username="1001",
  realm="crivel.com.br",
  nonce="abc123def456",
  uri="sip:crivel.com.br",
  response="e7c3b2a1d4f5e6c7b8a9d0e1f2c3b4a5",
  algorithm=MD5
User-Agent: SIP.js/0.21.2
Content-Length: 0`}
                  </pre>
                </div>
              </div>

              {/* INVITE Example */}
              <div className="space-y-2">
                <h5 className="font-medium flex items-center gap-2">
                  <Badge variant="secondary">INVITE</Badge>
                  Iniciar Chamada
                </h5>
                <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                  <pre className="text-foreground">
{`INVITE sip:5511999998888@crivel.com.br SIP/2.0
Via: SIP/2.0/WSS df7jal23ls.invalid;branch=z9hG4bK-524287-3
Max-Forwards: 70
From: <sip:1001@crivel.com.br>;tag=xyz789
To: <sip:5511999998888@crivel.com.br>
Call-ID: call-9876543210@df7jal23ls.invalid
CSeq: 1 INVITE
Contact: <sip:1001@df7jal23ls.invalid;transport=ws>
Allow: INVITE,ACK,CANCEL,BYE,REFER,INFO,NOTIFY
Content-Type: application/sdp
Content-Length: 512

v=0
o=- 1234567890 1234567890 IN IP4 192.168.1.100
s=SIP.js Media Session
c=IN IP4 192.168.1.100
t=0 0
m=audio 49170 RTP/SAVPF 111 0 8
a=rtpmap:111 opus/48000/2
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=ice-ufrag:abc123
a=ice-pwd:def456ghi789
a=fingerprint:sha-256 AB:CD:EF:...
a=setup:actpass
a=mid:audio
a=sendrecv`}
                  </pre>
                </div>
              </div>

              {/* 200 OK Response */}
              <div className="space-y-2">
                <h5 className="font-medium flex items-center gap-2">
                  <Badge variant="outline">200 OK</Badge>
                  Resposta de Sucesso
                </h5>
                <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
                  <pre className="text-foreground">
{`SIP/2.0 200 OK
Via: SIP/2.0/WSS df7jal23ls.invalid;branch=z9hG4bK-524287-3
From: <sip:1001@crivel.com.br>;tag=xyz789
To: <sip:5511999998888@crivel.com.br>;tag=server456
Call-ID: call-9876543210@df7jal23ls.invalid
CSeq: 1 INVITE
Contact: <sip:5511999998888@10.0.0.1:5060>
Content-Type: application/sdp
Content-Length: 480

v=0
o=- 9876543210 9876543210 IN IP4 10.0.0.1
s=Asterisk PBX
c=IN IP4 10.0.0.1
t=0 0
m=audio 12000 RTP/SAVPF 111 0
a=rtpmap:111 opus/48000/2
a=rtpmap:0 PCMU/8000
a=ice-ufrag:server123
a=ice-pwd:serverpass456
a=fingerprint:sha-256 12:34:56:...
a=setup:active
a=mid:audio
a=sendrecv`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Troubleshooting Tab */}
        <TabsContent value="troubleshoot" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Problemas Comuns e Soluções
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Failed */}
              <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg p-4">
                <h5 className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Erro: "WebSocket connection failed"
                </h5>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground"><strong>Causas possíveis:</strong></p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>URL do WebSocket incorreta</li>
                    <li>Servidor não suporta WebSocket</li>
                    <li>Certificado SSL inválido ou expirado</li>
                    <li>Firewall bloqueando porta 443/8443</li>
                  </ul>
                  <p className="text-muted-foreground mt-3"><strong>Soluções:</strong></p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Verificar se a URL começa com <code className="bg-muted px-1 rounded">wss://</code></li>
                    <li>Testar certificado em <code className="bg-muted px-1 rounded">https://</code> primeiro</li>
                    <li>Verificar logs do servidor SIP</li>
                  </ul>
                </div>
              </div>

              {/* Registration Failed */}
              <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg p-4">
                <h5 className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Erro: "Registration failed (401/403)"
                </h5>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground"><strong>Causas possíveis:</strong></p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Usuário ou senha incorretos</li>
                    <li>Realm/domínio incorreto</li>
                    <li>Ramal não existe no servidor</li>
                    <li>IP não autorizado no servidor</li>
                  </ul>
                  <p className="text-muted-foreground mt-3"><strong>Soluções:</strong></p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Confirmar credenciais com a Crivel</li>
                    <li>Verificar se o ramal está ativo</li>
                    <li>Verificar ACL/whitelist no servidor</li>
                  </ul>
                </div>
              </div>

              {/* No Audio */}
              <div className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 rounded-lg p-4">
                <h5 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Problema: Chamada conecta mas sem áudio
                </h5>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground"><strong>Causas possíveis:</strong></p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>NAT/firewall bloqueando RTP</li>
                    <li>ICE candidates não conseguem conectar</li>
                    <li>Codec incompatível</li>
                    <li>SRTP não configurado no servidor</li>
                  </ul>
                  <p className="text-muted-foreground mt-3"><strong>Soluções:</strong></p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Configurar TURN server</li>
                    <li>Verificar se OPUS ou G.711 estão habilitados</li>
                    <li>Habilitar <code className="bg-muted px-1 rounded">media_encryption=dtls</code> no Asterisk</li>
                  </ul>
                </div>
              </div>

              {/* One-way Audio */}
              <div className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 rounded-lg p-4">
                <h5 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Problema: Áudio só em uma direção
                </h5>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground"><strong>Causas possíveis:</strong></p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Problema de NAT simétrico</li>
                    <li>Microfone bloqueado no navegador</li>
                    <li>ICE connectivity check falhando</li>
                  </ul>
                  <p className="text-muted-foreground mt-3"><strong>Soluções:</strong></p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Usar TURN server (relay)</li>
                    <li>Verificar permissões do microfone</li>
                    <li>Verificar logs de ICE no console</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Checklist de Verificação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  'Servidor SIP com suporte a WebSocket habilitado',
                  'Certificado SSL válido (não self-signed)',
                  'Porta WSS (443/8443) acessível externamente',
                  'Ramal criado com suporte a WebRTC',
                  'Codecs OPUS ou G.711 habilitados',
                  'DTLS/SRTP configurado para mídia',
                  'ICE support habilitado',
                  'Firewall liberando portas RTP (10000-20000 UDP)',
                ].map((item, index) => (
                  <label key={index} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="rounded border-input" />
                    <span className="text-sm">{item}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alternative Solutions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Soluções Alternativas
              </CardTitle>
              <CardDescription>
                Se o servidor SIP da Crivel não suportar WebSocket
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Gateway WebSocket → SIP</AlertTitle>
                <AlertDescription>
                  Se o Asterisk/FreeSWITCH da Crivel não tiver WebSocket habilitado, 
                  podemos configurar um gateway intermediário usando:
                </AlertDescription>
              </Alert>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h5 className="font-medium mb-2">Opção 1: FreeSWITCH Gateway</h5>
                  <p className="text-sm text-muted-foreground">
                    Instalar FreeSWITCH como gateway entre WebRTC e SIP tradicional.
                    Recebe WebSocket do Maxcall e converte para SIP UDP/TCP para a Crivel.
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h5 className="font-medium mb-2">Opção 2: Kamailio Proxy</h5>
                  <p className="text-sm text-muted-foreground">
                    Usar Kamailio como proxy SIP com módulo WebSocket.
                    Faz bridging de protocolo e pode adicionar TLS.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Key Question Box */}
      <Card className="border-primary">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-primary">
            <HelpCircle className="h-5 w-5" />
            Pergunta Principal para a Crivel
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-lg font-medium">
              "O servidor SIP de vocês (Asterisk/FreeSWITCH) tem suporte a WebSocket habilitado? 
              Se sim, qual é a URL do endpoint WSS para registro SIP?"
            </p>
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p><strong>Se a resposta for SIM:</strong> Solicitar URL WSS, credenciais e configurações STUN/TURN.</p>
            <p><strong>Se a resposta for NÃO:</strong> Discutir opções de gateway ou habilitação do módulo WebSocket.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
