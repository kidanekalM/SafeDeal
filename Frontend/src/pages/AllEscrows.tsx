import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
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

const AllEscrows = () => {
  const { t } = useTranslation();
  const {  } = useAuthStore();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchEscrows();
  }, []);

  const fetchEscrows = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await escrowApi.getMyEscrows();
      const payload: any = response.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.escrows)
        ? payload.escrows
        : [];
      setEscrows(list as Escrow[]);
    } catch (error: any) {
      setError(error.response?.data?.message || t('pages.error_loading_escrows', 'Failed to fetch escrows'));
      toast.error(t('pages.error_loading_escrows', 'Failed to load escrows'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchEscrows();
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

  const filteredEscrows = Array.isArray(escrows)
    ? escrows.filter((escrow) => {
        const term = searchTerm.trim().toLowerCase();
        const matchesSearch = !term
          ? true
          : escrow.id.toString().includes(term) ||
            escrow.title?.toLowerCase().includes(term) ||
            escrow.amount.toString().includes(term) ||
            (escrow.conditions || '').toLowerCase().includes(term);
        const matchesStatus = statusFilter === 'all' || escrow.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
    : [];

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
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 text-xs sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('pages.back_to_dashboard', 'Back to Dashboard')}</span>
            </Link>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{t('pages.my_escrows', 'My Escrows')}</h1>
            <p className="text-gray-600 mt-2">
              {t('pages.manage_all_your_escrow_transactions', 'Manage all your escrow transactions')}
            </p>
          </div>
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="btn btn-outline btn-md ml-8 sm:ml-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('pages.refresh', 'Refresh')}
            </button>
            <Link to="/create-escrow" className="btn btn-primary btn-md">
              <Plus className="h-4 w-4 mr-2" />
              {t('pages.create_escrow', 'Create Escrow')}
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('pages.search_placeholder', 'Search by ID, amount, or conditions...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-full"
              >
                <option value="all">{t('pages.all_status', 'All Status')}</option>
                <option value="Pending">{t('pages.pending', 'Pending')}</option>
                <option value="Funded">{t('pages.funded', 'Funded')}</option>
                <option value="Cancelled">{t('pages.cancelled', 'Cancelled')}</option>
                <option value="Refunded">{t('pages.refunded', 'Refunded')}</option>
                <option value="Released">{t('pages.released', 'Released')}</option>
                <option value="Disputed">{t('pages.disputed', 'Disputed')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="card p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {t('pages.error_loading_escrows', 'Error loading escrows')}
              </h4>
              <p className="text-gray-600 mb-4">{error}</p>
              <button onClick={fetchEscrows} className="btn btn-outline btn-sm">
                {t('pages.try_again', 'Try Again')}
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredEscrows.length === 0 && (
          <div className="card p-12">
            <div className="text-center">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-xl font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? t('pages.no_matching_escrows', 'No matching escrows') : t('pages.no_escrows_yet', 'No escrows yet')}
              </h4>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? t('pages.try_adjusting_search', 'Try adjusting your search or filter criteria.')
                  : t('pages.create_your_first_escrow', 'Create your first secure escrow transaction to get started.')
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Link to="/create-escrow" className="btn btn-primary btn-lg">
                  <Plus className="h-5 w-5 mr-2" />
                  {t('pages.create_your_first_escrow_btn', 'Create Your First Escrow')}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Escrows List */}
        {!isLoading && !error && filteredEscrows.length > 0 && (
          <div className="space-y-4">
            {filteredEscrows.map((escrow, idx) => {
              console.log("Escrow object:", escrow);
              const isQuick = !escrow.milestones || escrow.milestones.length === 0;
              const isPending = escrow.status === 'Pending';
              const isActive = escrow.status === 'Funded';
              
              let statusTestId = undefined;
              if (isQuick && isPending) statusTestId = 'escrow-card-quick-pending';
              else if (isActive) statusTestId = 'escrow-card-status-active';

              return (
                <motion.div
                  key={escrow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-testid={`escrow-card-${idx}`}
                  className="card p-4 sm:p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-3 rounded-full ${getStatusColor(escrow.status)}`}
                      >
                        {getStatusIcon(escrow.status)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {escrow.title || `${t('pages.escrow_id', 'Escrow')} #${escrow.id}`}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {escrow.created_at ? `${t('pages.created', 'Created')} ${formatRelativeTime(escrow.created_at)}` : `${t('pages.created', 'Created')} N/A`}
                        </p>
                        {escrow.conditions && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {escrow.conditions}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(escrow.amount)}
                      </p>
                      <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-2">
                        <span
                          data-testid={statusTestId}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            escrow.status
                          )}`}
                        >
                          {getStatusIcon(escrow.status)}
                          <span className="ml-1">{t(`pages.${escrow.status.toLowerCase()}`, escrow.status)}</span>
                        </span>
                        {escrow.milestones && escrow.milestones.length > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {escrow.milestones.length} {t('pages.milestones', 'Milestones')}
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/escrow/${escrow.id}`}
                        className="btn btn-outline btn-sm mt-3 w-full sm:w-auto"
                      >
                        {t('pages.view_details', 'View Details')}
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Stats Summary */}
        {!isLoading && !error && escrows.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('pages.summary', 'Summary')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{escrows.length}</p>
                <p className="text-sm text-gray-600">{t('pages.total_escrows', 'Total Escrows')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {escrows.filter(e => e.status === 'Pending' || e.status === 'Funded').length}
                </p>
                <p className="text-sm text-gray-600">{t('pages.active', 'Active')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {escrows.filter(e => e.status === 'Released').length}
                </p>
                <p className="text-sm text-gray-600">{t('pages.completed', 'Completed')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(escrows.reduce((sum, e) => sum + e.amount, 0))}
                </p>
                <p className="text-sm text-gray-600">{t('pages.total_volume', 'Total Volume')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AllEscrows;
