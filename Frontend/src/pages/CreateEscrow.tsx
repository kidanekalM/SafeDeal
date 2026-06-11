import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield,
  Search, Check, FileText, 
  ChevronLeft, Trash2,
  ListChecks, Scale,
  Info, Briefcase, ShoppingCart, Calendar, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import { userApi, escrowApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchUser } from '../types';

const MilestoneSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().optional(),
  due_date: z.string().optional(),
});

const CreateEscrowSchema = z.object({
  creator_role: z.enum(['seller', 'buyer', 'mediator']),
  escrow_type: z.enum(['item', 'project']),
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  amount: z.coerce.number().min(1, 'Amount must be positive'),
  delivery_date: z.string().optional(),
  inspection_period: z.coerce.number().min(1).default(3),
  
  buyer_id: z.number().optional(),
  buyer_email: z.string().optional(),
  seller_id: z.number().optional(),
  seller_email: z.string().optional(),
  mediator_id: z.number().optional(),
  mediator_email: z.string().optional(),
  
  milestones: z.array(MilestoneSchema).optional(),
});

type CreateEscrowForm = z.infer<typeof CreateEscrowSchema>;

const CreateEscrow = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<SearchUser | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<SearchUser | null>(null);
  const [selectedMediator, setSelectedMediator] = useState<SearchUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchRole, setActiveSearchRole] = useState<'buyer' | 'seller' | 'mediator' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isValid, errors: formErrors },
    watch,
    setValue,
    control,
    trigger,
  } = useForm<CreateEscrowForm>({
    resolver: zodResolver(CreateEscrowSchema),
    mode: 'onChange',
    defaultValues: {
      creator_role: 'buyer',
      escrow_type: 'item',
      inspection_period: 3,
      amount: 0,
      milestones: [],
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });

  const escrowType = watch('escrow_type');
  const creatorRole = watch('creator_role');
  const milestonesWatch = watch('milestones') || [];

  // Sync amount from milestones for projects
  useEffect(() => {
    if (escrowType === 'project' && milestonesWatch.length > 0) {
      const total = milestonesWatch.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
      setValue('amount', total, { shouldValidate: true });
    }
  }, [milestonesWatch, escrowType, setValue]);

  const steps = useMemo(() => {
    const s = [
      { id: 'type', title: t('pages.deal_type', 'Type'), icon: Briefcase },
      { id: 'parties', title: t('pages.parties', 'Parties'), icon: Search },
      { id: 'details', title: t('pages.details', 'Details'), icon: FileText },
    ];
    if (escrowType === 'project') s.push({ id: 'milestones', title: t('pages.milestones', 'Milestones'), icon: ListChecks });
    s.push({ id: 'review', title: t('pages.review', 'Review'), icon: Check });
    return s;
  }, [escrowType, t]);

  const handleSearch = async (term: string, role: 'buyer' | 'seller' | 'mediator') => {
    setSearchTerm(term);
    setActiveSearchRole(role);
    if (term.length < 1) { setSearchResults([]); return; }
    try {
      const response = await userApi.searchUsers(term);
      if (response.data.data.invited) {
        const tempUser: SearchUser = {
          id: 0, first_name: term.split('@')[0], last_name: 'Invited', profession: 'Invited User', activated: false, email: term,
        };
        setSearchResults([tempUser]);
      } else {
        setSearchResults(response.data.data.users || []);
      }
    } catch (error) { setSearchResults([]); }
  };

  const selectUser = (user: SearchUser, role: 'buyer' | 'seller' | 'mediator') => {
    if (role === 'buyer') { setSelectedBuyer(user); setValue('buyer_id', user.id || undefined); setValue('buyer_email', user.id === 0 ? user.email : undefined); }
    else if (role === 'seller') { setSelectedSeller(user); setValue('seller_id', user.id || undefined); setValue('seller_email', user.id === 0 ? user.email : undefined); }
    else if (role === 'mediator') { setSelectedMediator(user); setValue('mediator_id', user.id || undefined); setValue('mediator_email', user.id === 0 ? user.email : undefined); }
    setSearchResults([]); setSearchTerm(''); setActiveSearchRole(null);
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    const currentId = steps[step].id;
    if (currentId === 'type') fieldsToValidate = ['escrow_type', 'creator_role'];
    else if (currentId === 'parties') {
      if (creatorRole === 'buyer' && !selectedSeller) { toast.error('Select a seller'); return; }
      if (creatorRole === 'seller' && !selectedBuyer) { toast.error('Select a buyer'); return; }
      if (creatorRole === 'mediator' && (!selectedBuyer || !selectedSeller)) { toast.error('Select both parties'); return; }
    }
    else if (currentId === 'details') fieldsToValidate = ['title', 'description', 'amount', 'inspection_period'];
    else if (currentId === 'milestones') {
      if (milestonesWatch.length === 0) { toast.error('Add at least one milestone'); return; }
      fieldsToValidate = ['milestones'];
    }

    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) setStep(s => Math.min(s + 1, steps.length - 1));
  };

  const onSubmit = async (data: CreateEscrowForm) => {
    try {
      const payload: any = {
        ...data,
        amount: Number(data.amount),
        inspection_period: Number(data.inspection_period),
        buyer_id: creatorRole === 'buyer' ? currentUser?.id : data.buyer_id,
        seller_id: creatorRole === 'seller' ? currentUser?.id : data.seller_id,
        mediator_id: creatorRole === 'mediator' ? currentUser?.id : data.mediator_id,
      };
      if (data.milestones) payload.milestones = data.milestones.map((m, i) => ({ ...m, order_index: i, amount: Number(m.amount) }));
      
      await escrowApi.create(payload);
      toast.success(t('pages.deal_launched', 'Deal Launched!'));
      navigate('/escrows');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create deal');
    }
  };

  const renderStepContent = () => {
    switch (steps[step].id) {
      case 'type': return (
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-4xl font-black text-gray-900 mb-4">{t('pages.what_are_you_doing', 'What are you doing?')}</h2>
            <p className="text-gray-500 font-medium">{t('pages.choose_path', 'Select the path that matches your deal')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <button onClick={() => { setValue('escrow_type', 'item'); }} className={`p-10 border-4 rounded-[3rem] text-left transition-all relative overflow-hidden group ${escrowType === 'item' ? 'border-primary-600 bg-primary-50 ring-8 ring-primary-100' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${escrowType === 'item' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <ShoppingCart size={32} />
              </div>
              <h3 className="text-2xl font-black mb-2">{t('pages.buy_sell_item', 'Buy / Sell Item')}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">Fast 3-step flow. Best for laptops, cars, electronics, or physical products.</p>
              {escrowType === 'item' && <Check size={24} className="absolute top-8 right-8 text-primary-600" />}
            </button>
            <button onClick={() => { setValue('escrow_type', 'project'); }} className={`p-10 border-4 rounded-[3rem] text-left transition-all relative overflow-hidden group ${escrowType === 'project' ? 'border-primary-600 bg-primary-50 ring-8 ring-primary-100' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${escrowType === 'project' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Briefcase size={32} />
              </div>
              <h3 className="text-2xl font-black mb-2">{t('pages.project_service', 'Project / Service')}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">Milestone-based. Best for software, consulting, construction, or long-term work.</p>
              {escrowType === 'project' && <Check size={24} className="absolute top-8 right-8 text-primary-600" />}
            </button>
          </div>
          <div className="pt-8 border-t border-gray-100 flex flex-col items-center">
             <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">{t('pages.your_role', 'Your Role in this deal')}</label>
             <div className="flex gap-4 p-2 bg-gray-100 rounded-[2rem]">
                {['buyer', 'seller', 'mediator'].map(r => (
                  <button key={r} onClick={() => setValue('creator_role', r as any)} className={`px-8 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all ${creatorRole === r ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                    {t(`pages.${r}`, r)}
                  </button>
                ))}
             </div>
          </div>
        </div>
      );

      case 'parties': return (
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-4xl font-black text-gray-900 mb-4">{t('pages.who_is_involved', 'Who is involved?')}</h2>
            <p className="text-gray-500 font-medium">{t('pages.search_participants', 'Search by email to add parties to this deal')}</p>
          </div>
          <div className="max-w-xl mx-auto space-y-8">
            {(creatorRole === 'seller' || creatorRole === 'mediator') && (
              <PartySearchField label={t('pages.the_buyer', 'The Buyer')} selected={selectedBuyer} role="buyer" searchTerm={searchTerm} activeSearchRole={activeSearchRole} searchResults={searchResults} onSearch={handleSearch} onSelect={selectUser} onClear={() => { setSelectedBuyer(null); setValue('buyer_id', undefined); }} />
            )}
            {(creatorRole === 'buyer' || creatorRole === 'mediator') && (
              <PartySearchField label={t('pages.the_seller', 'The Seller')} selected={selectedSeller} role="seller" searchTerm={searchTerm} activeSearchRole={activeSearchRole} searchResults={searchResults} onSearch={handleSearch} onSelect={selectUser} onClear={() => { setSelectedSeller(null); setValue('seller_id', undefined); }} />
            )}
            {escrowType === 'project' && creatorRole !== 'mediator' && (
              <PartySearchField label={t('pages.mediator_optional', 'Mediator (Optional)')} selected={selectedMediator} role="mediator" searchTerm={searchTerm} activeSearchRole={activeSearchRole} searchResults={searchResults} onSearch={handleSearch} onSelect={selectUser} onClear={() => { setSelectedMediator(null); setValue('mediator_id', undefined); }} isOptional />
            )}
          </div>
        </div>
      );

      case 'details': return (
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-4xl font-black text-gray-900 mb-4">{t('pages.deal_details', 'Deal Details')}</h2>
            <p className="text-gray-500 font-medium">{t('pages.what_are_the_terms', 'What exactly is being traded and when?')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="space-y-6">
              <div className="form-control">
                <label className="label-text font-black text-[10px] uppercase tracking-widest text-gray-400 mb-2 block">{escrowType === 'item' ? t('pages.item_name', 'Item Name') : t('pages.project_name', 'Project Name')}</label>
                <input type="text" {...register('title')} className="input w-full h-16 rounded-[1.5rem] bg-gray-50 border-none font-bold text-lg px-6" placeholder="e.g. MacBook Pro M3" />
                {formErrors.title && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase">{formErrors.title.message}</p>}
              </div>
              <div className="form-control">
                <label className="label-text font-black text-[10px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.description', 'Description')}</label>
                <textarea rows={6} {...register('description')} className="textarea w-full rounded-[1.5rem] bg-gray-50 border-none font-medium p-6 leading-relaxed" placeholder={t('pages.describe_deal', 'Provide specific details, specs, or scope...')} />
                {formErrors.description && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase">{formErrors.description.message}</p>}
              </div>
            </div>
            <div className="space-y-8 p-10 bg-primary-50 rounded-[3rem] border-4 border-white shadow-xl shadow-primary-900/5">
              <div className="form-control">
                <label className="label-text font-black text-[10px] uppercase tracking-widest text-primary-600 mb-2 block">{t('pages.total_amount', 'Total Amount (ETB)')}</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary-300 text-xl">ETB</div>
                  <input type="number" {...register('amount')} disabled={escrowType === 'project'} className="input w-full h-20 rounded-[1.5rem] bg-white border-none font-black text-3xl pl-20 pr-6 text-primary-900 shadow-sm disabled:opacity-80" placeholder="0" />
                </div>
                {escrowType === 'project' && <p className="text-[9px] font-black text-primary-400 uppercase mt-2 italic">Calculated from milestones</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label-text font-black text-[10px] uppercase tracking-widest text-primary-600 mb-2 block">{t('pages.delivery_date', 'Expected Delivery')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-300" size={18} />
                    <input type="date" {...register('delivery_date')} className="input w-full h-14 rounded-xl bg-white border-none font-bold text-sm pl-12" />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label-text font-black text-[10px] uppercase tracking-widest text-primary-600 mb-2 block">{t('pages.inspection', 'Inspection (Days)')}</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-300" size={18} />
                    <input type="number" {...register('inspection_period')} className="input w-full h-14 rounded-xl bg-white border-none font-bold text-sm pl-12" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

      case 'milestones': return (
        <div className="space-y-10">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-4xl font-black text-gray-900 mb-2">{t('pages.milestones', 'Milestones')}</h2>
              <p className="text-gray-500 font-medium">{t('pages.break_it_down', 'Break the project into deliverables and payments')}</p>
            </div>
            <button type="button" onClick={() => append({ title: '', amount: 0, description: '' })} className="btn btn-primary px-8 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/30">
              + {t('pages.add_milestone', 'Add Milestone')}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[50vh] pr-4">
            {fields.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-white border-2 border-gray-100 rounded-[2.5rem] relative group hover:border-primary-200 transition-all shadow-sm">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">#{i + 1} Deliverable Name</label>
                      <input placeholder="e.g. Website Homepage Design" {...register(`milestones.${i}.title`)} className="w-full font-black text-xl outline-none border-b-2 border-transparent focus:border-primary-600 transition-all bg-transparent" />
                    </div>
                    <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Payout (ETB)</label>
                      <input type="number" {...register(`milestones.${i}.amount`)} className="w-full font-black text-primary-600 text-2xl outline-none bg-transparent" placeholder="0" />
                    </div>
                    <div className="w-32">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Due Date</label>
                      <input type="date" {...register(`milestones.${i}.due_date`)} className="w-full font-bold text-xs outline-none bg-transparent" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="p-10 bg-primary-600 rounded-[3rem] text-white flex justify-between items-center shadow-2xl">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Project Budget</p>
              <p className="text-4xl font-black">{Number(watch('amount')).toLocaleString()} ETB</p>
            </div>
            <ListChecks size={48} className="opacity-40" />
          </div>
        </div>
      );

      case 'review': {
        const data = watch();
        return (
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-4xl font-black text-gray-900 mb-4">{t('pages.review_accept', 'Review & Accept')}</h2>
              <p className="text-gray-500 font-medium">{t('pages.system_generated_agreement', 'SafeDeal has generated your legal framework')}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
               <div className="p-10 bg-primary-900 text-white rounded-[3.5rem] shadow-2xl space-y-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Shield size={120} /></div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] opacity-40 mb-4">Agreement Overview</p>
                    <h3 className="text-3xl font-black leading-tight mb-4">{data.title}</h3>
                    <p className="text-primary-200 font-medium leading-relaxed">{data.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 pt-10 border-t border-white/10">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Total Value</p>
                      <p className="text-3xl font-black">{Number(data.amount).toLocaleString()} <span className="text-sm opacity-60">ETB</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Target Date</p>
                      <p className="text-xl font-black">{data.delivery_date || 'Ongoing'}</p>
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                 <div className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-white shadow-inner">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                      <Scale size={16} className="text-primary-600" /> Legal Summary
                    </h4>
                    <div className="space-y-6 text-sm font-medium text-gray-700 leading-relaxed">
                      <p>• <span className="font-black text-gray-900">Buyer</span> agrees to purchase <span className="text-primary-600">"{data.title}"</span>.</p>
                      {escrowType === 'item' ? (
                        <p>• <span className="font-black text-gray-900">Seller</span> agrees to deliver the item by <span className="font-black">{data.delivery_date || 'N/A'}</span>.</p>
                      ) : (
                        <p>• <span className="font-black text-gray-900">Seller</span> will deliver <span className="font-black">{milestonesWatch.length} milestones</span> as scheduled.</p>
                      )}
                      <p>• <span className="font-black text-gray-900">Buyer</span> has <span className="text-primary-600">{data.inspection_period} days</span> after each delivery to inspect and either <span className="text-green-600">Approve</span> or <span className="text-red-600">Dispute</span>.</p>
                      <p>• <span className="italic text-gray-500">Auto-Approval:</span> If no action is taken within the inspection period, the system will automatically release funds.</p>
                      <p>• <span className="italic text-gray-500">Legal Protection:</span> Anchored with <span className="font-mono text-[10px] bg-white px-2 py-1 rounded border">Keccak256</span> cryptographic fingerprinting.</p>
                    </div>
                 </div>
                 <div className="p-6 bg-amber-50 rounded-[2rem] border-2 border-amber-100 flex gap-4">
                    <Info className="text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-800 leading-relaxed font-bold uppercase tracking-tight">
                      By launching, you acknowledge that all payments are deterministic. Fraudulent evidence is punishable under the Electronic Transaction Proclamation of Ethiopia.
                    </p>
                 </div>
               </div>
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-12 px-4 pb-32">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-16 px-4">
          <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} className="p-5 bg-white shadow-xl rounded-2xl hover:bg-gray-50 transition-all border border-gray-100 group">
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex-1 max-w-2xl mx-12 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary-600" initial={{ width: 0 }} animate={{ width: `${(step / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.5, ease: "circOut" }} />
          </div>
          <div className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">{step + 1} / {steps.length}</div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-[4rem] shadow-[0_48px_96px_-24px_rgba(0,0,0,0.12)] border border-gray-100 p-10 sm:p-20 min-h-[60vh] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12 scale-150"><Shield size={300} /></div>
          
          <div className="relative flex-1">
            <AnimatePresence mode="wait">
              <motion.div key={steps[step].id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.5, ease: "circOut" }}>
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-16 flex justify-end">
            {step < steps.length - 1 ? (
              <button onClick={nextStep} className="btn btn-primary px-16 h-20 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary-500/40 hover:shadow-primary-500/60 transition-all flex items-center gap-4 group">
                {t('pages.continue', 'Continue')} <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            ) : (
              <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || !isValid} className="btn btn-primary px-16 h-20 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary-500/40 flex items-center gap-4">
                {isSubmitting ? t('pages.launching', 'Launching...') : t('pages.secure_launch', 'Secure Launch')}
                <Check size={24} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const PartySearchField = ({ label, selected, role, searchTerm, activeSearchRole, searchResults, onSearch, onSelect, onClear, isOptional = false }: any) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block flex justify-between">
        <span>{label}</span>
        {isOptional && <span className="lowercase italic opacity-60 font-medium">({t('common.optional', 'Optional')})</span>}
      </label>
      {selected ? (
        <div className="flex items-center justify-between p-6 bg-primary-50 rounded-[2rem] border-2 border-primary-600 shadow-sm animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-black text-xl uppercase">{selected.first_name[0]}{selected.last_name[0]}</div>
            <div>
              <p className="font-black text-gray-900 text-lg">{selected.first_name} {selected.last_name}</p>
              <p className="text-xs text-primary-700 font-bold">{selected.email}</p>
            </div>
          </div>
          <button onClick={onClear} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all rounded-xl"><Trash2 size={24} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
          <input type="text" placeholder={t(`pages.search_${role}_placeholder`, `Search by email...`)} className="input w-full h-20 rounded-[2rem] pl-16 pr-12 bg-gray-50 border-none font-bold text-lg focus:ring-4 focus:ring-primary-100" value={activeSearchRole === role ? searchTerm : ''} onChange={e => onSearch(e.target.value, role)} />
          {activeSearchRole === role && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-4 border-2 border-gray-100 rounded-[2.5rem] overflow-hidden shadow-2xl bg-white animate-in slide-in-from-top-4 duration-300">
              {searchResults.map((u: any) => (
                <button key={u.id || u.email} onClick={() => onSelect(u, role)} className="w-full p-6 hover:bg-primary-50 border-b border-gray-50 last:border-0 text-left transition-all flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-primary-600 group-hover:text-white flex items-center justify-center font-black text-sm transition-all">{u.first_name[0]}{u.last_name[0]}</div>
                    <div>
                      <p className="font-black text-gray-900">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-gray-400 font-bold">{u.email}</p>
                    </div>
                  </div>
                  {u.id === 0 && <span className="badge badge-info uppercase text-[8px] font-black tracking-widest py-3 px-4 rounded-lg border-none">Invite</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateEscrow;
