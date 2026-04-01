import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Plus, 
  User, 
  LogOut, 
  Lock,
  Bell,
  Settings,
  Shield,
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
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // showBottomNav removed - bottom nav always visible on mobile
  const [activeNavTab, setActiveNavTab] = useState('Dashboard');

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      toast.success('Logged out successfully');
    } catch (error) {
      logout(); // Still logout locally even if API call fails
    }
  };

  const normalNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Start Deal', href: '/create-escrow', icon: Plus },
    { name: 'Directory', href: '/search', icon: Search },
    { name: 'Payments', href: '/transactions', icon: CreditCard },
    { name: 'Profile', href: '/profile', icon: User },
  ];
  
  // Only add CBE test page in development mode
  const devNavigation = (import.meta as any).env.DEV 
    ? [{ name: 'CBE Test', href: '/cbe-test', icon: Shield }] 
    : [];
    
  const navigationWithDev = [...normalNavigation, ...devNavigation];
  
  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
  ];
 const navigation = user?.id === 2 ? adminNavigation : navigationWithDev;
  const isActive = (path: string) => location.pathname === path;

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
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6 text-gray-600" />
              </button>
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-9 h-9 bg-primary-600 rounded-lg">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:inline">SafeDeal</span>
              </Link>
            </div>
            
            {/* Center: Page Title */}
            <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center absolute left-1/2 -translate-x-1/2 sm:relative sm:absolute-none">
              {activeNavTab || 'Dashboard'}
            </h1>
            
            {/* Right: Actions */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowNotifications(true)}
                className="p-2 text-gray-400 hover:text-gray-600 relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-200">
                <span className="text-sm font-medium text-primary-700">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Desktop Horizontal Nav */}
        <nav className="hidden md:block px-6 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveNavTab(item.name);
                    // Simulate navigation
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${
                    activeNavTab === item.name
                      ? 'bg-white text-primary-700 shadow-sm border border-primary-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </button>
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
              <span className="text-xl font-bold text-gray-900">SafeDeal</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close menu"
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
            <button className="w-full flex items-center space-x-3 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all">
              <Settings className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Settings</span>
            </button>
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
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Nav - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl p-2">
        <div className="grid grid-cols-5 gap-1 max-w-4xl mx-auto">
          {[
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'New Deal', href: '/create-escrow', icon: Plus },
            { name: 'Escrows', href: '/escrows', icon: Shield },
            { name: 'Payments', href: '/transactions', icon: CreditCard },
            { name: 'Profile', href: '/profile', icon: User },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center p-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === item.href || location.pathname.includes(item.href.replace('/',''))
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-primary-600'
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Main Content - Full width, mobile padding bottom */}
      <main className="pb-24 md:pb-6 p-4 sm:p-6 lg:p-8">
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
