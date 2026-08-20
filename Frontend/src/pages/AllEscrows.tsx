import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Plus,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import { escrowApi } from '../lib/api';
import { formatCurrency, formatRelativeTime, getStatusColor } from '../lib/utils';
import { Escrow } from '../types';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { Card, Button, Input, Select, PageHeader } from '../components/ui';

const AllEscrows = () => {
  const { t } = useTranslation();
  const { } = useAuthStore();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchEscrows(true);
  }, []);

  const fetchEscrows = async (reset = false) => {
    if (reset) {
      setIsLoading(true);
      setPage(1);
    } else {
      setIsFetchingMore(true);
    }

    const currentPage = reset ? 1 : page;

    try {
      const response = await escrowApi.getMyEscrows(currentPage, itemsPerPage, statusFilter, searchTerm);
      const { data, meta } = response.data;

      const newItems = data || [];

      if (reset) {
        setEscrows(newItems);
      } else {
        setEscrows(prev => [...prev, ...newItems]);
      }

      setHasMore(newItems.length === itemsPerPage && (reset ? newItems.length : (escrows.length + newItems.length)) < meta.total);
    } catch (error: any) {
      setError(error.response?.data?.message || t('pages.error_loading_escrows', 'Failed to fetch escrows'));
      toast.error(t('pages.error_loading_escrows', 'Failed to load escrows'));
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || isFetchingMore || !hasMore) {
      return;
    }
    setPage(prevPage => prevPage + 1);
  }, [isFetchingMore, hasMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    setPage(1);
    fetchEscrows(true);
  }, [searchTerm, statusFilter]);

  const handleRefresh = async () => {
    setPage(1);
    await fetchEscrows(true);
    toast.success(t('pages.escrows_refreshed', 'Escrows refreshed'));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-4 w-4" />;
      case 'Funded':
        return <Shield className="h-4 w-4" />;
      case 'Released':
        return <CheckCircle className="h-4 w-4" />;
      case 'Cancelled':
        return <X className="h-4 w-4" />;
      case 'Refunded':
        return <RotateCcw className="h-4 w-4" />;
      case 'Disputed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredEscrows = escrows;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 pb-12 sm:py-8 sm:space-y-6">
        <PageHeader
          backTo="/dashboard"
          backLabel={t('pages.back_to_dashboard', 'Back to Dashboard')}
          title={t('pages.my_escrows', 'My Escrows')}
          subtitle={t('pages.manage_all_your_escrow_transactions', 'Manage all your escrow transactions')}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {t('pages.refresh', 'Refresh')}
              </Button>
              <Button to="/create-escrow" size="sm">
                <Plus className="h-4 w-4" />
                {t('pages.create_escrow', 'Create Escrow')}
              </Button>
            </>
          }
        />

        <Card padding="sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder={t('pages.search_placeholder', 'Search by ID, amount, or conditions...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="md:w-44"
            >
              <option value="all">{t('pages.all_status', 'All Status')}</option>
              <option value="Pending">{t('pages.pending', 'Pending')}</option>
              <option value="Funded">{t('pages.funded', 'Funded')}</option>
              <option value="Cancelled">{t('pages.cancelled', 'Cancelled')}</option>
              <option value="Refunded">{t('pages.refunded', 'Refunded')}</option>
              <option value="Released">{t('pages.released', 'Released')}</option>
              <option value="Disputed">{t('pages.disputed', 'Disputed')}</option>
            </Select>
          </div>
        </Card>

        {error && (
          <Card padding="md">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
              <h4 className="mb-1 text-lg font-semibold text-gray-900">
                {t('pages.error_loading_escrows', 'Error loading escrows')}
              </h4>
              <p className="mb-4 text-sm text-gray-600">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchEscrows(true)}>
                {t('pages.try_again', 'Try Again')}
              </Button>
            </div>
          </Card>
        )}

        {!error && filteredEscrows.length === 0 && (
          <Card padding="md">
            <div className="py-8 text-center">
              <Shield className="mx-auto mb-3 h-14 w-14 text-gray-300" />
              <h4 className="mb-1 text-lg font-semibold text-gray-900">
                {searchTerm || statusFilter !== 'all' ? t('pages.no_matching_escrows', 'No matching escrows') : t('pages.no_escrows_yet', 'No escrows yet')}
              </h4>
              <p className="mb-5 text-sm text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? t('pages.try_adjusting_search', 'Try adjusting your search or filter criteria.')
                  : t('pages.create_your_first_escrow', 'Create your first secure escrow transaction to get started.')
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button to="/create-escrow">
                  <Plus className="h-5 w-5" />
                  {t('pages.create_your_first_escrow_btn', 'Create Your First Escrow')}
                </Button>
              )}
            </div>
          </Card>
        )}

        {!error && filteredEscrows.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {filteredEscrows.map((escrow, idx) => {
              const isQuick = !escrow.milestones || escrow.milestones.length === 0;
              const isPending = escrow.status === 'pending';
              const isActive = escrow.status === 'funded';

              let statusTestId = undefined;
              if (isQuick && isPending) statusTestId = 'escrow-card-quick-pending';
              else if (isActive) statusTestId = 'escrow-card-status-active';

              return (
                <motion.div
                  key={escrow.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-testid={`escrow-card-${idx}`}
                >
                  <Card padding="sm" className="hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${getStatusColor(escrow.status)}`}>
                          {getStatusIcon(escrow.status)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-gray-900 max-w-[200px] sm:max-w-md">
                            {escrow.title || `${t('pages.escrow_id', 'Escrow')} #${escrow.id}`}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatRelativeTime(escrow.created_at || escrow.CreatedAt || new Date().toISOString())}
                          </p>
                          {escrow.Conditions && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                              {escrow.Conditions}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(escrow.amount)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            data-testid={statusTestId}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(
                              escrow.status
                            )}`}
                          >
                            {getStatusIcon(escrow.status)}
                            <span>{t(`pages.${escrow.status.toLowerCase()}`, escrow.status)}</span>
                          </span>
                          {escrow.milestones && escrow.milestones.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                              <CheckCircle className="h-3 w-3" />
                              {escrow.milestones.length} {t('pages.milestones', 'Milestones')}
                            </span>
                          )}
                        </div>
                        <Button
                          to={`/escrow/${escrow.id}`}
                          variant="outline"
                          size="sm"
                          className="mt-2.5 w-full sm:w-auto"
                        >
                          {t('pages.view_details', 'View Details')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            {isFetchingMore && (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            )}

            {!hasMore && (
              <div className="py-3 text-center text-sm text-gray-500">
                {t('pages.no_more_escrows', 'No more escrows to load')}
              </div>
            )}
          </div>
        )}

        {!error && escrows.length > 0 && (
          <Card padding="sm">
            <h3 className="mb-3 text-base font-semibold text-gray-900">
              {t('pages.summary', 'Summary')}
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{escrows.length}</p>
                <p className="text-xs text-gray-600">{t('pages.total_escrows', 'Total Escrows')}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">
                  {escrows.filter(e => e.status === 'pending' || e.status === 'funded').length}
                </p>
                <p className="text-xs text-gray-600">{t('pages.active', 'Active')}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">
                  {escrows.filter(e => e.status === 'completed').length}
                </p>
                <p className="text-xs text-gray-600">{t('pages.completed', 'Completed')}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(escrows.reduce((sum, e) => sum + e.amount, 0))}
                </p>
                <p className="text-xs text-gray-600">{t('pages.total_volume', 'Total Volume')}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default AllEscrows;