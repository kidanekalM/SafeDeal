import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import Layout from '../components/Layout';
import { userApi } from '../lib/api';
import { SearchUser } from '../types';

const UserSearch = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Server-side search function
  const performServerSideSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await userApi.searchUsers(query);
      const users = response.data.data.users || [];
      setSearchResults(users);
      console.log('Server-side search results:', users.length, 'users');
    } catch (error: any) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setHasSearched(false);
  };

  // Debounced server-side search
  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        performServerSideSearch(searchTerm.trim());
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [searchTerm, performServerSideSearch]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('pages.back_to_dashboard', 'Back to Dashboard')}</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t('pages.search_users', 'Search Users')}</h1>
          <p className="text-gray-600 mt-2">
            {t('pages.find_users_to_create_escrow_transactions_with', 'Find users to create escrow transactions with')}
          </p>
        </div>

        {/* Search Input */}
        <div className="card p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('pages.search_people_placeholder', 'Search people...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-12 w-full"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-primary-600" />
              )}
            </div>
            {hasSearched && searchTerm && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {isSearching ? t('pages.searching', 'Searching...') : `${searchResults.length} ${t('pages.users_found', 'users found')}`}
                </span>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="btn btn-outline btn-sm"
                >
                  {t('pages.clear', 'Clear')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchTerm && (
          <div className="card p-6">
            {searchResults.length > 0 && (
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('pages.people', 'People')}
              </h3>
            )}

            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <span className="ml-2 text-gray-600">{t('pages.searching_users', 'Searching users...')}</span>
              </div>
            ) : searchResults.length === 0 && !isSearching ? (
              <div className="text-center py-6">
                <p className="text-gray-600">
                  {t('pages.no_people_found', 'No people found for')} "{searchTerm}"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((user, index) => (
                  <motion.div
                    key={`${user.first_name}-${user.last_name}-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-base">
                          {user.first_name} {user.last_name}
                        </h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span>{user.profession}</span>
                          {user.activated && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-green-600 text-xs">{t('pages.verified', 'Verified')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {user.activated ? (
                        <Link
                          to={`/create-escrow?seller=${encodeURIComponent(user.first_name + ' ' + user.last_name)}&seller_id=${user.id}`}
                          className="btn btn-primary btn-sm px-4"
                        >
                          {t('pages.create_escrow', 'Create Escrow')}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400 px-3">
                          {t('pages.not_verified', 'Not verified')}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Tips */}
        {!searchTerm && (
          <div className="card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              {t('pages.find_people', 'Find People')}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                  <Search className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{t('pages.instant_search', 'Instant Search')}</h4>
                  <p className="text-sm sm:text-base text-gray-600">
                    {t('pages.just_start_typing', 'Just start typing! Results appear instantly as you type, just like Facebook.')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{t('pages.create_escrows', 'Create Escrows')}</h4>
                  <p className="text-sm sm:text-base text-gray-600">
                    {t('pages.find_verified_users_and_create_secure_escrow_transactions', 'Find verified users and create secure escrow transactions with them.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default UserSearch;