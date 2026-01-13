import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  read: boolean;
  created_at: string;
}

const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Visão geral do contact center em tempo real' },
  '/campaigns': { title: 'Campanhas', subtitle: 'Gerenciamento de campanhas de discagem' },
  '/agents': { title: 'Agentes', subtitle: 'Gerenciamento de agentes e equipes' },
  '/queues': { title: 'Filas', subtitle: 'Gerenciamento de filas de atendimento' },
  '/agent-console': { title: 'Console do Agente', subtitle: 'Atendimento e discador' },
  '/reports': { title: 'Relatórios', subtitle: 'Análise de performance e métricas' },
  '/qa': { title: 'Qualidade', subtitle: 'Avaliação e coaching de atendimentos' },
  '/integrations': { title: 'Integrações', subtitle: 'Multi-carrier com roteamento inteligente por IA' },
  '/settings': { title: 'Configurações', subtitle: 'Configurações do sistema' },
  '/supervisor': { title: 'Supervisão', subtitle: 'Wallboard e monitoria em tempo real' },
  '/telephony': { title: 'Telefonia', subtitle: 'Gestão de trunks, qualidade, CPS e logs SIP' },
  '/caller-id': { title: 'Gestão de Caller ID', subtitle: 'Pools de números, rotação e reputação' },
};

export function Header() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, severity, read, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data as Notification[]);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const { title, subtitle } = routeTitles[location.pathname] || { title: 'MaxCall' };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <Input
              type="search"
              placeholder="Buscar..."
              className="w-64 animate-fade-in"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-busy text-[10px] font-bold text-status-busy-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificações</span>
              <Badge variant="secondary" className="text-xs">
                {unreadCount} novas
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id} 
                  className={`flex flex-col items-start gap-1 p-3 ${!notification.read ? 'bg-muted/50' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium">{notification.title}</span>
                    <Badge
                      variant={
                        notification.severity === 'CRITICAL'
                          ? 'destructive'
                          : notification.severity === 'WARNING'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-[10px]"
                    >
                      {notification.severity}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{notification.message}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>

        {/* Live indicator */}
        <div className="ml-2 flex items-center gap-2 rounded-full bg-status-ready/20 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-ready opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-status-ready"></span>
          </span>
          <span className="text-xs font-medium text-status-ready">AO VIVO</span>
        </div>
      </div>
    </header>
  );
}
