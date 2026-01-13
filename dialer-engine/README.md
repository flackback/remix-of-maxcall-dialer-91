# Dialer Engine - Worker Node.js Dedicado

Worker Node.js dedicado para motor de discagem profissional com suporte a Asterisk AMI, FreeSWITCH ESL, rate limiting e state machine completa.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                │
│  Database + Edge Functions (API externa)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST/RPC
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              DIALER ENGINE (Este Worker)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Scheduler  │  │  Executor   │  │  Timer Processor        │ │
│  │  (250ms)    │  │  (100ms)    │  │  (500ms)                │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   State     │  │   Bucket    │  │    Route Health         │ │
│  │  Machine    │  │  Manager    │  │    Manager              │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ AMI Adapter │  │ ESL Adapter │  │   Mock Adapter          │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘ │
└─────────┼────────────────┼──────────────────────────────────────┘
          │ TCP            │ TCP
          ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Asterisk / FreeSWITCH                              │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Configurar ambiente

```bash
cp .env.example .env
# Editar .env com suas credenciais
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Compilar

```bash
npm run build
```

### 4. Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🐳 Docker

```bash
# Build
docker build -t dialer-engine .

# Run
docker run -d --env-file .env -p 3000:3000 dialer-engine

# Docker Compose
docker-compose up -d
```

## ⚙️ Configuração

| Variável | Descrição | Default |
|----------|-----------|---------|
| `SUPABASE_URL` | URL do projeto Supabase | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | - |
| `VOICE_ADAPTER` | `asterisk_ami`, `freeswitch_esl`, `mock` | `mock` |
| `ASTERISK_HOST` | Host do Asterisk | `127.0.0.1` |
| `ASTERISK_AMI_PORT` | Porta AMI | `5038` |
| `SCHEDULER_INTERVAL_MS` | Intervalo do scheduler | `250` |
| `EXECUTOR_INTERVAL_MS` | Intervalo do executor | `100` |

## 📊 Componentes

### Scheduler (250ms)
- Busca campanhas ativas
- Calcula orçamento de chamadas (PREVIEW/POWER/PREDICTIVE)
- Reserva leads atomicamente
- Cria jobs de originate

### Executor (100ms)
- Consome jobs da fila
- Aplica rate limiting (token bucket)
- Seleciona melhor rota
- Envia originate para voz

### Reconciler (Event-Driven)
- Recebe eventos da camada de voz
- Mapeia para transições de estado
- Atualiza health scores

### Timer Processor (500ms)
- Processa timers expirados
- Dispara timeouts automáticos

### State Machine
- 20 estados de chamada
- Transições validadas
- Criação/cancelamento de timers

## 🔌 Voice Adapters

### Asterisk AMI
- Conexão TCP persistente
- Eventos em tempo real
- Suporte a PJSIP

### FreeSWITCH ESL
- Event Socket Library
- Suporte a sofia/gateway

### Mock (Testes)
- Simula fluxo de chamada
- Útil para desenvolvimento

## 📡 Health Check

```bash
# Status
curl http://localhost:3000/health

# Detalhes
curl http://localhost:3000/status
```

## 🔒 Segurança

- Use `SUPABASE_SERVICE_ROLE_KEY` apenas no worker
- Nunca exponha credenciais no frontend
- Execute em rede isolada com Asterisk/FreeSWITCH

## 📈 Métricas

O worker expõe métricas via `/status`:
- Token buckets por trunk
- Health scores por rota
- Status de conexão do voice adapter

## 🛠️ Desenvolvimento

```bash
# Testes
npm test

# Lint
npm run lint
```
