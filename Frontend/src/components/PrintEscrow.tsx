import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { escrowApi } from '../lib/api';
import { Escrow } from '../types';
import PrintEscrowAgreement from './PrintEscrowAgreement';
import { Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrintEscrow: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [escrow, setEscrow] = useState<Escrow | null>(location.state?.escrow || null);
  const [loading, setLoading] = useState<boolean>(!location.state?.escrow);

  useEffect(() => {
    // If escrow wasn't passed via navigation state (e.g. page refresh), fetch by id
    if (!escrow && id) {
      escrowApi.getById(parseInt(id))
        .then((res) => setEscrow(res.data))
        .finally(() => setLoading(false));
    }
  }, [id, escrow]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-[#014d46] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-xl text-gray-500">{t('pages.no_escrow_data', 'No escrow data available')}</p>
      </div>
    );
  }

  return (
    <div className="print-page bg-gray-100 min-h-screen py-10">
      <div className="max-w-6xl mx-auto">
        {/* Top Action Bar (hidden on print) */}
        <div className="mb-6 bg-white shadow rounded-2xl p-4 flex justify-between items-center no-print">
          <Link to={`/escrow/${escrow.id}`} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
            <ArrowLeft size={18} /> {t('pages.back_to_details', 'Back to Escrow')}
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="btn btn-primary bg-primary-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Printer size={20} /> {t('pages.print_agreement', 'Print Agreement')}
            </button>
          </div>
        </div>

        {/* Preview (hidden on print) */}
        <div className="prose max-w-none no-print">
          <PrintEscrowAgreement escrow={escrow} />
        </div>

        {/* Hidden element for printing */}
        <div className="hidden print:block">
          <PrintEscrowAgreement escrow={escrow} />
        </div>
      </div>
    </div>
  );
};

export default PrintEscrow;