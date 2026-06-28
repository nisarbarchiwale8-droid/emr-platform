import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList,
  Activity, Receipt, BarChart3, Settings,
  LogOut, Stethoscope, UserCog,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store.js';
import { authService } from '../services/auth.service.js';
import toast from 'react-hot-toast';
import { ROLES } from '../utils/constants.js';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard', roles: ['ADMINISTRATOR', 'DOCTOR', 'RECEPTIONIST'] },
  { icon: Users, label: 'Patients', to: '/patients', roles: ['ADMINISTRATOR', 'DOCTOR', 'RECEPTIONIST'] },
  { icon: CalendarDays, label: 'Appointments', to: '/appointments', roles: ['ADMINISTRATOR', 'DOCTOR', 'RECEPTIONIST'] },
  { icon: ClipboardList, label: 'Queue', to: '/queue', roles: ['ADMINISTRATOR', 'DOCTOR', 'RECEPTIONIST'] },
  { icon: Activity, label: 'Vitals', to: '/vitals', roles: ['ADMINISTRATOR', 'DOCTOR', 'RECEPTIONIST'] },
  { icon: Stethoscope, label: 'EMR', to: '/emr', roles: ['ADMINISTRATOR', 'DOCTOR'] },
  { icon: Receipt, label: 'Billing', to: '/billing', roles: ['ADMINISTRATOR', 'RECEPTIONIST'] },
  { icon: BarChart3, label: 'Reports', to: '/reports', roles: ['ADMINISTRATOR'] },
  { icon: UserCog, label: 'Staff', to: '/staff', roles: ['ADMINISTRATOR'] },
  { icon: Settings, label: 'Settings', to: '/settings', roles: ['ADMINISTRATOR'] },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // proceed regardless
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <aside className="w-20 h-screen bg-gradient-primary flex flex-col items-center py-6 gap-4 flex-shrink-0 sticky top-0">
      {/* Logo */}
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-2">
        <Stethoscope size={20} className="text-white" />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1 w-full px-2">
        {filteredItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center gap-1 py-2 rounded-[10px] transition-colors group',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Logout"
        className="flex flex-col items-center justify-center gap-1 py-2 w-full rounded-[10px] text-white/60 hover:bg-white/10 hover:text-white transition-colors"
      >
        <LogOut size={20} />
        <span className="text-[10px] font-medium">Logout</span>
      </button>
    </aside>
  );
}
