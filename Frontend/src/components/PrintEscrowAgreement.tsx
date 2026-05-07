import React from 'react';
import { Escrow } from '../types';

interface PrintEscrowAgreementProps {
  escrow: Escrow;
}

const PrintEscrowAgreement: React.FC<PrintEscrowAgreementProps> = ({ escrow }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="print-container bg-white p-8 max-w-4xl mx-auto">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold mb-2 text-[#014d46]">SAFEDEAL ESCROW AGREEMENT</h1>
        <div className="w-32 h-1 bg-[#014d46] mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Agreement ID: {escrow.id}</p>
        <p className="text-gray-500">Created: {formatDate(escrow.created_at)}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">PARTIES TO THE AGREEMENT</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-[#014d46] mb-2">BUYER / DEPOSITOR</h3>
            <p className="font-semibold">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
            <p>Email: {escrow.buyer?.email}</p>
            <p>Profession: {escrow.buyer?.profession}</p>
            <p>Trust Score: {escrow.buyer?.trust_score}%</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-[#014d46] mb-2">SELLER / SERVICE PROVIDER</h3>
            <p className="font-semibold">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
            <p>Email: {escrow.seller?.email}</p>
            <p>Profession: {escrow.seller?.profession}</p>
            <p>Trust Score: {escrow.seller?.trust_score}%</p>
          </div>
        </div>
        
        {escrow.mediator && (
          <div className="mt-4 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <h3 className="font-bold text-blue-700 mb-2">MEDIATOR</h3>
            <p className="font-semibold">{escrow.mediator?.first_name} {escrow.mediator?.last_name}</p>
            <p>Email: {escrow.mediator?.email}</p>
            <p>Trust Score: {escrow.mediator?.trust_score}%</p>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">AGREEMENT DETAILS</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p><span className="font-bold">Title:</span> {escrow.title}</p>
            <p><span className="font-bold">Type:</span> {escrow.sub_type || 'Standard'}</p>
            <p><span className="font-bold">Total Amount:</span> {escrow.amount?.toLocaleString()} ETB</p>
            <p><span className="font-bold">Platform Fee:</span> {escrow.platform_fee?.toLocaleString()} ETB</p>
          </div>
          
          <div>
            <p><span className="font-bold">Status:</span> 
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                escrow.status === 'Completed' ? 'bg-green-100 text-green-800' :
                escrow.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                escrow.status === 'Disputed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {escrow.status}
              </span>
            </p>
            <p><span className="font-bold">Inspection Period:</span> {escrow.inspection_period} days</p>
            <p><span className="font-bold">Jurisdiction:</span> {escrow.jurisdiction}</p>
            <p><span className="font-bold">Governing Law:</span> {escrow.governing_law}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">TERMS & CONDITIONS</h2>
        <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
          {escrow.conditions}
        </div>
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
                        milestone.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        milestone.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                        milestone.status === 'Rejected' ? 'bg-red-100 text-red-800' :
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

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#014d46]">DISPUTE RESOLUTION</h2>
        <p>{escrow.dispute_resolution}</p>
      </section>

      <footer className="mt-16 pt-8 border-t-2 border-gray-300">
        <div className="flex justify-between items-start">
          <div className="text-center">
            <p className="font-bold">Buyer Signature</p>
            <div className="h-16 border-b border-gray-300 mt-4 w-48"></div>
            <p>{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
          </div>
          
          <div className="text-center">
            <p className="font-bold">Seller Signature</p>
            <div className="h-16 border-b border-gray-300 mt-4 w-48"></div>
            <p>{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
          </div>
          
          {escrow.mediator && (
            <div className="text-center">
              <p className="font-bold">Mediator Signature</p>
              <div className="h-16 border-b border-gray-300 mt-4 w-48"></div>
              <p>{escrow.mediator?.first_name} {escrow.mediator?.last_name}</p>
            </div>
          )}
        </div>
        
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>This document was digitally generated by SafeDeal Escrow Platform</p>
          <p>All terms are protected by hybrid blockchain audit logs.</p>
          <p>Contract Hash: {escrow.contract_hash}</p>
          <p>Blockchain Transaction: {escrow.blockchain_tx_hash}</p>
        </div>
      </footer>
    </div>
  );
};

export default PrintEscrowAgreement;