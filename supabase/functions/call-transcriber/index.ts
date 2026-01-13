import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscribeRequest {
  call_id: string;
  audio_url?: string;
  audio_base64?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { call_id, audio_url, audio_base64 } = await req.json() as TranscribeRequest;

    // Fetch call to get recording URL if not provided
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('recording_url, transcript')
      .eq('id', call_id)
      .single();

    if (callError || !call) {
      throw new Error(`Call not found: ${callError?.message}`);
    }

    const callData = call as any;

    // Return existing transcript if available
    if (callData.transcript) {
      return new Response(JSON.stringify({
        already_transcribed: true,
        transcript: callData.transcript
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recordingUrl = audio_url || callData.recording_url;
    
    if (!recordingUrl && !audio_base64) {
      return new Response(JSON.stringify({ 
        error: 'No audio source available',
        suggestion: 'Provide audio_url, audio_base64, or ensure call has recording_url'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For Lovable AI, we'll use Gemini's audio capabilities
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let transcript = '';

    // If we have a URL, we can use it directly with Gemini
    if (recordingUrl) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are a professional transcriptionist. Transcribe the audio accurately, including speaker labels when you can distinguish different speakers.

FORMAT:
- Use "Agent:" for call center agent
- Use "Customer:" for the customer
- Include timestamps if natural pauses occur
- Preserve filler words and natural speech patterns
- Note any unclear audio as [inaudible]`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please transcribe this call recording from: ${recordingUrl}`
                }
              ]
            }
          ]
        }),
      });

      if (!response.ok) {
        // Fallback: Generate a placeholder if audio transcription fails
        console.error('Transcription failed, using placeholder');
        transcript = '[Transcription unavailable - audio processing not supported for this format]';
      } else {
        const data = await response.json();
        transcript = data.choices?.[0]?.message?.content || '';
      }
    } else if (audio_base64) {
      // Handle base64 audio
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'Transcribe the audio accurately with speaker labels (Agent/Customer).'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please transcribe this call recording.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:audio/webm;base64,${audio_base64}`
                  }
                }
              ]
            }
          ]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        transcript = data.choices?.[0]?.message?.content || '';
      }
    }

    // Update call with transcript
    if (transcript) {
      await supabase
        .from('calls')
        .update({ transcript })
        .eq('id', call_id);

      // Log event
      await supabase.from('call_events').insert({
        call_id,
        event_type: 'TRANSCRIBED',
        event_data: {
          length: transcript.length,
          word_count: transcript.split(/\s+/).length
        }
      });
    }

    console.log('Call transcribed:', { call_id, length: transcript.length });

    return new Response(JSON.stringify({
      success: true,
      transcript,
      word_count: transcript.split(/\s+/).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in call-transcriber:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
