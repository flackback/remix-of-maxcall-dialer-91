# 🚀 Manual de Implantação - Dialer Engine no Coolify

Este guia detalha o processo completo de deploy do Dialer Engine Worker em um ambiente Coolify via importação do GitHub.

---

## ⚠️ CONFIGURAÇÃO CRÍTICA DO BUILD

> **IMPORTANTE**: Este repositório contém Edge Functions (Deno) na pasta `supabase/functions/`.
> O Coolify/Nixpacks pode detectar incorretamente como "Deno" se não configurado corretamente.
> 
> **VOCÊ DEVE usar o Build Pack "Dockerfile"**, NÃO Nixpacks!

### ❌ Se você vir este erro:
```
Found application type: deno.
error: Relative import path "http" not prefixed with / or ./ or ../
```
**→ Você está usando Nixpacks. Mude para Dockerfile!**

### ✅ Configuração Correta no Coolify

| Campo | Valor EXATO |
|-------|-------------|
| **Build Pack** | `Dockerfile` ← OBRIGATÓRIO! |
| **Dockerfile Location** | `Dockerfile` |
| **Base Directory** | *(deixe vazio)* |
| **Build Context** | *(deixe vazio)* |

> ⚠️ **IMPORTANTE**: Use apenas `Dockerfile` (sem caminho).
> Caminhos com `/` como `dialer-engine/Dockerfile` causam erro de mkdir!

```
┌─────────────────────────────────────────────────────────────┐
│  BUILD CONFIGURATION - COOLIFY                              │
├─────────────────────────────────────────────────────────────┤
│  Build Pack:          [Dockerfile ▼]  ← SELECIONE ESTE!    │
│                        ✗ Nixpacks (NÃO USE!)               │
│                                                             │
│  Dockerfile Location: [Dockerfile]    ← SEM CAMINHO!       │
│                                                             │
│  Base Directory:      [ ]  ← VAZIO                         │
│  Build Context:       [ ]  ← VAZIO                         │
└─────────────────────────────────────────────────────────────┘
```

### ❌ Erros Comuns e Soluções

#### Erro: "mkdir: can't create directory... File exists"
```
mkdir -p .../dialer-engine/Dockerfile
mkdir: can't create directory '...Dockerfile': File exists
```
**Causa**: Dockerfile Location tem `/` no caminho.
**Solução**: Use apenas `Dockerfile` (o da raiz).

