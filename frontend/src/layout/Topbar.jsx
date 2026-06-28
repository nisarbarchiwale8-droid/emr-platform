import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '../store/auth.store.js';

export function Topbar({ title }) {
  const { user } = useAuthStore();

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';

  return (
    <header className="flex items-center justify-between bg-bg-card px-6 py-3 border-b border-border sticky top-0 z-10">
      <h1 className="text-h2 font-semibold text-text-main">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            placeholder="Search patients, appointments..."
            className="w-72 pl-9 pr-4 py-2 rounded-full border border-border bg-bg-main text-body text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Notifications */}
        <button className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-bg-main border border-border text-text-muted hover:text-text-main transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-small font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="hidden lg:block">
            <p className="text-body font-medium text-text-main leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-small text-text-muted capitalize mt-0.5">
              {user?.role?.toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
