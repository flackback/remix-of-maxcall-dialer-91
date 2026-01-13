CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: adaptive_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.adaptive_method AS ENUM (
    'HARD_LIMIT',
    'TAPERED',
    'AVERAGE'
);


--
-- Name: agent_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agent_status AS ENUM (
    'READY',
    'BUSY',
    'WRAPUP',
    'PAUSE',
    'OFFLINE'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'supervisor',
    'qa',
    'agent',
    'analyst'
);


--
-- Name: call_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.call_direction AS ENUM (
    'INBOUND',
    'OUTBOUND'
);


--
-- Name: call_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.call_state AS ENUM (
    'QUEUED',
    'ORIGINATING',
    'RINGING',
    'EARLY_MEDIA',
    'ANSWERED',
    'BRIDGED',
    'PLAYING',
    'RECORDING',
    'TRANSFER_PENDING',
    'TRANSFERRED',
    'ENDED',
    'FAILED',
    'NO_RTP',
    'ABANDONED',
    'TIMEOUT',
    'CANCELLED'
);


--
-- Name: call_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.call_status AS ENUM (
    'QUEUED',
    'RINGING',
    'CONNECTED',
    'ON_HOLD',
    'TRANSFERRING',
    'ENDED',
    'FAILED',
    'ABANDONED'
);


--
-- Name: campaign_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'COMPLETED'
);


--
-- Name: carrier_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.carrier_type AS ENUM (
    'telnyx',
    'jambonz',
    'sip_generic',
    'sip_webrtc',
    'twilio',
    'vonage',
    'plivo',
    'bandwidth',
    'sinch',
    'infobip',
    'zenvia',
    'totalvoice',
    'asterisk_ami',
    'freeswitch_esl',
    'opensips',
    'kamailio',
    'gsvoip',
    'mundivox',
    'directcall'
);


--
-- Name: dial_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dial_mode AS ENUM (
    'PREVIEW',
    'POWER',
    'PREDICTIVE'
);


--
-- Name: disposition_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.disposition_category AS ENUM (
    'POSITIVE',
    'NEGATIVE',
    'NEUTRAL',
    'CALLBACK',
    'DNC'
);


--
-- Name: queue_strategy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_strategy AS ENUM (
    'LONGEST_IDLE',
    'ROUND_ROBIN',
    'SKILL_WEIGHTED'
);


--
-- Name: queue_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_type AS ENUM (
    'INBOUND',
    'OUTBOUND',
    'CALLBACK',
    'AI_TRIAGE'
);


