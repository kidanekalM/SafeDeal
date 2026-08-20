import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  CreditCard,
  Loader2,
  RefreshCw,
  Award,
  Zap
} from "lucide-react";
import Layout from "../components/Layout";
import { useAuthStore } from "../store/authStore";
import { escrowApi } from "../lib/api";
import {
  formatCurrency,
  formatRelativeTime,
  getStatusColor,
} from "../lib/utils";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import AdminDashboard from "./AdminDashboard";
import GuidedTour from "../components/GuidedTour";
import VerifiedBadge from "../components/VerifiedBadge";
import { Button, Card } from "../components/ui";

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  if (user?.id === 2) {
    return <AdminDashboard />;
  }

  const [escrows, setEscrows] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    total_escrows: number;
    active_escrows: number;
    completed_escrows: number;
    disputed_escrows: number;
    total_amount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  const loadData = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setStatsLoading(true);
    }
    try {
      const response = await escrowApi.getMyEscrows();
      const payload: any = response.data;
      const list = Array.isArray(payload) ? payload : (payload?.escrows || []);

      const summary = payload?.summary;
      const computed = {
        total_escrows: list.length,
        active_escrows: list.filter((e: any) => e.status === 'pending' || e.status === 'funded').length,
        completed_escrows: list.filter((e: any) => e.status === 'completed').length,
        disputed_escrows: list.filter((e: any) => e.status === 'disputed').length,
        total_amount: list.reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
      };

      setEscrows(list);
      setStats({
        total_escrows: Number(summary?.total ?? computed.total_escrows),
        active_escrows: Number(summary?.active ?? computed.active_escrows),
        completed_escrows: Number(summary?.completed ?? computed.completed_escrows),
        disputed_escrows: Number(summary?.disputed ?? computed.disputed_escrows),
        total_amount: Number(summary?.total_amount ?? computed.total_amount),
      });
    } catch (err: any) {
      toast.error(t('pages.connection_failed', 'Connection failed. Showing last known data.'));
    } finally {
      setIsLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const nextActions = escrows.filter(e => {
    if (e.status === 'pending' && e.buyer_id === user?.id) return true;
    if (e.status === 'funded' && e.seller_id === user?.id && !e.active) return true;
    return false;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending": return <Clock className="h-4 w-4" />;
      case "Funded": return <Shield className="h-4 w-4" />;
      case "Released": return <CheckCircle className="h-4 w-4" />;
      case "Disputed": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <GuidedTour />
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 pb-12 sm:space-y-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-primary relative overflow-hidden rounded-2xl p-5 text-white shadow-md sm:p-8"
        >
          <div className="relative z-10">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                {t('pages.welcome', 'Welcome')}, {user?.first_name}!
              </h2>
              <VerifiedBadge isVerified={!!user?.activated} className="rounded-lg bg-white/20 px-2 py-1 text-white" />
            </div>
            <p className="max-w-md text-sm text-teal-50 opacity-90">
              {t('pages.your_secure_gateway_to_trust_based_transactions', 'Your secure gateway to trust-based transactions is active and protected.')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button to="/create-escrow" data-testid="create-escrow-button" className="bg-white text-[#014d46] shadow-md">
                <Zap size={18} />
                {t('pages.start_new_deal', 'Start New Deal')}
              </Button>
              <Button onClick={() => loadData()} variant="secondary" className="border border-teal-400/30 bg-teal-800/30 text-white hover:bg-teal-800/50">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                {t('pages.refresh', 'Refresh')}
              </Button>
            </div>
          </div>
          <Shield className="absolute -bottom-8 -right-8 h-56 w-56 rotate-12 text-white opacity-5" />
        </motion.div>

        {nextActions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
              <Clock size={14} className="text-orange-500" /> {t('pages.action_required', 'Action Required')}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {nextActions.map(action => (
                <Link key={action.id} to={`/escrow/${action.id}`} className="group flex items-center justify-between rounded-2xl border border-orange-100 bg-white p-4 transition-all hover:border-orange-200 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-orange-50 p-3 text-orange-600 transition-transform group-hover:scale-110">
                      {action.status === 'pending' ? <CreditCard size={20} /> : <CheckCircle size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {action.status === 'pending' ? t('pages.payment_needed', 'Payment Needed') : t('pages.acceptance_needed', 'Acceptance Needed')}
                      </p>
                      <p className="text-[10px] font-bold uppercase text-gray-400">
                        {action.title || `${t('pages.escrow_id', 'Escrow')} #${action.id}`} • {formatCurrency(action.amount)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-orange-200 transition-all group-hover:translate-x-1 group-hover:text-orange-500" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {[
            { label: t('pages.active_deals', 'Active Deals'), val: stats?.active_escrows, icon: Shield, color: 'text-teal-600' },
            { label: t('pages.completed', 'Completed'), val: stats?.completed_escrows, icon: CheckCircle, color: 'text-green-600' },
            { label: t('pages.total_volume', 'Total Volume'), val: formatCurrency(stats?.total_amount || 0), icon: TrendingUp, color: 'text-blue-600' },
            { label: t('pages.disputed', 'Disputed'), val: stats?.disputed_escrows, icon: AlertCircle, color: 'text-red-600' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Card padding="sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className={`rounded-xl bg-gray-50 p-2.5 ${s.color}`}><s.icon size={18} /></div>
                  {statsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-200" />}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900 sm:text-xl">{s.val ?? 0}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 xl:col-span-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">{t('pages.recent_transactions', 'Recent Transactions')}</h3>
              <Link to="/escrows" className="text-[10px] font-bold uppercase text-[#014d46] hover:underline">{t('pages.view_all_history', 'View All History')}</Link>
            </div>
            <Card padding="none" className="overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center"><LoadingSpinner /></div>
              ) : escrows.length === 0 ? (
                <div className="space-y-3 p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-300"><Shield size={28} /></div>
                  <p className="font-bold text-gray-400">{t('pages.no_transactions_found', 'No transactions found')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {escrows.slice(0, 5).map((escrow) => (
                    <Link key={escrow.id} to={`/escrow/${escrow.id}`} className="group flex items-center justify-between p-4 transition-colors hover:bg-gray-50 sm:p-5">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-xl p-2.5 ${getStatusColor(escrow.status)}`}>{getStatusIcon(escrow.status)}</div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{escrow.title || `${t('pages.escrow_id', 'Escrow')} #${escrow.id}`}</p>
                          <p className="text-[10px] font-bold uppercase text-gray-400">{formatRelativeTime(escrow.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(escrow.amount)}</p>
                        <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusColor(escrow.status)}`}>{escrow.status}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          <div className="space-y-3">
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">{t('pages.safedeal_hub', 'SafeDeal Hub')}</h3>
            <div className="group relative overflow-hidden rounded-2xl bg-[#014d46] p-5 text-white shadow-md sm:p-6">
              <div className="relative z-10">
                <Award className="mb-3 text-teal-300" size={28} />
                <h4 className="text-base font-bold leading-tight">{t('pages.become_a_top_rated_provider', 'Become a Top-Rated Provider')}</h4>
                <p className="mt-1.5 text-xs text-teal-100 opacity-80">{t('pages.complete_deals_without_disputes', 'Complete deals without disputes to increase your trust score and unlock lower fees.')}</p>
                <button className="mt-4 rounded-xl border border-teal-400/30 bg-teal-400/20 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-teal-400/40">
                  {t('pages.learn_more', 'Learn More')}
                </button>
              </div>
              <TrendingUp className="absolute -bottom-4 -right-4 h-28 w-28 text-white opacity-5 transition-transform group-hover:scale-110" />
            </div>

            <Card padding="sm">
              <h4 className="mb-3 text-sm font-bold text-gray-900">{t('pages.security_overview', 'Security Overview')}</h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <p className="text-xs font-semibold text-gray-600">{t('pages.encrypted_private_keys', 'Encrypted Private Keys')}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <p className="text-xs font-semibold text-gray-600">{t('pages.blockchain_audit_logging', 'Blockchain Audit Logging')}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <p className="text-xs font-semibold text-gray-600">{t('pages.ai_dispute_resolution_active', 'AI Dispute Resolution Active')}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;