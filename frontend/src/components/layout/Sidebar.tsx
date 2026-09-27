import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Globe, Network, Users, Clock, FileSearch,
  Server, Brain, Search, FileBarChart2, Settings, LogOut
} from 'lucide-react';
import { NemesisLogo } from '@/components/NemesisLogo';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sources',        icon: Globe,           label: 'Sources' },
  { to: '/graph',          icon: Network,         label: 'Graph' },
  { to: '/timeline',       icon: Clock,           label: 'Timeline' },
  { to: '/investigations', icon: Users,           label: 'Investigations' },
  { to: '/evidence',       icon: FileSearch,      label: 'Evidence' },
  { to: '/infrastructure', icon: Server,          label: 'Infrastructure' },
  { to: '/personas',       icon: Brain,           label: 'Persona Analysis' },
  { to: '/discover',       icon: Search,          label: 'Discover' },
  { to: '/reports',        icon: FileBarChart2,   label: 'Export' },
  { to: '/settings',       icon: Settings,        label: 'Settings' },
];

export function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[224px] bg-white border-r border-zinc-100 flex flex-col z-30">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-zinc-100 flex-shrink-0">
        <NemesisLogo size={28} />
        <div>
          <p className="text-[11px] font-black tracking-widest uppercase text-zinc-900 leading-none">Nemesis</p>
          <p className="text-[9px] text-zinc-400 font-medium tracking-wide mt-0.5 leading-none">Dark Web Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group mb-0.5',
                isActive
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-700'}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-all duration-150"
        >
          <LogOut size={16} strokeWidth={2} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