--
-- Name: consume_token(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_token(p_trunk_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bucket rate_limit_buckets;
  v_elapsed DECIMAL;
  v_new_tokens DECIMAL;
BEGIN
  -- Lock e busca do bucket
  SELECT * INTO v_bucket 
  FROM rate_limit_buckets 
  WHERE trunk_id = p_trunk_id 
  FOR UPDATE;
  
  IF v_bucket IS NULL THEN
    RETURN TRUE; -- Se não existe bucket, permite (fail-open para não quebrar)
  END IF;
  
  -- Calcular tokens acumulados desde último refill
  v_elapsed := EXTRACT(EPOCH FROM (NOW() - v_bucket.last_refill_at));
  v_new_tokens := LEAST(v_bucket.max_tokens, v_bucket.tokens + (v_elapsed * v_bucket.refill_rate));
  
  IF v_new_tokens >= 1 THEN
    UPDATE rate_limit_buckets 
    SET tokens = v_new_tokens - 1, 
        last_refill_at = NOW(),
        updated_at = NOW()
    WHERE trunk_id = p_trunk_id;
    RETURN TRUE;
  END IF;
  
  -- Atualizar tokens mesmo sem consumir (para manter o refill correto)
  UPDATE rate_limit_buckets 
  SET tokens = v_new_tokens, 
      last_refill_at = NOW(),
      updated_at = NOW()
  WHERE trunk_id = p_trunk_id;
  
  RETURN FALSE;
END;
$$;


--
-- Name: decrypt_api_key(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrypt_api_key(encrypted_key text, encryption_key text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF encrypted_key IS NULL OR encrypted_key = '' THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(decode(encrypted_key, 'base64'), encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


--
-- Name: encrypt_api_key(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.encrypt_api_key(plain_key text, encryption_key text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF plain_key IS NULL OR plain_key = '' THEN
    RETURN NULL;
  END IF;
  RETURN encode(pgp_sym_encrypt(plain_key, encryption_key), 'base64');
END;
$$;


--
-- Name: get_user_account_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_account_id(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT account_id FROM public.profiles WHERE user_id = _user_id
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;


--
-- Name: handle_new_user_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_account() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  default_account_id uuid;
BEGIN
  -- Se já tem account_id, não fazer nada
  IF NEW.account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Pegar a primeira conta ativa como padrão
  SELECT id INTO default_account_id 
  FROM public.accounts 
  WHERE is_active = true 
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Se não existir conta, criar uma nova para o usuário
  IF default_account_id IS NULL THEN
    INSERT INTO public.accounts (name, is_active) 
    VALUES ('Conta de ' || COALESCE(NEW.full_name, 'Novo Usuário'), true)
    RETURNING id INTO default_account_id;
  END IF;
  
  -- Atualizar o perfil com o account_id
  NEW.account_id := default_account_id;
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: process_expired_timers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_expired_timers() RETURNS TABLE(timer_id uuid, attempt_id uuid, timer_type text, current_state text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    UPDATE call_attempt_timers t
    SET fired = TRUE
    WHERE t.fires_at <= NOW()
      AND t.fired = FALSE
      AND t.cancelled = FALSE
    RETURNING t.id, t.attempt_id, t.timer_type
  )
  SELECT e.id, e.attempt_id, e.timer_type, ca.state
  FROM expired e
  JOIN call_attempts ca ON ca.id = e.attempt_id;
END;
$$;


--
-- Name: reserve_leads_for_campaign(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_leads_for_campaign(p_campaign_id uuid, p_account_id uuid, p_limit integer) RETURNS TABLE(lead_id uuid, phone text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH reserved AS (
    UPDATE leads
    SET status = 'IN_PROGRESS',
        updated_at = NOW()
    WHERE id IN (
      SELECT l.id
      FROM leads l
      JOIN campaign_lists cl ON cl.list_id = l.list_id
      WHERE cl.campaign_id = p_campaign_id
        AND l.status = 'NEW'
        AND l.account_id = p_account_id
        AND NOT EXISTS (
          SELECT 1 FROM call_attempts ca
          WHERE ca.lead_id = l.id
            AND ca.campaign_id = p_campaign_id
            AND ca.state NOT IN ('ENDED', 'FAILED', 'TIMEOUT', 'CANCELLED')
        )
      ORDER BY cl.priority DESC, l.created_at
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, phone
  )
  SELECT r.id, r.phone FROM reserved r;
END;
$$;


--
-- Name: update_call_attempt_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_call_attempt_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_route_health_on_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_route_health_on_transition() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_trunk_id UUID;
  v_penalty DECIMAL;
  v_recovery DECIMAL;
BEGIN
  -- Buscar trunk_id da chamada (se existir na tabela calls)
  -- Por enquanto, vamos pular se não conseguir identificar
  
  -- Penalizar baseado no estado final
  IF NEW.to_state IN ('FAILED', 'NO_RTP', 'TIMEOUT', 'CANCELLED') THEN
    v_penalty := CASE 
      WHEN NEW.to_state = 'NO_RTP' THEN 10
      WHEN NEW.to_state = 'FAILED' THEN 5
      WHEN NEW.to_state = 'TIMEOUT' THEN 3
      ELSE 2
    END;
    
    -- Atualizar contadores (usando carrier_id da calls se disponível)
    UPDATE route_health rh
    SET health_score = GREATEST(0, health_score - v_penalty),
        no_rtp_count = CASE WHEN NEW.to_state = 'NO_RTP' THEN no_rtp_count + 1 ELSE no_rtp_count END,
        timeout_count = CASE WHEN NEW.to_state = 'TIMEOUT' THEN timeout_count + 1 ELSE timeout_count END,
        failed_calls = failed_calls + 1,
        total_calls = total_calls + 1,
        last_failure_at = NOW(),
        is_degraded = CASE WHEN health_score - v_penalty < 50 THEN TRUE ELSE is_degraded END,
        updated_at = NOW()
    WHERE rh.carrier_id IN (
      SELECT c.carrier_id FROM calls c WHERE c.id = NEW.call_id
    );
    
  ELSIF NEW.to_state = 'ENDED' AND NEW.from_state = 'BRIDGED' THEN
    -- Chamada bem sucedida - recuperar score lentamente
    v_recovery := 0.5;
    
    UPDATE route_health rh
    SET health_score = LEAST(100, health_score + v_recovery),
        connected_calls = connected_calls + 1,
        total_calls = total_calls + 1,
        last_success_at = NOW(),
        is_degraded = CASE WHEN health_score + v_recovery >= 60 THEN FALSE ELSE is_degraded END,
        updated_at = NOW()
    WHERE rh.carrier_id IN (
      SELECT c.carrier_id FROM calls c WHERE c.id = NEW.call_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: account_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    provider text NOT NULL,
    api_key_encrypted text,
    api_secret_encrypted text,
    config_json jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    last_verified_at timestamp with time zone,
    verification_error text,
    total_requests integer DEFAULT 0,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    settings_json jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    queue_id uuid NOT NULL,
    skill_level integer DEFAULT 3,
    CONSTRAINT agent_skills_skill_level_check CHECK (((skill_level >= 1) AND (skill_level <= 5)))
);


--
-- Name: agent_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    date date NOT NULL,
    calls_handled integer DEFAULT 0,
    calls_missed integer DEFAULT 0,
    total_talk_time integer DEFAULT 0,
    total_hold_time integer DEFAULT 0,
    total_wrapup_time integer DEFAULT 0,
    aht integer DEFAULT 0,
    conversions integer DEFAULT 0,
    adherence numeric(5,2) DEFAULT 100
);


--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    team_id uuid,
    extension text,
    sip_user text,
    status public.agent_status DEFAULT 'OFFLINE'::public.agent_status,
    pause_reason text,
    current_call_id uuid,
    last_call_at timestamp with time zone,
    logged_in_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_agent_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    agent_id uuid,
    call_id uuid,
    conversation_id text,
    caller_phone text,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    duration_seconds integer DEFAULT 0,
    transcript text,
    summary text,
    sentiment text,
    handoff_requested boolean DEFAULT false,
    handoff_reason text,
    satisfaction_score integer,
    metadata_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_handoffs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_handoffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    summary text,
    fields_json jsonb DEFAULT '{}'::jsonb,
    sentiment text,
    intent text,
    confidence numeric(3,2),
    duration integer DEFAULT 0,
    transcript text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_prompt_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_prompt_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    name text NOT NULL,
    description text,
    category text DEFAULT 'geral'::text NOT NULL,
    system_prompt text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    is_public boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_prompt_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_prompt_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    system_prompt text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    training_examples_count integer DEFAULT 0,
    performance_metrics jsonb DEFAULT '{}'::jsonb,
    notes text,
    is_active boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_training_examples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_training_examples (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    agent_id uuid,
    call_id uuid,
    category text DEFAULT 'geral'::text NOT NULL,
    subcategory text,
    transcript text NOT NULL,
    expected_behavior text,
    annotations jsonb DEFAULT '[]'::jsonb,
    quality_score integer,
    is_positive_example boolean DEFAULT true,
    tags text[] DEFAULT '{}'::text[],
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_training_examples_quality_score_check CHECK (((quality_score >= 1) AND (quality_score <= 5)))
);


--
-- Name: ai_voice_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_voice_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    provider text DEFAULT 'elevenlabs'::text NOT NULL,
    agent_id text,
    voice_id text,
    voice_name text,
    system_prompt text,
    first_message text DEFAULT 'Olá! Como posso ajudá-lo hoje?'::text,
    language text DEFAULT 'pt-BR'::text,
    tools_config jsonb DEFAULT '[]'::jsonb,
    overrides_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    total_calls integer DEFAULT 0,
    total_duration_seconds integer DEFAULT 0,
    avg_satisfaction numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: amd_provider_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amd_provider_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    provider text NOT NULL,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 1,
    config_json jsonb DEFAULT '{}'::jsonb,
    silence_threshold_ms integer DEFAULT 1500,
    speech_threshold_ms integer DEFAULT 3000,
    max_detection_time_ms integer DEFAULT 5000,
    min_word_count integer DEFAULT 3,
    cost_per_detection numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: amd_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amd_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    campaign_id uuid,
    detection_result text NOT NULL,
    confidence_score numeric DEFAULT 0,
    detection_time_ms integer DEFAULT 0,
    audio_duration_ms integer DEFAULT 0,
    provider text DEFAULT 'internal'::text,
    speech_detected boolean DEFAULT false,
    beep_detected boolean DEFAULT false,
    silence_duration_ms integer DEFAULT 0,
    action_taken text,
    raw_response jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: amd_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amd_statistics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    hour integer DEFAULT EXTRACT(hour FROM now()),
    total_detections integer DEFAULT 0,
    human_detections integer DEFAULT 0,
    machine_detections integer DEFAULT 0,
    fax_detections integer DEFAULT 0,
    unknown_detections integer DEFAULT 0,
    avg_detection_time_ms integer DEFAULT 0,
    avg_confidence numeric DEFAULT 0,
    messages_left integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: call_attempt_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_attempt_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    event_type text NOT NULL,
    from_state text,
    to_state text,
    sip_code integer,
    sip_reason text,
    rtp_stats jsonb,
    event_source text,
    event_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: call_attempt_timers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_attempt_timers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    timer_type text NOT NULL,
    fires_at timestamp with time zone NOT NULL,
    fired boolean DEFAULT false,
    cancelled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT call_attempt_timers_timer_type_check CHECK ((timer_type = ANY (ARRAY['RING_TIMEOUT'::text, 'ANSWER_NO_RTP_TIMEOUT'::text, 'AMD_TIMEOUT'::text, 'AGENT_ASSIGN_TIMEOUT'::text, 'MAX_DURATION'::text, 'HOLD_TIMEOUT'::text])))
);


--
-- Name: call_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    campaign_id uuid,
    lead_id uuid,
    agent_id uuid,
    phone_e164 text NOT NULL,
    attempt_number integer DEFAULT 1,
    correlation_id text,
    state text DEFAULT 'QUEUED'::text NOT NULL,
    route_id uuid,
    trunk_id uuid,
    carrier_id uuid,
    caller_id_id uuid,
    caller_id_used text,
    queued_at timestamp with time zone DEFAULT now(),
    reserved_at timestamp with time zone,
    originate_at timestamp with time zone,
    ring_at timestamp with time zone,
    early_media_at timestamp with time zone,
    answer_at timestamp with time zone,
    bridge_at timestamp with time zone,
    end_at timestamp with time zone,
    rtp_started_at timestamp with time zone,
    rtp_last_seen_at timestamp with time zone,
    rtp_packets_received integer DEFAULT 0,
    rtp_jitter_ms numeric,
    rtp_packet_loss_percent numeric,
    sip_call_id text,
    sip_from_tag text,
    sip_to_tag text,
    sip_codes integer[] DEFAULT '{}'::integer[],
    sip_final_code integer,
    sip_final_reason text,
    hangup_cause text,
    hangup_source text,
    duration_ms integer DEFAULT 0,
    ring_duration_ms integer DEFAULT 0,
    talk_duration_ms integer DEFAULT 0,
    hold_duration_ms integer DEFAULT 0,
    amd_result text,
    amd_confidence numeric,
    amd_duration_ms integer,
    mos_score numeric,
    quality_issues text[],
    retry_count integer DEFAULT 0,
    failover_count integer DEFAULT 0,
    previous_attempt_id uuid,
    failover_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT call_attempts_amd_result_check CHECK ((amd_result = ANY (ARRAY['HUMAN'::text, 'MACHINE'::text, 'FAX'::text, 'UNKNOWN'::text, 'NOTSURE'::text]))),
    CONSTRAINT call_attempts_hangup_source_check CHECK ((hangup_source = ANY (ARRAY['CALLER'::text, 'CALLEE'::text, 'SYSTEM'::text, 'AGENT'::text, 'TIMEOUT'::text, 'ERROR'::text]))),
    CONSTRAINT call_attempts_state_check CHECK ((state = ANY (ARRAY['QUEUED'::text, 'RESERVING'::text, 'ORIGINATING'::text, 'RINGING'::text, 'EARLY_MEDIA'::text, 'ANSWERED'::text, 'AMD_PROCESSING'::text, 'BRIDGING'::text, 'BRIDGED'::text, 'PLAYING'::text, 'RECORDING'::text, 'TRANSFERRING'::text, 'TRANSFERRED'::text, 'ENDING'::text, 'ENDED'::text, 'FAILED'::text, 'NO_RTP'::text, 'ABANDONED'::text, 'TIMEOUT'::text, 'CANCELLED'::text])))
);


--
-- Name: call_bridges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_bridges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    call_a_id uuid,
    call_b_id uuid,
    bridge_type text DEFAULT 'transfer'::text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    connected_at timestamp with time zone,
    ended_at timestamp with time zone,
    initiated_by uuid
);


--
-- Name: call_dispositions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_dispositions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    disposition_id uuid NOT NULL,
    notes text,
    callback_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: call_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: call_quality_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_quality_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    carrier_id uuid,
    trunk_id uuid,
    jitter_ms numeric DEFAULT 0,
    packet_loss_percent numeric DEFAULT 0,
    rtt_ms integer DEFAULT 0,
    mos_score numeric(2,1) DEFAULT 4.0,
    codec_used text,
    bitrate_kbps integer,
    samples_collected integer DEFAULT 0,
    min_jitter_ms numeric,
    max_jitter_ms numeric,
    avg_jitter_ms numeric,
    min_rtt_ms integer,
    max_rtt_ms integer,
    avg_rtt_ms integer,
    total_packets_sent integer DEFAULT 0,
    total_packets_lost integer DEFAULT 0,
    measured_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT call_quality_metrics_mos_score_check CHECK (((mos_score >= 1.0) AND (mos_score <= 5.0)))
);


--
-- Name: call_state_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_state_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    from_state public.call_state,
    to_state public.call_state NOT NULL,
    trigger_event text NOT NULL,
    sip_code integer,
    rtp_stats jsonb DEFAULT '{}'::jsonb,
    duration_in_state_ms integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: callbacks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.callbacks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    agent_id uuid,
    campaign_id uuid,
    scheduled_at timestamp with time zone NOT NULL,
    status text DEFAULT 'scheduled'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);


--
-- Name: caller_id_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caller_id_health (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    caller_id_number_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    calls_attempted integer DEFAULT 0,
    calls_connected integer DEFAULT 0,
    calls_blocked integer DEFAULT 0,
    calls_spam_reported integer DEFAULT 0,
    answer_rate numeric(5,2) DEFAULT 0,
    block_rate numeric(5,2) DEFAULT 0,
    health_score integer DEFAULT 100,
    reputation_source text,
    external_reputation_score integer,
    flagged_as_spam boolean DEFAULT false,
    flagged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: caller_id_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caller_id_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_id uuid NOT NULL,
    phone_number text NOT NULL,
    friendly_name text,
    carrier_id uuid,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    stir_shaken_attestation text,
    priority integer DEFAULT 1,
    weight integer DEFAULT 100,
    last_used_at timestamp with time zone,
    uses_today integer DEFAULT 0,
    uses_this_hour integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: caller_id_pools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caller_id_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    region text,
    is_active boolean DEFAULT true,
    rotation_strategy text DEFAULT 'round_robin'::text,
    cooldown_seconds integer DEFAULT 300,
    max_uses_per_hour integer DEFAULT 100,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: caller_id_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caller_id_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    pool_id uuid NOT NULL,
    campaign_id uuid,
    ddd_pattern text,
    time_start time without time zone DEFAULT '00:00:00'::time without time zone,
    time_end time without time zone DEFAULT '23:59:59'::time without time zone,
    days_of_week integer[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
    priority integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: caller_id_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caller_id_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    caller_id_number_id uuid NOT NULL,
    call_id uuid,
    campaign_id uuid,
    used_at timestamp with time zone DEFAULT now(),
    result text,
    duration_seconds integer DEFAULT 0
);


--
-- Name: calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    direction public.call_direction NOT NULL,
    status public.call_status DEFAULT 'QUEUED'::public.call_status,
    lead_id uuid,
    agent_id uuid,
    queue_id uuid,
    campaign_id uuid,
    disposition_id uuid,
    phone text NOT NULL,
    caller_id text,
    started_at timestamp with time zone DEFAULT now(),
    ringing_at timestamp with time zone,
    connected_at timestamp with time zone,
    ended_at timestamp with time zone,
    duration integer DEFAULT 0,
    hold_time integer DEFAULT 0,
    wrapup_time integer DEFAULT 0,
    recording_url text,
    notes text,
    is_ai_handled boolean DEFAULT false,
    ai_handoff_summary text,
    telephony_id text,
    created_at timestamp with time zone DEFAULT now(),
    amd_result text,
    amd_confidence numeric,
    amd_duration_ms integer DEFAULT 0,
    ai_summary text,
    ai_sentiment text,
    ai_quality_score integer,
    ai_key_topics text[],
    ai_action_items text[],
    ai_analyzed_at timestamp with time zone,
    transcript text,
    carrier_id uuid,
    trunk_id uuid,
    current_state public.call_state DEFAULT 'QUEUED'::public.call_state
);


--
-- Name: campaign_amd_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_amd_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    amd_enabled boolean DEFAULT true,
    amd_provider text DEFAULT 'carrier'::text,
    machine_action text DEFAULT 'hangup'::text,
    machine_message text,
    fax_action text DEFAULT 'hangup'::text,
    no_answer_action text DEFAULT 'reschedule'::text,
    max_detection_time_ms integer DEFAULT 5000,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: campaign_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    list_id uuid NOT NULL,
    priority integer DEFAULT 1
);


--
-- Name: campaign_metrics_window; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_metrics_window (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    attempts_total integer DEFAULT 0,
    attempts_answered integer DEFAULT 0,
    attempts_failed integer DEFAULT 0,
    attempts_no_rtp integer DEFAULT 0,
    attempts_abandoned integer DEFAULT 0,
    asr numeric,
    acd_seconds numeric,
    pdd_ms numeric,
    abandon_rate numeric,
    metrics_by_route jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    dial_mode public.dial_mode DEFAULT 'POWER'::public.dial_mode,
    status public.campaign_status DEFAULT 'DRAFT'::public.campaign_status,
    dial_ratio numeric(4,2) DEFAULT 1.0,
    max_attempts integer DEFAULT 5,
    cooldown_minutes integer DEFAULT 60,
    caller_id text,
    start_time time without time zone DEFAULT '09:00:00'::time without time zone,
    end_time time without time zone DEFAULT '21:00:00'::time without time zone,
    work_days integer[] DEFAULT '{1,2,3,4,5}'::integer[],
    script_id uuid,
    queue_id uuid,
    adaptive_method public.adaptive_method DEFAULT 'AVERAGE'::public.adaptive_method,
    available_only_tally boolean DEFAULT true,
    max_adapt_dial_level numeric(4,2) DEFAULT 3.0,
    drop_percentage_target numeric(4,2) DEFAULT 3.0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    target_cps numeric DEFAULT 1.0,
    max_concurrent integer DEFAULT 10,
    abandon_limit_percent numeric DEFAULT 3.0,
    ring_timeout_seconds integer DEFAULT 30,
    answer_no_rtp_timeout_seconds integer DEFAULT 5,
    max_call_duration_seconds integer DEFAULT 1800,
    agent_assign_timeout_seconds integer DEFAULT 10,
    retry_delay_minutes integer DEFAULT 30,
    max_retry_attempts integer DEFAULT 3,
    allowed_routes uuid[],
    dialer_mode text DEFAULT 'POWER'::text,
    CONSTRAINT campaigns_dialer_mode_check CHECK ((dialer_mode = ANY (ARRAY['PREVIEW'::text, 'POWER'::text, 'PROGRESSIVE'::text, 'PREDICTIVE'::text])))
);


--
-- Name: carrier_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carrier_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid,
    campaign_id uuid,
    carrier_id uuid NOT NULL,
    ai_reasoning text,
    was_successful boolean,
    actual_duration integer DEFAULT 0,
    actual_cost numeric(10,4) DEFAULT 0,
    latency_ms integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: carrier_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carrier_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    carrier_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    hour integer DEFAULT EXTRACT(hour FROM now()),
    total_calls integer DEFAULT 0,
    connected_calls integer DEFAULT 0,
    failed_calls integer DEFAULT 0,
    avg_duration integer DEFAULT 0,
    avg_latency_ms integer DEFAULT 0,
    cost_total numeric(12,4) DEFAULT 0,
    connection_rate numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: carrier_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carrier_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    carrier_id uuid NOT NULL,
    ddd_patterns text[] DEFAULT '{}'::text[],
    campaign_types text[] DEFAULT '{}'::text[],
    time_start time without time zone DEFAULT '00:00:00'::time without time zone,
    time_end time without time zone DEFAULT '23:59:59'::time without time zone,
    days_of_week integer[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
    priority integer DEFAULT 1,
    weight integer DEFAULT 100,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: conference_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conference_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conference_id uuid NOT NULL,
    call_id uuid,
    agent_id uuid,
    participant_type text DEFAULT 'participant'::text NOT NULL,
    phone_number text,
    display_name text,
    is_muted boolean DEFAULT false,
    is_on_hold boolean DEFAULT false,
    joined_at timestamp with time zone DEFAULT now(),
    left_at timestamp with time zone,
    status text DEFAULT 'active'::text
);


--
-- Name: conference_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conference_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    room_code text NOT NULL,
    max_participants integer DEFAULT 50,
    is_active boolean DEFAULT true,
    is_recording boolean DEFAULT false,
    is_moderated boolean DEFAULT false,
    moderator_pin text,
    participant_pin text,
    created_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    created_by uuid
);


--
-- Name: cps_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cps_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trunk_id uuid NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    cps_value integer NOT NULL,
    limit_value integer NOT NULL,
    was_throttled boolean DEFAULT false,
    throttle_reason text,
    calls_queued integer DEFAULT 0,
    calls_rejected integer DEFAULT 0
);


--
-- Name: dial_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dial_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    agents_available integer DEFAULT 0,
    agents_on_call integer DEFAULT 0,
    calls_dialed integer DEFAULT 0,
    calls_ringing integer DEFAULT 0,
    calls_connected integer DEFAULT 0,
    calls_abandoned integer DEFAULT 0,
    current_dial_ratio numeric DEFAULT 1.0,
    drop_rate numeric DEFAULT 0,
    asr numeric DEFAULT 0,
    avg_talk_time integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: dispositions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispositions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    category public.disposition_category NOT NULL,
    description text,
    is_default boolean DEFAULT false,
    requires_callback boolean DEFAULT false,
    requires_notes boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    list_id uuid,
    first_name text,
    last_name text,
    phone text NOT NULL,
    normalized_phone text,
    email text,
    company text,
    city text,
    state text,
    tags text[] DEFAULT '{}'::text[],
    score integer DEFAULT 0,
    metadata_json jsonb DEFAULT '{}'::jsonb,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    last_attempt_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    is_dnc boolean DEFAULT false,
    has_consent boolean DEFAULT true,
    status text DEFAULT 'new'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text,
    leads_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    severity text DEFAULT 'INFO'::text,
    read boolean DEFAULT false,
    related_entity_type text,
    related_entity_id uuid,
    metadata_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_severity_check CHECK ((severity = ANY (ARRAY['INFO'::text, 'WARNING'::text, 'CRITICAL'::text]))),
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['SLA_BREACH'::text, 'CALLBACK_DUE'::text, 'QUEUE_OVERFLOW'::text, 'SIP_ERROR'::text, 'CARRIER_DOWN'::text, 'QUALITY_ALERT'::text, 'SYSTEM'::text, 'INFO'::text])))
);


