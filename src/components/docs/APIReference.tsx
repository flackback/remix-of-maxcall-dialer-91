import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface EndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestBody?: string;
  responseBody?: string;
  actions?: string[];
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Endpoint({ method, path, description, requestBody, responseBody, actions }: EndpointProps) {
  const methodColors = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    PUT: 'bg-yellow-500',
    DELETE: 'bg-red-500',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={methodColors[method]}>{method}</Badge>
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{path}</code>
        </div>
        <CardDescription>{description}</CardDescription>
        {actions && (
          <div className="flex flex-wrap gap-1 mt-2">
            {actions.map((action) => (
              <Badge key={action} variant="outline" className="text-xs">
                {action}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      {(requestBody || responseBody) && (
        <CardContent>
          <Tabs defaultValue={requestBody ? 'request' : 'response'}>
            <TabsList>
              {requestBody && <TabsTrigger value="request">Request</TabsTrigger>}
              {responseBody && <TabsTrigger value="response">Response</TabsTrigger>}
            </TabsList>
            {requestBody && (
              <TabsContent value="request">
                <CodeBlock code={requestBody} />
              </TabsContent>
            )}
            {responseBody && (
              <TabsContent value="response">
                <CodeBlock code={responseBody} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

export function APIReference() {
  const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'your-project-id'}.supabase.co/functions/v1`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Reference</CardTitle>
          <CardDescription>
            Documentação completa dos endpoints da API Maxcall
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Base URL</h3>
              <CodeBlock code={baseUrl} />
            </div>
            <div>
              <h3 className="font-medium mb-2">Autenticação</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Todas as requisições devem incluir o header de autorização:
              </p>
              <CodeBlock 
                code={`Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json`} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Dialer Engine</h2>
        <Endpoint
          method="POST"
          path="/dialer-engine"
          description="Motor principal de discagem preditiva. Controla o início, pausa e parada de campanhas."
          actions={['start', 'stop', 'pause', 'resume', 'status', 'dial_batch']}
          requestBody={`{
  "action": "start",
  "campaignId": "uuid",
  "options": {
    "dialRatio": 1.5,
    "maxConcurrent": 10
  }
}`}
          responseBody={`{
  "success": true,
  "campaignId": "uuid",
  "status": "running",
  "metrics": {
    "callsDialed": 150,
    "callsConnected": 45,
    "agentsAvailable": 5,
    "currentDialRatio": 1.5
  }
}`}
        />

        <Endpoint
          method="POST"
          path="/dial-pacing"
          description="Calcula e ajusta o pacing do discador baseado em métricas em tempo real."
          requestBody={`{
  "campaignId": "uuid",
  "currentMetrics": {
    "agentsAvailable": 5,
    "agentsOnCall": 3,
    "avgTalkTime": 180,
    "dropRate": 2.5
  }
}`}
          responseBody={`{
  "recommendedDialRatio": 1.8,
  "callsToDial": 3,
  "reasoning": "Increasing ratio due to high agent availability",
  "constraints": {
    "maxDropRate": 3.0,
    "currentDropRate": 2.5
  }
}`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Telephony Handlers</h2>
        
        <Endpoint
          method="POST"
          path="/telnyx-handler"
          description="Handler para integração com Telnyx. Gerencia chamadas via API Telnyx."
          actions={['originate', 'hangup', 'transfer', 'hold', 'unhold', 'dtmf']}
          requestBody={`{
  "action": "originate",
  "to": "+5511999999999",
  "from": "+5511888888888",
  "callbackUrl": "https://your-app.com/webhook",
  "connectionId": "your-telnyx-connection-id"
}`}
          responseBody={`{
  "success": true,
  "callId": "uuid",
  "telnyxCallControlId": "v2:xxx",
  "status": "initiated"
}`}
        />

        <Endpoint
          method="POST"
          path="/jambonz-handler"
          description="Handler para integração com Jambonz. Gerencia chamadas via Jambonz."
          actions={['originate', 'hangup', 'transfer', 'status']}
          requestBody={`{
  "action": "originate",
  "to": "+5511999999999",
  "from": "+5511888888888",
  "applicationSid": "your-jambonz-app-sid"
}`}
          responseBody={`{
  "success": true,
  "callId": "uuid",
  "jambonzCallSid": "xxx",
  "status": "initiated"
}`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">AMD & Classification</h2>
        
        <Endpoint
          method="POST"
          path="/amd-detector"
          description="Detecção de secretária eletrônica. Analisa áudio e retorna classificação."
          requestBody={`{
  "callId": "uuid",
  "campaignId": "uuid",
  "provider": "internal"
}`}
          responseBody={`{
  "success": true,
  "result": "human",
  "confidence": 92.5,
  "action": "connect",
  "detectionTimeMs": 450
}`}
        />

        <Endpoint
          method="POST"
          path="/call-classifier"
          description="Classificação avançada de chamadas com suporte a múltiplos métodos."
          actions={['carrier', 'ai', 'hybrid']}
          requestBody={`{
  "callId": "uuid",
  "method": "hybrid",
  "carrierResult": {
    "provider": "telnyx",
    "result": "machine_start"
  }
}`}
          responseBody={`{
  "result": "machine",
  "confidence": 88.5,
  "method": "hybrid",
  "action": "leave_message",
  "details": {
    "carrierResult": "machine_start",
    "aiResult": "machine",
    "finalDecision": "machine"
  }
}`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Conference Bridge</h2>
        
        <Endpoint
          method="POST"
          path="/conference-bridge"
          description="Gerenciamento de conferências e bridges de chamadas."
          actions={['create', 'join', 'leave', 'mute', 'unmute', 'kick', 'end', 'bridge', 'transfer']}
          requestBody={`{
  "action": "create",
  "name": "Sala de Reunião",
  "isModerated": true,
  "maxParticipants": 10
}`}
          responseBody={`{
  "success": true,
  "conferenceId": "uuid",
  "roomCode": "ABC123",
  "moderatorPin": "1234",
  "participantPin": "5678"
}`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Caller ID</h2>
        
        <Endpoint
          method="POST"
          path="/caller-id-selector"
          description="Seleção inteligente de caller ID baseado em regras e disponibilidade."
          requestBody={`{
  "accountId": "uuid",
  "campaignId": "uuid",
  "destinationPhone": "+5511999999999"
}`}
          responseBody={`{
  "success": true,
  "selectedNumber": "+5511888888888",
  "poolId": "uuid",
  "poolName": "São Paulo Local",
  "strategy": "highest_health",
  "healthScore": 95.2
}`}
        />

        <Endpoint
          method="POST"
          path="/caller-id-health-updater"
          description="Atualiza métricas de saúde dos números de caller ID."
          requestBody={`{
  "callerId": "uuid",
  "callResult": "connected",
  "duration": 180
}`}
          responseBody={`{
  "success": true,
  "newHealthScore": 94.5,
  "usesToday": 45,
  "usesThisHour": 8
}`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Call Analysis</h2>
        
        <Endpoint
          method="POST"
          path="/call-analyzer"
          description="Análise de chamadas com IA: transcrição, sentimento, tópicos e qualidade."
          requestBody={`{
  "call_id": "uuid",
  "force_reanalyze": false
}`}
          responseBody={`{
  "success": true,
  "analysis": {
    "summary": "Cliente interessado em produto X...",
    "sentiment": "positive",
    "qualityScore": 85,
    "keyTopics": ["pricing", "features", "delivery"],
    "actionItems": ["Send quote", "Schedule follow-up"],
    "concerns": [],
    "positiveAspects": ["Good rapport", "Clear explanation"]
  }
}`}
        />

        <Endpoint
          method="POST"
          path="/call-transcriber"
          description="Transcrição de áudio de chamadas."
          requestBody={`{
  "call_id": "uuid",
  "audio_url": "https://storage.example.com/recordings/call.wav"
}`}
          responseBody={`{
  "success": true,
  "transcript": "Agent: Bom dia, em que posso ajudar?\\nCustomer: ...",
  "wordCount": 450,
  "duration": 180
}`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Carrier Routing</h2>
        
        <Endpoint
          method="POST"
          path="/carrier-router"
          description="Roteamento inteligente de chamadas entre carriers."
          requestBody={`{
  "accountId": "uuid",
  "destinationPhone": "+5511999999999",
  "campaignId": "uuid"
}`}
          responseBody={`{
  "success": true,
  "selectedCarrier": {
    "id": "uuid",
    "name": "Telnyx",
    "connectionRate": 85.5,
    "avgLatency": 120
  },
  "routingMethod": "ai_decision",
  "reasoning": "Best connection rate for DDD 11"
}`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">WebRTC Gateway</h2>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500">WebSocket</Badge>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">/webrtc-gateway</code>
            </div>
            <CardDescription>
              Gateway WebRTC para conexão do softphone. Utiliza WebSocket para comunicação bidirecional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Eventos do Cliente → Servidor</h4>
                <CodeBlock code={`// Registrar agente
{ "type": "register", "agentId": "uuid", "extension": "1001" }

// Fazer chamada
{ "type": "call", "to": "+5511999999999" }

// Atender chamada
{ "type": "answer", "callId": "uuid" }

// Encerrar chamada
{ "type": "hangup", "callId": "uuid" }

// DTMF
{ "type": "dtmf", "callId": "uuid", "digit": "5" }`} />
              </div>
              <div>
                <h4 className="font-medium mb-2">Eventos do Servidor → Cliente</h4>
                <CodeBlock code={`// Chamada entrante
{ "type": "incoming", "callId": "uuid", "from": "+5511888888888" }

// Chamada conectada
{ "type": "connected", "callId": "uuid" }

// Chamada encerrada
{ "type": "hangup", "callId": "uuid", "reason": "normal" }

// Oferta SDP
{ "type": "sdp_offer", "callId": "uuid", "sdp": "..." }

// Candidato ICE
{ "type": "ice_candidate", "callId": "uuid", "candidate": "..." }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Telephony Infrastructure</h2>
        
        <Endpoint
          method="POST"
          path="/cps-controller"
          description="Controlador de Calls Per Second. Gerencia limites de tráfego por trunk."
          requestBody={`{
  "trunkId": "uuid",
  "action": "check",
  "callsToMake": 5
}`}
          responseBody={`{
  "allowed": true,
  "currentCps": 8,
  "limit": 15,
  "available": 7,
  "throttled": false
}`}
        />

        <Endpoint
          method="POST"
          path="/rtc-quality-monitor"
          description="Monitoramento de qualidade RTC: latência, jitter, perda de pacotes."
          requestBody={`{
  "callId": "uuid",
  "metrics": {
    "jitterMs": 15,
    "rttMs": 80,
    "packetLoss": 0.5
  }
}`}
          responseBody={`{
  "success": true,
  "mosScore": 4.2,
  "quality": "good",
  "alerts": []
}`}
        />

        <Endpoint
          method="POST"
          path="/sbc-gateway"
          description="Gateway SBC para conexão com infraestrutura SIP."
          requestBody={`{
  "action": "status"
}`}
          responseBody={`{
  "status": "healthy",
  "activeCalls": 45,
  "registeredAgents": 12,
  "trunks": [
    { "name": "Telnyx", "status": "up", "activeCalls": 30 },
    { "name": "Jambonz", "status": "up", "activeCalls": 15 }
  ]
}`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">AI Voice Agents</h2>
        
        <Endpoint
          method="POST"
          path="/verify-integration"
          description="Verifica se uma API key de integração é válida antes de salvar."
          actions={['elevenlabs', 'openai', 'vapi']}
          requestBody={`{
  "provider": "elevenlabs",
  "api_key": "xi-xxxxxxxxxxxxxxxxxx"
}`}
          responseBody={`{
  "valid": true,
  "user_info": {
    "subscription": "creator",
    "characters_remaining": 50000,
    "models_available": 12
  }
}`}
        />

        <Endpoint
          method="POST"
          path="/save-integration"
          description="Salva uma integração de IA encriptada para o tenant atual."
          requestBody={`{
  "provider": "elevenlabs",
  "api_key": "xi-xxxxxxxxxxxxxxxxxx",
  "config_json": {
    "default_voice_id": "EXAVITQu4vr4xnSDxMaL",
    "default_agent_id": "agent_xxx"
  }
}`}
          responseBody={`{
  "success": true,
  "integration_id": "uuid",
  "is_verified": true
}`}
        />

        <Endpoint
          method="POST"
          path="/ai-voice-token"
          description="Gera token efêmero para conexão com agente de IA. Usado pelo frontend para iniciar sessão."
          requestBody={`{
  "provider": "elevenlabs",
  "agent_id": "agent_xxx"
}`}
          responseBody={`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2025-12-10T20:00:00Z",
  "provider": "elevenlabs",
  "config": {
    "voice_id": "EXAVITQu4vr4xnSDxMaL",
    "language": "pt-BR"
  }
}`}
        />
      </div>
    </div>
  );
}
