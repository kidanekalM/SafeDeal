import { useEffect, useRef, useState } from "react";
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
  X,
  Loader2,
  Download,
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
import PrintEscrowAgreement from "../components/PrintEscrowAgreement";


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

  const [showAgreement, setShowAgreement] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const agreementRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = async () => {
    const root = agreementRef.current;
    if (!root || isExporting) return;
    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const pageWidthPx = 794;
      const pageHeightPx = 1123;
      const scale = 2;

      const exportHost = document.createElement("div");
      exportHost.style.position = "fixed";
      exportHost.style.left = "-20000px";
      exportHost.style.top = "0";
      exportHost.style.zIndex = "-1";
      document.body.appendChild(exportHost);

      const clonedRoot = root.cloneNode(true) as HTMLElement;
      const doc = clonedRoot.querySelector<HTMLElement>(".print-container");
      if (!doc) throw new Error("print container not found");
      doc.style.width = `${pageWidthPx}px`;
      doc.style.maxWidth = `${pageWidthPx}px`;
      doc.style.margin = "0";
      doc.style.boxShadow = "none";
      doc.style.boxSizing = "border-box";
      doc.querySelectorAll(".no-print").forEach((el) => el.remove());
      exportHost.appendChild(doc);

      const canvas = await html2canvas(doc, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: pageWidthPx,
      });

      const fullHeight = canvas.height;
      const fullCssHeight = fullHeight / scale;
      const pageW = canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidthMm = pdf.internal.pageSize.getWidth();
      const mmPerPx = pageWidthMm / (pageWidthPx * scale);

      const units = Array.from(
        doc.querySelectorAll<HTMLElement>("[data-export-unit]")
      );

      const SAFETY = 40;
      const maxPageCss = pageHeightPx - SAFETY;
      const breaks: number[] = [0];
      let pageStart = 0;
      for (const u of units) {
        const top = u.offsetTop;
        const height = u.offsetHeight;
        const end = top + height;
        if (end - pageStart <= maxPageCss) continue;
        if (top <= pageStart) continue;
        if (height > maxPageCss) {
          let y = Math.max(top, pageStart + pageHeightPx);
          while (y < end) {
            breaks.push(y);
            pageStart = y;
            y += pageHeightPx;
          }
          continue;
        }
        breaks.push(top);
        pageStart = top;
      }

      const finalBreaks = [...new Set(breaks)].sort((a, b) => a - b);

      const boundaries = [...finalBreaks, fullCssHeight];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const offset = boundaries[i] * scale;
        const sliceHeightPx = (boundaries[i + 1] - boundaries[i]) * scale;
        const slice = document.createElement("canvas");
        slice.width = pageW;
        slice.height = sliceHeightPx;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, offset, pageW, sliceHeightPx, 0, 0, pageW, sliceHeightPx);
        const pageImage = slice.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(pageImage, "JPEG", 0, 0, pageWidthMm, sliceHeightPx * mmPerPx);
      }

      document.body.removeChild(exportHost);
      pdf.save(`SafeDeal-Agreement-SD${escrow?.id}.pdf`);
      toast.success(t('pages.print_agreement_success', "Agreement PDF generated successfully!"));
    } catch (error) {
      toast.error(t('pages.print_agreement_failed', "Failed to generate PDF"));
    } finally {
      setIsExporting(false);
    }
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
        <div className="flex justify-between items-center mb-5 no-print">
          <Link to="/escrows" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
            <ArrowLeft size={18} /> {t('pages.back_to_my_escrows', 'Back')}
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAgreement(true)} className="btn btn-primary bg-primary-600 text-white font-black px-6 py-3 rounded-xl shadow-md hover:bg-primary-700 flex items-center gap-2">
              {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />} {isExporting ? t('pages.generating_pdf', 'Generating...') : t('pages.print_agreement', 'Print Agreement')}
            </button>
          </div>
        </div>

        {showAgreement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 overflow-y-auto no-print"
            onClick={() => { if (!isExporting) setShowAgreement(false); }}
          >
            <div className="min-h-full py-8 px-4 flex flex-col items-center">
              <div
                className="max-w-[210mm] w-full bg-white rounded-2xl shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between bg-[#014d46] text-white px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Shield size={20} className="text-emerald-300" />
                    <div>
                      <p className="font-black uppercase tracking-widest text-sm">{t('pages.agreement_preview', 'Agreement Preview')}</p>
                      <p className="text-[11px] text-emerald-100">Ref: SD-{escrow.id} • {t('pages.choose_language_then_download', 'Choose language, then download PDF')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrint}
                      disabled={isExporting}
                      className="btn bg-white text-[#014d46] font-black px-5 py-2.5 rounded-xl hover:bg-emerald-50 flex items-center gap-2 shadow disabled:opacity-50"
                    >
                      {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} {t('pages.download_pdf', 'Download PDF')}
                    </button>
                    <button
                      onClick={() => setShowAgreement(false)}
                      disabled={isExporting}
                      className="p-2.5 rounded-xl hover:bg-white/10 disabled:opacity-50"
                      aria-label="Close"
                    >
                      <X size={22} />
                    </button>
                  </div>
                </div>
                <div className="p-6 bg-gray-100">
                  <div ref={agreementRef} className="bg-white">
                    <PrintEscrowAgreement escrow={escrow} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-5 sm:p-8 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-start gap-6">
                     <div className="space-y-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${escrow.escrow_type === 'item' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {escrow.escrow_type === 'item' ? <ShoppingCart size={28} /> : <Briefcase size={28} />}
                       </div>
                       <div>
                          <h1 className="text-3xl font-black text-gray-900 leading-tight uppercase tracking-tight">{escrow.title}</h1>
                          <p className="text-gray-500 font-bold flex items-center gap-2 mt-1">
                             <Clock size={16} /> Agreement ID: SD-{escrow.id}
                          </p>
                       </div>
                    </div>
                    <div className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border ${getStatusColor(escrow.status)}`}>
                       {t(`pages.${escrow.status}`, escrow.status)}
                    </div>
                  </div>
               </div>

               <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                     <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{t('pages.total_amount', 'Deal Amount')}</label>
                        <p className="text-3xl font-black text-gray-900">{formatCurrency(escrow.amount)}</p>
                     </div>
                     <div className="p-8 bg-primary-900 rounded-2xl text-white">
                        <label className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-2">{t('pages.target', 'Target Date')}</label>
                        <p className="text-2xl font-black">{formatDateSafe(escrow.delivery_date)}</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><FileText size={20} className="text-primary-600" /> {t('pages.contract_description', 'Contract Description')}</h3>
                    <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                       <p className="text-gray-700 leading-relaxed font-medium text-lg italic">"{escrow.description}"</p>
                    </div>
                  </div>

                  {milestones.length > 0 && (
                    <div className="space-y-6">
                       <h3 className="text-lg font-bold flex items-center gap-2"><ListChecks size={20} className="text-primary-600" /> {t('pages.milestones', 'Milestone Plan')}</h3>
                       <div className="space-y-4">
                          {milestones.map((m, idx) => (
                            <div key={m.id} className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all flex justify-between items-center">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8 text-center space-y-6 no-print">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{t('pages.governance_actions', 'Governance Actions')}</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isBuyer && escrow.status === "pending" && (
                    <>
                      <button onClick={handleInitiatePayment} className="btn btn-primary h-12 rounded-xl font-black uppercase tracking-widest flex items-center gap-3 justify-center group shadow-md shadow-primary-500/20">
                        <Zap size={24} className="group-hover:scale-110 transition-all" /> {t('pages.pay_with_chapa', 'Pay with Chapa')}
                      </button>
                      <button onClick={() => setShowCBEModal(true)} className="btn btn-outline h-12 rounded-xl font-black uppercase tracking-widest flex items-center gap-3 justify-center border-gray-200">
                        <Shield size={24} /> {t('pages.cbe_direct_verify', 'CBE Direct Verify')}
                      </button>
                    </>
                  )}
                  {isSeller && !escrow.active && escrow.status === "funded" && (
                    <button onClick={handleAccept} className="sm:col-span-2 btn btn-primary h-12 rounded-xl font-black uppercase tracking-widest shadow-md">{t('pages.accept_deal_and_start', 'Accept Deal & Start Work')}</button>
                  )}
               </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
             <div className="p-5 sm:p-8 bg-white rounded-2xl shadow-sm border border-gray-100 space-y-5 sm:space-y-6">
                <h3 className="text-lg font-black">{t('pages.the_parties', 'The Parties')}</h3>
                <div className="space-y-4 sm:space-y-6">
                   <div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><User size={28} /></div>
                       <div className="min-w-0">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('pages.buyer_client', 'Buyer / Client')}</p>
                          <p className="font-bold text-gray-900 truncate">{escrow.buyer?.email}</p>
                       </div>
                   </div>
                   <div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0"><User size={28} /></div>
                       <div className="min-w-0">
                          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">{t('pages.seller_provider', 'Seller / Provider')}</p>
                          <p className="font-bold text-gray-900 truncate">{escrow.seller?.email}</p>
                       </div>
                   </div>
                </div>
             </div>

             <div className="p-5 sm:p-8 bg-[#f8fafc] rounded-2xl shadow-sm border border-gray-100 space-y-4 sm:space-y-6">
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
                   <div className="p-4 bg-white rounded-2xl border border-gray-100">
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-12 w-full max-w-lg shadow-xl">
              <h3 className="text-3xl font-black mb-2">{t('pages.cbe_direct_verify', 'CBE Direct Verify')}</h3>
              <p className="text-gray-500 font-medium mb-8">{t('pages.cbe_direct_verify_sub', 'Enter Transaction ID and Account Suffix')}</p>
              <div className="space-y-6 mb-10">
                <input type="text" value={cbeTransactionId} onChange={e => setCbeTransactionId(e.target.value)} className="input w-full h-12 rounded-xl bg-gray-50 border-none font-bold px-6" placeholder={t('pages.transaction_id_placeholder', 'FT...')} />
                <input type="text" value={cbeAccountSuffix} onChange={e => setCbeAccountSuffix(e.target.value)} className="input w-full h-12 rounded-xl bg-gray-50 border-none font-bold px-6" placeholder={t('pages.account_suffix_placeholder', 'Account Suffix...')} />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowCBEModal(false)} className="flex-1 btn btn-ghost h-12 rounded-xl font-black">{t('pages.cancel', 'Cancel')}</button>
                <button onClick={handleCBEVerify} disabled={isVerifyingCBE} className="flex-1 btn btn-primary h-12 rounded-xl font-black uppercase tracking-widest">
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
