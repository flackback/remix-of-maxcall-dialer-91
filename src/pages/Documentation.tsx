import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickStartGuide } from '@/components/docs/QuickStartGuide';
import { UserManual } from '@/components/docs/UserManual';
import { APIReference } from '@/components/docs/APIReference';
import { IntegrationsGuide } from '@/components/docs/IntegrationsGuide';
import { CrivelIntegrationGuide } from '@/components/docs/CrivelIntegrationGuide';
import { BookOpen, Rocket, Code, Plug, Phone } from 'lucide-react';

export default function Documentation() {
  return (
    <>
      <Helmet>
        <title>Documentação | Maxcall</title>
        <meta name="description" content="Documentação completa do Maxcall - Manual do usuário, API Reference e guias de integração" />
      </Helmet>

      <div className="space-y-6">
        <div className="border-b border-border pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Documentação Maxcall</h1>
              <p className="text-muted-foreground">Manual completo do sistema de discagem preditiva</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="quickstart" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="quickstart" className="gap-2">
              <Rocket className="h-4 w-4" />
              <span className="hidden sm:inline">Início Rápido</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
            <TabsTrigger value="crivel" className="gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Crivel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quickstart">
            <QuickStartGuide />
          </TabsContent>

          <TabsContent value="manual">
            <UserManual />
          </TabsContent>

          <TabsContent value="api">
            <APIReference />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationsGuide />
          </TabsContent>

          <TabsContent value="crivel">
            <CrivelIntegrationGuide />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}