--
-- Name: originate_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.originate_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    priority integer DEFAULT 0,
    route_id uuid,
    trunk_id uuid,
    caller_id_id uuid,
    status text DEFAULT 'PENDING'::text,
    locked_by text,
    locked_at timestamp with time zone,
    result jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    CONSTRAINT originate_jobs_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'PROCESSING'::text, 'COMPLETED'::text, 'FAILED'::text, 'CANCELLED'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid,
    full_name text,
    avatar_url text,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: qa_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    reviewer_id uuid,
    agent_id uuid,
    scorecard_id uuid,
    scores_json jsonb DEFAULT '{}'::jsonb,
    total_score integer,
    feedback text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: qa_scorecards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_scorecards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    campaign_id uuid,
    criteria_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    max_score integer DEFAULT 100,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: quality_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    carrier_id uuid,
    trunk_id uuid,
    call_id uuid,
    alert_type text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    threshold_value numeric,
    current_value numeric,
    message text,
    auto_action_taken text,
    action_details jsonb DEFAULT '{}'::jsonb,
    acknowledged_at timestamp with time zone,
    acknowledged_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT quality_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['HIGH_JITTER'::text, 'PACKET_LOSS'::text, 'LOW_MOS'::text, 'HIGH_RTT'::text, 'CPS_EXCEEDED'::text, 'CODEC_MISMATCH'::text, 'TLS_FAILURE'::text, 'SRTP_FAILURE'::text, 'NAT_FAILURE'::text, 'TRUNK_DOWN'::text, 'QUALITY_DEGRADED'::text]))),
    CONSTRAINT quality_alerts_auto_action_taken_check CHECK ((auto_action_taken = ANY (ARRAY['NONE'::text, 'THROTTLE'::text, 'FAILOVER'::text, 'DISCONNECT'::text, 'NOTIFY'::text]))),
    CONSTRAINT quality_alerts_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])))
);


--
-- Name: queue_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queue_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    priority integer DEFAULT 1
);


--
-- Name: queues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    type public.queue_type DEFAULT 'INBOUND'::public.queue_type NOT NULL,
    strategy public.queue_strategy DEFAULT 'LONGEST_IDLE'::public.queue_strategy,
    wrapup_time integer DEFAULT 30,
    sla_target integer DEFAULT 20,
    max_wait_time integer DEFAULT 300,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: rate_limit_buckets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limit_buckets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trunk_id uuid,
    carrier_id uuid,
    bucket_type text DEFAULT 'trunk'::text NOT NULL,
    tokens numeric DEFAULT 0 NOT NULL,
    max_tokens numeric DEFAULT 10 NOT NULL,
    refill_rate numeric DEFAULT 1 NOT NULL,
    last_refill_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: recordings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    file_url text NOT NULL,
    duration integer DEFAULT 0,
    file_size integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: route_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_health (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    carrier_id uuid,
    trunk_id uuid,
    health_score numeric DEFAULT 100,
    asr numeric DEFAULT 0,
    acd integer DEFAULT 0,
    pdd integer DEFAULT 0,
    total_calls integer DEFAULT 0,
    connected_calls integer DEFAULT 0,
    failed_calls integer DEFAULT 0,
    no_rtp_count integer DEFAULT 0,
    timeout_count integer DEFAULT 0,
    last_failure_at timestamp with time zone,
    last_success_at timestamp with time zone,
    cooldown_until timestamp with time zone,
    is_degraded boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT route_health_health_score_check CHECK (((health_score >= (0)::numeric) AND (health_score <= (100)::numeric)))
);


