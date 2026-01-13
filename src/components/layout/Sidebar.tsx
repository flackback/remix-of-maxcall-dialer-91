import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  LayoutDashboard,
  Headphones,
  Users,
  BarChart3,
  Settings,
  PhoneCall,
  List,
  ClipboardCheck,
  Radio,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookOpen,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string | number;
  requiredRole?: 'admin' | 'supervisor' | 'qa' | 'agent' | 'analyst';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Console', icon: Headphones, href: '/agent' },
  { label: 'Supervisão', icon: Radio, href: '/supervisor', requiredRole: 'supervisor' },
  { label: 'Campanhas', icon: PhoneCall, href: '/campaigns' },
  { label: 'Filas', icon: List, href: '/queues' },
  { label: 'Agentes', icon: Users, href: '/agents', requiredRole: 'supervisor' },
  { label: 'Discador', icon: PhoneCall, href: '/dialer', requiredRole: 'supervisor' },
  { label: 'Telefonia', icon: Radio, href: '/telephony', requiredRole: 'admin' },
  { label: 'AMD', icon: Zap, href: '/amd', requiredRole: 'admin' },
  { label: 'Caller ID', icon: PhoneCall, href: '/caller-id', requiredRole: 'admin' },
  { label: 'Conferência', icon: Users, href: '/conference' },
  { label: 'Análise', icon: BarChart3, href: '/call-analysis' },
  { label: 'Agentes IA', icon: Bot, href: '/ai-agents', requiredRole: 'supervisor' },
  { label: 'QA', icon: ClipboardCheck, href: '/qa', requiredRole: 'qa' },
  { label: 'Relatórios', icon: BarChart3, href: '/reports' },
  { label: 'Integrações', icon: Zap, href: '/integrations', requiredRole: 'admin' },
  { label: 'Configurações', icon: Settings, href: '/settings', requiredRole: 'admin' },
  { label: 'Documentação', icon: BookOpen, href: '/docs' },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, hasRole, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Filter nav items based on user roles
  const visibleNavItems = navItems.filter(item => {
    if (!item.requiredRole) return true;
    if (isAdmin) return true;
    return hasRole(item.requiredRole);
  });

  const userInitials = profile?.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">Maxcall</span>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1 overflow-y-auto p-3",
        collapsed ? "scrollbar-hidden" : "scrollbar-thin"
      )}>
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          const linkContent = (
            <Link
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-sidebar-primary')} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-2">
                  {item.label}
                  {item.badge && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Collapse button */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={toggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">Recolher</span>}
        </Button>
      </div>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {userInitials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.full_name || user?.email || 'Usuário'}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                {user?.email || ''}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
