import React from 'react';
import { Escrow } from '../types';

interface PrintEscrowAgreementProps {
  escrow: Escrow;
}

const PrintEscrowAgreement: React.FC<PrintEscrowAgreementProps> = ({ escrow }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="print-container bg-white text-gray-900 font-serif p-16 max-w-[210mm] mx-auto shadow-xl print:shadow-none border border-gray-200">
      {/* 1. Official Institutional Header */}
      <div className="border-b-4 border-double border-gray-900 pb-8 mb-10 flex justify-between items-center">
        <div>
          <div className="text-3xl font-black tracking-widest text-[#014d46] font-sans">SAFEDEAL</div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mt-1">Institutional Escrow & Settlement Service</p>
        </div>
        <div className="text-right font-sans">
          <p className="text-xs font-black uppercase tracking-widest text-gray-900">Official Contract Record</p>
          <p className="text-sm font-bold text-[#014d46] mt-0.5">Ref: SD-{escrow.id}</p>
          <p className="text-[11px] text-gray-500 mt-1">Date: {formatDate(escrow.created_at || new Date().toISOString())}</p>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-black uppercase tracking-wider text-gray-900 font-sans">Master Escrow & Transaction Agreement</h1>
        <p className="text-xs text-gray-500 italic mt-1 font-sans">Governed under the Commercial Code of Federal Democratic Republic of Ethiopia</p>
      </div>

      {/* 2. Executive Summary Box */}
      <div className="bg-gray-50 border-2 border-gray-900 p-6 mb-10 font-sans">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-gray-300">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Transaction Type</p>
            <p className="font-black text-sm text-gray-900 mt-1">{escrow.escrow_type === 'item' ? 'Quick (Item)' : 'Detailed (Milestones)'}</p>
          </div>
          <div className="pl-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Total Escrow Principal</p>
            <p className="font-black text-lg text-[#014d46] mt-1">{escrow.amount?.toLocaleString()} ETB</p>
          </div>
          <div className="pl-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Inspection Window</p>
            <p className="font-black text-sm text-gray-900 mt-1">{escrow.scope?.acceptance_days || escrow.inspection_period || 5} Business Days</p>
          </div>
          <div className="pl-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Status</p>
            <p className="font-black text-xs uppercase tracking-wider text-emerald-700 mt-1">{escrow.status || 'ACTIVE'}</p>
          </div>
        </div>
      </div>

      {/* 3. Preamble & Parties */}
      <section className="mb-8 font-sans">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-3 pb-1 border-b-2 border-gray-900">Preamble & Contracting Parties</h2>
        <p className="text-sm text-gray-800 leading-relaxed mb-4">
          This Master Escrow Agreement (the "Agreement") is entered into and made effective as of the date stated above, by and between the undersigned parties, facilitated securely through the SafeDeal Institution.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
          <div className="border border-gray-300 p-5 bg-white rounded">
            <p className="text-[10px] font-black text-[#014d46] uppercase tracking-widest mb-1">First Party (Buyer / Depositor)</p>
            <p className="font-black text-base text-gray-900">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
            <p className="text-xs text-gray-600 break-all font-mono mt-0.5">{escrow.buyer?.email}</p>
            <p className="text-[11px] text-gray-600 mt-1 font-medium">Profession / Entity: {escrow.buyer?.profession || 'Verified Client'}</p>
          </div>

          <div className="border border-gray-300 p-5 bg-white rounded">
            <p className="text-[10px] font-black text-[#014d46] uppercase tracking-widest mb-1">Second Party (Seller / Provider)</p>
            <p className="font-black text-base text-gray-900">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
            <p className="text-xs text-gray-600 break-all font-mono mt-0.5">{escrow.seller?.email}</p>
            <p className="text-[11px] text-gray-600 mt-1 font-medium">Profession / Entity: {escrow.seller?.profession || 'Verified Provider'}</p>
          </div>
        </div>
      </section>

      {/* 4. Section 1: Subject Matter & Purpose */}
      <section className="mb-8 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-3 pb-1 border-b-2 border-gray-900 font-sans">Section 1 — Subject Matter & Scope</h2>
        <p className="text-sm leading-relaxed text-gray-800">
          <strong>1.1 Purpose:</strong> The Seller agrees to provide and transfer the goods or services specified herein, and the Buyer agrees to deposit the total principal into SafeDeal escrow under the strict terms and conditions of this Agreement.
        </p>
        <div className="border border-gray-300 p-5 bg-gray-50 rounded">
          <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Contract Title / Objective</p>
          <p className="font-black text-base text-gray-900">{escrow.title}</p>
          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">{escrow.description}</p>
        </div>
      </section>

      {/* 5. Section 2: Deliverables (Schedule A) */}
      <section className="mb-8">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-3 pb-1 border-b-2 border-gray-900 font-sans">Section 2 — Schedule A (Deliverables & Valuation)</h2>
        {escrow.scope?.deliverables?.length ? (
          <div className="border border-gray-300 rounded overflow-hidden bg-white font-sans">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">Item</th>
                  <th className="py-3 px-4 text-left">Description / Task</th>
                  <th className="py-3 px-4 text-center">Qty / Unit</th>
                  <th className="py-3 px-4 text-left">Acceptance Standard</th>
                  <th className="py-3 px-4 text-right">Row Price (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {escrow.scope.deliverables.map((d: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-600">0{i + 1}</td>
                    <td className="py-3 px-4 font-black text-gray-900">{d.title}</td>
                    <td className="py-3 px-4 text-center font-bold text-gray-700">{d.amount || 1} {d.unit || 'flat'}</td>
                    <td className="py-3 px-4 font-medium text-gray-600">
                      {d.standard === 'buyer_approves' ? 'Buyer approves in app' : d.standard === 'matches_file' ? 'Matches attached file' : d.standard === 'buyer_inspects' ? 'Buyer inspects in person' : d.standard || 'Buyer approval'}
                      {d.standard_ref ? ` — ${d.standard_ref}` : ''}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-gray-900">{Number(d.price || 0).toLocaleString()} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-gray-300 p-5 bg-white rounded font-sans text-sm text-gray-800">
            <p className="font-bold">Primary Deliverable:</p>
            <p className="mt-1">{escrow.title} — Lump sum valuation of {escrow.amount?.toLocaleString()} ETB</p>
          </div>
        )}
      </section>

      {/* 6. Section 3: Milestones (if any) */}
      {escrow.milestones && escrow.milestones.length > 0 && (
        <section className="mb-8 font-sans">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-3 pb-1 border-b-2 border-gray-900">Section 3 — Milestone Disbursement Schedule</h2>
          <div className="border border-gray-300 rounded overflow-hidden bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">Milestone Phase</th>
                  <th className="py-3 px-4 text-right">Amount (ETB)</th>
                  <th className="py-3 px-4 text-center">Execution Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {escrow.milestones.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-black text-gray-900">{m.title}</td>
                    <td className="py-3 px-4 text-right font-black text-gray-900">{m.amount?.toLocaleString()} ETB</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-800 border border-gray-300">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7. Section 4: Exclusions (Schedule B) */}
      {escrow.scope?.exclusions?.length ? (
        <section className="mb-8 font-sans">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-3 pb-1 border-b-2 border-gray-900">Section 4 — Schedule B (Exclusions / Out of Scope)</h2>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-800 font-medium">
            {escrow.scope.exclusions.map((e: any, i: number) => <li key={i}>{e.title}</li>)}
          </ul>
        </section>
      ) : null}

      {/* 8. Section 5: Institutional Escrow Covenants & Legal Governance */}
      <section className="mb-8 space-y-3 font-sans">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-3 pb-1 border-b-2 border-gray-900">Section 5 — Institutional Escrow Covenants & Legal Governance</h2>
        <p className="text-sm leading-relaxed text-gray-800">
          <strong>5.1 Custody of Funds:</strong> All financial principal is securely held in SafeDeal institutional escrow accounts. Funds are disbursed strictly upon receipt of verified Buyer acceptance. Under no circumstances are funds released automatically or unilaterally by the platform provider.
        </p>
        <p className="text-sm leading-relaxed text-gray-800">
          <strong>5.2 Inspection & Acceptance Window:</strong> The Buyer is granted an inspection period of exactly <span className="font-bold">{escrow.scope?.acceptance_days || escrow.inspection_period || 5} calendar days</span> following formal delivery notification to examine the deliverable against agreed specifications.
        </p>
        <p className="text-sm leading-relaxed text-gray-800">
          <strong>5.3 Governing Law & Dispute Forum:</strong> This Agreement shall be strictly construed and governed under the substantive laws and Commercial Code of Ethiopia. Any unresolved disputes arising herefrom shall be submitted to binding arbitration in Addis Ababa, Ethiopia.
        </p>
        <div className="bg-gray-100 border border-gray-300 p-4 rounded text-xs text-gray-600 font-mono mt-4">
          <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">Cryptographic Audit Stamp (Keccak-256)</p>
          <p className="break-all mt-1">{escrow.contract_hash || escrow.escrow_hash || '0xd81c...institution_verified'}</p>
        </div>
      </section>

      {/* 9. Signatures & Institutional Seal */}
      <section className="mt-12 pt-8 border-t-4 border-double border-gray-900 font-sans">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-6 pb-1 border-b-2 border-gray-900">Section 6 — Execution, Authentication & Signatures</h2>
        <p className="text-xs text-gray-600 mb-8 leading-relaxed">
          IN WITNESS WHEREOF, the Parties hereto have executed this Master Escrow Agreement with full legal capacity, binding themselves to all terms and conditions set forth herein.
        </p>
        <div className="grid grid-cols-2 gap-16">
          <div className="border-t border-gray-400 pt-3">
            <p className="text-xs font-black uppercase tracking-wider text-gray-900">Buyer / Depositor Signature</p>
            <div className="h-12"></div>
            <p className="font-black text-sm text-gray-900">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
            <p className="text-xs text-gray-500 font-mono">{escrow.buyer?.email}</p>
            <p className="text-[10px] text-gray-400 mt-1">Date: ________________________</p>
          </div>

          <div className="border-t border-gray-400 pt-3">
            <p className="text-xs font-black uppercase tracking-wider text-gray-900">Seller / Provider Signature</p>
            <div className="h-12"></div>
            <p className="font-black text-sm text-gray-900">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
            <p className="text-xs text-gray-500 font-mono">{escrow.seller?.email}</p>
            <p className="text-[10px] text-gray-400 mt-1">Date: ________________________</p>
          </div>
        </div>
      </section>

      {/* 10. Official Institutional Footer */}
      <footer className="mt-16 pt-6 border-t-2 border-gray-900 text-center text-xs text-gray-600 font-sans">
        <p className="font-black tracking-widest text-gray-900">SAFEDEAL INSTITUTIONAL ESCROW & SETTLEMENT NETWORK</p>
        <p className="text-[11px] mt-1">Certified Secure Transaction Record • Addis Ababa, Ethiopia</p>
        <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-wider">Page 1 of 1 • Confidential & Legally Binding</p>
      </footer>
    </div>
  );
};

export default PrintEscrowAgreement;