--
-- Name: scripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    steps_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sensitive_action_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sensitive_action_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    account_id uuid,
    action text NOT NULL,
    resource_type text,
    resource_id uuid,
    payload jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    success boolean DEFAULT true,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sip_webrtc_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sip_webrtc_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    carrier_id uuid,
    trunk_id uuid,
    session_id text,
    call_id uuid,
    log_level text DEFAULT 'INFO'::text NOT NULL,
    category text NOT NULL,
    message text NOT NULL,
    sip_method text,
    sip_status_code integer,
    sip_status_text text,
    sip_call_id text,
    sip_from text,
    sip_to text,
    ice_candidate text,
    ice_state text,
    sdp_type text,
    sdp_content text,
    error_code text,
    error_description text,
    stack_trace text,
    user_agent text,
    remote_address text,
    metadata_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sip_webrtc_logs_category_check CHECK ((category = ANY (ARRAY['REGISTRATION'::text, 'INVITE'::text, 'BYE'::text, 'ICE'::text, 'SRTP'::text, 'CODEC'::text, 'AUTH'::text, 'TRANSPORT'::text, 'MEDIA'::text, 'GENERAL'::text]))),
    CONSTRAINT sip_webrtc_logs_log_level_check CHECK ((log_level = ANY (ARRAY['DEBUG'::text, 'INFO'::text, 'WARN'::text, 'ERROR'::text])))
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: telephony_carriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telephony_carriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    type public.carrier_type NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 1,
    cost_per_minute numeric(10,4) DEFAULT 0,
    max_concurrent_calls integer DEFAULT 100,
    webhook_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: trunk_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trunk_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    carrier_id uuid NOT NULL,
    name text NOT NULL,
    codecs_allowed text[] DEFAULT ARRAY['G.711'::text, 'Opus'::text],
    tls_enabled boolean DEFAULT true,
    srtp_enabled boolean DEFAULT true,
    nat_traversal_enabled boolean DEFAULT true,
    topology_hiding boolean DEFAULT true,
    max_cps integer DEFAULT 10,
    current_cps integer DEFAULT 0,
    cps_window_seconds integer DEFAULT 1,
    dtmf_mode text DEFAULT 'rfc2833'::text,
    session_timers_enabled boolean DEFAULT true,
    session_expires_seconds integer DEFAULT 1800,
    min_se_seconds integer DEFAULT 90,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: trunk_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trunk_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trunk_id uuid NOT NULL,
    limit_type text NOT NULL,
    limit_scope_id uuid,
    limit_scope_pattern text,
    max_cps integer DEFAULT 5 NOT NULL,
    burst_limit integer DEFAULT 10,
    throttle_duration_seconds integer DEFAULT 60,
    current_usage integer DEFAULT 0,
    last_throttle_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trunk_limits_limit_type_check CHECK ((limit_type = ANY (ARRAY['TRUNK'::text, 'CAMPAIGN'::text, 'DESTINATION'::text, 'DDD'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb,
    status text DEFAULT 'pending'::text,
    attempts integer DEFAULT 0,
    last_attempt_at timestamp with time zone,
    response_code integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    url text NOT NULL,
    events text[] DEFAULT '{}'::text[],
    secret_key text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: webrtc_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webrtc_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    agent_id uuid,
    call_id uuid,
    session_id text NOT NULL,
    provider text DEFAULT 'telnyx'::text NOT NULL,
    status text DEFAULT 'initializing'::text,
    ice_connection_state text,
    signaling_state text,
    codec_audio text,
    codec_video text,
    local_sdp text,
    remote_sdp text,
    created_at timestamp with time zone DEFAULT now(),
    connected_at timestamp with time zone,
    disconnected_at timestamp with time zone
);


--
-- Name: account_integrations account_integrations_account_id_provider_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_integrations
    ADD CONSTRAINT account_integrations_account_id_provider_key UNIQUE (account_id, provider);


--
-- Name: account_integrations account_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_integrations
    ADD CONSTRAINT account_integrations_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: agent_skills agent_skills_agent_id_queue_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_skills
    ADD CONSTRAINT agent_skills_agent_id_queue_id_key UNIQUE (agent_id, queue_id);


--
-- Name: agent_skills agent_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_skills
    ADD CONSTRAINT agent_skills_pkey PRIMARY KEY (id);


--
-- Name: agent_stats agent_stats_agent_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_stats
    ADD CONSTRAINT agent_stats_agent_id_date_key UNIQUE (agent_id, date);


--
-- Name: agent_stats agent_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_stats
    ADD CONSTRAINT agent_stats_pkey PRIMARY KEY (id);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: agents agents_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_key UNIQUE (user_id);


--
-- Name: ai_agent_calls ai_agent_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_calls
    ADD CONSTRAINT ai_agent_calls_pkey PRIMARY KEY (id);


--
-- Name: ai_handoffs ai_handoffs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_handoffs
    ADD CONSTRAINT ai_handoffs_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_templates ai_prompt_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_versions ai_prompt_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_versions
    ADD CONSTRAINT ai_prompt_versions_pkey PRIMARY KEY (id);


--
-- Name: ai_training_examples ai_training_examples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_training_examples
    ADD CONSTRAINT ai_training_examples_pkey PRIMARY KEY (id);


--
-- Name: ai_voice_agents ai_voice_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_voice_agents
    ADD CONSTRAINT ai_voice_agents_pkey PRIMARY KEY (id);


--
-- Name: amd_provider_configs amd_provider_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amd_provider_configs
    ADD CONSTRAINT amd_provider_configs_pkey PRIMARY KEY (id);


--
-- Name: amd_results amd_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amd_results
    ADD CONSTRAINT amd_results_pkey PRIMARY KEY (id);


--
-- Name: amd_statistics amd_statistics_campaign_id_date_hour_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amd_statistics
    ADD CONSTRAINT amd_statistics_campaign_id_date_hour_key UNIQUE (campaign_id, date, hour);


--
-- Name: amd_statistics amd_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amd_statistics
    ADD CONSTRAINT amd_statistics_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: call_attempt_events call_attempt_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempt_events
    ADD CONSTRAINT call_attempt_events_pkey PRIMARY KEY (id);


--
-- Name: call_attempt_timers call_attempt_timers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempt_timers
    ADD CONSTRAINT call_attempt_timers_pkey PRIMARY KEY (id);


--
-- Name: call_attempts call_attempts_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_correlation_id_key UNIQUE (correlation_id);


--
-- Name: call_attempts call_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_pkey PRIMARY KEY (id);


--
-- Name: call_bridges call_bridges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_bridges
    ADD CONSTRAINT call_bridges_pkey PRIMARY KEY (id);


--
-- Name: call_dispositions call_dispositions_call_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_dispositions
    ADD CONSTRAINT call_dispositions_call_id_key UNIQUE (call_id);


--
-- Name: call_dispositions call_dispositions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_dispositions
    ADD CONSTRAINT call_dispositions_pkey PRIMARY KEY (id);


--
-- Name: call_events call_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_events
    ADD CONSTRAINT call_events_pkey PRIMARY KEY (id);


--
-- Name: call_quality_metrics call_quality_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_quality_metrics
    ADD CONSTRAINT call_quality_metrics_pkey PRIMARY KEY (id);


--
-- Name: call_state_transitions call_state_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_state_transitions
    ADD CONSTRAINT call_state_transitions_pkey PRIMARY KEY (id);


--
-- Name: callbacks callbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacks
    ADD CONSTRAINT callbacks_pkey PRIMARY KEY (id);


--
-- Name: caller_id_health caller_id_health_caller_id_number_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_health
    ADD CONSTRAINT caller_id_health_caller_id_number_id_date_key UNIQUE (caller_id_number_id, date);


--
-- Name: caller_id_health caller_id_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_health
    ADD CONSTRAINT caller_id_health_pkey PRIMARY KEY (id);


--
-- Name: caller_id_numbers caller_id_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_numbers
    ADD CONSTRAINT caller_id_numbers_pkey PRIMARY KEY (id);


--
-- Name: caller_id_numbers caller_id_numbers_pool_id_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_numbers
    ADD CONSTRAINT caller_id_numbers_pool_id_phone_number_key UNIQUE (pool_id, phone_number);


--
-- Name: caller_id_pools caller_id_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_pools
    ADD CONSTRAINT caller_id_pools_pkey PRIMARY KEY (id);


--
-- Name: caller_id_rules caller_id_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_rules
    ADD CONSTRAINT caller_id_rules_pkey PRIMARY KEY (id);


--
-- Name: caller_id_usage caller_id_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_usage
    ADD CONSTRAINT caller_id_usage_pkey PRIMARY KEY (id);


--
-- Name: calls calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_pkey PRIMARY KEY (id);


--
-- Name: campaign_amd_settings campaign_amd_settings_campaign_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_amd_settings
    ADD CONSTRAINT campaign_amd_settings_campaign_id_key UNIQUE (campaign_id);


--
-- Name: campaign_amd_settings campaign_amd_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_amd_settings
    ADD CONSTRAINT campaign_amd_settings_pkey PRIMARY KEY (id);


--
-- Name: campaign_lists campaign_lists_campaign_id_list_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_lists
    ADD CONSTRAINT campaign_lists_campaign_id_list_id_key UNIQUE (campaign_id, list_id);


--
-- Name: campaign_lists campaign_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_lists
    ADD CONSTRAINT campaign_lists_pkey PRIMARY KEY (id);


--
-- Name: campaign_metrics_window campaign_metrics_window_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_metrics_window
    ADD CONSTRAINT campaign_metrics_window_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: carrier_decisions carrier_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_decisions
    ADD CONSTRAINT carrier_decisions_pkey PRIMARY KEY (id);


--
-- Name: carrier_metrics carrier_metrics_carrier_id_date_hour_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_metrics
    ADD CONSTRAINT carrier_metrics_carrier_id_date_hour_key UNIQUE (carrier_id, date, hour);


--
-- Name: carrier_metrics carrier_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_metrics
    ADD CONSTRAINT carrier_metrics_pkey PRIMARY KEY (id);


--
-- Name: carrier_routes carrier_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_routes
    ADD CONSTRAINT carrier_routes_pkey PRIMARY KEY (id);


--
-- Name: conference_participants conference_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conference_participants
    ADD CONSTRAINT conference_participants_pkey PRIMARY KEY (id);


--
-- Name: conference_rooms conference_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conference_rooms
    ADD CONSTRAINT conference_rooms_pkey PRIMARY KEY (id);


--
-- Name: conference_rooms conference_rooms_room_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conference_rooms
    ADD CONSTRAINT conference_rooms_room_code_key UNIQUE (room_code);


--
-- Name: cps_history cps_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cps_history
    ADD CONSTRAINT cps_history_pkey PRIMARY KEY (id);


--
-- Name: dial_metrics dial_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dial_metrics
    ADD CONSTRAINT dial_metrics_pkey PRIMARY KEY (id);


--
-- Name: dispositions dispositions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositions
    ADD CONSTRAINT dispositions_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: lists lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: originate_jobs originate_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.originate_jobs
    ADD CONSTRAINT originate_jobs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: qa_reviews qa_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_reviews
    ADD CONSTRAINT qa_reviews_pkey PRIMARY KEY (id);


--
-- Name: qa_scorecards qa_scorecards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_scorecards
    ADD CONSTRAINT qa_scorecards_pkey PRIMARY KEY (id);


--
-- Name: quality_alerts quality_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_alerts
    ADD CONSTRAINT quality_alerts_pkey PRIMARY KEY (id);


--
-- Name: queue_agents queue_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_agents
    ADD CONSTRAINT queue_agents_pkey PRIMARY KEY (id);


--
-- Name: queue_agents queue_agents_queue_id_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_agents
    ADD CONSTRAINT queue_agents_queue_id_agent_id_key UNIQUE (queue_id, agent_id);


--
-- Name: queues queues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_buckets rate_limit_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_buckets
    ADD CONSTRAINT rate_limit_buckets_pkey PRIMARY KEY (id);


--
-- Name: recordings recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordings
    ADD CONSTRAINT recordings_pkey PRIMARY KEY (id);


--
-- Name: route_health route_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_health
    ADD CONSTRAINT route_health_pkey PRIMARY KEY (id);


--
-- Name: scripts scripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_pkey PRIMARY KEY (id);


--
-- Name: sensitive_action_logs sensitive_action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensitive_action_logs
    ADD CONSTRAINT sensitive_action_logs_pkey PRIMARY KEY (id);


--
-- Name: sip_webrtc_logs sip_webrtc_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sip_webrtc_logs
    ADD CONSTRAINT sip_webrtc_logs_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: telephony_carriers telephony_carriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telephony_carriers
    ADD CONSTRAINT telephony_carriers_pkey PRIMARY KEY (id);


--
-- Name: trunk_config trunk_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trunk_config
    ADD CONSTRAINT trunk_config_pkey PRIMARY KEY (id);


--
-- Name: trunk_limits trunk_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trunk_limits
    ADD CONSTRAINT trunk_limits_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_buckets unique_carrier_bucket; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_buckets
    ADD CONSTRAINT unique_carrier_bucket UNIQUE (carrier_id);


--
-- Name: route_health unique_carrier_health; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_health
    ADD CONSTRAINT unique_carrier_health UNIQUE (carrier_id);


--
-- Name: rate_limit_buckets unique_trunk_bucket; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_buckets
    ADD CONSTRAINT unique_trunk_bucket UNIQUE (trunk_id);


--
-- Name: route_health unique_trunk_health; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_health
    ADD CONSTRAINT unique_trunk_health UNIQUE (trunk_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: webrtc_sessions webrtc_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webrtc_sessions
    ADD CONSTRAINT webrtc_sessions_pkey PRIMARY KEY (id);


--
-- Name: webrtc_sessions webrtc_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webrtc_sessions
    ADD CONSTRAINT webrtc_sessions_session_id_key UNIQUE (session_id);


--
-- Name: idx_account_integrations_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_integrations_account ON public.account_integrations USING btree (account_id);


--
-- Name: idx_account_integrations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_integrations_active ON public.account_integrations USING btree (account_id, is_active) WHERE (is_active = true);


--
-- Name: idx_account_integrations_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_integrations_provider ON public.account_integrations USING btree (provider);


--
-- Name: idx_agents_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_account ON public.agents USING btree (account_id);


--
-- Name: idx_agents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_status ON public.agents USING btree (status);


--
-- Name: idx_ai_agent_calls_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_agent_calls_agent ON public.ai_agent_calls USING btree (agent_id);


--
-- Name: idx_ai_agent_calls_call; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_agent_calls_call ON public.ai_agent_calls USING btree (call_id);


--
-- Name: idx_ai_prompt_versions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompt_versions_active ON public.ai_prompt_versions USING btree (agent_id, is_active) WHERE (is_active = true);


--
-- Name: idx_ai_prompt_versions_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompt_versions_agent ON public.ai_prompt_versions USING btree (agent_id);


--
-- Name: idx_ai_training_examples_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_training_examples_account ON public.ai_training_examples USING btree (account_id);


--
-- Name: idx_ai_training_examples_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_training_examples_agent ON public.ai_training_examples USING btree (agent_id);


--
-- Name: idx_ai_training_examples_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_training_examples_category ON public.ai_training_examples USING btree (category);


--
-- Name: idx_ai_voice_agents_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_voice_agents_account ON public.ai_voice_agents USING btree (account_id);


--
-- Name: idx_ai_voice_agents_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_voice_agents_active ON public.ai_voice_agents USING btree (is_active);


--
-- Name: idx_amd_results_call; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amd_results_call ON public.amd_results USING btree (call_id);


--
-- Name: idx_amd_results_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amd_results_campaign ON public.amd_results USING btree (campaign_id);


--
-- Name: idx_amd_statistics_campaign_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amd_statistics_campaign_date ON public.amd_statistics USING btree (campaign_id, date);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_call_attempt_events_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_attempt_events_attempt ON public.call_attempt_events USING btree (attempt_id);


--
-- Name: idx_call_attempt_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_attempt_events_type ON public.call_attempt_events USING btree (event_type);


--
-- Name: idx_call_attempts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_attempts_active ON public.call_attempts USING btree (state) WHERE (state <> ALL (ARRAY['ENDED'::text, 'FAILED'::text, 'NO_RTP'::text, 'ABANDONED'::text, 'TIMEOUT'::text, 'CANCELLED'::text]));


--
-- Name: idx_call_attempts_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_attempts_campaign ON public.call_attempts USING btree (campaign_id, state);


--
-- Name: idx_call_attempts_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_attempts_correlation ON public.call_attempts USING btree (correlation_id);


--
-- Name: idx_call_attempts_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_attempts_lead ON public.call_attempts USING btree (lead_id);


--
-- Name: idx_call_attempts_queued; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_attempts_queued ON public.call_attempts USING btree (queued_at) WHERE (state = 'QUEUED'::text);


--
-- Name: idx_call_attempts_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_attempts_state ON public.call_attempts USING btree (state);


--
-- Name: idx_call_bridges_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_bridges_account ON public.call_bridges USING btree (account_id);


--
-- Name: idx_call_quality_metrics_call; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_quality_metrics_call ON public.call_quality_metrics USING btree (call_id);


--
-- Name: idx_call_quality_metrics_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_quality_metrics_carrier ON public.call_quality_metrics USING btree (carrier_id);


--
-- Name: idx_call_quality_metrics_measured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_quality_metrics_measured ON public.call_quality_metrics USING btree (measured_at);


--
-- Name: idx_call_state_transitions_call_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_state_transitions_call_id ON public.call_state_transitions USING btree (call_id);


--
-- Name: idx_call_state_transitions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_state_transitions_created_at ON public.call_state_transitions USING btree (created_at DESC);


--
-- Name: idx_call_state_transitions_to_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_state_transitions_to_state ON public.call_state_transitions USING btree (to_state);


--
-- Name: idx_callbacks_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_callbacks_scheduled ON public.callbacks USING btree (scheduled_at) WHERE (status = 'scheduled'::text);


--
-- Name: idx_caller_id_health_number_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_caller_id_health_number_date ON public.caller_id_health USING btree (caller_id_number_id, date);


--
-- Name: idx_caller_id_health_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_caller_id_health_score ON public.caller_id_health USING btree (health_score DESC);


--
-- Name: idx_caller_id_numbers_last_used; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_caller_id_numbers_last_used ON public.caller_id_numbers USING btree (last_used_at);


--
-- Name: idx_caller_id_numbers_pool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_caller_id_numbers_pool ON public.caller_id_numbers USING btree (pool_id, is_active);


--
-- Name: idx_caller_id_rules_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_caller_id_rules_account ON public.caller_id_rules USING btree (account_id, is_active);


--
-- Name: idx_caller_id_usage_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_caller_id_usage_number ON public.caller_id_usage USING btree (caller_id_number_id, used_at DESC);


--
-- Name: idx_calls_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calls_agent ON public.calls USING btree (agent_id);


--
-- Name: idx_calls_ai_analyzed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calls_ai_analyzed ON public.calls USING btree (ai_analyzed_at) WHERE (ai_analyzed_at IS NOT NULL);


--
-- Name: idx_calls_amd_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calls_amd_result ON public.calls USING btree (amd_result) WHERE (amd_result IS NOT NULL);


--
-- Name: idx_calls_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calls_campaign ON public.calls USING btree (campaign_id);


--
-- Name: idx_calls_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calls_started ON public.calls USING btree (started_at);


--
-- Name: idx_calls_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calls_status ON public.calls USING btree (status);


--
-- Name: idx_campaign_metrics_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_metrics_campaign ON public.campaign_metrics_window USING btree (campaign_id, window_start);


--
-- Name: idx_carrier_decisions_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carrier_decisions_carrier ON public.carrier_decisions USING btree (carrier_id);


--
-- Name: idx_carrier_decisions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carrier_decisions_created ON public.carrier_decisions USING btree (created_at);


--
-- Name: idx_carrier_metrics_carrier_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carrier_metrics_carrier_date ON public.carrier_metrics USING btree (carrier_id, date);


--
-- Name: idx_carrier_routes_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carrier_routes_carrier ON public.carrier_routes USING btree (carrier_id);


--
-- Name: idx_conference_participants_conference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conference_participants_conference ON public.conference_participants USING btree (conference_id);


--
-- Name: idx_conference_rooms_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conference_rooms_account ON public.conference_rooms USING btree (account_id);


--
-- Name: idx_conference_rooms_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conference_rooms_code ON public.conference_rooms USING btree (room_code);


--
-- Name: idx_cps_history_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cps_history_timestamp ON public.cps_history USING btree ("timestamp");


--
-- Name: idx_cps_history_trunk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cps_history_trunk ON public.cps_history USING btree (trunk_id);


--
-- Name: idx_dial_metrics_campaign_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dial_metrics_campaign_timestamp ON public.dial_metrics USING btree (campaign_id, "timestamp" DESC);


--
-- Name: idx_dial_metrics_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dial_metrics_timestamp ON public.dial_metrics USING btree ("timestamp" DESC);


--
-- Name: idx_leads_list; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_list ON public.leads USING btree (list_id);


--
-- Name: idx_leads_next_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_next_attempt ON public.leads USING btree (next_attempt_at) WHERE (next_attempt_at IS NOT NULL);


--
-- Name: idx_leads_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_phone ON public.leads USING btree (normalized_phone);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_notifications_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_account ON public.notifications USING btree (account_id);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_originate_jobs_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_originate_jobs_pending ON public.originate_jobs USING btree (priority DESC, created_at) WHERE (status = 'PENDING'::text);


--
-- Name: idx_quality_alerts_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_alerts_account ON public.quality_alerts USING btree (account_id);


--
-- Name: idx_quality_alerts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_alerts_created ON public.quality_alerts USING btree (created_at);


--
-- Name: idx_quality_alerts_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_alerts_severity ON public.quality_alerts USING btree (severity);


--
-- Name: idx_quality_alerts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_alerts_type ON public.quality_alerts USING btree (alert_type);


--
-- Name: idx_rate_limit_buckets_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limit_buckets_carrier ON public.rate_limit_buckets USING btree (carrier_id);


--
-- Name: idx_rate_limit_buckets_trunk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limit_buckets_trunk ON public.rate_limit_buckets USING btree (trunk_id);


--
-- Name: idx_route_health_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_health_carrier ON public.route_health USING btree (carrier_id);


--
-- Name: idx_route_health_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_health_score ON public.route_health USING btree (health_score DESC);


--
-- Name: idx_route_health_trunk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_health_trunk ON public.route_health USING btree (trunk_id);


--
-- Name: idx_sensitive_logs_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sensitive_logs_account ON public.sensitive_action_logs USING btree (account_id);


--
-- Name: idx_sensitive_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sensitive_logs_action ON public.sensitive_action_logs USING btree (action);


--
-- Name: idx_sensitive_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sensitive_logs_created ON public.sensitive_action_logs USING btree (created_at DESC);


--
-- Name: idx_sensitive_logs_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sensitive_logs_resource ON public.sensitive_action_logs USING btree (resource_type, resource_id);


--
-- Name: idx_sensitive_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sensitive_logs_user ON public.sensitive_action_logs USING btree (user_id);


--
-- Name: idx_sip_logs_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sip_logs_account ON public.sip_webrtc_logs USING btree (account_id);


--
-- Name: idx_sip_logs_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sip_logs_carrier ON public.sip_webrtc_logs USING btree (carrier_id);


--
-- Name: idx_sip_logs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sip_logs_category ON public.sip_webrtc_logs USING btree (category);


--
-- Name: idx_sip_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sip_logs_created ON public.sip_webrtc_logs USING btree (created_at DESC);


--
-- Name: idx_sip_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sip_logs_level ON public.sip_webrtc_logs USING btree (log_level);


--
-- Name: idx_sip_logs_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sip_logs_session ON public.sip_webrtc_logs USING btree (session_id);


--
-- Name: idx_sip_logs_sip_call_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sip_logs_sip_call_id ON public.sip_webrtc_logs USING btree (sip_call_id);


--
-- Name: idx_timers_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timers_attempt ON public.call_attempt_timers USING btree (attempt_id);


--
-- Name: idx_timers_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timers_pending ON public.call_attempt_timers USING btree (fires_at) WHERE ((fired = false) AND (cancelled = false));


--
-- Name: idx_trunk_config_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trunk_config_carrier ON public.trunk_config USING btree (carrier_id);


--
-- Name: idx_trunk_limits_trunk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trunk_limits_trunk ON public.trunk_limits USING btree (trunk_id);


--
-- Name: idx_trunk_limits_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trunk_limits_type ON public.trunk_limits USING btree (limit_type);


--
-- Name: idx_webrtc_sessions_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webrtc_sessions_agent ON public.webrtc_sessions USING btree (agent_id);


--
-- Name: idx_webrtc_sessions_call; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webrtc_sessions_call ON public.webrtc_sessions USING btree (call_id);


--
-- Name: call_attempts call_attempts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER call_attempts_updated_at BEFORE UPDATE ON public.call_attempts FOR EACH ROW EXECUTE FUNCTION public.update_call_attempt_timestamp();


--
-- Name: profiles on_profile_created_set_account; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_set_account BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_account();


--
-- Name: profiles on_profile_updated_set_account; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_updated_set_account BEFORE UPDATE ON public.profiles FOR EACH ROW WHEN (((old.account_id IS NULL) AND (new.account_id IS NULL))) EXECUTE FUNCTION public.handle_new_user_account();


--
-- Name: call_state_transitions trigger_update_route_health; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_route_health AFTER INSERT ON public.call_state_transitions FOR EACH ROW EXECUTE FUNCTION public.update_route_health_on_transition();


--
-- Name: account_integrations update_account_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_account_integrations_updated_at BEFORE UPDATE ON public.account_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounts update_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agents update_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_prompt_templates update_ai_prompt_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_prompt_templates_updated_at BEFORE UPDATE ON public.ai_prompt_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_training_examples update_ai_training_examples_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_training_examples_updated_at BEFORE UPDATE ON public.ai_training_examples FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_voice_agents update_ai_voice_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_voice_agents_updated_at BEFORE UPDATE ON public.ai_voice_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: caller_id_numbers update_caller_id_numbers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_caller_id_numbers_updated_at BEFORE UPDATE ON public.caller_id_numbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: caller_id_pools update_caller_id_pools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_caller_id_pools_updated_at BEFORE UPDATE ON public.caller_id_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: campaigns update_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lists update_lists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scripts update_scripts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telephony_carriers update_telephony_carriers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telephony_carriers_updated_at BEFORE UPDATE ON public.telephony_carriers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trunk_config update_trunk_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trunk_config_updated_at BEFORE UPDATE ON public.trunk_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account_integrations account_integrations_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_integrations
    ADD CONSTRAINT account_integrations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: agent_skills agent_skills_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_skills
    ADD CONSTRAINT agent_skills_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_skills agent_skills_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_skills
    ADD CONSTRAINT agent_skills_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.queues(id) ON DELETE CASCADE;


--
-- Name: agent_stats agent_stats_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_stats
    ADD CONSTRAINT agent_stats_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents agents_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: agents agents_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: agents agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_agent_calls ai_agent_calls_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_calls
    ADD CONSTRAINT ai_agent_calls_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: ai_agent_calls ai_agent_calls_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_calls
    ADD CONSTRAINT ai_agent_calls_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_voice_agents(id);


--
-- Name: ai_agent_calls ai_agent_calls_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_calls
    ADD CONSTRAINT ai_agent_calls_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id);


--
-- Name: ai_handoffs ai_handoffs_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_handoffs
    ADD CONSTRAINT ai_handoffs_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;


--
-- Name: ai_prompt_templates ai_prompt_templates_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: ai_prompt_versions ai_prompt_versions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_versions
    ADD CONSTRAINT ai_prompt_versions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: ai_prompt_versions ai_prompt_versions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_versions
    ADD CONSTRAINT ai_prompt_versions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_voice_agents(id) ON DELETE CASCADE;


--
-- Name: ai_training_examples ai_training_examples_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_training_examples
    ADD CONSTRAINT ai_training_examples_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: ai_training_examples ai_training_examples_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_training_examples
    ADD CONSTRAINT ai_training_examples_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_voice_agents(id) ON DELETE SET NULL;


--
-- Name: ai_training_examples ai_training_examples_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_training_examples
    ADD CONSTRAINT ai_training_examples_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE SET NULL;


--
-- Name: ai_voice_agents ai_voice_agents_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_voice_agents
    ADD CONSTRAINT ai_voice_agents_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: amd_provider_configs amd_provider_configs_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amd_provider_configs
    ADD CONSTRAINT amd_provider_configs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: amd_results amd_results_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amd_results
    ADD CONSTRAINT amd_results_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;


--
-- Name: amd_results amd_results_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amd_results
    ADD CONSTRAINT amd_results_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: amd_statistics amd_statistics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amd_statistics
    ADD CONSTRAINT amd_statistics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: audit_logs audit_logs_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: call_attempt_events call_attempt_events_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempt_events
    ADD CONSTRAINT call_attempt_events_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.call_attempts(id) ON DELETE CASCADE;


--
-- Name: call_attempt_timers call_attempt_timers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempt_timers
    ADD CONSTRAINT call_attempt_timers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.call_attempts(id) ON DELETE CASCADE;


--
-- Name: call_attempts call_attempts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: call_attempts call_attempts_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: call_attempts call_attempts_caller_id_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_caller_id_id_fkey FOREIGN KEY (caller_id_id) REFERENCES public.caller_id_numbers(id);


--
-- Name: call_attempts call_attempts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: call_attempts call_attempts_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id);


--
-- Name: call_attempts call_attempts_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: call_attempts call_attempts_previous_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_previous_attempt_id_fkey FOREIGN KEY (previous_attempt_id) REFERENCES public.call_attempts(id);


--
-- Name: call_attempts call_attempts_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.carrier_routes(id);


--
-- Name: call_attempts call_attempts_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_attempts
    ADD CONSTRAINT call_attempts_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id);


--
-- Name: call_bridges call_bridges_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_bridges
    ADD CONSTRAINT call_bridges_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: call_bridges call_bridges_call_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_bridges
    ADD CONSTRAINT call_bridges_call_a_id_fkey FOREIGN KEY (call_a_id) REFERENCES public.calls(id);


--
-- Name: call_bridges call_bridges_call_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_bridges
    ADD CONSTRAINT call_bridges_call_b_id_fkey FOREIGN KEY (call_b_id) REFERENCES public.calls(id);


--
-- Name: call_bridges call_bridges_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_bridges
    ADD CONSTRAINT call_bridges_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES auth.users(id);


--
-- Name: call_dispositions call_dispositions_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_dispositions
    ADD CONSTRAINT call_dispositions_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;


--
-- Name: call_dispositions call_dispositions_disposition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_dispositions
    ADD CONSTRAINT call_dispositions_disposition_id_fkey FOREIGN KEY (disposition_id) REFERENCES public.dispositions(id) ON DELETE SET NULL;


--
-- Name: call_events call_events_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_events
    ADD CONSTRAINT call_events_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;


--
-- Name: call_quality_metrics call_quality_metrics_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_quality_metrics
    ADD CONSTRAINT call_quality_metrics_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;


--
-- Name: call_quality_metrics call_quality_metrics_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_quality_metrics
    ADD CONSTRAINT call_quality_metrics_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id);


