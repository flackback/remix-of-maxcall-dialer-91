import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Plus,
  Phone,
  Clock,
  Copy,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Conference {
  id: string;
  name: string;
  room_code: string;
  is_active: boolean;
  is_recording: boolean;
  max_participants: number;
  created_at: string;
  participant_count?: number;
}

interface ConferenceListProps {
  onJoinConference?: (conferenceId: string, roomCode: string, isModerator: boolean) => void;
}

export function ConferenceList({ onJoinConference }: ConferenceListProps) {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newConferenceName, setNewConferenceName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPin, setJoinPin] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    try {
      const { data, error } = await supabase
        .from('conference_rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts
      const confsWithCounts = await Promise.all(
        (data || []).map(async (conf) => {
          const { count } = await supabase
            .from('conference_participants')
            .select('*', { count: 'exact', head: true })
            .eq('conference_id', conf.id)
            .eq('status', 'active');

          return { ...conf, participant_count: count || 0 };
        })
      );

      setConferences(confsWithCounts);
    } catch (error) {
      console.error('Error fetching conferences:', error);
      toast.error('Erro ao carregar conferências');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConference = async () => {
    if (!newConferenceName.trim()) {
      toast.error('Digite um nome para a conferência');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('conference-bridge', {
        body: {
          action: 'create',
          displayName: newConferenceName,
        },
      });

      if (error) throw error;

      toast.success('Conferência criada!');
      setCreateDialogOpen(false);
      setNewConferenceName("");
      fetchConferences();

      // Show room details
      if (data.conference) {
        toast.info(
          `Código: ${data.roomCode}\nPIN Moderador: ${data.moderatorPin}\nPIN Participante: ${data.participantPin}`,
          { duration: 10000 }
        );
      }
    } catch (error) {
      console.error('Error creating conference:', error);
      toast.error('Erro ao criar conferência');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      toast.error('Digite o código da sala');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('conference-bridge', {
        body: {
          action: 'join',
          roomCode: joinCode.toUpperCase(),
          pin: joinPin,
          displayName: 'Participante',
        },
      });

      if (error) throw error;

      toast.success('Você entrou na conferência!');
      setJoinDialogOpen(false);
      setJoinCode("");
      setJoinPin("");

      if (onJoinConference && data.conference) {
        onJoinConference(data.conference.id, data.conference.roomCode, data.isModerator);
      }
    } catch (error) {
      console.error('Error joining conference:', error);
      toast.error('Erro ao entrar na conferência');
    }
  };

  const handleJoinConference = async (conference: Conference) => {
    try {
      const { data, error } = await supabase.functions.invoke('conference-bridge', {
        body: {
          action: 'join',
          conferenceId: conference.id,
          displayName: 'Participante',
        },
      });

      if (error) throw error;

      toast.success('Você entrou na conferência!');

      if (onJoinConference) {
        onJoinConference(conference.id, conference.room_code, data.isModerator);
      }
    } catch (error) {
      console.error('Error joining conference:', error);
      toast.error('Erro ao entrar na conferência');
    }
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-2">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conferência
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Conferência</DialogTitle>
              <DialogDescription>
                Crie uma sala de conferência para múltiplos participantes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conferência</Label>
                <Input
                  id="name"
                  placeholder="Ex: Reunião de Vendas"
                  value={newConferenceName}
                  onChange={(e) => setNewConferenceName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateConference} disabled={creating}>
                {creating ? 'Criando...' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <LogIn className="h-4 w-4 mr-2" />
              Entrar com Código
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Entrar na Conferência</DialogTitle>
              <DialogDescription>
                Digite o código da sala para participar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código da Sala</Label>
                <Input
                  id="code"
                  placeholder="Ex: ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (opcional)</Label>
                <Input
                  id="pin"
                  placeholder="1234"
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value)}
                  maxLength={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleJoinByCode}>
                Entrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={fetchConferences}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Conference List */}
      <Card>
        <CardHeader>
          <CardTitle>Conferências Ativas</CardTitle>
          <CardDescription>
            Salas de conferência disponíveis para participar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conferences.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="h-12 w-12 mb-2" />
              <p>Nenhuma conferência ativa</p>
              <p className="text-sm">Crie uma nova conferência para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conferences.map((conf) => (
                <Card key={conf.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        <span className="font-medium">{conf.name}</span>
                      </div>
                      {conf.is_recording && (
                        <Badge variant="destructive">REC</Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center justify-between">
                        <span>Código:</span>
                        <Badge
                          variant="outline"
                          className="font-mono cursor-pointer"
                          onClick={() => copyRoomCode(conf.room_code)}
                        >
                          {conf.room_code}
                          <Copy className="h-3 w-3 ml-1" />
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Participantes:</span>
                        <span>{conf.participant_count}/{conf.max_participants}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Criada em:</span>
                        <span>{format(new Date(conf.created_at), 'HH:mm')}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleJoinConference(conf)}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
