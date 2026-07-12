import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import { getCurrentUser, api } from '@/lib/api';
import { Bell, Sun, Moon, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('assetflow_theme');
    if (saved === 'dark') return 'dark';
    return 'light';
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Toggle html class for dark mode
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('assetflow_theme', theme);
  }, [theme, user, navigate]);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      api.get('/analytics')
        .then((res) => {
          setNotifications(res.recentNotifications || []);
        })
        .catch(() => {});
    }
  }, [location.pathname]);

  if (!user) return null;

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleClearNotifications = async () => {
    try {
      await api.post('/analytics/notifications/read-all', {});
      setNotifications([]);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to clear notifications');
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard Overview';
    if (path.startsWith('/assets')) return 'Asset Inventory & Tracking';
    if (path.startsWith('/allocations')) return 'Allocations & Transfers Ledger';
    if (path.startsWith('/bookings')) return 'Shared Resource Scheduler';
    if (path.startsWith('/maintenance')) return 'Maintenance & Repair Workflow';
    if (path.startsWith('/audits')) return 'Asset Audit Cycle Manager';
    if (path.startsWith('/reports')) return 'Reports & Business Intelligence';
    if (path.startsWith('/setup/departments')) return 'Departments Setup';
    if (path.startsWith('/setup/categories')) return 'Asset Categories Setup';
    if (path.startsWith('/setup/employees')) return 'Employee Directory Directory';
    return 'AssetFlow Platform';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-200 font-sans">
      {/* Announcement Bar */}
      <div className="h-9 bg-cohere-black text-white flex items-center justify-center text-[11px] font-mono tracking-wider relative z-50">
        <span>SECURITY COMPLIANCE AUDITING ACTIVE. <Link to="/audits" className="underline hover:text-accent font-bold">RUN MANUAL VERIFICATION</Link></span>
      </div>

      <div className="flex flex-1 min-h-[calc(100vh-36px)]">
        {/* Sidebar Layout */}
        <SidebarNav role={user.role} />

        {/* Main Layout Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-16 border-b border-border bg-white flex items-center justify-between px-8 sticky top-0 z-40">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground uppercase font-mono">{getPageTitle()}</h2>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xs hover:bg-secondary/40 text-muted-foreground transition-all duration-200"
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="size-5" /> : <Sun className="size-5" />}
              </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(prev => !prev)}
                className="p-2 rounded-xs hover:bg-secondary/40 text-muted-foreground relative transition-all duration-200"
                title="Notifications"
              >
                <Bell className="size-5" />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-1 right-1 size-2.5 bg-accent rounded-xs border-2 border-white" />
                )}
              </button>

              {/* Notifications Dropdown Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-card rounded-xs border border-border shadow-none z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <span className="font-bold text-xs uppercase font-mono">Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearNotifications}
                        className="text-xs text-action-blue hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground font-medium">
                        No new notifications
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.map((n, i) => (
                          <div 
                            key={i} 
                            className={`p-4 border-b border-border/50 flex gap-3 hover:bg-secondary/20 transition-colors ${!n.isRead ? 'bg-secondary/10' : ''}`}
                          >
                            <div className="mt-0.5">
                              {n.type === 'ALERT' && <AlertTriangle className="size-4 text-red-500" />}
                              {n.type === 'SUCCESS' && <CheckCircle className="size-4 text-green-500" />}
                              {n.type === 'INFO' && <Info className="size-4 text-blue-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate text-foreground">{n.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[9px] text-muted-foreground/60 block mt-1.5 font-mono">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu Info */}
            <div className="flex items-center gap-3 border-l border-border pl-4">
              <div className="size-9 rounded-xs bg-primary text-white font-mono font-bold flex items-center justify-center text-sm shadow-none">
                {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold leading-tight">{user.name}</p>
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider font-mono mt-0.5">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Panel */}
        <main 
          className="flex-1 p-8 overflow-y-auto"
          onClick={() => setShowNotifications(false)}
        >
          <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
            {children}
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