--
-- Name: call_quality_metrics call_quality_metrics_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_quality_metrics
    ADD CONSTRAINT call_quality_metrics_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id);


--
-- Name: call_state_transitions call_state_transitions_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_state_transitions
    ADD CONSTRAINT call_state_transitions_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;


--
-- Name: callbacks callbacks_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacks
    ADD CONSTRAINT callbacks_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: callbacks callbacks_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacks
    ADD CONSTRAINT callbacks_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: callbacks callbacks_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacks
    ADD CONSTRAINT callbacks_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: callbacks callbacks_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callbacks
    ADD CONSTRAINT callbacks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: caller_id_health caller_id_health_caller_id_number_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_health
    ADD CONSTRAINT caller_id_health_caller_id_number_id_fkey FOREIGN KEY (caller_id_number_id) REFERENCES public.caller_id_numbers(id) ON DELETE CASCADE;


--
-- Name: caller_id_numbers caller_id_numbers_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_numbers
    ADD CONSTRAINT caller_id_numbers_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id);


--
-- Name: caller_id_numbers caller_id_numbers_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_numbers
    ADD CONSTRAINT caller_id_numbers_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.caller_id_pools(id) ON DELETE CASCADE;


--
-- Name: caller_id_pools caller_id_pools_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_pools
    ADD CONSTRAINT caller_id_pools_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: caller_id_rules caller_id_rules_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_rules
    ADD CONSTRAINT caller_id_rules_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: caller_id_rules caller_id_rules_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_rules
    ADD CONSTRAINT caller_id_rules_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: caller_id_rules caller_id_rules_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_rules
    ADD CONSTRAINT caller_id_rules_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.caller_id_pools(id) ON DELETE CASCADE;


