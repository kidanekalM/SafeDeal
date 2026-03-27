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

const Dashboard = () => {
  useTranslation();
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
        active_escrows: list.filter((e: any) => e.status === 'Pending' || e.status === 'Funded').length,
        completed_escrows: list.filter((e: any) => e.status === 'Released').length,
        disputed_escrows: list.filter((e: any) => e.status === 'Disputed').length,
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
      toast.error("Connection failed. Showing last known data.");
    } finally {
      setIsLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const nextActions = escrows.filter(e => {
    if (e.status === 'Pending' && e.buyer_id === user?.id) return true;
    if (e.status === 'Funded' && e.seller_id === user?.id && !e.active) return true;
    return false;
  });

  // Calculate Trust Score (Use value from backend if available)
  const trustScore = user?.trust_score ?? Math.min(100, (stats?.completed_escrows || 0) * 10 + 65);

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
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Welcome & Trust Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 gradient-primary rounded-[2rem] p-8 text-white shadow-2xl shadow-[#014d46]/20 relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-white">Welcome, {user?.first_name}!</h2>
                <VerifiedBadge isVerified={!!user?.activated} className="bg-white/20 px-2 py-1 rounded-lg text-white" />
              </div>
              <p className="text-teal-50 opacity-90 max-w-md">Your secure gateway to trust-based transactions is active and protected.</p>
              <div className="mt-8 flex gap-4">
                <Link to="/create-escrow" className="bg-white text-[#014d46] px-6 py-3 rounded-2xl font-bold hover:bg-teal-50 transition-all flex items-center gap-2 shadow-xl">
                  <Zap size={18} /> Start New Deal
                </Link>
                <button onClick={() => loadData()} className="bg-teal-800/30 text-white px-6 py-3 rounded-2xl font-bold hover:bg-teal-800/50 transition-all flex items-center gap-2 border border-teal-400/30">
                  <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
            </div>
            <Shield className="absolute -right-8 -bottom-8 h-64 w-64 text-white opacity-5 rotate-12" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[2rem] p-8 border-2 border-teal-50 shadow-xl flex flex-col justify-center items-center text-center"
          >
            <div className="relative w-24 h-24 mb-4">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#014d46]" strokeWidth="3" strokeDasharray={`${trustScore}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-[#014d46]">{trustScore}</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Trust Score</span>
              </div>
            </div>
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <Award className="text-yellow-500" size={18} /> Verified Professional
            </h4>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-black opacity-60">Level 1 Member</p>
          </motion.div>
        </div>

        {/* Next Action Required */}
        {nextActions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Clock size={14} className="text-orange-500" /> Action Required
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nextActions.map(action => (
                <Link key={action.id} to={`/escrow/${action.id}`} className="bg-white border-2 border-orange-100 rounded-3xl p-5 flex items-center justify-between hover:shadow-xl hover:border-orange-200 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-50 rounded-2xl text-orange-600 group-hover:scale-110 transition-transform">
                      {action.status === 'Pending' ? <CreditCard size={22} /> : <CheckCircle size={22} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{action.status === 'Pending' ? 'Payment Needed' : 'Acceptance Needed'}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Escrow #{action.id} • {formatCurrency(action.amount)}</p>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-orange-200 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Active Deals', val: stats?.active_escrows, icon: Shield, color: 'text-teal-600' },
            { label: 'Completed', val: stats?.completed_escrows, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Total Volume', val: formatCurrency(stats?.total_amount || 0), icon: TrendingUp, color: 'text-blue-600' },
            { label: 'Disputed', val: stats?.disputed_escrows, icon: AlertCircle, color: 'text-red-600' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="bg-white p-6 rounded-[2rem] border-2 border-gray-50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-gray-50 ${s.color}`}><s.icon size={20} /></div>
                {statsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-200" />}
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-xl font-black text-gray-900 mt-1">{s.val ?? 0}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Recent Transactions</h3>
              <Link to="/escrows" className="text-[10px] font-black text-[#014d46] uppercase hover:underline">View All History</Link>
            </div>
            <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-20 text-center"><LoadingSpinner /></div>
              ) : escrows.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-300"><Shield size={32} /></div>
                  <p className="text-gray-400 font-bold">No transactions found</p>
                </div>
              ) : (
                <div className="divide-y-2 divide-gray-50">
                  {escrows.slice(0, 5).map((escrow) => (
                    <Link key={escrow.id} to={`/escrow/${escrow.id}`} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${getStatusColor(escrow.status)}`}>{getStatusIcon(escrow.status)}</div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">Escrow #{escrow.id}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{formatRelativeTime(escrow.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900">{formatCurrency(escrow.amount)}</p>
                        <p className={`text-[8px] font-black uppercase px-2 py-1 rounded-full inline-block mt-1 ${getStatusColor(escrow.status)}`}>{escrow.status}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Support / Info */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-2">SafeDeal Hub</h3>
            <div className="bg-[#014d46] rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="relative z-10">
                <Award className="text-teal-300 mb-4" size={32} />
                <h4 className="text-lg font-black leading-tight">Become a Top-Rated Provider</h4>
                <p className="text-teal-100 text-xs mt-2 opacity-80">Complete deals without disputes to increase your trust score and unlock lower fees.</p>
                <button className="mt-6 text-[10px] font-black uppercase tracking-widest bg-teal-400/20 py-2 px-4 rounded-xl border border-teal-400/30 hover:bg-teal-400/40 transition-all">Learn More</button>
              </div>
              <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 text-white opacity-5 group-hover:scale-110 transition-transform" />
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border-2 border-gray-50 shadow-sm">
              <h4 className="font-black text-gray-900 text-sm mb-4">Security Overview</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <p className="text-xs font-bold text-gray-600">Encrypted Private Keys</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <p className="text-xs font-bold text-gray-600">Blockchain Audit Logging</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <p className="text-xs font-bold text-gray-600">AI Dispute Resolution Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;