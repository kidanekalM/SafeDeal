import React, { useState } from 'react';
import { Escrow } from '../types';
import { ShieldCheck, Lock, Globe } from 'lucide-react';

interface PrintEscrowAgreementProps {
  escrow: Escrow;
}

const PrintEscrowAgreement: React.FC<PrintEscrowAgreementProps> = ({ escrow }) => {
  const [lang, setLang] = useState<'en' | 'am'>('en');

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const L = {
    service: lang === 'am' ? 'የሴፍዲል ኦፊሴላዊ የውል እና የዕርከን አገልግሎት' : 'Institutional Escrow & Settlement Service',
    record: lang === 'am' ? 'ኦፊሴላዊ የውል መዝገብ' : 'Official Contract Record',
    date: lang === 'am' ? 'ቀን' : 'Date',
    title: lang === 'am' ? 'ዋና የዕርከን እና የግብይት ውል' : 'MASTER ESCROW & TRANSACTION AGREEMENT',
    subtitle: lang === 'am' ? 'በፌዴራላዊ ዲሞክራሲያዊ ኢትዮጵያ የንግድ ሕግ የሚተዳደር' : 'Governed under the Commercial Code of the Federal Democratic Republic of Ethiopia',
    type: lang === 'am' ? 'የግብይት ዓይነት' : 'Transaction Type',
    typeVal: escrow.escrow_type === 'item'
      ? (lang === 'am' ? 'ፈጣን (ዕቃ)' : 'Quick (Item)')
      : (lang === 'am' ? 'ዝርዝር (ደረጃዎች)' : 'Detailed (Milestones)'),
    total: lang === 'am' ? 'አጠቃላይ የዕርከን ዋጋ' : 'Total Escrow Principal',
    inspection: lang === 'am' ? 'የፍተሻ ጊዜ' : 'Inspection Window',
    days: lang === 'am' ? 'ቀናት' : 'Days',
    status: lang === 'am' ? 'ሁኔታ' : 'Status',
    preamble: lang === 'am' ? 'መግቢያ እና ተዋዋይ ወገኖች' : 'Preamble & Contracting Parties',
    preambleBody: lang === 'am'
      ? 'ይህ ዋና የዕርከን ውል ("ውሉ") ከዚህ በታች በተገለጹት ወገኖች መካከል፣ በሴፍዲል የዕርከን ጥበቃ እና በኢትዮጵያ የንግድ ሕግ መሠረት በፈቃደኝነት ተደመምና ገቢራዊ ሆኗል።'
      : 'This Master Escrow Agreement (the "Agreement") is entered into by and between the undersigned parties, facilitated securely through the SafeDeal Institution and governed by the Commercial Code of Ethiopia.',
    buyer: lang === 'am' ? 'የመጀመሪያ ወገን (ገዢ / ገንዘብ አስቀማጭ)' : 'First Party (Buyer / Depositor)',
    seller: lang === 'am' ? 'ሁለተኛ ወገን (ሻጭ / አገልግሎት ሰጪ)' : 'Second Party (Seller / Provider)',
    profession: lang === 'am' ? 'ሙያ / ድርጅት' : 'Profession / Entity',
    s1: lang === 'am' ? 'ክፍል 1 — የውሉ ዋና ዓላማ እና ወሰን' : 'Section 1 — Subject Matter & Scope',
    s1a: lang === 'am' ? 'ዓላማ፡' : 'Purpose:',
    s1b: lang === 'am' ? 'ሻጩ በዚህ ውል ውስጥ የተገለጹትን ዕቃዎች ወይም አገልግሎቶች ለማቅረብ ተስማምቷል፤ ገዢውም አጠቃላይ ዋጋውን በሴፍዲል ዕርከን አካውንት አስቀምጧል።' : 'The Seller agrees to provide and transfer the goods or services specified herein, and the Buyer agrees to deposit the total principal into SafeDeal escrow under the strict terms of this Agreement.',
    objTitle: lang === 'am' ? 'የውል ርዕስ / ዓላማ' : 'Contract Title / Objective',
    s2: lang === 'am' ? 'ክፍል 2 — መርሐ ግብር A (የሚቀርቡ ዕቃዎች እና ዋጋዎች)' : 'Section 2 — Schedule A (Deliverables & Valuation)',
    thItem: lang === 'am' ? 'ቁ.ጥ.' : 'Item',
    thDesc: lang === 'am' ? 'መግለጫ / ተግባር' : 'Description / Task',
    thQty: lang === 'am' ? 'ብዛት / አሃድ' : 'Qty / Unit',
    thStd: lang === 'am' ? 'የጥራት ደረጃ' : 'Acceptance Standard',
    thPrice: lang === 'am' ? 'ዋጋ (ብር)' : 'Row Price (ETB)',
    dodApprove: lang === 'am' ? 'ገዢ በመተግበሪያው ያጸድቃል' : 'Buyer approves in app',
    dodFile: lang === 'am' ? 'ከተያያዘው ፋይል ጋር ይመሳሰላል' : 'Matches attached file',
    dodInspect: lang === 'am' ? 'ገዢ በአካል ይመረምራል' : 'Buyer inspects in person',
    dodDefault: lang === 'am' ? 'የገዢ ማረጋገጫ' : 'Buyer approval',
    primaryDeliv: lang === 'am' ? 'ዋና ዕቃ / አገልግሎት፡' : 'Primary Deliverable:',
    s3: lang === 'am' ? 'ክፍል 3 — የክፍያ ደረጃዎች መርሐ ግብር' : 'Section 3 — Milestone Disbursement Schedule',
    thMilestone: lang === 'am' ? 'የክፍያ ደረጃ' : 'Milestone Phase',
    thAmount: lang === 'am' ? 'መጠን (ብር)' : 'Amount (ETB)',
    thExec: lang === 'am' ? 'የአፈጻጸም ሁኔታ' : 'Execution Status',
    s4: lang === 'am' ? 'ክፍል 4 — መርሐ ግብር B (ያልተካተቱ ነገሮች)' : 'Section 4 — Schedule B (Exclusions / Out of Scope)',
    s5: lang === 'am' ? 'ክፍል 5 — የዕርከን ጥበቃ እና ሕጋዊ ደንቦች' : 'Section 5 — Institutional Escrow Covenants & Legal Governance',
    s51: lang === 'am' ? 'የገንዘብ ጥበቃ፡' : '5.1 Custody of Funds:',
    s51b: lang === 'am' ? 'ሁሉም ገንዘቦች በሴፍዲል ዕርከን አካውንቶች ውስጥ በደህንነት ይቀመጣሉ፤ የሚለቀቁትም የገዢው የተረጋገጠ ማረጋገጫ ሲገኝ ብቻ ነው።' : 'All financial principal is securely held in SafeDeal institutional escrow accounts and disbursed strictly upon verified Buyer acceptance. Funds are never released automatically or unilaterally.',
    s52: lang === 'am' ? 'የፍተሻ እና የማረጋገጫ ጊዜ፡' : '5.2 Inspection & Acceptance Window:',
    s52b: lang === 'am' ? `ገዢው ዕቃውን ወይም አገልግሎቱን ከተስማሙት ደረጃዎች ጋር ለመመርመር በትክክል ${escrow.scope?.acceptance_days || escrow.inspection_period || 5} ቀናት አሉት።` : `The Buyer is granted an inspection period of exactly ${escrow.scope?.acceptance_days || escrow.inspection_period || 5} calendar days following formal delivery to examine the deliverable against agreed specifications.`,
    s53: lang === 'am' ? 'የሕግ ባለቤትነት እና የግጭት አፈታት፡' : '5.3 Governing Law & Dispute Forum:',
    s53b: lang === 'am' ? 'ይህ ውል በኢትዮጵያ የንግድ ሕግ መሠረት የሚመራ ሲሆን ማናቸውም አለመግባባቶች በአዲስ አበባ በግልግል ይፈታሉ።' : 'This Agreement shall be strictly construed and governed under the substantive laws and Commercial Code of Ethiopia. Any unresolved dispute shall be submitted to binding arbitration in Addis Ababa, Ethiopia.',
    hash: lang === 'am' ? 'የምስጢራዊ ቁጥጥር ማህተም (Keccak-256)' : 'Cryptographic Audit Stamp (Keccak-256)',
    s6: lang === 'am' ? 'ክፍል 6 — ፊርማ እና ማረጋገጫ' : 'Section 6 — Execution, Authentication & Signatures',
    witness: lang === 'am' ? 'ስለዚህም ተዋዋይ ወገኖቹ በሙሉ ሕጋዊ አቅም በዚህ ውል ውስጥ የተካተቱትን ደንቦች በሙሉ በመቀበል ፈርማቸዋል።' : 'IN WITNESS WHEREOF, the Parties hereto have executed this Master Escrow Agreement with full legal capacity, binding themselves to all terms set forth herein.',
    buyerSig: lang === 'am' ? 'የገዢ / አስቀማጭ ፊርማ' : 'Buyer / Depositor Signature',
    sellerSig: lang === 'am' ? 'የሻጭ / አገልግሎት ሰጪ ፊርማ' : 'Seller / Provider Signature',
    footer1: 'SAFEDEAL INSTITUTIONAL ESCROW & SETTLEMENT NETWORK',
    footer2: lang === 'am' ? 'የተረጋገጠ ደህንነቱ የተጠበቀ የግብይት መዝገብ • አዲስ አበባ፣ ኢትዮጵያ' : 'Certified Secure Transaction Record • Addis Ababa, Ethiopia',
    footer3: lang === 'am' ? 'ገጽ 1 ከ 1 • ሚስጥራዊ እና ሕጋዊ ማሰሪያ' : 'Page 1 of 1 • Confidential & Legally Binding',
  };

  const stdLabel = (d: any) => {
    if (d.standard === 'buyer_approves') return L.dodApprove;
    if (d.standard === 'matches_file') return L.dodFile;
    if (d.standard === 'buyer_inspects') return L.dodInspect;
    return d.standard || L.dodDefault;
  };

  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-6 w-1.5 bg-[#014d46] rounded-full" />
      <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 flex-1">{children}</h2>
    </div>
  );

  return (
    <div className="print-container relative bg-white text-gray-900 font-serif p-14 max-w-[210mm] mx-auto shadow-xl print:shadow-none border border-gray-200">
      {/* Watermark */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-[0.04] flex items-center justify-center overflow-hidden">
        <div className="text-[180px] font-black tracking-widest text-[#014d46] transform -rotate-12 whitespace-nowrap">
          SAFEDEAL • ሴፍዲል • SAFEDEAL
        </div>
      </div>

      {/* Language Toggle (Hidden on print) */}
      <div className="absolute top-5 right-5 no-print z-10 flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
        <Globe size={16} className="text-gray-600 ml-2" />
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${lang === 'en' ? 'bg-[#014d46] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
        >
          English
        </button>
        <button
          onClick={() => setLang('am')}
          className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${lang === 'am' ? 'bg-[#014d46] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
        >
          አማርኛ
        </button>
      </div>

      {/* 1. Official Institutional Header */}
      <div className="relative border-b-4 border-double border-gray-900 pb-8 mb-8 flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#014d46] to-emerald-700 text-white rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-emerald-100">
            <Lock size={30} className="text-emerald-200" />
          </div>
          <div>
            <div className="text-3xl font-black tracking-widest text-[#014d46] font-sans flex items-center gap-2">
              SAFEDEAL <ShieldCheck size={22} className="text-emerald-600 inline" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mt-1">{L.service}</p>
          </div>
        </div>
        <div className="text-right font-sans">
          <p className="text-xs font-black uppercase tracking-widest text-gray-900">{L.record}</p>
          <p className="text-sm font-bold text-[#014d46] mt-0.5">Ref: SD-{escrow.id}</p>
          <p className="text-[11px] text-gray-500 mt-1">{L.date}: {formatDate(escrow.created_at || new Date().toISOString())}</p>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="h-px w-16 bg-gray-300" />
          <ShieldCheck size={18} className="text-[#014d46]" />
          <div className="h-px w-16 bg-gray-300" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-wider text-gray-900 font-sans">{L.title}</h1>
        <p className="text-xs text-gray-500 italic mt-1 font-sans">{L.subtitle}</p>
      </div>

      {/* 2. Executive Summary Box */}
      <div className="relative bg-gradient-to-br from-gray-50 to-white border-2 border-gray-900 p-6 mb-8 font-sans shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-gray-300">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{L.type}</p>
            <p className="font-black text-sm text-gray-900 mt-1">{L.typeVal}</p>
          </div>
          <div className="pl-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{L.total}</p>
            <p className="font-black text-lg text-[#014d46] mt-1">{escrow.amount?.toLocaleString()} ETB</p>
          </div>
          <div className="pl-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{L.inspection}</p>
            <p className="font-black text-sm text-gray-900 mt-1">{escrow.scope?.acceptance_days || escrow.inspection_period || 5} {L.days}</p>
          </div>
          <div className="pl-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{L.status}</p>
            <p className="font-black text-xs uppercase tracking-wider text-emerald-700 mt-1">{escrow.status || 'ACTIVE'}</p>
          </div>
        </div>
      </div>

      {/* 3. Preamble & Parties */}
      <section className="relative mb-8 font-sans">
        <SectionHeading>{L.preamble}</SectionHeading>
        <p className="text-sm text-gray-800 leading-relaxed mb-4">{L.preambleBody}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-300 p-5 bg-white rounded-lg shadow-sm">
            <p className="text-[10px] font-black text-[#014d46] uppercase tracking-widest mb-1">{L.buyer}</p>
            <p className="font-black text-base text-gray-900">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
            <p className="text-xs text-gray-600 break-all font-mono mt-0.5">{escrow.buyer?.email}</p>
            <p className="text-[11px] text-gray-600 mt-1 font-medium">{L.profession}: {escrow.buyer?.profession || 'Verified Client'}</p>
          </div>
          <div className="border border-gray-300 p-5 bg-white rounded-lg shadow-sm">
            <p className="text-[10px] font-black text-[#014d46] uppercase tracking-widest mb-1">{L.seller}</p>
            <p className="font-black text-base text-gray-900">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
            <p className="text-xs text-gray-600 break-all font-mono mt-0.5">{escrow.seller?.email}</p>
            <p className="text-[11px] text-gray-600 mt-1 font-medium">{L.profession}: {escrow.seller?.profession || 'Verified Provider'}</p>
          </div>
        </div>
      </section>

      {/* 4. Section 1 */}
      <section className="relative mb-8 space-y-3">
        <SectionHeading>{L.s1}</SectionHeading>
        <p className="text-sm leading-relaxed text-gray-800"><strong>{L.s1a}</strong> {L.s1b}</p>
        <div className="border border-gray-300 p-5 bg-gray-50 rounded-lg">
          <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">{L.objTitle}</p>
          <p className="font-black text-base text-gray-900">{escrow.title}</p>
          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">{escrow.description}</p>
        </div>
      </section>

      {/* 5. Section 2: Deliverables */}
      <section className="relative mb-8">
        <SectionHeading>{L.s2}</SectionHeading>
        {escrow.scope?.deliverables?.length ? (
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white font-sans shadow-sm">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#014d46] text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">{L.thItem}</th>
                  <th className="py-3 px-4 text-left">{L.thDesc}</th>
                  <th className="py-3 px-4 text-center">{L.thQty}</th>
                  <th className="py-3 px-4 text-left">{L.thStd}</th>
                  <th className="py-3 px-4 text-right">{L.thPrice}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {escrow.scope.deliverables.map((d: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="py-3 px-4 font-bold text-gray-600">0{i + 1}</td>
                    <td className="py-3 px-4 font-black text-gray-900">{d.title}</td>
                    <td className="py-3 px-4 text-center font-bold text-gray-700">{d.amount || 1} {d.unit || 'flat'}</td>
                    <td className="py-3 px-4 font-medium text-gray-600">{stdLabel(d)}{d.standard_ref ? ` — ${d.standard_ref}` : ''}</td>
                    <td className="py-3 px-4 text-right font-black text-gray-900">{Number(d.price || 0).toLocaleString()} ETB</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={4} className="py-3 px-4 text-right font-black uppercase tracking-wider text-[10px] text-gray-600">{lang === 'am' ? 'ጠቅላላ ዋጋ' : 'Total Value'}</td>
                  <td className="py-3 px-4 text-right font-black text-gray-900">{escrow.scope.deliverables.reduce((s: number, d: any) => s + Number(d.price || 0), 0).toLocaleString()} ETB</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-gray-300 p-5 bg-white rounded-lg font-sans text-sm text-gray-800 shadow-sm">
            <p className="font-bold">{L.primaryDeliv}</p>
            <p className="mt-1">{escrow.title} — {escrow.amount?.toLocaleString()} ETB</p>
          </div>
        )}
      </section>

      {/* 6. Section 3: Milestones */}
      {escrow.milestones && escrow.milestones.length > 0 && (
        <section className="relative mb-8 font-sans">
          <SectionHeading>{L.s3}</SectionHeading>
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#014d46] text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">{L.thMilestone}</th>
                  <th className="py-3 px-4 text-right">{L.thAmount}</th>
                  <th className="py-3 px-4 text-center">{L.thExec}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {escrow.milestones.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-black text-gray-900">{m.title}</td>
                    <td className="py-3 px-4 text-right font-black text-gray-900">{m.amount?.toLocaleString()} ETB</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-800 border border-gray-300">{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7. Section 4: Exclusions */}
      {escrow.scope?.exclusions?.length ? (
        <section className="relative mb-8 font-sans">
          <SectionHeading>{L.s4}</SectionHeading>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-800 font-medium">
            {escrow.scope.exclusions.map((e: any, i: number) => <li key={i}>{e.title}</li>)}
          </ul>
        </section>
      ) : null}

      {/* 8. Section 5: Legal Terms */}
      <section className="relative mb-8 space-y-3 font-sans">
        <SectionHeading>{L.s5}</SectionHeading>
        <p className="text-sm leading-relaxed text-gray-800"><strong>{L.s51}</strong> {L.s51b}</p>
        <p className="text-sm leading-relaxed text-gray-800"><strong>{L.s52}</strong> {L.s52b}</p>
        <p className="text-sm leading-relaxed text-gray-800"><strong>{L.s53}</strong> {L.s53b}</p>
        <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg text-xs text-gray-600 font-mono">
          <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">{L.hash}</p>
          <p className="break-all mt-1">{escrow.contract_hash || escrow.escrow_hash || '0xd81c...institution_verified'}</p>
        </div>
      </section>

      {/* 9. Signatures */}
      <section className="relative mt-12 pt-8 border-t-4 border-double border-gray-900 font-sans">
        <SectionHeading>{L.s6}</SectionHeading>
        <p className="text-xs text-gray-600 mb-8 leading-relaxed">{L.witness}</p>
        <div className="grid grid-cols-2 gap-16">
          <div className="border-t border-gray-400 pt-3">
            <p className="text-xs font-black uppercase tracking-wider text-gray-900">{L.buyerSig}</p>
            <div className="h-12"></div>
            <p className="font-black text-sm text-gray-900">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
            <p className="text-xs text-gray-500 font-mono">{escrow.buyer?.email}</p>
            <p className="text-[10px] text-gray-400 mt-1">{L.date}: ________________________</p>
          </div>
          <div className="border-t border-gray-400 pt-3">
            <p className="text-xs font-black uppercase tracking-wider text-gray-900">{L.sellerSig}</p>
            <div className="h-12"></div>
            <p className="font-black text-sm text-gray-900">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
            <p className="text-xs text-gray-500 font-mono">{escrow.seller?.email}</p>
            <p className="text-[10px] text-gray-400 mt-1">{L.date}: ________________________</p>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="relative mt-16 pt-6 border-t-2 border-gray-900 text-center text-xs text-gray-600 font-sans">
        <p className="font-black tracking-widest text-gray-900">{L.footer1}</p>
        <p className="text-[11px] mt-1">{L.footer2}</p>
        <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-wider">{L.footer3}</p>
      </footer>
    </div>
  );
};

export default PrintEscrowAgreement;