---

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Arquitetura](#arquitetura)
3. [Importação no Coolify](#importação-no-coolify)
4. [Configuração de Variáveis](#configuração-de-variáveis)
5. [Network e Firewall](#network-e-firewall)
6. [Health Checks](#health-checks)
7. [Logs e Monitoramento](#logs-e-monitoramento)
8. [Troubleshooting](#troubleshooting)
9. [Manutenção](#manutenção)

---

## Pré-requisitos

### Infraestrutura Necessária

| Componente | Requisito Mínimo | Recomendado |
|------------|------------------|-------------|
| **CPU** | 1 vCPU | 2 vCPU |
| **RAM** | 512 MB | 1 GB |
| **Disco** | 1 GB | 5 GB |
| **Node.js** | 18.x | 20.x (via Docker) |

### Serviços Externos

1. **Supabase Project** (já configurado)
   - URL do projeto
   - Service Role Key (com permissões completas)

2. **Asterisk PBX** (se usando AMI)
   - IP acessível pelo container
   - Porta AMI: 5038
   - Usuário/senha AMI configurados

3. **FreeSWITCH** (se usando ESL)
   - IP acessível pelo container
   - Porta ESL: 8021
   - Senha ESL configurada

### Coolify

- Coolify v4.x instalado
- Acesso ao GitHub configurado
- Domínio ou IP para o servidor

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        COOLIFY HOST                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               DIALER ENGINE CONTAINER                       │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │                  ENGINE CORE                          │  │ │
│  │  │                                                        │  │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │ │
│  │  │  │  Scheduler  │  │  Executor   │  │ TimerProc    │  │  │ │
│  │  │  │  (250ms)    │  │  (100ms)    │  │ (500ms)      │  │  │ │
│  │  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │ │
│  │  │                                                        │  │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │ │
│  │  │  │ StateMachine│  │ RateLimit   │  │ HealthMgr    │  │  │ │
│  │  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │               VOICE ADAPTERS                          │  │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │ │
│  │  │  │ AMI Client  │  │ ESL Client  │  │ Mock Client  │  │  │ │
│  │  │  │ (Asterisk)  │  │ (FreeSWITCH)│  │ (Testes)     │  │  │ │
│  │  │  └──────┬──────┘  └──────┬──────┘  └──────────────┘  │  │ │
│  │  └─────────┼────────────────┼───────────────────────────┘  │ │
│  │            │                │                               │ │
│  │  ┌─────────▼────────────────▼───────────────────────────┐  │ │
│  │  │              HTTP Health Check :3000                  │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│            │ TCP:5038          │ TCP:8021         │ HTTPS       │
└────────────┼───────────────────┼──────────────────┼─────────────┘
             ▼                   ▼                  ▼
     ┌───────────────┐   ┌───────────────┐  ┌──────────────────┐
     │   Asterisk    │   │  FreeSWITCH   │  │  Supabase Cloud  │
     │   PBX         │   │   PBX         │  │  (Database)      │
     └───────────────┘   └───────────────┘  └──────────────────┘
```

---

## Importação no Coolify

### Passo 1: Acessar Coolify Dashboard

1. Acesse seu Coolify em `https://seu-coolify.com`
2. Faça login com suas credenciais

### Passo 2: Criar Nova Aplicação

1. Clique em **"+ New"** ou **"Add Resource"**
2. Selecione **"Application"**
3. Escolha **"GitHub"** como source

### Passo 3: Conectar Repositório

1. Se ainda não conectou, clique em **"Connect GitHub"**
2. Autorize o Coolify a acessar seus repositórios
3. Selecione o repositório do projeto

### Passo 4: Configurar Build

| Campo | Valor |
|-------|-------|
| **Build Pack** | `Dockerfile` |
| **Dockerfile Location** | `Dockerfile` |
| **Docker Build Context** | *(deixe vazio)* |
| **Base Directory** | *(deixe vazio)* |

> ⚠️ **NÃO USE** `dialer-engine/Dockerfile` - causa erro de mkdir!

### Passo 5: Configurações Adicionais

```yaml
# Configurações recomendadas
Port Exposed: 3000
Health Check Path: /health
Health Check Interval: 30s
Restart Policy: always
```

---

## Configuração de Variáveis

### Variáveis Obrigatórias

No painel do Coolify, vá em **"Environment Variables"** e adicione:

```env
# ═══════════════════════════════════════════════════════════════
# SUPABASE (OBRIGATÓRIO)
# ═══════════════════════════════════════════════════════════════
SUPABASE_URL=https://tlpgpzguyliflibhrkxy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ═══════════════════════════════════════════════════════════════
# VOICE ADAPTER (escolha um)
# ═══════════════════════════════════════════════════════════════
VOICE_ADAPTER=asterisk_ami
# Opções: asterisk_ami | freeswitch_esl | mock

# ═══════════════════════════════════════════════════════════════
# ASTERISK AMI (se VOICE_ADAPTER=asterisk_ami)
# ═══════════════════════════════════════════════════════════════
ASTERISK_HOST=192.168.1.100
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=dialer
ASTERISK_AMI_SECRET=sua-senha-segura
ASTERISK_CONTEXT=from-dialer

# ═══════════════════════════════════════════════════════════════
# FREESWITCH ESL (se VOICE_ADAPTER=freeswitch_esl)
# ═══════════════════════════════════════════════════════════════
FREESWITCH_HOST=192.168.1.101
FREESWITCH_ESL_PORT=8021
FREESWITCH_ESL_PASSWORD=ClueCon
FREESWITCH_CONTEXT=default

# ═══════════════════════════════════════════════════════════════
# ENGINE (valores padrão recomendados)
# ═══════════════════════════════════════════════════════════════
SCHEDULER_INTERVAL_MS=250
EXECUTOR_INTERVAL_MS=100
TIMER_PROCESSOR_INTERVAL_MS=500
MAX_CONCURRENT_ORIGINATES=50

# ═══════════════════════════════════════════════════════════════
# AMBIENTE
# ═══════════════════════════════════════════════════════════════
NODE_ENV=production
LOG_LEVEL=info
```

### Obter SUPABASE_SERVICE_ROLE_KEY

1. Acesse o backend do Lovable Cloud
2. Vá em **Settings** → **API**
3. Copie a **service_role key** (NÃO a anon key)

⚠️ **IMPORTANTE**: A service_role key tem acesso total ao banco. Mantenha-a segura!

---

## Network e Firewall

### Cenário 1: Asterisk na mesma rede Docker

Se o Asterisk roda em outro container na mesma rede:

```env
ASTERISK_HOST=asterisk  # nome do container
ASTERISK_AMI_PORT=5038
```

No Coolify, adicione ambos containers à mesma network.

### Cenário 2: Asterisk em servidor externo

Se o Asterisk está em outro servidor:

```env
ASTERISK_HOST=203.0.113.50  # IP público ou VPN
ASTERISK_AMI_PORT=5038
```

#### Firewall do Asterisk

Libere a porta AMI apenas para o IP do Coolify:

```bash
# No servidor Asterisk
sudo ufw allow from <IP_COOLIFY> to any port 5038 proto tcp
```

Ou via iptables:

```bash
iptables -A INPUT -p tcp -s <IP_COOLIFY> --dport 5038 -j ACCEPT
```

### Cenário 3: VPN/Tunnel

Para conexões seguras entre datacenters:

1. Configure WireGuard ou OpenVPN entre os servidores
2. Use o IP da VPN no `ASTERISK_HOST`
3. Exemplo: `ASTERISK_HOST=10.8.0.2`

### Configurar AMI no Asterisk

Edite `/etc/asterisk/manager.conf`:

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0  ; ou IP específico

[dialer]
secret = sua-senha-segura
deny = 0.0.0.0/0.0.0.0
permit = <IP_COOLIFY>/255.255.255.255
read = system,call,log,verbose,command,agent,user,originate
write = system,call,log,verbose,command,agent,user,originate
writetimeout = 5000
```

Recarregue o Asterisk:

```bash
asterisk -rx "manager reload"
```

---

## Health Checks

### Endpoint de Health

O container expõe:

| Endpoint | Descrição |
|----------|-----------|
| `GET /health` | Status do engine (200 = healthy, 503 = unhealthy) |
| `GET /status` | Detalhes do estado atual |

### Exemplo de Resposta `/health`

```json
{
  "status": "healthy",
  "running": true,
  "voiceAdapterConnected": true,
  "uptime": 3600,
  "schedulerActive": true,
  "executorActive": true
}
```

### Configurar no Coolify

1. Vá em **Settings** → **Health Checks**
2. Configure:

| Campo | Valor |
|-------|-------|
| **Health Check Type** | HTTP |
| **Path** | `/health` |
| **Port** | `3000` |
| **Interval** | `30s` |
| **Timeout** | `10s` |
| **Retries** | `3` |
| **Start Period** | `60s` |

---

## Logs e Monitoramento

### Visualizar Logs no Coolify

1. Acesse a aplicação no dashboard
2. Clique em **"Logs"**
3. Os logs são estruturados em JSON (pino)

### Formato dos Logs

```json
{
  "level": 30,
  "time": 1702000000000,
  "pid": 1,
  "hostname": "dialer-engine-xyz",
  "name": "Scheduler",
  "msg": "Processed 5 campaigns, scheduled 23 calls",
  "campaignCount": 5,
  "callsScheduled": 23
}
```

### Níveis de Log

| Nível | Valor | Quando Usar |
|-------|-------|-------------|
| `trace` | 10 | Debug detalhado |
| `debug` | 20 | Desenvolvimento |
| `info` | 30 | Produção (padrão) |
| `warn` | 40 | Alertas |
| `error` | 50 | Erros |
| `fatal` | 60 | Erros críticos |

### Integração com Ferramentas Externas

Para enviar logs para sistemas externos (Grafana Loki, Datadog, etc.):

1. Configure um sidecar container no Coolify
2. Ou use a API de logs do Docker

---

## Troubleshooting

### Problema: Container não inicia

**Sintomas**: Status "Crashed" ou "Restarting"

**Soluções**:

1. Verifique as variáveis de ambiente:
```bash
# Todas obrigatórias devem estar definidas
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VOICE_ADAPTER
```

2. Verifique os logs de erro:
```
Coolify Dashboard → Logs → Procure por "fatal" ou "error"
```

3. Teste conectividade com Supabase:
```bash
curl -H "apikey: <ANON_KEY>" \
  "https://tlpgpzguyliflibhrkxy.supabase.co/rest/v1/campaigns?limit=1"
```

### Problema: Não conecta ao Asterisk

**Sintomas**: Logs mostram "AMI connection failed"

**Soluções**:

1. Verifique conectividade de rede:
```bash
# De dentro do container (se possível) ou do host
telnet <ASTERISK_HOST> 5038
```

2. Verifique credenciais AMI:
```bash
# No servidor Asterisk
asterisk -rx "manager show user dialer"
```

3. Verifique firewall:
```bash
# No servidor Asterisk
sudo ufw status
sudo iptables -L -n | grep 5038
```

4. Verifique se AMI está habilitado:
```bash
asterisk -rx "manager show settings"
```

### Problema: Health check falha

**Sintomas**: Container fica em loop de restart

**Soluções**:

1. Aumente o `Start Period` para 120s
2. Verifique se a porta 3000 está sendo exposta
3. Teste manualmente:
```bash
curl http://localhost:3000/health
```

### Problema: Rate limit muito agressivo

**Sintomas**: Poucas chamadas sendo originadas

**Soluções**:

1. Verifique os buckets no banco:
```sql
SELECT * FROM rate_limit_buckets;
```

2. Ajuste os valores de CPS nos trunks:
```sql
UPDATE trunk_config SET cps_limit = 10 WHERE id = '...';
```

3. Verifique os logs do Executor

### Problema: Chamadas não progridem de estado

**Sintomas**: Chamadas ficam em "ORIGINATING" ou "RINGING"

**Soluções**:

1. Verifique se eventos AMI estão chegando:
```
LOG_LEVEL=debug → procure por "handleData" nos logs
```

2. Verifique se o CORRELATION_ID está sendo propagado:
```
No dialplan do Asterisk, adicione logs
```

3. Verifique timers:
```sql
SELECT * FROM call_attempt_timers 
WHERE fired = false AND cancelled = false
ORDER BY fires_at;
```

---

## Manutenção

### Atualizar para Nova Versão

1. Faça push das alterações para o GitHub
2. No Coolify, clique em **"Redeploy"**
3. O Coolify fará build e deploy automaticamente

### Backup de Configurações

Exporte as variáveis de ambiente do Coolify periodicamente.

### Escalar (se necessário)

⚠️ **IMPORTANTE**: O Dialer Engine é **stateful** e deve rodar em **apenas 1 instância**.

Para alta disponibilidade, configure:
- Health checks agressivos (restart rápido em caso de falha)
- Monitoramento externo (UptimeRobot, Pingdom)

### Rollback

1. No Coolify, vá em **"Deployments"**
2. Encontre o deployment anterior
3. Clique em **"Rollback"**

---

## Checklist de Deploy

- [ ] Coolify instalado e acessível
- [ ] Repositório GitHub conectado
- [ ] Dockerfile location configurado: `dialer-engine/Dockerfile`
- [ ] Build context configurado: `dialer-engine`
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `VOICE_ADAPTER` configurado
- [ ] Credenciais do Asterisk/FreeSWITCH configuradas
- [ ] Firewall liberado para conexão AMI/ESL
- [ ] Health check configurado em `/health:3000`
- [ ] Primeiro deploy executado
- [ ] Logs verificados (sem erros)
- [ ] Teste de chamada executado

---

## Suporte

Para problemas específicos:

1. Verifique os logs no Coolify
2. Consulte a documentação do Asterisk/FreeSWITCH
3. Verifique a conectividade de rede
4. Revise as variáveis de ambiente

---

*Última atualização: Dezembro 2024*
