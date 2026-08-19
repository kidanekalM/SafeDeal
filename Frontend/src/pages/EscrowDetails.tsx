import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Shield,
  Clock,
  User,
  FileText,
  Scale,
  Printer,
  ListChecks,
  ShoppingCart,
  Briefcase,
  Zap,
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
  if (!date) return "N/A";
  let d: Date;
  if (typeof date === "string") {
    const normalized = date.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1");
    d = new Date(normalized);
  } else {
    d = new Date(date);
  }
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
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
  
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const isBuyer = Number(user?.id) === Number(escrow?.buyer_id);
  const isSeller = Number(user?.id) === Number(escrow?.seller_id);

  const handleMilestoneSubmit = async (milestoneId: number) => {
    try {
      await milestoneApi.submit(milestoneId);
      toast.success(t('pages.milestone_submitted', "Milestone submitted!"));
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

  const fetchEscrowDetails = async () => {
    if (!id) return;
    const escrowId = parseInt(id);
    setIsLoading(true);
    try {
      const response = await escrowApi.getById(escrowId);
      const rawData = response.data as any;
      setEscrow({
        ...rawData,
        status: (rawData.status || "pending").toLowerCase(),
        escrow_type: rawData.escrow_type || "item",
      });
      
      const msRes = await milestoneApi.getByEscrow(escrowId);
      setMilestones(msRes.data);
    } catch (error: any) {
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

    const addText = (text: string, fontSize = 10, fontStyle = "normal", color = [30, 30, 30]) => {
      doc.setFontSize(fontSize);
      doc.setFont("times", fontStyle);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, y);
      y += (lines.length * (fontSize * 0.45)) + 3;
    };

    const addSectionTitle = (text: string, amharicTitle?: string) => {
      y += 8;
      doc.setFillColor(240, 245, 245);
      doc.rect(margin, y - 5, contentWidth, 8, "F");
      doc.setFontSize(10.5);
      doc.setFont("times", "bold");
      doc.setTextColor(1, 77, 70);
      doc.text(text.toUpperCase(), margin + 3, y);
      if (amharicTitle) {
        doc.setFont("times", "italic");
        doc.setFontSize(9.5);
        doc.text(`— ${amharicTitle}`, margin + doc.getTextWidth(text.toUpperCase()) + 6, y);
      }
      y += 8;
    };

    // Official Letterhead Header with Emblem Lock
    doc.setFillColor(1, 77, 70);
    doc.roundedRect(margin, y - 4, 12, 12, 3, 3, "F");
    doc.setFontSize(12);
    doc.setFont("times", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("SD", margin + 6, y + 3, { align: "center" });

    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.setTextColor(1, 77, 70);
    doc.text("SAFEDEAL INSTITUTIONAL ESCROW NETWORK", margin + 18, y + 2);
    y += 6;
    doc.setFontSize(8.5);
    doc.setFont("times", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("የሴፍዲል ኦፊሴላዊ የውል እና የዕርከን ማረጋገጫ • Addis Ababa, Ethiopia", margin + 18, y + 2);
    y += 12;

    doc.setDrawColor(1, 77, 70);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Bilingual Subtitle
    doc.setFontSize(12);
    doc.setFont("times", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("MASTER ESCROW & SETTLEMENT AGREEMENT / የዕርከን ውል ማረጋገጫ", pageWidth / 2, y, { align: "center" });
    y += 10;

    // Contract Preamble
    addSectionTitle("Master Escrow Agreement Preamble", "የውል መግቢያ");
    addText(`This Master Escrow Agreement ("Agreement") is officially established and entered into regarding Transaction Reference SD-${escrow?.id}. All parties have consented to execute this binding transaction under the governance of SafeDeal escrow protection and the Commercial Code of Ethiopia. / ይህ የዕርከን ውል በሴፍዲል ጥበቃ እና በኢትዮጵያ የንግድ ሕግ መሠረት የተቋቋመ ነው።`);

    addSectionTitle("1. Contracting Parties", "ውል ተዋዋይ ወገኖች");
    addText(`First Party (Buyer / Depositor / ገዢ): ${escrow?.buyer?.first_name || ''} ${escrow?.buyer?.last_name || ''} (${escrow?.buyer?.email || 'N/A'})`, 10, "bold");
    addText(`Second Party (Seller / Provider / ሻጭ): ${escrow?.seller?.first_name || ''} ${escrow?.seller?.last_name || ''} (${escrow?.seller?.email || 'N/A'})`, 10, "bold");

    addSectionTitle("2. Subject Matter & Purpose", "የውሉ ዋና ዓላማ");
    addText(`Objective: ${escrow?.title || 'N/A'}`, 11, "bold");
    addText(`Detailed Scope / Description: ${escrow?.description || 'N/A'}`);

    addSectionTitle("3. Financial Principal & Valuation", "የገንዘብ መጠን እና ዋጋ");
    addText(`Total Escrow Principal: ETB ${escrow?.amount.toLocaleString()} (የተቀመጠ ገንዘብ)`, 11, "bold");
    addText(`Inspection & Review Period: Exactly ${escrow?.scope?.acceptance_days || escrow?.inspection_period || 5} calendar days following formal delivery / የፍተሻ ጊዜ.`);
    addText(`Platform Settlement Fee: ETB ${escrow?.platform_fee?.toLocaleString() || 0}`);

    addSectionTitle("4. Schedule A (Deliverables & Acceptance Standards)", "መርሐ ግብር A (የሚቀርቡ ዕቃዎች እና የጥራት ደረጃዎች)");
    const delivs = escrow?.scope?.deliverables?.length ? escrow.scope.deliverables : [];
    if (delivs.length) {
      delivs.forEach((d: any, i: number) => {
        const stdLabel = d.standard === 'buyer_approves' ? 'Buyer approves in app' : d.standard === 'matches_file' ? 'Matches attached file' : d.standard === 'buyer_inspects' ? 'Buyer inspects in person' : d.standard || 'Buyer approval';
        addText(`Item ${i + 1}: ${d.title} [${d.amount || 1} ${d.unit || 'flat'}] — Price: ${Number(d.price || 0).toLocaleString()} ETB`, 10, "bold");
        addText(`   Definition of Done: ${stdLabel}${d.standard_ref ? ` (${d.standard_ref})` : ''}`, 9, "normal", [100, 100, 100]);
      });
    } else {
      addText(`Primary Deliverable: ${escrow?.title} — Lump sum value of ${escrow?.amount?.toLocaleString()} ETB.`);
    }

    if (milestones.length > 0) {
      addSectionTitle("5. Milestone Payment Allocation", "የክፍያ ደረጃዎች ክፍፍል");
      autoTable(doc, {
        startY: y,
        head: [['#', 'Milestone Title', 'Amount (ETB)', 'Status']],
        body: milestones.map((m, i) => [i + 1, m.title, m.amount.toLocaleString(), m.status]),
        margin: { left: margin },
        styles: { font: 'times', fontSize: 9 }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (escrow?.scope?.exclusions?.length) {
      addSectionTitle("6. Schedule B (Exclusions / Out of Scope)", "መርሐ ግብር B (ያልተካተቱ)");
      escrow.scope.exclusions.forEach((e: any, i: number) => {
        addText(`Exclusion ${i + 1}: ${e.title}`, 9);
      });
    }

    addSectionTitle("7. Institutional Escrow Covenants & Legal Governance", "የዕርከን ጥበቃ እና ሕጋዊ ደንቦች");
    addText("7.1 Fund Protection: All funds are deposited into SafeDeal institutional escrow accounts and disbursed strictly upon verified Buyer acceptance. / ገንዘቡ ደህንነቱ በተጠበቀ አካውንት ይቀመጣል።");
    addText("7.2 Governing Law: This Agreement is governed under the Commercial Code of Ethiopia. / ውሉ በኢትዮጵያ ሕግ የሚመራ ነው።");
    addText(`7.3 Cryptographic Audit Stamp: ${escrow?.escrow_hash || '0x...institution_verified'}`);

    addSectionTitle("8. Execution & Signatures", "ፊርማ እና ማረጋገጫ");
    addText("IN WITNESS WHEREOF, the Parties have executed this Master Escrow Agreement.");
    y += 5;
    addText(`Buyer Signature / የገዢ ፊርማ: _______________________      Seller Signature / የሻጭ ፊርማ: _______________________`, 10, "bold");

    // Footer brand
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("times", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("SafeDeal Institutional Escrow & Settlement Network — Official Certified Record", pageWidth / 2, pageH - 10, { align: "center" });

    doc.save(`SafeDeal-Contract-SD${escrow?.id}.pdf`);
  };

  const handleAccept = async () => {
    try {
      await escrowApi.accept(Number(id));
      toast.success(t('pages.escrow_accepted_success', "Escrow accepted!"));
      fetchEscrowDetails();
    } catch (error) { toast.error(t('pages.escrow_accept_failed', "Failed to accept")); }
  };

  const handleInitiatePayment = async () => {
    if (!id || !escrow) return;
    try {
      const response = await paymentApi.initiateEscrowPayment(Number(id), escrow.amount);
      setPayment(response.data);
      setShowPayment(true);
    } catch (error) { toast.error("Failed to initiate payment"); }
  };

  const handleCBEVerify = async () => {
    if (!cbeTransactionId || !cbeAccountSuffix) return toast.error("Fill all fields");
    setIsVerifyingCBE(true);
    try {
      await escrowApi.verifyCBE(Number(id), cbeTransactionId, cbeAccountSuffix);
      toast.success("Payment verified!");
      setShowCBEModal(false);
      fetchEscrowDetails();
    } catch (error) { toast.error("Verification failed"); }
    finally { setIsVerifyingCBE(false); }
  };

  useEffect(() => { if (id) fetchEscrowDetails(); }, [id]);

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;
  if (!escrow) return <Layout><div className="p-12 text-center">Not found</div></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-12 px-4">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-8 no-print">
          <Link to="/escrows" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
            <ArrowLeft size={18} /> {t('pages.back_to_my_escrows', 'Back')}
          </Link>
          <button onClick={handlePrint} className="btn btn-primary bg-primary-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg hover:bg-primary-700 flex items-center gap-2">
            <Printer size={20} /> {t('pages.print_agreement', 'Print Agreement')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
               <div className="p-10 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-start gap-6">
                    <div className="space-y-4">
                       <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${escrow.escrow_type === 'item' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {escrow.escrow_type === 'item' ? <ShoppingCart size={28} /> : <Briefcase size={28} />}
                       </div>
                       <div>
                          <h1 className="text-4xl font-black text-gray-900 leading-tight uppercase tracking-tight">{escrow.title}</h1>
                          <p className="text-gray-500 font-bold flex items-center gap-2 mt-1">
                             <Clock size={16} /> Agreement ID: SD-{escrow.id}
                          </p>
                       </div>
                    </div>
                    <div className={`px-8 py-3 rounded-3xl text-xs font-black uppercase tracking-widest border-2 ${getStatusColor(escrow.status)}`}>
                       {t(`pages.${escrow.status}`, escrow.status)}
                    </div>
                  </div>
               </div>

               <div className="p-10 space-y-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                     <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{t('pages.total_amount', 'Deal Amount')}</label>
                        <p className="text-4xl font-black text-gray-900">{formatCurrency(escrow.amount)}</p>
                     </div>
                     <div className="p-8 bg-primary-900 rounded-3xl text-white">
                        <label className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-2">{t('pages.target', 'Target Date')}</label>
                        <p className="text-2xl font-black">{formatDateSafe(escrow.delivery_date)}</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2"><FileText size={20} className="text-primary-600" /> {t('pages.contract_description', 'Contract Description')}</h3>
                    <div className="p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                       <p className="text-gray-700 leading-relaxed font-medium text-lg italic">"{escrow.description}"</p>
                    </div>
                  </div>

                  {milestones.length > 0 && (
                    <div className="space-y-6">
                       <h3 className="text-xl font-bold flex items-center gap-2"><ListChecks size={20} className="text-primary-600" /> {t('pages.milestones', 'Milestone Plan')}</h3>
                       <div className="space-y-4">
                          {milestones.map((m, idx) => (
                            <div key={m.id} className="p-6 bg-white border border-gray-100 rounded-3xl hover:shadow-md transition-all flex justify-between items-center">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400">#{idx+1}</div>
                                  <div>
                                     <h4 className="font-bold text-gray-900">{m.title}</h4>
                                     <p className="text-xs text-gray-400 font-bold">{t('pages.due', 'Due')}: {formatDateSafe(m.due_date)} • {m.status}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-6">
                                  <span className="font-black text-xl text-primary-600">{formatCurrency(m.amount)}</span>
                                  {isSeller && (m.status === 'funded' || m.status === 'pending') && (
                                    <button onClick={() => handleMilestoneSubmit(m.id)} className="btn btn-primary btn-sm rounded-xl px-6 font-black uppercase text-[10px]">{t('pages.submit_work', 'Submit Work')}</button>
                                  )}
                                  {isBuyer && m.status === 'submitted' && (
                                    <button onClick={() => handleMilestoneApprove(m.id)} className="btn btn-success btn-sm rounded-xl px-6 font-black uppercase text-[10px] text-white">{t('pages.approve', 'Approve')}</button>
                                  )}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center space-y-6 no-print">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{t('pages.governance_actions', 'Governance Actions')}</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isBuyer && escrow.status === "pending" && (
                    <>
                      <button onClick={handleInitiatePayment} className="btn btn-primary h-20 rounded-3xl font-black uppercase tracking-widest flex items-center gap-3 justify-center group shadow-xl shadow-primary-500/20">
                        <Zap size={24} className="group-hover:scale-110 transition-all" /> {t('pages.pay_with_chapa', 'Pay with Chapa')}
                      </button>
                      <button onClick={() => setShowCBEModal(true)} className="btn btn-outline h-20 rounded-3xl font-black uppercase tracking-widest flex items-center gap-3 justify-center border-gray-200">
                        <Shield size={24} /> {t('pages.cbe_direct_verify', 'CBE Direct Verify')}
                      </button>
                    </>
                  )}
                  {isSeller && !escrow.active && escrow.status === "funded" && (
                    <button onClick={handleAccept} className="sm:col-span-2 btn btn-primary h-20 rounded-3xl font-black uppercase tracking-widest shadow-xl">{t('pages.accept_deal_and_start', 'Accept Deal & Start Work')}</button>
                  )}
               </div>
            </div>
          </div>

          <div className="space-y-8">
             <div className="p-10 bg-white rounded-3xl shadow-xl border border-gray-100 space-y-10">
                <h3 className="text-xl font-black">{t('pages.the_parties', 'The Parties')}</h3>
                <div className="space-y-8">
                   <div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><User size={28} /></div>
                       <div className="min-w-0">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('pages.buyer_client', 'Buyer / Client')}</p>
                          <p className="font-bold text-gray-900 truncate">{escrow.buyer?.email}</p>
                       </div>
                   </div>
                   <div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-3xl bg-green-50 text-green-600 flex items-center justify-center shrink-0"><User size={28} /></div>
                       <div className="min-w-0">
                          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">{t('pages.seller_provider', 'Seller / Provider')}</p>
                          <p className="font-bold text-gray-900 truncate">{escrow.seller?.email}</p>
                       </div>
                   </div>
                </div>
             </div>

             <div className="p-10 bg-[#f8fafc] rounded-3xl shadow-xl border border-gray-200 space-y-8">
                <div className="flex items-center gap-3">
                   <Scale className="text-primary-600" />
                   <h3 className="font-black text-lg">{t('pages.legal_framework', 'Legal Framework')}</h3>
                </div>
                <div className="space-y-6">
                   <div className="flex justify-between border-b pb-4">
                      <span className="text-xs font-bold text-gray-400 uppercase">{t('pages.inspection', 'Inspection')}</span>
                      <span className="font-black">{escrow.inspection_period} {t('pages.days', 'Days')}</span>
                   </div>
                   <div className="flex justify-between border-b pb-4">
                      <span className="text-xs font-bold text-gray-400 uppercase">{t('pages.jurisdiction', 'Jurisdiction')}</span>
                      <span className="font-black">{t('pages.ethiopia', 'Ethiopia')}</span>
                   </div>
                   <div className="p-4 bg-white rounded-3xl border border-gray-100">
                      <p className="text-[9px] font-black text-primary-400 uppercase mb-2">{t('pages.hash_fingerprint', 'Hash Fingerprint')}</p>
                      <p className="font-mono text-[8px] break-all text-primary-900 opacity-60 leading-tight">{escrow.escrow_hash}</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} amount={escrow.amount} paymentUrl={payment?.payment_url} onPaymentComplete={() => fetchEscrowDetails()} />

        {showCBEModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 z-50 no-print">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-12 w-full max-w-lg shadow-2xl">
              <h3 className="text-3xl font-black mb-2">{t('pages.cbe_direct_verify', 'CBE Direct Verify')}</h3>
              <p className="text-gray-500 font-medium mb-8">{t('pages.cbe_direct_verify_sub', 'Enter Transaction ID and Account Suffix')}</p>
              <div className="space-y-6 mb-10">
                <input type="text" value={cbeTransactionId} onChange={e => setCbeTransactionId(e.target.value)} className="input w-full h-16 rounded-3xl bg-gray-50 border-none font-bold px-6" placeholder={t('pages.transaction_id_placeholder', 'FT...')} />
                <input type="text" value={cbeAccountSuffix} onChange={e => setCbeAccountSuffix(e.target.value)} className="input w-full h-16 rounded-3xl bg-gray-50 border-none font-bold px-6" placeholder={t('pages.account_suffix_placeholder', 'Account Suffix...')} />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowCBEModal(false)} className="flex-1 btn btn-ghost h-16 rounded-3xl font-black">{t('pages.cancel', 'Cancel')}</button>
                <button onClick={handleCBEVerify} disabled={isVerifyingCBE} className="flex-1 btn btn-primary h-16 rounded-3xl font-black uppercase tracking-widest">
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
