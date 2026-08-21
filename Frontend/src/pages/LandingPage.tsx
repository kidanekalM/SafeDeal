import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Send, 
  Shield,
  CheckCircle,
  Clock,
  Award,
  ArrowRight
} from 'lucide-react';
 
import Logo from "../assets/Logo.png";

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Instant deal box state (Phase 1)
  const [dealTitle, setDealTitle] = useState('');
  const [dealAmount, setDealAmount] = useState('');
  const [counterpartyPhone, setCounterpartyPhone] = useState('+251');

  const handleInstantStart = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = {
      title: dealTitle,
      amount: dealAmount,
      seller_email: counterpartyPhone
    };
    localStorage.setItem('safedeal_instant_draft', JSON.stringify(draft));
    navigate('/create-escrow');
  };

  const steps = [
    {
      step: t("pages.step_1", "STEP 1"),
      title: t("pages.create_a_contract_between_parties", "Create a contract between parties"),
      description: t("pages.set_up_your_escrow_agreement_with_clear_terms_and_conditions_for_both_buyer_and_seller", "Set up your escrow agreement with clear terms and conditions for both buyer and seller."),
      icon: <CheckCircle className="h-6 w-6 text-[#005356]" />
    },
    {
      step: t("pages.step_2", "STEP 2"),
      title: t("pages.buyer_pays_to_the_escrow", "Buyer pays to the escrow"),
      description: t("pages.funds_are_securely_held_in_escrow_until_all_conditions_are_met_by_both_parties", "Funds are securely held in escrow until all conditions are met by both parties."),
      icon: <Clock className="h-6 w-6 text-[#005356]" />
    },
    {
      step: t("pages.step_3", "STEP 3"),
      title: t("pages.service_or_item_gets_delivered", "Service or item gets delivered"),
      description: t("pages.seller_delivers_the_agreed_service_or_product_according_to_the_contract_terms", "Seller delivers the agreed service or product according to the contract terms."),
      icon: <Send className="h-6 w-6 text-[#005356]" />
    },
    {
      step: t("pages.step_4", "STEP 4"),
      title: t("pages.client_releases_the_payment", "Client releases the payment"),
      description: t("pages.once_satisfied_buyer_confirms_delivery_and_funds_are_automatically_released_to_seller", "Once satisfied, buyer confirms delivery and funds are automatically released to seller."),
      icon: <Award className="h-6 w-6 text-[#005356]" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
      {/* 1. Minimal Top Bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={Logo} alt="SafeDeal" className="h-8 w-8 object-contain" />
          <span className="font-black text-lg text-gray-900 tracking-tight">SafeDeal</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => i18n.changeLanguage(i18n.language === 'am' ? 'en' : 'am')}
            className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {i18n.language === 'am' ? 'English' : 'አማርኛ'}
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-1.5 rounded-xl bg-[#014d46] text-white text-xs font-bold hover:bg-[#02665c] transition-colors"
          >
            {t('common.sign_in', 'Sign In')}
          </button>
        </div>
      </header>

      {/* Main Content - Mobile First Vertical Stack */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-8">
        
        {/* 2. Hero Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
            <Shield size={14} className="text-emerald-600" /> Works with Telebirr & CBE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
            {i18n.language === 'am' ? 'ዕቃ ወይም ገንዘብ ሲለዋወጡ ዋስትና ይኑርዎት።' : 'Exchange money and goods with total safety.'}
          </h1>
          <p className="text-sm font-medium text-gray-600 max-w-sm mx-auto">
            {i18n.language === 'am' ? 'ገንዘቡ በዕገዳ (Escrow) ይቀመጣል። ስራው ሲጠናቀቅ ወይም ዕቃው ሲረከብ ብቻ ለባለቤቱ ይለቀቃል። በቴሌብር እና በንግድ ባንክ (CBE) ይሰራል።' : 'Your money is held securely in escrow. It is only released to the seller when you confirm delivery. Works with Telebirr & CBE.'}
          </p>
        </div>

        {/* 3. The Instant Deal Box (No scroll needed) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-xs font-black uppercase tracking-wider text-primary-800">
              {i18n.language === 'am' ? 'ፈጣን ስምምነት ጀምር' : 'Start an Instant Deal'}
            </h2>
            <span className="text-[10px] font-bold text-gray-400">30 seconds</span>
          </div>

          <form onSubmit={handleInstantStart} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                {i18n.language === 'am' ? 'የስምምነቱ ርዕስ (ምሳሌ ፦ ላፕቶፕ / ዌብሳይት)' : 'Deal Title (e.g., iPhone 13 / Web Design)'}
              </label>
              <input 
                type="text" 
                required
                value={dealTitle}
                onChange={e => setDealTitle(e.target.value)}
                placeholder={i18n.language === 'am' ? 'ዕቃውን ወይም አገልግሎቱን ይግለጹ...' : 'What are you buying or selling?'}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                {i18n.language === 'am' ? 'ጠቅላላ ዋጋ (በብር)' : 'Total Amount (ETB)'}
              </label>
              <input 
                type="number" 
                required
                value={dealAmount}
                onChange={e => setDealAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                {i18n.language === 'am' ? 'የሌላው ወገን ስልክ ቁጥር' : "Other Party's Phone Number"}
              </label>
              <input 
                type="tel" 
                required
                value={counterpartyPhone}
                onChange={e => setCounterpartyPhone(e.target.value)}
                placeholder="+251 9..."
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>

            <button 
              type="submit"
              className="w-full h-12 bg-[#014d46] text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-md hover:bg-[#02665c] transition-colors flex items-center justify-center gap-2"
            >
              {i18n.language === 'am' ? 'ደህንነቱ የተጠበቀ ስምምነት ጀምር' : 'Start Secure Deal'} <ArrowRight size={16} />
            </button>
          </form>

          <div className="pt-2 text-center">
            <button 
              type="button"
              onClick={() => navigate('/create-escrow')}
              className="text-xs font-bold text-primary-700 hover:underline"
            >
              {i18n.language === 'am' ? 'ከበርካታ ደረጃዎች ጋር ፕሮጀክት ወይም አገልግሎት ከሆነ →' : "It's a project or service with multiple steps →"}
            </button>
          </div>
        </div>

        {/* 4. 3-Step Visual Explainer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 text-center">
            {i18n.language === 'am' ? 'እንዴት ይሰራል?' : 'How SafeDeal Works'}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {steps.slice(0, 3).map((s, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="p-2 bg-emerald-50 rounded-lg text-primary-800 shrink-0">
                  {s.icon}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">{s.title}</p>
                  <p className="text-[11px] text-gray-500 font-medium leading-snug mt-0.5">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Footer */}
        <footer className="text-center py-4 text-xs font-bold text-gray-400 space-y-2 border-t border-gray-100">
          <div className="flex justify-center gap-4">
            <a href="/terms" className="hover:text-gray-700">Terms of Service</a>
            <span>•</span>
            <a href="/privacy" className="hover:text-gray-700">Privacy Policy</a>
          </div>
          <p>© {new Date().getFullYear()} SafeDeal Ethiopia. All rights reserved.</p>
        </footer>

      </main>
    </div>
  );
};

export default LandingPage;