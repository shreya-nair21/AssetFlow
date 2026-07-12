import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Share2, 
  Calendar, 
  Wrench, 
  ClipboardCheck, 
  BarChart3, 
  Building2, 
  Tags, 
  Users, 
  LogOut,
  User,
  ShieldAlert
} from 'lucide-react';
import { removeToken, removeCurrentUser } from '@/lib/api';

interface SidebarNavProps {
  role: string;
}

export default function SidebarNav({ role }: SidebarNavProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLogout = () => {
    removeToken();
    removeCurrentUser();
    window.location.href = '/login';
  };

  const isActive = (path: string) => {
    return currentPath === path;
  };

  // Base items visible to all logged-in users
  const commonItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Bookings', path: '/bookings', icon: Calendar },
  ];

  // Asset Manager & Admin items for Inventory/Allocations
  const managerItems = [
    { label: 'Asset Inventory', path: '/assets', icon: Package },
    { label: 'Asset Allocations', path: '/allocations', icon: Share2 },
    { label: 'Maintenance Requests', path: '/maintenance', icon: Wrench },
  ];

  // Admin Setup & Auditing
  const adminItems = [
    { label: 'Departments', path: '/setup/departments', icon: Building2 },
    { label: 'Asset Categories', path: '/setup/categories', icon: Tags },
    { label: 'Employees Directory', path: '/setup/employees', icon: Users },
    { label: 'Audit Manager', path: '/audits', icon: ClipboardCheck },
    { label: 'Analytics Reports', path: '/reports', icon: BarChart3 },
  ];

  // Department Head menu options
  const deptHeadItems = [
    { label: 'Department Assets', path: '/assets', icon: Package },
    { label: 'Transfer Approvals', path: '/allocations', icon: Share2 },
    { label: 'Maintenance Dashboard', path: '/maintenance', icon: Wrench },
  ];

  // Employee menu options
  const employeeItems = [
    { label: 'My Assets', path: '/assets', icon: Package },
    { label: 'Request Maintenance', path: '/maintenance', icon: Wrench },
  ];

  const getMenuLinks = () => {
    switch (role) {
      case 'ADMIN':
        return [
          ...commonItems,
          ...managerItems,
          ...adminItems,
        ];
      case 'ASSET_MANAGER':
        return [
          ...commonItems,
          ...managerItems,
          { label: 'Audit Manager', path: '/audits', icon: ClipboardCheck },
          { label: 'Analytics Reports', path: '/reports', icon: BarChart3 },
        ];
      case 'DEPT_HEAD':
        return [
          ...commonItems,
          ...deptHeadItems,
        ];
      case 'EMPLOYEE':
      default:
        return [
          ...commonItems,
          ...employeeItems,
        ];
    }
  };

  const navLinks = getMenuLinks();

  return (
    <aside className="w-64 bg-white text-foreground border-r border-border flex flex-col justify-between h-screen sticky top-0 font-sans z-40">
      <div>
        {/* Header Logo */}
        <div className="p-6 border-b border-border flex items-center gap-3 bg-white">
          <div className="size-8.5 bg-primary rounded-xs flex items-center justify-center shadow-none">
            <span className="font-mono font-bold text-sm text-white">AF</span>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-foreground uppercase font-mono leading-none">AssetFlow</h1>
            <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider font-mono">Enterprise ERP</span>
          </div>
        </div>

        {/* User Role Card */}
        <div className="px-6 py-4 border-b border-border bg-white flex items-center gap-3">
          <div className="size-9 rounded-xs bg-secondary flex items-center justify-center text-foreground">
            {role === 'ADMIN' ? <ShieldAlert className="size-5 text-accent" /> : <User className="size-5 text-muted-foreground" />}
          </div>
          <div>
            <p className="text-[9px] font-bold text-accent tracking-wider uppercase font-mono leading-none">{role.replace('_', ' ')}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Portal Session</p>
          </div>
        </div>

        {/* Links Navigation */}
        <nav className="py-4 flex flex-col gap-1">
          {navLinks.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={index}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 font-semibold text-xs transition-all duration-150 ${
                  active 
                    ? 'border-l-2 border-accent bg-secondary/30 text-foreground pl-[22px]' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/15 pl-6'
                }`}
              >
                <Icon className="size-4.5" />
                <span className="tracking-wide uppercase font-mono">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="p-4 border-t border-border bg-white">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-6 py-3 rounded-xs font-bold text-xs uppercase tracking-wider text-red-500 hover:text-red-600 hover:bg-red-500/5 transition-all duration-150"
        >
          <LogOut className="size-4.5" />
          <span className="font-mono">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
