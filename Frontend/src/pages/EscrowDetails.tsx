import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MessageCircle,
  FileText,
  Edit3,
  Download,
  Lock,
  Zap,
  Scale,
  Printer,
  ExternalLink,
  Info,
  History,
  AlertTriangle
} from "lucide-react";
import { milestoneApi } from "../lib/api";
import type { Milestone } from "../types";
import Layout from "../components/Layout";
import { useAuthStore } from "../store/authStore";
import { escrowApi, paymentApi } from "../lib/api";
import { formatCurrency, getStatusColor } from "../lib/utils";
import { Escrow, EscrowPayment } from "../types";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import RealTimeChat from "../components/RealTimeChat";
import PaymentModal from "../components/PaymentModal";
import { AnimatePresence, motion } from "framer-motion";

const formatDateSafe = (date: string | number | Date | null | undefined) => {
  if (!date) return "Unknown date";
  let d: Date;
  if (typeof date === "string") {
    const normalized = date.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1");
    d = new Date(normalized);
  } else {
    d = new Date(date);
  }
  if (isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const EscrowDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [payment, setPayment] = useState<EscrowPayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCBEModal, setShowCBEModal] = useState(false);
  const [cbeTransactionId, setCbeTransactionId] = useState("");
  const [cbeAccountSuffix, setCbeAccountSuffix] = useState("");
  const [isVerifyingCBE, setIsVerifyingCBE] = useState(false);
  const [editConditions, setEditConditions] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [disputeReason, setDisputeReason] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const [isBackendBusy, setIsBackendBusy] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  const isBuyer = Number(user?.id) === Number(escrow?.buyer_id);
  const isSeller = Number(user?.id) === Number(escrow?.seller_id);
  const isMediator = Number(user?.id) === Number(escrow?.mediator_id);

  const fetchEscrowDetails = async (retryCount = 0) => {
    if (!id) return;
    if (errorCount > 5) {
      toast.error(t('pages.backend_issues', "🚫 Backend is experiencing issues."));
      return;
    }
    const escrowId = parseInt(id);
    if (isNaN(escrowId)) return;
    if (retryCount === 0) setIsLoading(true);
    try {
      const response = await escrowApi.getById(escrowId);
      const rawData = response.data as any;
      console.log("DEBUG: Escrow Data:", JSON.stringify({ 
        status: rawData.status || rawData.Status, 
        active: rawData.active !== undefined ? rawData.active : rawData.Active,
        user_id: user?.id,
        escrow_seller_id: rawData.seller_id || rawData.SellerID,
        isSeller: Number(user?.id) === Number(rawData.seller_id || rawData.SellerID)
      }));
      setEscrow({
        ...rawData,
        id: rawData.id || rawData.ID,
        buyer_id: rawData.buyer_id || rawData.BuyerID,
        seller_id: rawData.seller_id || rawData.SellerID,
        mediator_id: rawData.mediator_id || rawData.MediatorID,
        amount: rawData.amount || rawData.Amount,
        platform_fee: rawData.platform_fee || rawData.PlatformFee,
        status: rawData.status || rawData.Status,
        active: rawData.active !== undefined ? rawData.active : rawData.Active,
        is_locked: rawData.is_locked !== undefined ? rawData.is_locked : rawData.IsLocked,
        created_at: rawData.created_at || rawData.CreatedAt,
        updated_at: rawData.updated_at || rawData.UpdatedAt,
        blockchain_tx_hash: rawData.blockchain_tx_hash || rawData.BlockchainTxHash,
      });
      setErrorCount(0);
      
      // Fetch status history if available
      try {
        const historyRes = await escrowApi.getStatusHistory(escrowId);
        setStatusHistory(historyRes.data || []);
      } catch (e) { /* ignore */ }
      
    } catch (error: any) {
      setErrorCount(prev => prev + 1);
      toast.error(t('pages.escrow_fetch_failed', "Failed to fetch escrow details."));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAccept = async () => {
    try {
      await escrowApi.accept(Number(id));
      toast.success(t('pages.escrow_accepted_success', "Escrow accepted!"));
      fetchEscrowDetails();
    } catch (error) {
      toast.error(t('pages.escrow_accept_failed', "Failed to accept escrow."));
    }
  };

  const handleConfirmReceipt = async () => {
    try {
      await escrowApi.confirmReceipt(Number(id));
      toast.success(t('pages.receipt_confirmed_toast', "Receipt confirmed!"));
      fetchEscrowDetails();
    } catch (error) {
      toast.error(t('pages.receipt_confirm_failed', "Failed to confirm receipt."));
    }
  };

  const handleInitiatePayment = async () => {
    let profile: any = {};
    try { profile = JSON.parse(localStorage.getItem("user_profile") || "{}"); } catch {}
    if (!profile?.phone_number) { setPhoneNumber(""); setShowPhoneModal(true); return; }
    try {
      const response = await paymentApi.initiateEscrowPayment(Number(id));
      setPayment(response.data); setShowPayment(true);
    } catch (error) { toast.error(t('pages.payment_initiate_failed', "Failed to initiate payment")); }
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 10) return;
    try {
      const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
      localStorage.setItem("user_profile", JSON.stringify({ ...profile, phone_number: phoneNumber }));
    } catch {}
    setShowPhoneModal(false);
    handleInitiatePayment();
  };

  const handleDisputeSubmit = async () => {
    if (!disputeReason || disputeReason.length < 10) return;
    try {
      await escrowApi.dispute(Number(id), disputeReason);
      toast.success(t('pages.dispute_created_success', "Disputed!"));
      setShowDisputeModal(false);
      fetchEscrowDetails();
    } catch (error) { toast.error(t('pages.dispute_create_failed', "Failed to dispute")); }
  };

  const handleEditSubmit = async () => {
    if (!editConditions || editConditions.length < 10) return;
    try {
      await escrowApi.update(Number(id), { amount: editAmount, conditions: editConditions });
      toast.success(t('pages.terms_updated', "Updated!"));
      setShowEditModal(false);
      fetchEscrowDetails();
    } catch (error) { toast.error(t('pages.terms_update_failed', "Failed update")); }
  };

  const handleLock = async () => {
    try {
      await escrowApi.lock(Number(id));
      toast.success(t('pages.terms_locked', "Locked!"));
      fetchEscrowDetails();
    } catch (error) { toast.error(t('pages.terms_lock_failed', "Failed lock")); }
  };

  const handleCBEVerify = async () => {
    if (!cbeTransactionId || !cbeAccountSuffix) {
      toast.error(t('pages.fill_all_fields', "Please fill all fields"));
      return;
    }
    setIsVerifyingCBE(true);
    try {
      await escrowApi.verifyCBE(Number(id), cbeTransactionId, cbeAccountSuffix);
      toast.success(t('pages.payment_verified_success', "Payment verified successfully!"));
      setShowCBEModal(false);
      fetchEscrowDetails();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t('pages.verification_failed', "Verification failed"));
    } finally {
      setIsVerifyingCBE(false);
    }
  };

  useEffect(() => { if (id) fetchEscrowDetails(); }, [id]);

  useEffect(() => {
    if (escrow?.id) {
      setLoadingMilestones(true);
      milestoneApi.getByEscrow(escrow.id)
        .then((res) => setMilestones(res.data))
        .catch(() => {})
        .finally(() => setLoadingMilestones(false));
    }
  }, [escrow?.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
      case "Verifying": return <Clock className="h-5 w-5" />;
      case "Funded": return <Shield className="h-5 w-5" />;
      case "Released": return <CheckCircle className="h-5 w-5" />;
      case "Disputed": return <AlertCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const handleDownloadAgreement = async () => {
    if (!escrow) return;
    try {
      const response = await escrowApi.downloadFinalAgreement(escrow.id);
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `escrow-${escrow.id}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('pages.agreement_download_success', "Downloaded!"));
    } catch (error) { toast.error(t('pages.agreement_download_failed', "Failed download")); }
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;
  if (!escrow) return <Layout><div className="p-12 text-center">{t('pages.escrow_not_found', "Not found")}</div></Layout>;

  return (
    <Layout>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; background: white; }
          .no-print { display: none !important; }
          .card { border: 1px solid #eee !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto pb-12 px-4 sm:px-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 no-print">
          <Link to="/escrows" className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>{t('pages.back_to_my_escrows', 'Back to My Escrows')}</span>
          </Link>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint} 
              className="btn btn-outline border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-4 flex items-center gap-2"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">{t('pages.print_contract', 'Print Contract')}</span>
            </button>
            <button 
              onClick={() => setShowChat(true)} 
              className="btn btn-primary rounded-xl px-4 flex items-center gap-2 shadow-lg shadow-primary-500/20"
            >
              <MessageCircle size={18} />
              <span>{t('pages.open_chat', 'Chat')}</span>
            </button>
          </div>
        </div>

        <div id="printable-area" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Main Info Card */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-8 sm:p-10 border-b border-gray-100 bg-gradient-to-br from-white to-gray-50">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="text-primary-600 h-6 w-6" />
                      <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight uppercase">{t('pages.safedeal_escrow', 'SafeDeal')} #{escrow.id}</h1>
                    </div>
                    <p className="text-gray-500 font-medium flex items-center gap-2">
                      <Clock size={16} /> {t('pages.initiated_on', 'Initiated on')} {formatDateSafe(escrow.created_at)}
                    </p>
                  </div>
                  <div className={`px-6 py-2 rounded-2xl text-sm font-black tracking-widest uppercase border-2 ${getStatusColor(escrow.status)}`}>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(escrow.status)}
                      {t(`pages.${escrow.status.toLowerCase()}`, escrow.status)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-10 space-y-10">
                {/* Financial Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">{t('pages.transaction_amount', 'Transaction Amount')}</label>
                    <p className="text-3xl font-black text-gray-900">{formatCurrency(escrow.amount)}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('pages.fiat_currency_etb', 'In Ethiopian Birr (ETB)')}</p>
                  </div>
                  <div className="p-6 bg-[#014d46] rounded-3xl text-white shadow-xl shadow-primary-900/10">
                    <label className="text-xs font-black opacity-60 uppercase tracking-widest block mb-2">{t('pages.total_secured', 'Total Secured Value')}</label>
                    <p className="text-3xl font-black">{formatCurrency(escrow.amount + (escrow.platform_fee || 0))}</p>
                    <p className="text-xs opacity-60 mt-1">{t('pages.includes_platform_fee', 'Includes processing fees')}</p>
                  </div>
                </div>

                {/* Agreement Terms */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="text-primary-600" size={20} />
                    {t('pages.legal_agreement_terms', 'Agreement Terms')}
                  </h3>
                  <div className="p-8 bg-white border-2 border-gray-100 rounded-[2rem] relative">
                    {!escrow.is_locked && (
                      <div className="absolute top-4 right-4 no-print">
                        <span className="badge badge-warning flex items-center gap-1 text-[10px] uppercase font-black px-3 py-1">
                          <AlertTriangle size={10} /> {t('pages.draft_stage', 'Draft')}
                        </span>
                      </div>
                    )}
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap italic font-serif text-lg">
                      "{escrow.conditions || t('pages.no_conditions_provided', 'No specific conditions provided.')}"
                    </p>
                  </div>
                </div>

                {/* Milestones */}
                {milestones.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Zap className="text-primary-600" size={20} />
                      {t('pages.delivery_milestones', 'Delivery Milestones')}
                    </h3>
                    <div className="space-y-4">
                      {milestones.map((m, idx) => (
                        <div key={m.id} className="group p-6 bg-white border border-gray-100 rounded-3xl hover:border-primary-200 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500">{idx + 1}</span>
                              <h4 className="font-bold text-gray-900">{m.title}</h4>
                            </div>
                            <span className="text-lg font-black text-[#014d46]">{formatCurrency(m.amount)}</span>
                          </div>
                          {m.description && <p className="text-sm text-gray-600 ml-11 mb-3">{m.description}</p>}
                          <div className="flex items-center gap-4 ml-11 text-xs">
                            <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-widest ${m.status === 'Released' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {m.status}
                            </span>
                            {m.due_date && <span className="text-gray-400 font-medium">Due: {new Date(m.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legal Signatures - only visible on print */}
                <div className="hidden print:block pt-20">
                  <h3 className="text-xl font-bold border-b-2 border-gray-900 pb-2 mb-12 uppercase tracking-[0.2em]">{t('pages.official_endorsement', 'Official Endorsement')}</h3>
                  <div className="grid grid-cols-2 gap-16">
                    <div className="space-y-4">
                      <div className="border-b border-black h-12" />
                      <div>
                        <p className="font-black uppercase text-xs">{t('pages.buyer_signature', 'Buyer / Purchaser')}</p>
                        <p className="text-[10px] text-gray-500">{escrow.buyer?.first_name} {escrow.buyer?.last_name} ({escrow.buyer?.email})</p>
                        <p className="text-[10px] text-gray-500">Date: ____________________</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="border-b border-black h-12" />
                      <div>
                        <p className="font-black uppercase text-xs">{t('pages.seller_signature', 'Seller / Provider')}</p>
                        <p className="text-[10px] text-gray-500">{escrow.seller?.first_name} {escrow.seller?.last_name} ({escrow.seller?.email})</p>
                        <p className="text-[10px] text-gray-500">Date: ____________________</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-16 pt-8 border-t border-gray-100 text-[8px] text-gray-400 leading-tight">
                    <p>{t('pages.print_footer_info', 'This document was digitally generated by SafeDeal Escrow Platform. All terms are protected by hybrid blockchain audit logs.')}</p>
                    <p>Escrow Hash: {escrow.blockchain_tx_hash || 'PENDING_SECURE_LOG'}</p>
                  </div>
                </div>
                
                {/* Blockchain Proof */}
                {escrow.blockchain_tx_hash && (
                  <div className="p-8 bg-gray-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full -translate-y-32 translate-x-32 blur-3xl group-hover:bg-primary-500/20 transition-all duration-700" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary-600 rounded-xl">
                          <Shield size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold uppercase tracking-tight">{t('pages.tamper_proof_record', 'Tamper-Proof Record')}</h3>
                          <p className="text-xs text-primary-400 font-black tracking-widest">{t('pages.on_ethereum_sepolia', 'ON ETHEREUM SEPOLIA TESTNET')}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-colors">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 block">{t('pages.transaction_hash', 'Transaction Hash')}</label>
                          <div className="flex items-center justify-between gap-4">
                            <code className="text-xs text-primary-300 break-all font-mono">{escrow.blockchain_tx_hash}</code>
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${escrow.blockchain_tx_hash}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors shrink-0 no-print"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50 font-medium italic">
                          <Info size={14} />
                          {t('pages.blockchain_verified_desc', 'This agreement is permanently logged on the blockchain for auditability.')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions Card - Mobile Friendly */}
            <div className="no-print bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 sm:p-10">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 text-center">{t('pages.available_actions', 'Available Actions')}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isBuyer && escrow.status === "Pending" && (
                  <>
                    <button onClick={handleInitiatePayment} className="btn btn-primary btn-lg rounded-2xl flex flex-col items-center py-6 h-auto gap-2 group">
                      <Zap size={28} className="group-hover:scale-110 transition-transform" />
                      <span className="font-black uppercase tracking-widest text-xs">{t('components.pay_with_chapa', 'Pay with Chapa')}</span>
                    </button>
                    <button onClick={() => setShowCBEModal(true)} className="btn btn-outline border-gray-200 btn-lg rounded-2xl flex flex-col items-center py-6 h-auto gap-2 hover:bg-gray-50">
                      <Shield size={28} className="text-primary-600" />
                      <span className="font-black uppercase tracking-widest text-xs text-gray-600">{t('pages.cbe_direct_verify', 'CBE Direct Verify')}</span>
                    </button>
                  </>
                )}
                
                {isSeller && !escrow.active && escrow.status === "Funded" && (
                  <button onClick={handleAccept} className="sm:col-span-2 btn btn-primary btn-lg w-full rounded-2xl py-6 font-black uppercase tracking-widest shadow-xl shadow-primary-500/20">
                    {t('pages.accept_funded_escrow', "Accept Funded Escrow")}
                  </button>
                )}
                
                {isBuyer && escrow.active && escrow.status === "Funded" && (
                  <button onClick={handleConfirmReceipt} className="sm:col-span-2 btn btn-success btn-lg w-full rounded-2xl py-6 font-black uppercase tracking-widest shadow-xl shadow-green-500/20">
                    <CheckCircle className="mr-2" /> {t('pages.confirm_receipt', "Confirm & Release Funds")}
                  </button>
                )}

                {/* Edit Section */}
                {!escrow.is_locked && (isBuyer || isSeller) && (
                  <div className="sm:col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-4">
                    <button 
                      onClick={() => { setEditConditions(escrow.conditions || ""); setEditAmount(escrow.amount); setShowEditModal(true); }} 
                      className="btn btn-outline border-gray-200 rounded-xl gap-2 h-12 text-sm font-bold"
                    >
                      <Edit3 size={16} /> {t('pages.edit_terms', 'Edit Terms')}
                    </button>
                    <button 
                      onClick={handleLock} 
                      className="btn btn-primary rounded-xl gap-2 h-12 text-sm font-bold shadow-lg shadow-primary-500/20"
                    >
                      <Lock size={16} /> {t('pages.lock_and_agree', 'Lock & Agree')}
                    </button>
                  </div>
                )}
                
                {(isBuyer || isSeller) && escrow.active && escrow.status === "Funded" && (
                  <button onClick={() => setShowDisputeModal(true)} className="sm:col-span-2 btn btn-outline border-red-100 text-red-600 hover:bg-red-50 btn-lg w-full rounded-2xl py-4 font-bold">
                    <AlertCircle className="mr-2" /> {t('pages.raise_dispute', "Raise Formal Dispute")}
                  </button>
                )}
                
                {escrow.status === "Released" && (
                  <button onClick={handleDownloadAgreement} className="sm:col-span-2 btn btn-secondary btn-lg w-full flex items-center justify-center gap-2 rounded-2xl py-6 font-black uppercase tracking-widest">
                    <Download size={20} /> {t('pages.download_final_agreement', "Official Agreement PDF")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            {/* Participants Card */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -translate-y-16 translate-x-16" />
              <h3 className="text-xl font-black text-gray-900 mb-8 relative z-10">{t('pages.the_parties', 'The Parties')}</h3>
              
              <div className="space-y-8 relative z-10">
                {/* Buyer */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 shadow-sm border border-blue-100">
                    <User size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{t('pages.buyer_role', 'Purchaser / Buyer')}</p>
                    <p className="font-bold text-gray-900 truncate">
                      {isBuyer ? t('pages.you', 'You') : (escrow.buyer?.first_name ? `${escrow.buyer.first_name} ${escrow.buyer.last_name}` : t('pages.pending_user', 'Pending...'))}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{isBuyer ? user?.email : (escrow.buyer?.email || t('pages.invited_user', 'Invited via Email'))}</p>
                  </div>
                </div>

                {/* Seller */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shrink-0 shadow-sm border border-green-100">
                    <User size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">{t('pages.seller_role', 'Provider / Seller')}</p>
                    <p className="font-bold text-gray-900 truncate">
                      {isSeller ? t('pages.you', 'You') : (escrow.seller?.first_name ? `${escrow.seller.first_name} ${escrow.seller.last_name}` : t('pages.pending_user', 'Pending...'))}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{isSeller ? user?.email : (escrow.seller?.email || t('pages.invited_user', 'Invited via Email'))}</p>
                  </div>
                </div>

                {/* Mediator */}
                {escrow.mediator_id && (
                  <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                      <Scale size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-0.5">{t('pages.mediator_role', 'Assigned Mediator')}</p>
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {isMediator ? t('pages.you', 'You') : (escrow.mediator?.first_name ? `${escrow.mediator.first_name} ${escrow.mediator.last_name}` : t('pages.official_mediator', 'SafeDeal Official'))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Compliance Card */}
            {(escrow.jurisdiction || escrow.governing_law || escrow.dispute_resolution) && (
              <div className="bg-[#f8fafc] rounded-[2rem] shadow-xl border border-gray-200 p-8">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Scale className="text-primary-600 h-5 w-5" />
                  {t('pages.legal_framework', 'Framework')}
                </h3>
                <div className="space-y-6">
                  {escrow.jurisdiction && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.jurisdiction', 'Jurisdiction')}</label>
                      <p className="text-sm font-bold text-gray-700">{escrow.jurisdiction}</p>
                    </div>
                  )}
                  {escrow.governing_law && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.governing_law', 'Governing Law')}</label>
                      <p className="text-sm font-bold text-gray-700">{escrow.governing_law}</p>
                    </div>
                  )}
                  {escrow.dispute_resolution && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.resolution_method', 'Resolution Method')}</label>
                      <p className="text-sm font-bold text-primary-700 flex items-center gap-1">
                        <Zap size={12} /> {escrow.dispute_resolution}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Card */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8">
              <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                <History className="text-primary-600 h-5 w-5" />
                {t('pages.activity_log', 'Activity Log')}
              </h3>
              <div className="space-y-6">
                <div className="relative pl-6 border-l-2 border-primary-500 py-1">
                  <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-primary-500 rounded-full border-4 border-white" />
                  <p className="text-xs font-black text-primary-600 uppercase tracking-widest">{t('pages.created', 'Created')}</p>
                  <p className="text-[10px] text-gray-500">{formatDateSafe(escrow.created_at)}</p>
                </div>
                {statusHistory.map((h, i) => (
                  <div key={i} className="relative pl-6 border-l-2 border-gray-200 py-1">
                    <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-300 rounded-full" />
                    <p className="text-xs font-bold text-gray-700 uppercase">{h.status}</p>
                    <p className="text-[10px] text-gray-500">{formatDateSafe(h.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <RealTimeChat isOpen={showChat} onClose={() => setShowChat(false)} escrowId={Number(id)} />
        <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} amount={escrow.amount} paymentUrl={payment?.payment_url} onPaymentComplete={() => fetchEscrowDetails()} />

        <AnimatePresence>
          {showPhoneModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm no-print">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                <h3 className="text-2xl font-black mb-2">{t('pages.contact_verification', 'Verification')}</h3>
                <p className="text-sm text-gray-500 mb-6">{t('pages.phone_needed_for_payment', 'We need your phone number for Chapa integration.')}</p>
                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="input w-full mb-6 h-14 rounded-2xl text-xl font-bold text-center tracking-widest" placeholder="0911..." />
                <div className="flex gap-3">
                  <button onClick={() => setShowPhoneModal(false)} className="flex-1 btn btn-ghost rounded-2xl h-14 font-bold">{t('pages.cancel', 'Cancel')}</button>
                  <button onClick={handlePhoneSubmit} className="flex-1 btn btn-primary rounded-2xl h-14 font-black shadow-lg shadow-primary-500/20">{t('pages.continue', 'Continue')}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {showDisputeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-md no-print">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-2">{t('pages.initiate_dispute', 'Initiate Dispute')}</h3>
              <p className="text-gray-500 mb-8">{t('pages.dispute_warning', 'Raising a dispute will freeze the funds and notify our arbitration team.')}</p>
              <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl mb-6 focus:border-red-500 outline-none transition-all h-40" placeholder={t('pages.describe_issue', 'Detailed reason for dispute...')} />
              <div className="flex gap-4">
                <button onClick={() => setShowDisputeModal(false)} className="flex-1 btn btn-ghost h-14 rounded-2xl font-bold">{t('pages.cancel', 'Cancel')}</button>
                <button onClick={handleDisputeSubmit} className="flex-1 btn bg-red-600 hover:bg-red-700 text-white h-14 rounded-2xl font-black uppercase tracking-widest">{t('pages.submit_dispute', 'Freeze & Dispute')}</button>
              </div>
            </motion.div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-md no-print">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl">
              <h3 className="text-3xl font-black text-gray-900 mb-8">{t('pages.revise_escrow_terms', 'Revise Terms')}</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 block">{t('pages.updated_transaction_amount', 'New Amount (ETB)')}</label>
                  <input type="number" className="input w-full h-16 rounded-2xl text-2xl font-black pl-6" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 block">{t('pages.updated_conditions', 'Contractual Conditions')}</label>
                  <textarea rows={6} className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-primary-500 outline-none transition-all" value={editConditions} onChange={e => setEditConditions(e.target.value)} />
                </div>
                <div className="flex gap-4 pt-6">
                  <button onClick={() => setShowEditModal(false)} className="flex-1 btn btn-ghost h-14 rounded-2xl font-bold">{t('pages.discard_changes', 'Discard')}</button>
                  <button onClick={handleEditSubmit} className="flex-1 btn btn-primary h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-500/20">{t('pages.apply_revisions', 'Apply Revisions')}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showCBEModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-md no-print">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Shield size={32} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-2">{t('pages.cbe_verification', 'CBE Verification')}</h3>
              <p className="text-gray-500 mb-8">{t('pages.cbe_verify_desc', 'Enter the transaction ID and your account suffix to verify payment.')}</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Transaction ID</label>
                  <input type="text" value={cbeTransactionId} onChange={e => setCbeTransactionId(e.target.value)} className="input w-full h-14 rounded-2xl" placeholder="FT..." />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Account Suffix</label>
                  <input type="text" value={cbeAccountSuffix} onChange={e => setCbeAccountSuffix(e.target.value)} className="input w-full h-14 rounded-2xl" placeholder="262..." />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowCBEModal(false)} className="flex-1 btn btn-ghost h-14 rounded-2xl font-bold">{t('pages.cancel', 'Cancel')}</button>
                <button onClick={handleCBEVerify} disabled={isVerifyingCBE} className="flex-1 btn btn-primary h-14 rounded-2xl font-black uppercase tracking-widest">
                  {isVerifyingCBE ? t('pages.verifying', 'Verifying...') : t('pages.verify_and_fund', 'Verify & Fund')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EscrowDetails;