--
-- Name: caller_id_usage caller_id_usage_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_usage
    ADD CONSTRAINT caller_id_usage_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id);


--
-- Name: caller_id_usage caller_id_usage_caller_id_number_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_usage
    ADD CONSTRAINT caller_id_usage_caller_id_number_id_fkey FOREIGN KEY (caller_id_number_id) REFERENCES public.caller_id_numbers(id) ON DELETE CASCADE;


--
-- Name: caller_id_usage caller_id_usage_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caller_id_usage
    ADD CONSTRAINT caller_id_usage_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: calls calls_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: calls calls_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: calls calls_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: calls calls_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id);


--
-- Name: calls calls_disposition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_disposition_id_fkey FOREIGN KEY (disposition_id) REFERENCES public.dispositions(id) ON DELETE SET NULL;


--
-- Name: calls calls_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: calls calls_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.queues(id) ON DELETE SET NULL;


--
-- Name: calls calls_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id);


--
-- Name: campaign_amd_settings campaign_amd_settings_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_amd_settings
    ADD CONSTRAINT campaign_amd_settings_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_lists campaign_lists_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_lists
    ADD CONSTRAINT campaign_lists_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_lists campaign_lists_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_lists
    ADD CONSTRAINT campaign_lists_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;


--
-- Name: campaign_metrics_window campaign_metrics_window_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_metrics_window
    ADD CONSTRAINT campaign_metrics_window_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: campaigns campaigns_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.queues(id) ON DELETE SET NULL;


--
-- Name: campaigns campaigns_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE SET NULL;


--
-- Name: carrier_decisions carrier_decisions_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_decisions
    ADD CONSTRAINT carrier_decisions_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE SET NULL;


--
-- Name: carrier_decisions carrier_decisions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_decisions
    ADD CONSTRAINT carrier_decisions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: carrier_decisions carrier_decisions_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_decisions
    ADD CONSTRAINT carrier_decisions_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id) ON DELETE CASCADE;


--
-- Name: carrier_metrics carrier_metrics_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_metrics
    ADD CONSTRAINT carrier_metrics_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id) ON DELETE CASCADE;


--
-- Name: carrier_routes carrier_routes_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_routes
    ADD CONSTRAINT carrier_routes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: carrier_routes carrier_routes_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrier_routes
    ADD CONSTRAINT carrier_routes_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id) ON DELETE CASCADE;


--
-- Name: conference_participants conference_participants_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conference_participants
    ADD CONSTRAINT conference_participants_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: conference_participants conference_participants_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conference_participants
    ADD CONSTRAINT conference_participants_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id);


--
-- Name: conference_participants conference_participants_conference_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conference_participants
    ADD CONSTRAINT conference_participants_conference_id_fkey FOREIGN KEY (conference_id) REFERENCES public.conference_rooms(id) ON DELETE CASCADE;


--
-- Name: conference_rooms conference_rooms_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conference_rooms
    ADD CONSTRAINT conference_rooms_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: conference_rooms conference_rooms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conference_rooms
    ADD CONSTRAINT conference_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: cps_history cps_history_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cps_history
    ADD CONSTRAINT cps_history_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id) ON DELETE CASCADE;


