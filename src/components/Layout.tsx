import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-navy bg-opacity-20' : '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">{t('app_title')}</h1>
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-navy hover:bg-opacity-20 transition ${isActive('/dashboard')}`}
                >
                  {t('dashboard')}
                </Link>
                <Link
                  to="/inventory"
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-navy hover:bg-opacity-20 transition ${isActive('/inventory')}`}
                >
                  {t('inventory')}
                </Link>
                <Link
                  to="/suppliers"
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-navy hover:bg-opacity-20 transition ${isActive('/suppliers')}`}
                >
                  {t('suppliers')}
                </Link>
                <Link
                  to="/orders"
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-navy hover:bg-opacity-20 transition ${isActive('/orders')}`}
                >
                  {t('orders')}
                </Link>
                <Link
                  to="/usage-reports"
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-navy hover:bg-opacity-20 transition ${isActive('/usage-reports')}`}
                >
                  {t('usage_reports')}
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <Link
                      to="/categories"
                      className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-navy hover:bg-opacity-20 transition ${isActive('/categories')}`}
                    >
                      {t('categories')}
                    </Link>
                    <Link
                      to="/admin/users"
                      className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-navy hover:bg-opacity-20 transition ${isActive('/admin/users')}`}
                    >
                      {t('admin_users')}
                    </Link>
                  </>
                )}
                <Link
                  to="/settings"
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-navy hover:bg-opacity-20 transition ${isActive('/settings')}`}
                >
                  {t('settings')}
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-navy hover:bg-opacity-20 transition"
              >
                {i18n.language === 'en' ? 'FR' : 'EN'}
              </button>
              <span className="text-sm">{user?.name}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-white text-navy rounded-md text-sm font-medium hover:bg-gray-100 transition"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} Ikiké Collective SARL. All rights reserved. Version 1.0.0
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
