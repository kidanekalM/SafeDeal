import { jsPDF } from "jspdf";
import "jspdf-autotable";
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
  FileText,
  Lock,
  Zap,
  Scale,
  Printer,
  ExternalLink,
  ListChecks,
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
import PaymentModal from "../components/PaymentModal";
import { motion } from "framer-motion";


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
  const [showPayment, setShowPayment] = useState(false);
  
  const [showCBEModal, setShowCBEModal] = useState(false);
  const [cbeTransactionId, setCbeTransactionId] = useState("");
  const [cbeAccountSuffix, setCbeAccountSuffix] = useState("");
  const [isVerifyingCBE, setIsVerifyingCBE] = useState(false);
  
  const [errorCount, setErrorCount] = useState(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const isBuyer = Number(user?.id) === Number(escrow?.buyer_id);
  const isSeller = Number(user?.id) === Number(escrow?.seller_id);
  const isMediator = Number(user?.id) === Number(escrow?.mediator_id);

  const handleMilestoneSubmit = async (milestoneId: number) => {
    try {
      await milestoneApi.submit(milestoneId);
      toast.success(t('pages.milestone_submitted', "Milestone submitted!"));
      // Refresh milestones
      const res = await milestoneApi.getByEscrow(escrow!.id);
      setMilestones(res.data);
    } catch (error) {
      toast.error(t('pages.milestone_submit_failed', "Failed to submit milestone"));
    }
  };

  const handleMilestoneApprove = async (milestoneId: number) => {
    try {
      await milestoneApi.approve(milestoneId);
      toast.success(t('pages.milestone_approved', "Milestone approved!"));
      const res = await milestoneApi.getByEscrow(escrow!.id);
      setMilestones(res.data);
    } catch (error) {
      toast.error(t('pages.milestone_approve_failed', "Failed to approve milestone"));
    }
  };

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
      setEscrow({
        ...rawData,
        id: rawData.id || rawData.ID,
        buyer_id: rawData.buyer_id || rawData.BuyerID,
        seller_id: rawData.seller_id || rawData.SellerID,
        mediator_id: rawData.mediator_id || rawData.MediatorID,
        amount: rawData.amount || rawData.Amount,
        platform_fee: rawData.platform_fee || rawData.PlatformFee,
        status: (rawData.status || rawData.Status).toLowerCase(),
        active: rawData.active !== undefined ? rawData.active : rawData.Active,
        is_locked: rawData.is_locked !== undefined ? rawData.is_locked : rawData.IsLocked,
        is_detailed: rawData.is_detailed !== undefined ? rawData.is_detailed : rawData.IsDetailed,
        sub_type: rawData.sub_type || rawData.SubType,
        inspection_period: rawData.inspection_period || rawData.InspectionPeriod,
        created_at: rawData.created_at || rawData.CreatedAt,
        updated_at: rawData.updated_at || rawData.UpdatedAt,
        blockchain_tx_hash: rawData.blockchain_tx_hash || rawData.BlockchainTxHash,
        escrow_hash: rawData.escrow_hash || rawData.EscrowHash,
      });
      setErrorCount(0);
    } catch (error: any) {
      setErrorCount(prev => prev + 1);
      toast.error(t('pages.escrow_fetch_failed', "Failed to fetch escrow details."));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    const doc = new jsPDF();
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    const addText = (text: string, fontSize = 10, fontStyle = "normal", color = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, y);
      y += (lines.length * (fontSize * 0.5)) + 2;
      return lines.length;
    };

    const addSectionTitle = (text: string) => {
      y += 5;
      doc.setFillColor(245, 247, 250);
      doc.rect(margin - 2, y - 5, contentWidth + 4, 8, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(text.toUpperCase(), margin, y);
      y += 8;
    };

    const checkPageBreak = (needed: number) => {
      if (y + needed > 280) {
        doc.addPage();
        y = 20;
      }
    };

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "black");
    doc.setTextColor(15, 23, 42);
    doc.text("SAFEDEAL ESCROW AGREEMENT", pageWidth / 2, y, { align: "center" });
    y += 15;

    // Agreement Details
    addSectionTitle("AGREEMENT DETAILS");
    addText(`Agreement ID: SD-${escrow?.id}-${escrow?.escrow_hash?.slice(2, 10).toUpperCase() || 'OFF-CHAIN'}`, 10, "bold");
    addText(`Date Created: ${formatDateSafe(escrow?.created_at)}`);
    addText(`Jurisdiction: ${escrow?.jurisdiction || 'Federal Democratic Republic of Ethiopia'}`);
    addText(`Governing Law: ${escrow?.governing_law || 'Commercial Code of Ethiopia, Civil Code of Ethiopia, Electronic Transaction Proclamation and applicable laws.'}`);
    addText(`Dispute Resolution Method: ${escrow?.dispute_resolution || 'Mediation / Arbitration via SafeDeal AI'}`);

    // 1. PARTIES
    checkPageBreak(40);
    addSectionTitle("1. PARTIES");
    
    addText("Buyer / Client", 10, "bold", [59, 130, 246]);
    addText(`Legal Name: ${escrow?.buyer?.first_name} ${escrow?.buyer?.last_name}`);
    addText(`Email: ${escrow?.buyer?.email}`);
    addText(`Phone: ${escrow?.buyer?.account_number || 'N/A'}`); // Using account number as placeholder for ID/Phone if missing
    addText(`Address: ____________________________________________________`);
    
    y += 5;
    addText("Seller / Service Provider", 10, "bold", [16, 185, 129]);
    addText(`Legal Name: ${escrow?.seller?.first_name} ${escrow?.seller?.last_name}`);
    addText(`Email: ${escrow?.seller?.email}`);
    addText(`Phone: ${escrow?.seller?.account_number || 'N/A'}`);
    addText(`Address: ____________________________________________________`);

    // 2. CONTRACT PURPOSE
    checkPageBreak(40);
    addSectionTitle("2. CONTRACT PURPOSE");
    addText("The Seller agrees to provide the following goods, services, or deliverables:", 9, "italic");
    addText(`Description: ${escrow?.title || 'N/A'}`, 10, "bold");
    addText(`Category: ${escrow?.sub_type?.toUpperCase() || 'GENERAL'}`);
    addText(`Expected Outcome: ${escrow?.conditions?.slice(0, 100)}...`);

    // 3. CONTRACT VALUE
    checkPageBreak(30);
    addSectionTitle("3. CONTRACT VALUE");
    addText(`Base Contract Amount: ETB ${escrow?.amount.toLocaleString()}`, 10, "bold");
    addText(`Taxes Included: _________________`);
    addText(`Additional Charges: ETB ${escrow?.platform_fee.toLocaleString()} (Secure Platform Fee)`);
    addText(`Total Secured Amount: ETB ${(escrow?.amount || 0) + (escrow?.platform_fee || 0)}`, 11, "bold", [30, 41, 59]);
    addText(`Currency: ETB (Ethiopian Birr)`);

    // 4. DELIVERY MILESTONES
    checkPageBreak(20);
    addSectionTitle("4. DELIVERY MILESTONES");
    if (milestones && milestones.length > 0) {
      (doc as any).autoTable({
        startY: y,
        head: [['#', 'Milestone Title', 'Amount (ETB)', 'Trigger', 'Due Date']],
        body: milestones.map((m, i) => [i + 1, m.title, m.amount.toLocaleString(), m.release_trigger, m.due_date || 'N/A']),
        margin: { left: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 65, 85] }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    } else {
      addText("Single Installment Delivery Model active.");
      y += 5;
    }

    // 5-7 Logic Boilerplate
    checkPageBreak(60);
    addSectionTitle("5. ACCEPTANCE CRITERIA");
    addText("A milestone shall be considered complete only if: 1) All listed deliverables are submitted; 2) Required evidence is uploaded; 3) Buyer confirms acceptance; OR 4) Inspection period expires without dispute.");

    addSectionTitle("6. INSPECTION PERIOD");
    addText(`Inspection Period: ${escrow?.inspection_period || 7} Calendar Days`);
    addText("Buyer Rights: Request clarification, Reject incomplete work, Open dispute, Approve milestone. If no action is taken before the deadline, milestone is automatically deemed accepted.");

    addSectionTitle("7. PAYMENT RELEASE CONDITIONS");
    addText(`Escrow funds shall only be released when: ${escrow?.is_detailed ? 'Milestone Triggers are met' : 'Buyer manually approves or Inspection period expires'}.`);

    // 8-13 Legal Clauses
    checkPageBreak(80);
    addSectionTitle("8. SELLER WARRANTIES");
    addText("The Seller warrants that: Work is original, Goods are legally owned, Deliverables comply with Ethiopian law and meet stated specifications. No fraud or misrepresentation exists.");

    addSectionTitle("9. BUYER OBLIGATIONS");
    addText("The Buyer agrees to: Provide necessary information, Review deliverables promptly, Raise disputes in good faith, and Not unreasonably delay acceptance.");

    addSectionTitle("10. CHANGE ORDERS");
    addText("Any modification to Scope, Price, Deliverables, or Deadlines must be approved electronically by both parties. No verbal modifications shall be binding.");

    checkPageBreak(40);
    addSectionTitle("11. DELAYS");
    addText("Seller Delay: Buyer may extend deadline, cancel milestone, or seek refund. Buyer Delay: Deadlines shall be extended accordingly.");

    addSectionTitle("12. NON-PAYMENT PROTECTION");
    addText("If payment is withheld without valid contractual grounds, Seller may initiate dispute resolution. Escrow records shall serve as evidence.");

    addSectionTitle("13. FRAUD AND MISREPRESENTATION");
    addText("Material breach includes: Fake documents, False identity, Forged invoices, and Attempted escrow circumvention. Remedies include fund freeze and account suspension.");

    // Signatures
    checkPageBreak(50);
    y += 10;
    doc.setDrawColor(200);
    doc.line(margin, y, margin + 70, y);
    doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.text("Buyer Signature (Digital ID Authenticated)", margin, y);
    doc.text("Seller Signature (Digital ID Authenticated)", pageWidth - margin, y, { align: "right" });

    doc.save(`SafeDeal-Agreement-SD${escrow?.id}.pdf`);
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

  const handleInitiatePayment = async () => {
    if (!id || !escrow) return;
    try {
      const response = await paymentApi.initiateEscrowPayment(Number(id), escrow.amount);
      setPayment(response.data);
      setShowPayment(true);
    } catch (error) {
      toast.error(t('pages.payment_initiate_failed', "Failed to initiate payment"));
    }
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
      milestoneApi.getByEscrow(escrow.id)
        .then((res) => setMilestones(res.data))
        .catch(() => {});
    }
  }, [escrow?.id]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
      case "verifying": return <Clock className="h-5 w-5" />;
      case "funded": 
      case "active": return <Shield className="h-5 w-5" />;
      case "completed":
      case "released": return <CheckCircle className="h-5 w-5" />;
      case "disputed": return <AlertCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;
  if (!escrow) return <Layout><div className="p-12 text-center">{t('pages.escrow_not_found', "Not found")}</div></Layout>;

  return (
    <Layout>
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
              <span className="hidden sm:inline">{t('pages.print_agreement', 'Print Agreement')}</span>
            </button>
          </div>
        </div>

        <div id="printable-area" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-8 sm:p-10 border-b border-gray-100 bg-gradient-to-br from-white to-gray-50">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="text-primary-600 h-6 w-6" />
                      <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight uppercase">#{escrow.id}: {escrow.title}</h1>
                    </div>
                    <p className="text-gray-500 font-medium flex items-center gap-2">
                      <Clock size={16} /> {t('pages.initiated_on', 'Initiated on')} {formatDateSafe(escrow.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-6 py-2 rounded-2xl text-sm font-black tracking-widest uppercase border-2 ${getStatusColor(escrow.status)}`}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(escrow.status)}
                        {t(`pages.${escrow.status.toLowerCase()}`, escrow.status)}
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-gray-100 text-[10px] font-black uppercase text-gray-500 border border-gray-200">
                      {escrow.is_detailed ? t('pages.logic_deterministic', 'Deterministic') : t('pages.logic_standard', 'Standard')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('pages.agreement_type', 'Agreement Type')}</p>
                    <p className="font-black text-gray-900 capitalize">{escrow.sub_type || 'General'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('pages.inspection', 'Inspection')}</p>
                    <p className="font-black text-gray-900">{escrow.inspection_period || 0} day(s)</p>
                  </div>
                  <div className="col-span-2 p-4 bg-teal-50 rounded-2xl border border-teal-100">
                    <p className="text-[10px] font-bold text-[#014d46] uppercase mb-1 flex items-center gap-1">
                      <Scale size={10} /> {t('pages.legal_fingerprint', 'Deterministic Hash')}
                    </p>
                    <p className="font-mono text-[9px] text-[#014d46] truncate" title={escrow.escrow_hash}>{escrow.escrow_hash}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-10 space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">{t('pages.transaction_amount', 'Transaction Amount')}</label>
                    <p className="text-3xl font-black text-gray-900">{formatCurrency(escrow.amount)}</p>
                  </div>
                  <div className="p-6 bg-primary-900 rounded-3xl text-white shadow-xl">
                    <label className="text-xs font-black opacity-60 uppercase tracking-widest block mb-2">{t('pages.total_secured', 'Total Secured Value')}</label>
                    <p className="text-3xl font-black">{formatCurrency(escrow.amount + (escrow.platform_fee || 0))}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <FileText className="text-primary-600" size={20} />
                    {t('pages.contractual_conditions', 'Contractual Conditions')}
                  </h3>
                  <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem]">
                    <p className="text-gray-700 leading-relaxed italic font-serif text-lg">
                      "{escrow.conditions || t('pages.no_conditions_provided', 'No specific conditions provided.')}"
                    </p>
                  </div>
                </div>

                {/* Milestones with Deterministic Logic */}
                {milestones.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <ListChecks className="text-primary-600" size={20} />
                      {t('pages.deterministic_milestones', 'Deterministic Milestones')}
                    </h3>
                    <div className="space-y-4">
                      {milestones.map((m, idx) => (
                        <div key={m.id} className="p-6 bg-white border border-gray-100 rounded-[2rem] hover:shadow-md transition-all">
                          <div className="flex flex-col lg:flex-row justify-between gap-6">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-black">#{idx + 1}</span>
                                <h4 className="font-black text-gray-900 text-lg">{m.title}</h4>
                              </div>
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">What</label>
                                  <p className="text-[10px] font-bold text-gray-700 capitalize">{m.completion_type?.replace('_', ' ')}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Who Verifies</label>
                                  <p className="text-[10px] font-bold text-gray-700 capitalize">{m.verification_authority?.replace('_', ' ')}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Trigger</label>
                                  <p className="text-[10px] font-bold text-primary-600 capitalize">{m.release_trigger?.replace('_', ' ')}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Evidence</label>
                                  <p className="text-[10px] font-bold text-gray-700 uppercase">{m.evidence_types || 'None'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col justify-between items-end min-w-[120px]">
                              <span className="text-xl font-black text-[#014d46]">{formatCurrency(m.amount)}</span>
                              <div className="flex gap-2 mt-4">
                                {isSeller && (m.status.toLowerCase() === 'funded' || m.status.toLowerCase() === 'pending') && (
                                  <button onClick={() => handleMilestoneSubmit(m.id)} className="btn btn-primary btn-xs rounded-lg px-4">{t('pages.submit_proof', 'Submit Proof')}</button>
                                )}
                                {isBuyer && m.status.toLowerCase() === 'submitted' && (
                                  <button onClick={() => handleMilestoneApprove(m.id)} className="btn btn-success btn-xs rounded-lg px-4 text-white">{t('pages.approve', 'Approve')}</button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {escrow.blockchain_tx_hash && (
                  <div className="p-8 bg-gray-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <Shield size={24} className="text-primary-600" />
                        <div>
                          <h3 className="text-xl font-bold uppercase tracking-tight">{t('pages.tamper_proof_audit', 'Tamper-Proof Audit')}</h3>
                          <p className="text-[10px] text-primary-400 font-black tracking-widest">ETHEREUM ANCHORED LOG</p>
                        </div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between gap-4">
                        <code className="text-[10px] text-primary-300 break-all font-mono">{escrow.blockchain_tx_hash}</code>
                        <a href={`https://sepolia.etherscan.io/tx/${escrow.blockchain_tx_hash}`} target="_blank" rel="noreferrer" className="p-2 bg-white/10 rounded-lg"><ExternalLink size={14} /></a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Actions */}
            <div className="no-print bg-white rounded-[2rem] shadow-xl border border-gray-100 p-10 text-center">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8">{t('pages.available_actions', 'Available Actions')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isBuyer && escrow.status.toLowerCase() === "pending" && (
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
                
                {isSeller && !escrow.active && escrow.status.toLowerCase() === "funded" && (
                  <button onClick={handleAccept} className="sm:col-span-2 btn btn-primary btn-lg w-full rounded-2xl py-6 font-black uppercase tracking-widest shadow-xl">
                    {t('pages.accept_funded_escrow', "Accept Funded Escrow")}
                  </button>
                )}

                {!escrow.is_locked && (isBuyer || isSeller) && (
                  <button onClick={handleLock} className="sm:col-span-2 btn btn-primary btn-lg w-full rounded-2xl py-6 font-black uppercase tracking-widest shadow-xl shadow-primary-500/20">
                    <Lock size={20} className="mr-2" /> {t('pages.lock_agreement', 'Lock Deterministic Agreement')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -translate-y-16 translate-x-16" />
              <h3 className="text-xl font-black text-gray-900 mb-8 relative z-10">{t('pages.the_parties', 'The Parties')}</h3>
              <div className="space-y-8 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100"><User size={24} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{t('pages.buyer_role', 'Purchaser / Buyer')}</p>
                    <p className="font-bold text-gray-900 truncate">{isBuyer ? t('pages.you', 'You') : (escrow.buyer?.email || t('pages.pending_user', 'Pending...'))}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shrink-0 border border-green-100"><User size={24} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">{t('pages.seller_role', 'Provider / Seller')}</p>
                    <p className="font-bold text-gray-900 truncate">{isSeller ? t('pages.you', 'You') : (escrow.seller?.email || t('pages.pending_user', 'Pending...'))}</p>
                  </div>
                </div>
                {escrow.mediator_id && (
                  <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0"><Scale size={20} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-0.5">{t('pages.mediator_role', 'Assigned Mediator')}</p>
                      <p className="font-bold text-gray-900 text-sm truncate">{isMediator ? t('pages.you', 'You') : (escrow.mediator?.first_name || t('pages.official_mediator', 'Official'))}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#f8fafc] rounded-[2rem] shadow-xl border border-gray-200 p-8">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2"><Scale className="text-primary-600 h-5 w-5" /> Legal Framework</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.jurisdiction', 'Jurisdiction')}</label>
                  <p className="text-sm font-bold text-gray-700">{escrow.jurisdiction || 'International'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.governing_law', 'Governing Law')}</label>
                  <p className="text-sm font-bold text-gray-700">{escrow.governing_law || 'SafeDeal Rules'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.arbitration', 'Resolution')}</label>
                  <p className="text-sm font-bold text-primary-700">{escrow.dispute_resolution || 'AI Smart Arbitration'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} amount={escrow.amount} paymentUrl={payment?.payment_url} onPaymentComplete={() => fetchEscrowDetails()} />

        {showCBEModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-md no-print">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><Shield size={32} /></div>
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