--
-- Name: dial_metrics dial_metrics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dial_metrics
    ADD CONSTRAINT dial_metrics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: dispositions dispositions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositions
    ADD CONSTRAINT dispositions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: leads leads_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: leads leads_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE SET NULL;


--
-- Name: lists lists_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: originate_jobs originate_jobs_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.originate_jobs
    ADD CONSTRAINT originate_jobs_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.call_attempts(id);


--
-- Name: originate_jobs originate_jobs_caller_id_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.originate_jobs
    ADD CONSTRAINT originate_jobs_caller_id_id_fkey FOREIGN KEY (caller_id_id) REFERENCES public.caller_id_numbers(id);


--
-- Name: originate_jobs originate_jobs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.originate_jobs
    ADD CONSTRAINT originate_jobs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: originate_jobs originate_jobs_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.originate_jobs
    ADD CONSTRAINT originate_jobs_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.carrier_routes(id);


--
-- Name: originate_jobs originate_jobs_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.originate_jobs
    ADD CONSTRAINT originate_jobs_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id);


--
-- Name: profiles profiles_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: qa_reviews qa_reviews_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_reviews
    ADD CONSTRAINT qa_reviews_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: qa_reviews qa_reviews_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_reviews
    ADD CONSTRAINT qa_reviews_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;


--
-- Name: qa_reviews qa_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_reviews
    ADD CONSTRAINT qa_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: qa_reviews qa_reviews_scorecard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_reviews
    ADD CONSTRAINT qa_reviews_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.qa_scorecards(id) ON DELETE SET NULL;


--
-- Name: qa_scorecards qa_scorecards_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_scorecards
    ADD CONSTRAINT qa_scorecards_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: qa_scorecards qa_scorecards_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_scorecards
    ADD CONSTRAINT qa_scorecards_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: quality_alerts quality_alerts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_alerts
    ADD CONSTRAINT quality_alerts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: quality_alerts quality_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_alerts
    ADD CONSTRAINT quality_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id);


--
-- Name: quality_alerts quality_alerts_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_alerts
    ADD CONSTRAINT quality_alerts_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id);


--
-- Name: quality_alerts quality_alerts_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_alerts
    ADD CONSTRAINT quality_alerts_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id);


--
-- Name: quality_alerts quality_alerts_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_alerts
    ADD CONSTRAINT quality_alerts_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id);


--
-- Name: queue_agents queue_agents_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_agents
    ADD CONSTRAINT queue_agents_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: queue_agents queue_agents_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_agents
    ADD CONSTRAINT queue_agents_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.queues(id) ON DELETE CASCADE;


--
-- Name: queues queues_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: rate_limit_buckets rate_limit_buckets_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_buckets
    ADD CONSTRAINT rate_limit_buckets_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id) ON DELETE CASCADE;


--
-- Name: rate_limit_buckets rate_limit_buckets_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_buckets
    ADD CONSTRAINT rate_limit_buckets_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id) ON DELETE CASCADE;


--
-- Name: recordings recordings_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordings
    ADD CONSTRAINT recordings_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;


--
-- Name: route_health route_health_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_health
    ADD CONSTRAINT route_health_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id) ON DELETE CASCADE;


--
-- Name: route_health route_health_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_health
    ADD CONSTRAINT route_health_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id) ON DELETE CASCADE;


--
-- Name: scripts scripts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: sip_webrtc_logs sip_webrtc_logs_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sip_webrtc_logs
    ADD CONSTRAINT sip_webrtc_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: sip_webrtc_logs sip_webrtc_logs_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sip_webrtc_logs
    ADD CONSTRAINT sip_webrtc_logs_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id);


--
-- Name: sip_webrtc_logs sip_webrtc_logs_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sip_webrtc_logs
    ADD CONSTRAINT sip_webrtc_logs_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id);


--
-- Name: sip_webrtc_logs sip_webrtc_logs_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sip_webrtc_logs
    ADD CONSTRAINT sip_webrtc_logs_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id);


--
-- Name: teams teams_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: telephony_carriers telephony_carriers_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telephony_carriers
    ADD CONSTRAINT telephony_carriers_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: trunk_config trunk_config_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trunk_config
    ADD CONSTRAINT trunk_config_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.telephony_carriers(id) ON DELETE CASCADE;


--
-- Name: trunk_limits trunk_limits_trunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trunk_limits
    ADD CONSTRAINT trunk_limits_trunk_id_fkey FOREIGN KEY (trunk_id) REFERENCES public.trunk_config(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webhook_deliveries webhook_deliveries_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE CASCADE;


--
-- Name: webhooks webhooks_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: webrtc_sessions webrtc_sessions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webrtc_sessions
    ADD CONSTRAINT webrtc_sessions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: webrtc_sessions webrtc_sessions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webrtc_sessions
    ADD CONSTRAINT webrtc_sessions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: webrtc_sessions webrtc_sessions_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webrtc_sessions
    ADD CONSTRAINT webrtc_sessions_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id);


