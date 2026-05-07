import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Escrow } from '../types';
import PrintEscrowAgreement from './PrintEscrowAgreement';

const PrintEscrow: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const escrow: Escrow = location.state?.escrow;

  useEffect(() => {
    // Trigger print after component renders
    const timer = setTimeout(() => {
      window.print();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!escrow) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">{t('pages.no_escrow_data', 'No escrow data available')}</p>
      </div>
    );
  }

  return (
    <div className="print-page bg-gray-100 min-h-screen py-8">
      <div className="max-w-6xl mx-auto bg-white shadow-lg p-8 print:hidden">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#014d46]">{t('pages.escrow_agreement_preview', 'Escrow Agreement Preview')}</h1>
          <button 
            onClick={() => window.print()} 
            className="btn btn-primary px-6 py-2 rounded-xl font-bold"
          >
            {t('pages.print_agreement', 'Print Agreement')}
          </button>
        </div>
        
        <div className="prose max-w-none">
          <PrintEscrowAgreement escrow={escrow} />
        </div>
      </div>
      
      {/* Hidden element for printing */}
      <div className="hidden print:block">
        <PrintEscrowAgreement escrow={escrow} />
      </div>
    </div>
  );
};

export default PrintEscrow;
