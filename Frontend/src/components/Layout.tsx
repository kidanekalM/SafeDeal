import { ReactNode, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Plus, 
  User, 
  LogOut, 
  Lock,
  Bell,
  Settings,
  CreditCard,
  Search,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { authApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import DebugAuth from './DebugAuth';
import NotificationCenter from './NotificationCenter';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      toast.success(t('components.logged_out_successfully', 'Logged out successfully'));
    } catch (error) {
      logout(); // Still logout locally even if API call fails
    }
  };

  const navigation = useMemo(() => {
    const normalNavigation = [
      { name: t('pages.dashboard', 'Dashboard'), href: '/dashboard', icon: LayoutDashboard },
      { name: t('pages.my_escrows', 'My Escrows'), href: '/escrows', icon: Lock },
      { name: t('pages.start_new_deal', 'Start Deal'), href: '/create-escrow', icon: Plus },
      { name: t('pages.directory', 'Directory'), href: '/search', icon: Search },
      { name: t('pages.payments', 'Payments'), href: '/transactions', icon: CreditCard },
      { name: t('pages.profile', 'Profile'), href: '/profile', icon: User },
    ];
    
      
    const navigationWithDev = normalNavigation;
    
    const adminNavigation = [
      { name: t('pages.admin_dashboard', 'Admin Dashboard'), href: '/admin', icon: LayoutDashboard },
    ];

    return user?.id === 2 ? adminNavigation : navigationWithDev;
  }, [user, t]);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const activePageName = useMemo(() => {
    const activeItem = navigation.find(item => isActive(item.href));
    return activeItem ? activeItem.name : t('pages.dashboard', 'Dashboard');
  }, [navigation, location.pathname, t]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      {/* Top Nav Bar - Mobile First */}
      <header className="bg-white shadow-sm border-b border-gray-200 z-50 sticky top-0">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Hamburger */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                aria-label={t('components.open_menu', 'Open menu')}
              >
                <Menu className="h-6 w-6 text-gray-600" />
              </button>
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-9 h-9 bg-primary-600 rounded-lg">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:inline">{t('components.safedeal', 'SafeDeal')}</span>
              </Link>
            </div>
            
            {/* Center: Page Title */}
            <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center absolute left-1/2 -translate-x-1/2 sm:relative sm:absolute-none">
              {activePageName}
            </h1>
            
            {/* Right: Actions */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowNotifications(true)}
                className="p-2 text-gray-400 hover:text-gray-600 relative"
                aria-label={t('components.notifications', 'Notifications')}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <Link to="/profile" className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-200">
                <span className="text-sm font-medium text-primary-700">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                data-testid="logout-button"
                className="hidden md:flex p-2 text-gray-400 hover:text-red-600 transition-colors"
                aria-label={t('components.sign_out', 'Sign out')}
                title={t('components.sign_out', 'Sign out')}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop Horizontal Nav */}
        <nav className="hidden md:block px-6 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex space-x-1 max-w-7xl mx-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const testId = item.href === '/escrows' ? 'nav-escrows' : item.href === '/transactions' ? 'nav-transactions' : undefined;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={testId}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
                    active
                      ? 'bg-white text-primary-700 shadow-sm border border-primary-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Mobile Full Nav Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out 
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden w-80`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link to="/dashboard" className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
              <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-lg">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">{t('components.safedeal', 'SafeDeal')}</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label={t('components.close_menu', 'Close menu')}
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-8 space-y-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-4 px-6 py-4 rounded-2xl text-base font-bold transition-all group hover:shadow-lg hover:scale-[1.02] ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-2xl scale-[1.02]'
                      : 'text-gray-700 hover:bg-gray-50 hover:shadow-md bg-white/80'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className={`h-6 w-6 flex-shrink-0 ${isActive(item.href) ? 'text-white drop-shadow-lg' : 'text-primary-600 group-hover:text-primary-700'}`} />
                  <span className="font-bold leading-tight">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="px-6 py-4 space-y-2">
            <Link 
              to="/profile" 
              className="w-full flex items-center space-x-3 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">{t('components.settings', 'Settings')}</span>
            </Link>
          </div>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('components.sign_out', 'Sign out')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Nav - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl p-2">
        <div className="grid grid-cols-5 gap-1 max-w-4xl mx-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center p-2 rounded-xl text-[10px] font-bold transition-all ${
                  active
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-primary-600'
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                <span className="truncate w-full text-center">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Main Content - Full width, mobile padding bottom */}
      <main className="pb-24 md:pb-6 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      
      {/* Debug Component */}
      <DebugAuth />
      
      {/* Notification Center */}
      <NotificationCenter 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </div>
  );
};

export default Layout;
