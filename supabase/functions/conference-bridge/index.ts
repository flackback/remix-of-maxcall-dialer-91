import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConferenceRequest {
  action: 'create' | 'join' | 'leave' | 'mute' | 'unmute' | 'kick' | 'end' | 'bridge' | 'transfer';
  conferenceId?: string;
  roomCode?: string;
  participantId?: string;
  callId?: string;
  agentId?: string;
  displayName?: string;
  phoneNumber?: string;
  pin?: string;
  bridgeType?: 'transfer' | 'conference' | 'whisper' | 'barge';
  targetCallId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const request: ConferenceRequest = await req.json();
    console.log(`Conference bridge action: ${request.action}`, request);

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: Record<string, unknown> = {};

    switch (request.action) {
      case 'create': {
        const roomCode = generateRoomCode();
        const moderatorPin = generatePin();
        const participantPin = generatePin();

        const { data: conference, error } = await supabase
          .from('conference_rooms')
          .insert({
            account_id: profile.account_id,
            name: request.displayName || `Conference ${roomCode}`,
            room_code: roomCode,
            moderator_pin: moderatorPin,
            participant_pin: participantPin,
            is_active: true,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, conference, roomCode, moderatorPin, participantPin };
        break;
      }

      case 'join': {
        let query = supabase.from('conference_rooms').select('*');
        if (request.conferenceId) {
          query = query.eq('id', request.conferenceId);
        } else if (request.roomCode) {
          query = query.eq('room_code', request.roomCode);
        }
        const { data: conf } = await query.single();
        if (!conf) throw new Error('Conference not found');

        const { data: participant, error } = await supabase
          .from('conference_participants')
          .insert({
            conference_id: conf.id,
            call_id: request.callId,
            agent_id: request.agentId,
            participant_type: 'participant',
            phone_number: request.phoneNumber,
            display_name: request.displayName || 'Anonymous',
            status: 'active',
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, participant, conference: conf, isModerator: false };
        break;
      }

      case 'leave':
      case 'kick': {
        await supabase
          .from('conference_participants')
          .update({ status: 'left', left_at: new Date().toISOString() })
          .eq('id', request.participantId);
        result = { success: true };
        break;
      }

      case 'mute':
      case 'unmute': {
        await supabase
          .from('conference_participants')
          .update({ is_muted: request.action === 'mute' })
          .eq('id', request.participantId);
        result = { success: true, isMuted: request.action === 'mute' };
        break;
      }

      case 'end': {
        await supabase
          .from('conference_participants')
          .update({ status: 'left', left_at: new Date().toISOString() })
          .eq('conference_id', request.conferenceId)
          .eq('status', 'active');

        await supabase
          .from('conference_rooms')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('id', request.conferenceId);
        result = { success: true };
        break;
      }

      case 'bridge':
      case 'transfer': {
        const { data: bridge, error } = await supabase
          .from('call_bridges')
          .insert({
            account_id: profile.account_id,
            call_a_id: request.callId,
            call_b_id: request.targetCallId,
            bridge_type: request.bridgeType || 'conference',
            status: 'pending',
            initiated_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, bridge };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Conference bridge error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
