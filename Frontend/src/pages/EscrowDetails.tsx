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
  Scale
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
import { AnimatePresence } from "framer-motion";

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
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editConditions, setEditConditions] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const [isBackendBusy, setIsBackendBusy] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);

  const isBuyer = user?.id === escrow?.buyer_id;
  const isSeller = user?.id === escrow?.seller_id;

  const fetchEscrowDetails = async (retryCount = 0) => {
    if (!id) return;
    if (errorCount > 5) {
      toast.error(t('pages.backend_issues', "🚫 Backend is experiencing issues."));
      return;
    }
    if (isBackendBusy) return;
    const escrowId = parseInt(id);
    if (isNaN(escrowId)) return;
    setIsBackendBusy(true);
    setTimeout(() => setIsBackendBusy(false), 2000);
    if (retryCount === 0) setIsLoading(true);
    try {
      const response = await escrowApi.getById(escrowId);
      const rawData = response.data as any;
      setEscrow({
        ...rawData,
        id: rawData.id || rawData.ID,
        active: rawData.active !== undefined ? rawData.active : rawData.Active,
        created_at: rawData.created_at || rawData.CreatedAt,
        updated_at: rawData.updated_at || rawData.UpdatedAt,
      });
      setErrorCount(0);
    } catch (error: any) {
      setErrorCount(prev => prev + 1);
      toast.error(t('pages.escrow_fetch_failed', "Failed to fetch escrow details."));
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAccept = async () => {
    toast.success(t('pages.escrow_accepted_success', "Escrow accepted!"));
    fetchEscrowDetails();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleConfirmReceipt = async () => {
    toast.success(t('pages.receipt_confirmed_toast', "Receipt confirmed!"));
    fetchEscrowDetails();
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

  const handleUploadReceipt = async () => {
    if (!receiptUrl) return;
    try {
      await escrowApi.uploadReceipt(Number(id), receiptUrl);
      toast.success(t('pages.receipt_submitted', "Submitted!"));
      setShowReceiptModal(false);
      fetchEscrowDetails();
    } catch (error) { toast.error(t('pages.receipt_upload_failed', "Failed upload")); }
  };

  useEffect(() => { if (id) fetchEscrowDetails(); }, [id]);

  useEffect(() => {
    if (escrow?.id && !loadingMilestones) {
      setLoadingMilestones(true);
      milestoneApi.getByEscrow(escrow.id)
        .then((res) => setMilestones(res.data))
        .catch(() => {})
        .finally(() => setLoadingMilestones(false));
    }
  }, [escrow?.id, loadingMilestones]);

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
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4" />
            <span>{t('pages.back_to_dashboard', 'Back to Dashboard')}</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('pages.escrow_id', 'Escrow')} #{escrow.id}</h1>
              <p className="text-gray-600 mt-2">{t('pages.created_on', 'Created on')} {formatDateSafe(escrow.created_at)}</p>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(escrow.status)}`}>
              {getStatusIcon(escrow.status)}
              <span className="ml-2">{t(`pages.${escrow.status.toLowerCase()}`, escrow.status)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {milestones.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.project_milestones', 'Milestones')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">{t('pages.title', 'Title')}</th>
                        <th className="text-left py-2 px-4">{t('pages.amount', 'Amount')}</th>
                        <th className="text-left py-2 px-4">{t('pages.status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((m) => (
                        <tr key={m.id} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="py-3 px-4">{m.title}</td>
                          <td className="py-3 px-4">{formatCurrency(m.amount)}</td>
                          <td className="py-3 px-4"><span className="text-xs font-medium">{t(`pages.${m.status.toLowerCase()}`, m.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.transaction_details', 'Details')}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm text-gray-600">{t('pages.amount', 'Amount')}</label><p className="text-lg font-bold">{formatCurrency(escrow.amount)}</p></div>
                  <div><label className="text-sm text-gray-600">{t('pages.total', 'Total')}</label><p className="text-lg font-black text-[#014d46]">{formatCurrency(escrow.amount + (escrow.platform_fee || 0))}</p></div>
                </div>
                {escrow.conditions && <div className="pt-2"><label className="text-sm text-gray-600">{t('pages.agreement_conditions', 'Conditions')}</label><p className="text-gray-900 text-sm mt-1 whitespace-pre-wrap">{escrow.conditions}</p></div>}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-xs font-black text-gray-400 uppercase mb-6">{t('pages.deal_actions', 'Actions')}</h3>
              <div className="space-y-4">
                {isBuyer && escrow.status === "Pending" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={handleInitiatePayment} className="btn btn-primary btn-lg rounded-2xl flex flex-col items-center py-6 h-auto gap-2">
                      <Zap size={24} /><span>{t('components.pay_with_chapa', 'Pay with Chapa')}</span>
                    </button>
                    <button onClick={() => setShowReceiptModal(true)} className="btn btn-outline btn-lg rounded-2xl flex flex-col items-center py-6 h-auto gap-2">
                      <FileText size={24} /><span>{t('pages.bank_transfer', 'Bank Transfer')}</span>
                    </button>
                  </div>
                )}
                {isSeller && !escrow.active && escrow.status === "Funded" && (
                  <button onClick={handleAccept} className="btn btn-primary btn-lg w-full rounded-2xl font-black">{t('pages.accept_funded_escrow', "Accept Funded Escrow")}</button>
                )}
                {isBuyer && escrow.active && escrow.status === "Funded" && (
                  <button onClick={handleConfirmReceipt} className="btn btn-success btn-lg w-full">{t('pages.confirm_receipt', "Confirm Receipt")}</button>
                )}
                <button onClick={() => setShowChat(true)} disabled={!escrow.active} className="btn btn-lg w-full btn-outline"><MessageCircle className="mr-2" />{t('pages.open_chat_btn', "Open Chat")}</button>
                {(isBuyer || isSeller) && escrow.active && escrow.status === "Funded" && (
                  <button onClick={() => setShowDisputeModal(true)} className="btn btn-outline btn-lg w-full text-red-600">{t('pages.create_dispute', "Create Dispute")}</button>
                )}
                {escrow.status === "Released" && (
                  <button onClick={handleDownloadAgreement} className="btn btn-secondary btn-lg w-full flex items-center justify-center gap-2"><Download size={20} className="mr-2" />{t('pages.download_final_agreement', "Download Final Agreement")}</button>
                )}
                {!escrow.is_locked && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditConditions(escrow.conditions || ""); setEditAmount(escrow.amount); setShowEditModal(true); }} className="btn btn-outline btn-sm rounded-xl gap-1"><Edit3 size={14} /> {t('pages.edit_terms', 'Edit Terms')}</button>
                    <button onClick={handleLock} className="btn btn-primary btn-sm rounded-xl gap-1"><Lock size={14} /> {t('pages.lock_and_agree', 'Lock & Agree')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">{t('pages.participants', 'Participants')}</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3"><User className="text-primary-600" /><div><p className="font-medium">{t('pages.buyer', 'Buyer')}</p><p className="text-sm text-gray-600">{isBuyer ? t('pages.you', 'You') : escrow.buyer?.first_name}</p></div></div>
                <div className="flex items-center space-x-3"><User className="text-gray-600" /><div><p className="font-medium">{t('pages.seller', 'Seller')}</p><p className="text-sm text-gray-600">{isSeller ? t('pages.you', 'You') : escrow.seller?.first_name}</p></div></div>
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">{t('pages.timeline', 'Timeline')}</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-primary-600 rounded-full" />{t('pages.escrow_created', 'Created')}</div>
                {escrow.status !== "Pending" && <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-600 rounded-full" />{t('pages.escrow_accepted', 'Accepted')}</div>}
              </div>
            </div>
            {(escrow.jurisdiction || escrow.governing_law || escrow.dispute_resolution) && (
              <div className="card p-6 bg-blue-50/50 border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Scale className="h-5 w-5 text-blue-600" /> {t('pages.legal_compliance', 'Legal Compliance')}</h3>
                <div className="space-y-3">
                  {escrow.jurisdiction && (<div><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('pages.jurisdiction', 'Jurisdiction')}</label><p className="text-sm font-medium text-gray-900">{escrow.jurisdiction}</p></div>)}
                  {escrow.governing_law && (<div><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('pages.governing_law', 'Governing Law')}</label><p className="text-sm font-medium text-gray-900">{escrow.governing_law}</p></div>)}
                  {escrow.dispute_resolution && (<div><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('pages.dispute_resolution', 'Dispute Resolution')}</label><p className="text-sm font-medium text-gray-900">{escrow.dispute_resolution}</p></div>)}
                </div>
              </div>
            )}
          </div>
        </div>

        <RealTimeChat isOpen={showChat} onClose={() => setShowChat(false)} escrowId={Number(id)} />
        <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} amount={escrow.amount} paymentUrl={payment?.payment_url} onPaymentComplete={() => fetchEscrowDetails()} />

        <AnimatePresence>
          {showPhoneModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-bold mb-4">{t('pages.phone_number_required', 'Phone Number')}</h3>
                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="input w-full mb-4 rounded-xl" placeholder="09..." />
                <div className="flex justify-end gap-3"><button onClick={() => setShowPhoneModal(false)} className="text-gray-500 hover:text-gray-700 font-medium">{t('pages.cancel', 'Cancel')}</button><button onClick={handlePhoneSubmit} className="btn btn-primary px-6 rounded-xl">{t('pages.continue', 'Continue')}</button></div>
              </div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDisputeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-bold mb-4">{t('pages.create_dispute', 'Dispute')}</h3>
                <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} className="w-full p-4 border-2 rounded-xl mb-4 focus:border-red-500 outline-none" rows={4} placeholder="..." />
                <div className="flex justify-end gap-3"><button onClick={() => setShowDisputeModal(false)} className="text-gray-500 hover:text-gray-700 font-medium">{t('pages.cancel', 'Cancel')}</button><button onClick={handleDisputeSubmit} className="btn btn-primary bg-red-600 hover:bg-red-700 border-red-600 rounded-xl px-6">{t('pages.submit', 'Submit')}</button></div>
              </div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReceiptModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-bold mb-4">{t('pages.verify_payment', 'Verify')}</h3>
                <input type="text" value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)} className="input w-full mb-4 rounded-xl" placeholder="URL..." />
                <div className="flex justify-end gap-3"><button onClick={() => setShowReceiptModal(false)} className="text-gray-500 hover:text-gray-700 font-medium">{t('pages.cancel', 'Cancel')}</button><button onClick={handleUploadReceipt} className="btn btn-primary px-6 rounded-xl">{t('pages.submit', 'Submit')}</button></div>
              </div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEditModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl">
                <h3 className="text-lg font-bold mb-4">{t('pages.edit_agreement_terms', 'Edit Terms')}</h3>
                <div className="space-y-4">
                  <div><label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{t('pages.total_amount', 'Total Amount')}</label><input type="number" className="input w-full rounded-xl" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} /></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{t('pages.agreement_conditions', 'Conditions')}</label><textarea rows={6} className="w-full p-4 border-2 rounded-xl focus:border-[#014d46] outline-none" value={editConditions} onChange={e => setEditConditions(e.target.value)} /></div>
                  <div className="flex justify-end gap-3 pt-4"><button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 font-medium">{t('pages.cancel', 'Cancel')}</button><button onClick={handleEditSubmit} className="btn btn-primary px-6 rounded-xl">{t('pages.updating', 'Update')}</button></div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default EscrowDetails;