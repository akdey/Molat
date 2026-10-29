import React from 'react';
import { cn } from '../../lib/utils';
import { useApp } from '../../contexts/AppContext';
import { ConnectionBadge } from '../common/States';
import { Library, BookOpen, ScanLine, Star, LayoutGrid, Settings, Menu, X } from 'lucide-react';

type NavRoute = 'home' | 'collection' | 'add' | 'wishlist' | 'reading' | 'inventory' | 'insights' | 'data' | 'settings';

interface NavItem {
  route: NavRoute;
  label: string;
  icon: React.ReactNode;
  showInBottom?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { route: 'home', label: 'Home', icon: <Library size={18} />, showInBottom: true },
  { route: 'collection', label: 'Books', icon: <LayoutGrid size={18} />, showInBottom: true },
  { route: 'add', label: 'Scan / Add', icon: <ScanLine size={18} />, showInBottom: true },
  { route: 'wishlist', label: 'Wishlist', icon: <Star size={18} />, showInBottom: true },
  { route: 'reading', label: 'Reading', icon: <BookOpen size={18} /> },
  { route: 'inventory', label: 'Inventory', icon: null },
  { route: 'insights', label: 'Insights', icon: null },
  { route: 'data', label: 'Data', icon: null },
  { route: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

interface LayoutProps {
  route: NavRoute;
  onNavigate: (r: NavRoute) => void;
  children: React.ReactNode;
}

export function AppLayout({ route, onNavigate, children }: LayoutProps) {
  const { connectionStatus, lastRefresh } = useApp();
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Close menu on route change
  React.useEffect(() => { setMenuOpen(false); }, [route]);

  const topItems = NAV_ITEMS.filter(n => n.route !== 'add');
  const bottomItems = NAV_ITEMS.filter(n => n.showInBottom);

  return (
    <div className="min-h-dvh flex flex-col bg-canvas dark:bg-canvas-dark">
      {/* === Top Header === */}
      <header className="sticky top-0 z-30 border-b border-rule dark:border-rule-dark bg-canvas/95 dark:bg-canvas-dark/95 backdrop-blur-sm">
        <div className="max-w-content mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
            aria-label="Go to home"
          >
            <Library size={20} className="text-accent dark:text-accent-dark" aria-hidden="true" />
            <span className="font-serif text-lg font-medium text-ink dark:text-ink-dark hidden sm:block">Molat</span>
          </button>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1 ml-4 flex-1">
            {topItems
              .filter(n => !['inventory', 'data', 'settings'].includes(n.route))
              .map(item => (
              <button
                key={item.route}
                onClick={() => onNavigate(item.route)}
                aria-current={route === item.route ? 'page' : undefined}
                className={cn(
                  'px-3 py-1.5 rounded text-sm transition-colors duration-fast',
                  route === item.route
                    ? 'bg-accent-subtle text-accent dark:bg-accent-dark-subtle dark:text-accent-dark font-medium'
                    : 'text-ink-secondary dark:text-ink-dark-secondary hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark',
                )}
              >
                {item.label}
              </button>
            ))}
            {/* More dropdown on desktop */}
            <div className="relative group ml-1">
              <button className="px-3 py-1.5 rounded text-sm text-ink-secondary dark:text-ink-dark-secondary hover:text-ink hover:bg-surface transition-colors">
                More
              </button>
              <div className="absolute top-full left-0 mt-1 bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark rounded-lg shadow-md py-1 min-w-[140px] hidden group-focus-within:block group-hover:block z-40">
                {['reading', 'inventory', 'insights', 'data', 'settings'].map(r => {
                  const item = NAV_ITEMS.find(n => n.route === r);
                  if (!item) return null;
                  return (
                    <button
                      key={r}
                      onClick={() => onNavigate(r as NavRoute)}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        route === r
                          ? 'text-accent dark:text-accent-dark font-medium'
                          : 'text-ink-secondary dark:text-ink-dark-secondary hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark',
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Right: connection badge + hamburger */}
          <div className="flex items-center gap-3 ml-auto">
            <ConnectionBadge
              status={connectionStatus}
              lastRefresh={lastRefresh}
              className="hidden sm:flex"
            />
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 -mr-1 rounded-md text-ink-secondary dark:text-ink-dark-secondary hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              onClick={() => setMenuOpen(prev => !prev)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer menu */}
        {menuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Mobile navigation"
            className="md:hidden border-t border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark py-2 px-4 animate-slide-up"
          >
            {topItems.filter(n => !['home', 'collection', 'add', 'wishlist'].includes(n.route)).map(item => (
              <button
                key={item.route}
                onClick={() => onNavigate(item.route)}
                aria-current={route === item.route ? 'page' : undefined}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors',
                  route === item.route
                    ? 'text-accent dark:text-accent-dark font-medium bg-accent-subtle dark:bg-accent-dark-subtle'
                    : 'text-ink-secondary dark:text-ink-dark-secondary hover:bg-surface dark:hover:bg-surface-dark',
                )}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-rule dark:border-rule-dark mt-2">
              <ConnectionBadge status={connectionStatus} lastRefresh={lastRefresh} />
            </div>
          </nav>
        )}
      </header>

      {/* === Main content === */}
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        <div className="max-w-content mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* === Mobile bottom navigation === */}
      <nav
        aria-label="Primary navigation"
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-30',
          'bg-canvas/95 dark:bg-canvas-dark/95 backdrop-blur-sm',
          'border-t border-rule dark:border-rule-dark',
          'flex items-stretch',
          // Safe area inset for iPhone home indicator
          'pb-safe',
        )}
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))' }}
      >
        {bottomItems.map(item => {
          const isAdd = item.route === 'add';
          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              aria-label={item.label}
              aria-current={route === item.route ? 'page' : undefined}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5',
                'min-h-[56px] transition-colors duration-fast',
                isAdd
                  ? 'text-accent dark:text-accent-dark'
                  : route === item.route
                  ? 'text-accent dark:text-accent-dark'
                  : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink-secondary',
              )}
            >
              <span className={cn(
                isAdd ? 'bg-accent dark:bg-accent-dark text-white rounded-lg w-9 h-9 flex items-center justify-center shadow-md' : '',
              )}>
                {item.icon}
              </span>
              <span className={cn('text-2xs', isAdd ? 'text-accent dark:text-accent-dark' : '')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

