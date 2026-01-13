import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Mic,
  MicOff,
  PhoneOff,
  UserMinus,
  Volume2,
  VolumeX,
  Copy,
  Plus,
  Phone,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

interface Participant {
  id: string;
  display_name: string;
  participant_type: string;
  is_muted: boolean;
  is_on_hold: boolean;
  joined_at: string;
  phone_number?: string;
}

interface ConferenceRoomProps {
  conferenceId: string;
  roomCode: string;
  isModerator?: boolean;
  onLeave?: () => void;
}

export function ConferenceRoom({ conferenceId, roomCode, isModerator = false, onLeave }: ConferenceRoomProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phoneToAdd, setPhoneToAdd] = useState("");

  useEffect(() => {
    fetchParticipants();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`conference-${conferenceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conference_participants',
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conferenceId]);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('conference_participants')
        .select('*')
        .eq('conference_id', conferenceId)
        .eq('status', 'active')
        .order('joined_at');

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMuteToggle = async (participantId: string, currentMuted: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('conference-bridge', {
        body: {
          action: currentMuted ? 'unmute' : 'mute',
          participantId,
        },
      });

      if (error) throw error;
      fetchParticipants();
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('Erro ao alterar mudo');
    }
  };

  const handleKickParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase.functions.invoke('conference-bridge', {
        body: {
          action: 'kick',
          participantId,
        },
      });

      if (error) throw error;
      toast.success('Participante removido');
      fetchParticipants();
    } catch (error) {
      console.error('Error kicking participant:', error);
      toast.error('Erro ao remover participante');
    }
  };

  const handleLeaveConference = async () => {
    try {
      // In production, this would properly disconnect
      if (onLeave) onLeave();
      toast.success('Você saiu da conferência');
    } catch (error) {
      console.error('Error leaving conference:', error);
    }
  };

  const handleEndConference = async () => {
    try {
      const { error } = await supabase.functions.invoke('conference-bridge', {
        body: {
          action: 'end',
          conferenceId,
        },
      });

      if (error) throw error;
      toast.success('Conferência encerrada');
      if (onLeave) onLeave();
    } catch (error) {
      console.error('Error ending conference:', error);
      toast.error('Erro ao encerrar conferência');
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Código copiado!');
  };

  const handleAddParticipant = async () => {
    if (!phoneToAdd.trim()) return;

    toast.info('Discando para adicionar participante...');
    // In production, this would initiate an outbound call
    setPhoneToAdd("");
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sala de Conferência
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              Código: 
              <Badge variant="outline" className="font-mono cursor-pointer" onClick={copyRoomCode}>
                {roomCode}
                <Copy className="h-3 w-3 ml-1" />
              </Badge>
              <span className="text-xs">• {participants.length} participante(s)</span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLeaveConference}>
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Add participant */}
        {isModerator && (
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Telefone para adicionar..."
                value={phoneToAdd}
                onChange={(e) => setPhoneToAdd(e.target.value)}
              />
            </div>
            <Button onClick={handleAddParticipant} disabled={!phoneToAdd.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        )}

        {/* Participants list */}
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${participant.is_on_hold ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{participant.display_name}</span>
                      {participant.participant_type === 'moderator' && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    {participant.phone_number && (
                      <span className="text-xs text-muted-foreground">
                        {participant.phone_number}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {participant.is_muted ? (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-green-500" />
                  )}

                  {isModerator && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMuteToggle(participant.id, participant.is_muted)}
                      >
                        {participant.is_muted ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <MicOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleKickParticipant(participant.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {participants.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum participante na conferência</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Moderator actions */}
        {isModerator && (
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleEndConference}
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Encerrar Conferência
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
