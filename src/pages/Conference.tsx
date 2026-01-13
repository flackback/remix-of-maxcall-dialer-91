import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConferenceList } from "@/components/conference/ConferenceList";
import { ConferenceRoom } from "@/components/conference/ConferenceRoom";
import { CallBridgePanel } from "@/components/conference/CallBridgePanel";
import {
  Users,
  ArrowRightLeft,
  Phone,
} from "lucide-react";

export default function Conference() {
  const [activeConference, setActiveConference] = useState<{
    id: string;
    roomCode: string;
    isModerator: boolean;
  } | null>(null);

  const handleJoinConference = (conferenceId: string, roomCode: string, isModerator: boolean) => {
    setActiveConference({ id: conferenceId, roomCode, isModerator });
  };

  const handleLeaveConference = () => {
    setActiveConference(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Conferência & Bridge</h1>
        <p className="text-muted-foreground">
          Gerenciamento de salas de conferência e conexão de chamadas
        </p>
      </div>

      {activeConference ? (
        <div className="h-[calc(100vh-200px)]">
          <ConferenceRoom
            conferenceId={activeConference.id}
            roomCode={activeConference.roomCode}
            isModerator={activeConference.isModerator}
            onLeave={handleLeaveConference}
          />
        </div>
      ) : (
        <Tabs defaultValue="conferences" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conferences" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Salas de Conferência
            </TabsTrigger>
            <TabsTrigger value="bridges" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Bridge de Chamadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conferences">
            <ConferenceList onJoinConference={handleJoinConference} />
          </TabsContent>

          <TabsContent value="bridges">
            <CallBridgePanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