--
-- Name: amd_provider_configs Admins can manage AMD configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage AMD configs" ON public.amd_provider_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agents Admins can manage agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage agents" ON public.agents USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: ai_voice_agents Admins can manage agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage agents" ON public.ai_voice_agents USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: campaign_amd_settings Admins can manage amd_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage amd_settings" ON public.campaign_amd_settings USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: campaign_lists Admins can manage campaign_lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage campaign_lists" ON public.campaign_lists USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: campaigns Admins can manage campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage campaigns" ON public.campaigns USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: telephony_carriers Admins can manage carriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage carriers" ON public.telephony_carriers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: conference_rooms Admins can manage conferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage conferences" ON public.conference_rooms USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: dispositions Admins can manage dispositions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage dispositions" ON public.dispositions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: account_integrations Admins can manage integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage integrations" ON public.account_integrations USING (((account_id = public.get_user_account_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: leads Admins can manage leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage leads" ON public.leads USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: lists Admins can manage lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage lists" ON public.lists USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: caller_id_numbers Admins can manage numbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage numbers" ON public.caller_id_numbers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: caller_id_pools Admins can manage pools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pools" ON public.caller_id_pools USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_prompt_versions Admins can manage prompt versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage prompt versions" ON public.ai_prompt_versions USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: queue_agents Admins can manage queue assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage queue assignments" ON public.queue_agents USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: queues Admins can manage queues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage queues" ON public.queues USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: carrier_routes Admins can manage routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage routes" ON public.carrier_routes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: caller_id_rules Admins can manage rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage rules" ON public.caller_id_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: scripts Admins can manage scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage scripts" ON public.scripts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_skills Admins can manage skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage skills" ON public.agent_skills USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: teams Admins can manage teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage teams" ON public.teams USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: ai_prompt_templates Admins can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage templates" ON public.ai_prompt_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_training_examples Admins can manage training examples; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage training examples" ON public.ai_training_examples USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: trunk_config Admins can manage trunk_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage trunk_config" ON public.trunk_config USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: trunk_limits Admins can manage trunk_limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage trunk_limits" ON public.trunk_limits USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: webhooks Admins can manage webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage webhooks" ON public.webhooks USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sensitive_action_logs Admins can view all logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all logs" ON public.sensitive_action_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admins can view audit_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit_logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: webhook_deliveries Admins can view webhook_deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view webhook_deliveries" ON public.webhook_deliveries FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agents Agents can update own status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can update own status" ON public.agents FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: qa_scorecards QA and admins can manage scorecards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QA and admins can manage scorecards" ON public.qa_scorecards USING ((public.has_role(auth.uid(), 'qa'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: recordings QA and supervisors can access all recordings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QA and supervisors can access all recordings" ON public.recordings FOR SELECT USING ((public.has_role(auth.uid(), 'qa'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: qa_reviews QA can manage reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QA can manage reviews" ON public.qa_reviews USING ((public.has_role(auth.uid(), 'qa'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: amd_results System can insert AMD results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert AMD results" ON public.amd_results FOR INSERT WITH CHECK (true);


--
-- Name: ai_agent_calls System can insert agent calls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert agent calls" ON public.ai_agent_calls FOR INSERT WITH CHECK (true);


--
-- Name: call_attempts System can insert attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert attempts" ON public.call_attempts FOR INSERT WITH CHECK (true);


--
-- Name: audit_logs System can insert audit_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: cps_history System can insert cps_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert cps_history" ON public.cps_history FOR INSERT WITH CHECK (true);


--
-- Name: carrier_decisions System can insert decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert decisions" ON public.carrier_decisions FOR INSERT WITH CHECK (true);


--
-- Name: dial_metrics System can insert dial_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert dial_metrics" ON public.dial_metrics FOR INSERT WITH CHECK (true);


--
-- Name: call_attempt_events System can insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert events" ON public.call_attempt_events FOR INSERT WITH CHECK (true);


--
-- Name: sensitive_action_logs System can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert logs" ON public.sensitive_action_logs FOR INSERT WITH CHECK (true);


--
-- Name: sip_webrtc_logs System can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert logs" ON public.sip_webrtc_logs FOR INSERT WITH CHECK (true);


--
-- Name: carrier_metrics System can insert metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert metrics" ON public.carrier_metrics FOR INSERT WITH CHECK (true);


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: quality_alerts System can insert quality alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert quality alerts" ON public.quality_alerts FOR INSERT WITH CHECK (true);


--
-- Name: call_quality_metrics System can insert quality metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert quality metrics" ON public.call_quality_metrics FOR INSERT WITH CHECK (true);


--
-- Name: call_state_transitions System can insert transitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert transitions" ON public.call_state_transitions FOR INSERT WITH CHECK (true);


--
-- Name: caller_id_usage System can insert usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert usage" ON public.caller_id_usage FOR INSERT WITH CHECK (true);


--
-- Name: amd_statistics System can manage AMD stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage AMD stats" ON public.amd_statistics USING (true);


--
-- Name: rate_limit_buckets System can manage buckets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage buckets" ON public.rate_limit_buckets USING (true);


--
-- Name: caller_id_health System can manage health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage health" ON public.caller_id_health USING (true);


--
-- Name: originate_jobs System can manage jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage jobs" ON public.originate_jobs USING (true);


--
-- Name: campaign_metrics_window System can manage metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage metrics" ON public.campaign_metrics_window USING (true);


--
-- Name: conference_participants System can manage participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage participants" ON public.conference_participants USING (true);


--
-- Name: route_health System can manage route health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage route health" ON public.route_health USING (true);


--
-- Name: webrtc_sessions System can manage sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage sessions" ON public.webrtc_sessions USING (true);


--
-- Name: call_attempt_timers System can manage timers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage timers" ON public.call_attempt_timers USING (true);


--
-- Name: ai_agent_calls System can update agent calls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update agent calls" ON public.ai_agent_calls FOR UPDATE USING (true);


--
-- Name: call_attempts System can update attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update attempts" ON public.call_attempts FOR UPDATE USING (true);


--
-- Name: carrier_decisions System can update decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update decisions" ON public.carrier_decisions FOR UPDATE USING (true);


--
-- Name: carrier_metrics System can update metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update metrics" ON public.carrier_metrics FOR UPDATE USING (true);


--
-- Name: call_quality_metrics System can update quality metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update quality metrics" ON public.call_quality_metrics FOR UPDATE USING (true);


--
-- Name: call_bridges Users can create bridges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create bridges" ON public.call_bridges FOR INSERT WITH CHECK ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: ai_handoffs Users can insert ai_handoffs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert ai_handoffs" ON public.ai_handoffs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = ai_handoffs.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: call_dispositions Users can insert call_dispositions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert call_dispositions" ON public.call_dispositions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = call_dispositions.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: call_events Users can insert call_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert call_events" ON public.call_events FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = call_events.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: calls Users can insert calls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert calls" ON public.calls FOR INSERT WITH CHECK ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: callbacks Users can manage callbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage callbacks" ON public.callbacks USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: call_bridges Users can update bridges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update bridges" ON public.call_bridges FOR UPDATE USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: calls Users can update calls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update calls" ON public.calls FOR UPDATE USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: leads Users can update leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update leads" ON public.leads FOR UPDATE USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: quality_alerts Users can update quality alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update quality alerts" ON public.quality_alerts FOR UPDATE USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: notifications Users can update their notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: amd_provider_configs Users can view AMD configs in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view AMD configs in their account" ON public.amd_provider_configs FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: amd_results Users can view AMD results for their calls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view AMD results for their calls" ON public.amd_results FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = amd_results.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: amd_statistics Users can view AMD stats for their campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view AMD stats for their campaigns" ON public.amd_statistics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.campaigns
  WHERE ((campaigns.id = amd_statistics.campaign_id) AND (campaigns.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: ai_agent_calls Users can view agent calls in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view agent calls in their account" ON public.ai_agent_calls FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: agents Users can view agents in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view agents in their account" ON public.agents FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: ai_voice_agents Users can view agents in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view agents in their account" ON public.ai_voice_agents FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: ai_handoffs Users can view ai_handoffs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view ai_handoffs" ON public.ai_handoffs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = ai_handoffs.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: campaign_amd_settings Users can view amd_settings for their campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view amd_settings for their campaigns" ON public.campaign_amd_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.campaigns
  WHERE ((campaigns.id = campaign_amd_settings.campaign_id) AND (campaigns.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: call_attempts Users can view attempts in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view attempts in their account" ON public.call_attempts FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: call_bridges Users can view bridges in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bridges in their account" ON public.call_bridges FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: call_dispositions Users can view call_dispositions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view call_dispositions" ON public.call_dispositions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = call_dispositions.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: call_events Users can view call_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view call_events" ON public.call_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = call_events.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: callbacks Users can view callbacks in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view callbacks in their account" ON public.callbacks FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: calls Users can view calls in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view calls in their account" ON public.calls FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: campaign_lists Users can view campaign_lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view campaign_lists" ON public.campaign_lists FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.campaigns
  WHERE ((campaigns.id = campaign_lists.campaign_id) AND (campaigns.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: campaigns Users can view campaigns in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view campaigns in their account" ON public.campaigns FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: telephony_carriers Users can view carriers in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view carriers in their account" ON public.telephony_carriers FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: conference_rooms Users can view conferences in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view conferences in their account" ON public.conference_rooms FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: cps_history Users can view cps_history for their trunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view cps_history for their trunks" ON public.cps_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.trunk_config tc
     JOIN public.telephony_carriers tc2 ON ((tc.carrier_id = tc2.id)))
  WHERE ((tc.id = cps_history.trunk_id) AND (tc2.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: carrier_decisions Users can view decisions for their carriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view decisions for their carriers" ON public.carrier_decisions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.telephony_carriers
  WHERE ((telephony_carriers.id = carrier_decisions.carrier_id) AND (telephony_carriers.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: dial_metrics Users can view dial_metrics for their campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view dial_metrics for their campaigns" ON public.dial_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.campaigns
  WHERE ((campaigns.id = dial_metrics.campaign_id) AND (campaigns.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: dispositions Users can view dispositions in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view dispositions in their account" ON public.dispositions FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: call_attempt_events Users can view events for their attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view events for their attempts" ON public.call_attempt_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.call_attempts ca
  WHERE ((ca.id = call_attempt_events.attempt_id) AND (ca.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: caller_id_health Users can view health for their numbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view health for their numbers" ON public.caller_id_health FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.caller_id_numbers cn
     JOIN public.caller_id_pools cp ON ((cn.pool_id = cp.id)))
  WHERE ((cn.id = caller_id_health.caller_id_number_id) AND (cp.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: account_integrations Users can view integrations in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view integrations in their account" ON public.account_integrations FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: leads Users can view leads in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view leads in their account" ON public.leads FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: lists Users can view lists in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view lists in their account" ON public.lists FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: sip_webrtc_logs Users can view logs in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view logs in their account" ON public.sip_webrtc_logs FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: campaign_metrics_window Users can view metrics for their campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view metrics for their campaigns" ON public.campaign_metrics_window FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.campaigns c
  WHERE ((c.id = campaign_metrics_window.campaign_id) AND (c.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: carrier_metrics Users can view metrics for their carriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view metrics for their carriers" ON public.carrier_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.telephony_carriers
  WHERE ((telephony_carriers.id = carrier_metrics.carrier_id) AND (telephony_carriers.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: notifications Users can view notifications in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view notifications in their account" ON public.notifications FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: caller_id_numbers Users can view numbers in their pools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view numbers in their pools" ON public.caller_id_numbers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.caller_id_pools
  WHERE ((caller_id_pools.id = caller_id_numbers.pool_id) AND (caller_id_pools.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: conference_participants Users can view participants in their conferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view participants in their conferences" ON public.conference_participants FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conference_rooms
  WHERE ((conference_rooms.id = conference_participants.conference_id) AND (conference_rooms.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: caller_id_pools Users can view pools in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view pools in their account" ON public.caller_id_pools FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: ai_prompt_versions Users can view prompt versions in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view prompt versions in their account" ON public.ai_prompt_versions FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: ai_prompt_templates Users can view public templates or their own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view public templates or their own" ON public.ai_prompt_templates FOR SELECT USING (((is_public = true) OR (account_id = public.get_user_account_id(auth.uid()))));


--
-- Name: qa_scorecards Users can view qa_scorecards in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view qa_scorecards in their account" ON public.qa_scorecards FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: quality_alerts Users can view quality alerts for their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view quality alerts for their account" ON public.quality_alerts FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: call_quality_metrics Users can view quality metrics for their calls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view quality metrics for their calls" ON public.call_quality_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = call_quality_metrics.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: queue_agents Users can view queue assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view queue assignments" ON public.queue_agents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.queues
  WHERE ((queues.id = queue_agents.queue_id) AND (queues.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: queues Users can view queues in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view queues in their account" ON public.queues FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: recordings Users can view recordings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view recordings" ON public.recordings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = recordings.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: route_health Users can view route health for their carriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view route health for their carriers" ON public.route_health FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.telephony_carriers
  WHERE ((telephony_carriers.id = route_health.carrier_id) AND (telephony_carriers.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: carrier_routes Users can view routes in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view routes in their account" ON public.carrier_routes FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: caller_id_rules Users can view rules in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view rules in their account" ON public.caller_id_rules FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: scripts Users can view scripts in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view scripts in their account" ON public.scripts FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: agent_skills Users can view skills in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view skills in their account" ON public.agent_skills FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = agent_skills.agent_id) AND (agents.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: teams Users can view teams in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view teams in their account" ON public.teams FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: accounts Users can view their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their account" ON public.accounts FOR SELECT USING ((id = public.get_user_account_id(auth.uid())));


--
-- Name: qa_reviews Users can view their qa_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their qa_reviews" ON public.qa_reviews FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = qa_reviews.agent_id) AND (agents.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'qa'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: webrtc_sessions Users can view their sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their sessions" ON public.webrtc_sessions FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: agent_stats Users can view their stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their stats" ON public.agent_stats FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = agent_stats.agent_id) AND (agents.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'supervisor'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: ai_training_examples Users can view training examples in their account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view training examples in their account" ON public.ai_training_examples FOR SELECT USING ((account_id = public.get_user_account_id(auth.uid())));


--
-- Name: call_state_transitions Users can view transitions for their calls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view transitions for their calls" ON public.call_state_transitions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.calls
  WHERE ((calls.id = call_state_transitions.call_id) AND (calls.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: trunk_config Users can view trunk_config for their carriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view trunk_config for their carriers" ON public.trunk_config FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.telephony_carriers
  WHERE ((telephony_carriers.id = trunk_config.carrier_id) AND (telephony_carriers.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: trunk_limits Users can view trunk_limits for their trunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view trunk_limits for their trunks" ON public.trunk_limits FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.trunk_config tc
     JOIN public.telephony_carriers tc2 ON ((tc.carrier_id = tc2.id)))
  WHERE ((tc.id = trunk_limits.trunk_id) AND (tc2.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: caller_id_usage Users can view usage for their numbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view usage for their numbers" ON public.caller_id_usage FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.caller_id_numbers cn
     JOIN public.caller_id_pools cp ON ((cn.pool_id = cp.id)))
  WHERE ((cn.id = caller_id_usage.caller_id_number_id) AND (cp.account_id = public.get_user_account_id(auth.uid()))))));


--
-- Name: account_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agent_calls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_agent_calls ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_handoffs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_handoffs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_prompt_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_prompt_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_training_examples; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_training_examples ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_voice_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_voice_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: amd_provider_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.amd_provider_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: amd_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.amd_results ENABLE ROW LEVEL SECURITY;

--
-- Name: amd_statistics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.amd_statistics ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: call_attempt_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_attempt_events ENABLE ROW LEVEL SECURITY;

--
-- Name: call_attempt_timers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_attempt_timers ENABLE ROW LEVEL SECURITY;

--
-- Name: call_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: call_bridges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_bridges ENABLE ROW LEVEL SECURITY;

--
-- Name: call_dispositions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_dispositions ENABLE ROW LEVEL SECURITY;

--
-- Name: call_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

--
-- Name: call_quality_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_quality_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: call_state_transitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_state_transitions ENABLE ROW LEVEL SECURITY;

--
-- Name: callbacks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;

--
-- Name: caller_id_health; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.caller_id_health ENABLE ROW LEVEL SECURITY;

--
-- Name: caller_id_numbers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.caller_id_numbers ENABLE ROW LEVEL SECURITY;

--
-- Name: caller_id_pools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.caller_id_pools ENABLE ROW LEVEL SECURITY;

--
-- Name: caller_id_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.caller_id_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: caller_id_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.caller_id_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: calls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_amd_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_amd_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_lists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_metrics_window; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_metrics_window ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: carrier_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carrier_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: carrier_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carrier_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: carrier_routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carrier_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: conference_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conference_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: conference_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conference_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: cps_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cps_history ENABLE ROW LEVEL SECURITY;

--
-- Name: dial_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dial_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: dispositions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dispositions ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: lists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: originate_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.originate_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_scorecards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_scorecards ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: queue_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.queue_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: queues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limit_buckets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: recordings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

--
-- Name: route_health; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.route_health ENABLE ROW LEVEL SECURITY;

--
-- Name: scripts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

--
-- Name: sensitive_action_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sensitive_action_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: sip_webrtc_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sip_webrtc_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: telephony_carriers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telephony_carriers ENABLE ROW LEVEL SECURITY;

--
-- Name: trunk_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trunk_config ENABLE ROW LEVEL SECURITY;

--
-- Name: trunk_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trunk_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: webrtc_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webrtc_sessions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;