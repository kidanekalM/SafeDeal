import React from 'react';
import { useTranslation } from 'react-i18next';
import { Escrow } from '../types';

interface PrintEscrowProps {
  escrow: Escrow;
  onClose: () => void;
}

const PrintEscrow: React.FC<PrintEscrowProps> = ({ escrow, onClose }) => {
  const { t } = useTranslation();

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl print:max-w-none print:shadow-none">
        {/* Header */}
        <div className="p-8 print:p-12 border-b border-gray-200">
          <div className="flex justify-between items-start mb-6 print:mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 print:text-4xl">{t('pages.safedeal_escrow', 'SafeDeal Escrow')}</h1>
              <p className="text-xl text-gray-600 mt-2 print:text-2xl">{t('pages.initiated_on', 'Initiated on')} {formatDate(escrow.created_at)}</p>
            </div>
            <div className="flex space-x-2 print:hidden">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors"
              >
                {t('common.close', 'Close')}
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                data-testid="print-contract-button"
              >
                {t('pages.print_contract', 'Print Contract')}
              </button>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="p-8 print:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 print:text-3xl">{t('pages.the_parties', 'The Parties')}</h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12 print:grid-cols-1 print:gap-6">
            <div className="border p-6 rounded-xl">
              <h3 className="font-bold text-lg mb-2 print:text-xl">{t('pages.buyer_role', 'Buyer / Purchaser')}</h3>
              <p className="text-gray-700 mb-1">{escrow.buyer?.first_name} {escrow.buyer?.last_name}</p>
              <p className="text-gray-500 text-sm">{escrow.buyer?.email}</p>
            </div>
            <div className="border p-6 rounded-xl">
              <h3 className="font-bold text-lg mb-2 print:text-xl">{t('pages.seller_role', 'Seller / Provider')}</h3>
              <p className="text-gray-700 mb-1">{escrow.seller?.first_name} {escrow.seller?.last_name}</p>
              <p className="text-gray-500 text-sm">{escrow.seller?.email}</p>
            </div>
            {escrow.mediator && (
              <div className="border p-6 rounded-xl">
                <h3 className="font-bold text-lg mb-2 print:text-xl">{t('pages.mediator_role', 'Assigned Mediator')}</h3>
                <p className="text-gray-700 mb-1">{escrow.mediator.first_name} {escrow.mediator.last_name}</p>
                <p className="text-gray-500 text-sm">{escrow.mediator.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financials */}
        <div className="p-8 print:p-12 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 print:text-3xl">{t('pages.transaction_amount', 'Transaction Amount')}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-4xl font-bold text-primary-600 print:text-5xl">{escrow.amount} {t('pages.fiat_currency_etb', 'ETB')}</p>
              <p className="text-lg text-gray-600 mt-2 print:text-xl">{t('pages.total_secured', 'Total Secured Value')}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold">{escrow.platform_fee} ETB {t('pages.includes_platform_fee', 'Platform Fee')}</p>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="p-8 print:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 print:text-3xl">{t('pages.legal_agreement_terms', 'Legal Agreement Terms')}</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-xl mb-3 print:text-2xl">{t('pages.agreement_conditions', 'Agreement Conditions')}</h3>
              <p className="text-lg leading-relaxed whitespace-pre-wrap text-gray-800 print:text-xl">{escrow.conditions}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="font-bold text-lg mb-2 block print:text-xl">{t('pages.jurisdiction', 'Jurisdiction')}</label>
                <p className="text-lg bg-gray-100 p-3 rounded-lg print:text-xl print:bg-white">{escrow.jurisdiction || 'Ethiopia'}</p>
              </div>
              <div>
                <label className="font-bold text-lg mb-2 block print:text-xl">{t('pages.governing_law', 'Governing Law')}</label>
                <p className="text-lg bg-gray-100 p-3 rounded-lg print:text-xl print:bg-white">{escrow.governing_law || 'Ethiopian Law'}</p>
              </div>
              <div>
                <label className="font-bold text-lg mb-2 block print:text-xl">{t('pages.dispute_resolution', 'Dispute Resolution')}</label>
                <p className="text-lg bg-gray-100 p-3 rounded-lg print:text-xl print:bg-white">{escrow.dispute_resolution || t('pages.ai_smart_resolution', 'AI Smart Resolution')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        {escrow.milestones && escrow.milestones.length > 0 && (
          <div className="p-8 print:p-12 bg-blue-50">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 print:text-3xl">{t('pages.delivery_milestones', 'Delivery Milestones')}</h2>
            <div className="space-y-4">
              {escrow.milestones.map((milestone: any /* Milestone */, _index: number) => (
                <div key={milestone.id} className="border-l-4 border-primary-500 pl-6 bg-white p-6 rounded-xl shadow-sm print:shadow-none">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl print:text-2xl">{milestone.title}</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">{milestone.amount} ETB</span>
                  </div>
                  <p className="text-gray-700 mb-2">{milestone.description}</p>
                  <p className="text-sm text-gray-500">Status: <span className="font-medium">{milestone.status}</span></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blockchain */}
        {escrow.contract_hash || escrow.blockchain_tx_hash && (
          <div className="p-8 print:p-12 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 print:text-3xl">{t('pages.tamper_proof_record', 'Tamper-Proof Record')}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {escrow.contract_hash && (
                <div>
                  <label className="font-bold text-lg mb-2 block print:text-xl">EscrowHash</label>
                  <p className="text-sm font-mono bg-gray-900 text-gray-100 p-4 rounded-lg break-all print:text-base print:p-6">{escrow.contract_hash}</p>
                </div>
              )}
              {escrow.blockchain_tx_hash && (
                <div>
                  <label className="font-bold text-lg mb-2 block print:text-xl">{t('pages.transaction_hash', 'Transaction Hash')}</label>
                  <p className="text-sm font-mono bg-blue-900 text-blue-100 p-4 rounded-lg break-all print:text-base print:p-6">{escrow.blockchain_tx_hash}</p>
                </div>
              )}
            </div>
            <p className="mt-4 text-gray-600 italic print:text-lg">{t('pages.blockchain_verified_desc', 'This agreement is permanently logged on the blockchain for auditability.')}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="p-8 print:p-12 border-t border-gray-200">
          <div className="grid md:grid-cols-2 gap-8 print:grid-cols-1">
            <div className="border-t pt-8">
              <label className="font-bold text-xl block mb-4 print:text-2xl">{t('pages.buyer_signature', 'Buyer / Purchaser Signature')}</label>
              <div className="h-24 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 text-sm print:h-32">
                ______________________________
              </div>
              <p className="text-xs text-gray-500 mt-2">Digital signature on file</p>
            </div>
            <div className="border-t pt-8">
              <label className="font-bold text-xl block mb-4 print:text-2xl">{t('pages.seller_signature', 'Seller / Provider Signature')}</label>
              <div className="h-24 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 text-sm print:h-32">
                ______________________________
              </div>
              <p className="text-xs text-gray-500 mt-2">Digital signature on file</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 print:p-12 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center print:text-sm">
          <p>{t('pages.print_footer_info', 'This document was digitally generated by SafeDeal Escrow Platform. All terms are protected by hybrid blockchain audit logs. EscrowHash: {{hash}} Tx: {{tx}}'.replace('{{hash}}', escrow.contract_hash || 'N/A').replace('{{tx}}', escrow.blockchain_tx_hash || 'N/A'))}</p>
          <p className="mt-1">{new Date().toLocaleDateString()} | Page 1 of 1</p>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-container, .print-container * { visibility: visible; }
            .print-container { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
            }
            button { display: none !important; }
          }
          @page { 
            size: A4; 
            margin: 1in;
            @bottom-center {
              content: "SafeDeal Escrow Agreement - Page " counter(page);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PrintEscrow;
