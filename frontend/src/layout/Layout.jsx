import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/queue': 'Queue Management',
  '/vitals': 'Vitals',
  '/emr': 'EMR',
  '/billing': 'Billing',
  '/reports': 'Reports',
  '/staff': 'Staff Management',
  '/settings': 'Settings',
};

const TITLE_PREFIXES = [
  { prefix: '/patients/', title: 'Patient Profile' },
];

export function Layout() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname]
    || TITLE_PREFIXES.find((t) => location.pathname.startsWith(t.prefix))?.title
    || 'EMR Platform';

  return (
    <div className="flex h-screen overflow-hidden bg-bg-main">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
