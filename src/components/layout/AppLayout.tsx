import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

function MainContent() {
  const { collapsed } = useSidebar();
  
  return (
    <div className={cn(
      "flex flex-1 flex-col transition-all duration-300",
      collapsed ? "pl-16" : "pl-64"
    )}>
      <Header />
      <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <Outlet />
      </main>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <MainContent />
      </div>
    </SidebarProvider>
  );
}
