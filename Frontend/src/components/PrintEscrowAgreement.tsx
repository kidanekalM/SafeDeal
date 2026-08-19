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

  // Prefer the authoritative contract text generated server-side.
  if (escrow.generated_contract) {
    return (
      <div className="print-container bg-white p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[#014d46]">SAFEDEAL ESCROW AGREEMENT</h1>
          <div className="w-32 h-1 bg-[#014d46] mx-auto mb-4"></div>
          <p className="text-gray-500">Generated document — ID: {escrow.id}</p>
        </div>
        <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {escrow.generated_contract}
        </div>
      </div>
    );
  }

  return (
    <div className="print-container bg-white p-8 max-w-4xl mx-auto">
      <div className="h-1.5 bg-[#014d46] mb-8 rounded-full"></div>
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold mb-2 text-[#014d46]">SAFEDEAL ESCROW AGREEMENT</h1>
        <div className="w-32 h-1 bg-[#014d46] mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Agreement ID: SD-{escrow.id}</p>
        <p className="text-gray-500">{formatDate(escrow.created_at)}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">PARTIES TO THE AGREEMENT</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs font-bold text-[#014d46] uppercase mb-2">Buyer / Depositor</p>
            <p className="font-bold text-lg">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
            <p className="text-xs text-gray-500 break-all">{escrow.buyer?.email}</p>
            <p className="text-xs text-gray-500 mt-1">Profession: {escrow.buyer?.profession}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs font-bold text-[#014d46] uppercase mb-2">Seller / Service Provider</p>
            <p className="font-bold text-lg">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
            <p className="text-xs text-gray-500 break-all">{escrow.seller?.email}</p>
            <p className="text-xs text-gray-500 mt-1">Profession: {escrow.seller?.profession}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">AGREEMENT DETAILS</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p><span className="font-bold">Title:</span> {escrow.title}</p>
            <p><span className="font-bold">Type:</span> {escrow.escrow_type === 'item' ? 'Quick' : 'Detailed'}</p>
            <p><span className="font-bold">Total Amount:</span> {escrow.amount?.toLocaleString()} ETB</p>
            <p><span className="font-bold">Platform Fee:</span> {escrow.platform_fee?.toLocaleString()} ETB</p>
          </div>

          <div>
            <p><span className="font-bold">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                escrow.status === 'completed' ? 'bg-green-100 text-green-800' :
                escrow.status === 'funded' || escrow.status === 'active' ? 'bg-blue-100 text-blue-800' :
                escrow.status === 'disputed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {escrow.status}
              </span>
            </p>
            <p><span className="font-bold">Review Period:</span> {escrow.scope?.acceptance_days || escrow.inspection_period} days</p>
            <p><span className="font-bold">Jurisdiction:</span> {escrow.jurisdiction}</p>
            <p><span className="font-bold">Governing Law:</span> {escrow.governing_law}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">DELIVERABLES</h2>
        {escrow.scope?.deliverables?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#014d46] text-white">
                  <th className="py-3 px-4 text-left">#</th>
                  <th className="py-3 px-4 text-left">Deliverable</th>
                  <th className="py-3 px-4 text-left">Acceptance Standard</th>
                </tr>
              </thead>
              <tbody>
                {escrow.scope.deliverables.map((d, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 px-4">{i + 1}</td>
                    <td className="py-3 px-4 font-semibold">{d.title}</td>
                    <td className="py-3 px-4 text-sm">{d.standard_ref || 'Not specified'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
            {escrow.description}
          </div>
        )}
      </section>

      {escrow.milestones && escrow.milestones.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">MILESTONES</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#014d46] text-white">
                  <th className="py-3 px-4 text-left">Title</th>
                  <th className="py-3 px-4 text-left">Description</th>
                  <th className="py-3 px-4 text-right">Amount (ETB)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {escrow.milestones.map((milestone, index) => (
                  <tr key={milestone.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 px-4 font-semibold">{milestone.title}</td>
                    <td className="py-3 px-4">{milestone.description}</td>
                    <td className="py-3 px-4 text-right">{milestone.amount?.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        milestone.status === 'paid' ? 'bg-green-100 text-green-800' :
                        milestone.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        milestone.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {milestone.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {escrow.scope?.exclusions?.length ? (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">EXCLUSIONS (OUT OF SCOPE)</h2>
          <ul className="list-disc pl-6 space-y-1">
            {escrow.scope.exclusions.map((e, i) => <li key={i}>{e.title}</li>)}
          </ul>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">TERMS</h2>
        <div className="space-y-2 text-sm">
          <p>• Funds are released only upon the Buyer's explicit approval — never automatically.</p>
          <p>• Review period: {escrow.scope?.acceptance_days || escrow.inspection_period} days after delivery.</p>
          {escrow.scope?.deemed_accept && <p>• Silence after the review period counts as acceptance of the deliverable.</p>}
          {escrow.scope?.rejection_policy && <p>• Rejection: {escrow.scope.rejection_policy}</p>}
          {escrow.scope?.breach_terms && <p>• Breach: {escrow.scope.breach_terms}</p>}
          <p>• Dispute resolution: {escrow.dispute_resolution || 'arbitration'}</p>
        </div>
      </section>

      <footer className="mt-16 pt-8 border-t-2 border-gray-300">
        <div className="flex justify-between items-start">
          <div className="text-center">
            <p className="font-bold">Buyer Signature</p>
            <div className="h-16 border-b border-gray-300 mt-4 w-48"></div>
            <p className="font-semibold mt-2">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
            <p className="text-xs text-gray-500 break-all">{escrow.buyer?.email}</p>
          </div>

          <div className="text-center">
            <p className="font-bold">Seller Signature</p>
            <div className="h-16 border-b border-gray-300 mt-4 w-48"></div>
            <p className="font-semibold mt-2">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
            <p className="text-xs text-gray-500 break-all">{escrow.seller?.email}</p>
          </div>

          {escrow.mediator && (
            <div className="text-center">
              <p className="font-bold">Mediator Signature</p>
              <div className="h-16 border-b border-gray-300 mt-4 w-48"></div>
              <p className="font-semibold mt-2">{escrow.mediator.first_name} {escrow.mediator.last_name}</p>
              <p className="text-xs text-gray-500 break-all">{escrow.mediator.email}</p>
            </div>
          )}
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>This document was digitally generated by SafeDeal Escrow Platform</p>
          <p>All terms are protected by hybrid blockchain audit logs.</p>
          <p className="text-xs break-all">Contract Hash: {escrow.contract_hash || escrow.escrow_hash}</p>
        </div>
      </footer>
    </div>
  );
};

export default PrintEscrowAgreement;