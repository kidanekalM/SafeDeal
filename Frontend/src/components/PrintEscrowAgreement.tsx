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
    <div className="print-container bg-white text-gray-900 font-sans p-12 max-w-[210mm] mx-auto shadow-sm print:shadow-none">
      {/* 1. Header */}
      <div className="border-b-2 border-gray-900 pb-6 mb-8 flex justify-between items-start">
        <div>
          <div className="text-2xl font-black tracking-tight text-[#014d46] mb-1">SAFEDEAL</div>
          <h1 className="text-2xl font-black uppercase text-gray-900 tracking-wide">Escrow Agreement</h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Secure Transaction & Escrow Record</p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-gray-100 border border-gray-300 rounded px-3 py-1 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-700">Agreement SD-{escrow.id}</span>
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300">
              {escrow.status || 'ACTIVE'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 font-medium">Generated: {formatDate(escrow.created_at || new Date().toISOString())}</p>
          <p className="text-[11px] text-gray-500 font-medium">Jurisdiction: {escrow.jurisdiction || 'Ethiopia'}</p>
        </div>
      </div>

      {/* 2. Agreement Summary Box */}
      <div className="bg-gray-50 border border-gray-300 rounded-xl p-6 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Agreement Type</p>
          <p className="font-bold text-gray-900">{escrow.escrow_type === 'item' ? 'Quick (Item)' : 'Detailed (Milestones)'}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Escrow Value</p>
          <p className="font-black text-lg text-[#014d46]">{escrow.amount?.toLocaleString()} ETB</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inspection Period</p>
          <p className="font-bold text-gray-900">{escrow.scope?.acceptance_days || escrow.inspection_period || 5} Days</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Platform Fee</p>
          <p className="font-bold text-gray-900">{escrow.platform_fee?.toLocaleString() || 0} ETB</p>
        </div>
      </div>

      {/* 3. Parties */}
      <section className="mb-8">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-200">01. Parties to the Agreement</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <p className="text-[10px] font-black text-[#014d46] uppercase tracking-widest mb-1">Buyer / Depositor</p>
            <p className="font-bold text-base text-gray-900">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
            <p className="text-xs text-gray-500 break-all">{escrow.buyer?.email}</p>
            <p className="text-[11px] text-gray-600 mt-1 font-medium">Profession: {escrow.buyer?.profession || 'N/A'}</p>
          </div>

          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <p className="text-[10px] font-black text-[#014d46] uppercase tracking-widest mb-1">Seller / Provider</p>
            <p className="font-bold text-base text-gray-900">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
            <p className="text-xs text-gray-500 break-all">{escrow.seller?.email}</p>
            <p className="text-[11px] text-gray-600 mt-1 font-medium">Profession: {escrow.seller?.profession || 'N/A'}</p>
          </div>
        </div>
      </section>

      {/* 4. Contract Purpose */}
      <section className="mb-8">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-200">02. Contract Purpose & Description</h2>
        <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-3">
          <h3 className="font-black text-lg text-gray-900">{escrow.title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{escrow.description}</p>
        </div>
      </section>

      {/* 5. Deliverables / Schedule A */}
      <section className="mb-8">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-200">03. Deliverables & Pricing (Schedule A)</h2>
        {escrow.scope?.deliverables?.length ? (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest border-b border-gray-200">
                  <th className="py-3 px-4 text-left">#</th>
                  <th className="py-3 px-4 text-left">What (Task / Item)</th>
                  <th className="py-3 px-4 text-center">Amount & Unit</th>
                  <th className="py-3 px-4 text-left">Definition of Done</th>
                  <th className="py-3 px-4 text-right">Price (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {escrow.scope.deliverables.map((d: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-500">0{i + 1}</td>
                    <td className="py-3 px-4 font-black text-gray-900">{d.title}</td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-700">{d.amount || 1} {d.unit || 'flat'}</td>
                    <td className="py-3 px-4 font-medium text-gray-600">{d.standard === 'buyer_approves' ? 'Buyer approves in app' : d.standard === 'matches_file' ? 'Matches attached file' : d.standard === 'buyer_inspects' ? 'Buyer inspects in person' : d.standard || 'Buyer approval'} {d.standard_ref ? `(${d.standard_ref})` : ''}</td>
                    <td className="py-3 px-4 text-right font-black text-gray-900">{Number(d.price || 0).toLocaleString()} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl p-6 bg-white text-sm text-gray-700">
            <p className="font-bold">Standard Single Deliverable:</p>
            <p className="mt-1">{escrow.title} — Full value of {escrow.amount?.toLocaleString()} ETB</p>
          </div>
        )}
      </section>

      {/* 6. Milestones (if any) */}
      {escrow.milestones && escrow.milestones.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-200">04. Milestone Payments</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest border-b border-gray-200">
                  <th className="py-3 px-4 text-left">Milestone</th>
                  <th className="py-3 px-4 text-right">Amount (ETB)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
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

      {/* 7. Exclusions (Schedule B) */}
      {escrow.scope?.exclusions?.length ? (
        <section className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-200">05. Exclusions (Schedule B - Out of Scope)</h2>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700 font-medium">
            {escrow.scope.exclusions.map((e: any, i: number) => <li key={i}>{e.title}</li>)}
          </ul>
        </section>
      ) : null}

      {/* 8. Legal & Escrow Protection Terms */}
      <section className="mb-8">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-200">06. Escrow Protection & Legal Terms</h2>
        <div className="bg-gray-50 border border-gray-300 rounded-xl p-6 text-xs text-gray-700 space-y-3 leading-relaxed">
          <p><strong className="text-gray-900">Fund Protection:</strong> Funds are deposited into SafeDeal escrow and released only upon explicit Buyer approval or resolution. Funds are never released automatically.</p>
          <p><strong className="text-gray-900">Inspection & Acceptance:</strong> The Buyer has {escrow.scope?.acceptance_days || escrow.inspection_period || 5} days following delivery to review and verify deliverables against agreed standards.</p>
          <p><strong className="text-gray-900">Governing Law & Jurisdiction:</strong> This Agreement is governed by the laws of Ethiopia ({escrow.governing_law || 'Commercial Code of Ethiopia'}). Any dispute shall be resolved through {escrow.dispute_resolution || 'binding arbitration'} in Addis Ababa, Ethiopia.</p>
          <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-200 font-mono">
            Cryptographic Verification Reference (Keccak-256): {escrow.contract_hash || escrow.escrow_hash || '0x...'}
          </p>
        </div>
      </section>

      {/* 9. Signatures */}
      <section className="mt-12 pt-8 border-t-2 border-gray-900">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pb-1 border-b border-gray-200">07. Signatures & Acknowledgment</h2>
        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-black uppercase text-gray-700">Buyer Acknowledgment</p>
            <div className="h-16 border-b border-gray-400 my-4"></div>
            <p className="font-black text-sm text-gray-900">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
            <p className="text-xs text-gray-500 break-all">{escrow.buyer?.email}</p>
          </div>

          <div>
            <p className="text-xs font-black uppercase text-gray-700">Seller Acknowledgment</p>
            <div className="h-16 border-b border-gray-400 my-4"></div>
            <p className="font-black text-sm text-gray-900">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
            <p className="text-xs text-gray-500 break-all">{escrow.seller?.email}</p>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="mt-16 pt-6 border-t border-gray-300 text-center text-xs text-gray-500 font-medium">
        <p className="font-bold text-gray-700">SAFEDEAL ESCROW AGREEMENT — SD-{escrow.id}</p>
        <p className="mt-1">Electronically generated secure transaction record. Confidential.</p>
        <p className="text-[10px] text-gray-400 mt-2">Page 1 of 1</p>
      </footer>
    </div>
  );
};

export default PrintEscrowAgreement;