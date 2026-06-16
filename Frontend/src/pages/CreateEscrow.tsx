import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, Check, 
  ChevronLeft, Trash2,
  Scale,
  Briefcase, ShoppingCart, Calendar, Clock,
  User, DollarSign, TextQuote
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
  title: z.string().min(3, 'Milestone title is required'),
  amount: z.coerce.number().min(1, 'Amount must be positive'),
  description: z.string().optional(),
  due_date: z.string().optional(),
});

const CreateEscrowSchema = z.object({
  creator_role: z.enum(['seller', 'buyer', 'mediator']),
  escrow_type: z.enum(['item', 'project']),
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Brief description is required'),
  amount: z.coerce.number().min(0),
  delivery_date: z.string().optional(),
  inspection_period: z.coerce.number().min(1).default(3),
  
  buyer_id: z.number().optional(),
  buyer_email: z.string().optional(),
  seller_id: z.number().optional(),
  seller_email: z.string().optional(),
  mediator_id: z.number().optional(),
  mediator_email: z.string().optional(),
  
  milestones: z.array(MilestoneSchema).optional(),
}).refine(data => {
  if (data.escrow_type === 'item' && data.amount <= 0) return false;
  return true;
}, {
  message: "Amount must be greater than zero for items",
  path: ["amount"]
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
    return [
      { id: 'type', title: 'Deal', icon: Briefcase },
      { id: 'parties', title: 'Parties', icon: User },
      { id: 'basics', title: 'Basics', icon: TextQuote },
      { id: 'timeline', title: 'Timeline', icon: Clock },
      { id: 'financial', title: 'Budget', icon: DollarSign },
      { id: 'review', title: 'Review', icon: Check },
    ];
  }, []);

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
    else if (currentId === 'basics') fieldsToValidate = ['title', 'description'];
    else if (currentId === 'timeline') fieldsToValidate = ['delivery_date', 'inspection_period'];
    else if (currentId === 'financial') {
      if (escrowType === 'item') fieldsToValidate = ['amount'];
      else {
        if (milestonesWatch.length === 0) { toast.error('Add at least one milestone'); return; }
        fieldsToValidate = ['milestones'];
      }
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-2">{t('pages.what_are_you_doing', 'What are you doing?')}</h2>
            <p className="text-gray-500 font-medium">{t('pages.choose_path', 'Select your deal type')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button onClick={() => setValue('escrow_type', 'item')} className={`p-8 border-2 rounded-[2rem] text-left transition-all relative group ${escrowType === 'item' ? 'border-primary-600 bg-primary-50' : 'border-gray-100 bg-white'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${escrowType === 'item' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                <ShoppingCart size={24} />
              </div>
              <h3 className="text-lg font-black">{t('pages.buy_sell_item', 'Buy / Sell Item')}</h3>
              <p className="text-[10px] text-gray-400 font-medium">Simple 5-step flow for electronics, vehicles, etc.</p>
              {escrowType === 'item' && <Check size={18} className="absolute top-6 right-6 text-primary-600" />}
            </button>
            <button onClick={() => setValue('escrow_type', 'project')} className={`p-8 border-2 rounded-[2rem] text-left transition-all relative group ${escrowType === 'project' ? 'border-primary-600 bg-primary-50' : 'border-gray-100 bg-white'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${escrowType === 'project' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                <Briefcase size={24} />
              </div>
              <h3 className="text-lg font-black">{t('pages.project_service', 'Project / Service')}</h3>
              <p className="text-[10px] text-gray-400 font-medium">Milestone-based flow for software, consulting, etc.</p>
              {escrowType === 'project' && <Check size={18} className="absolute top-6 right-6 text-primary-600" />}
            </button>
          </div>
          <div className="pt-6 border-t border-gray-100 flex flex-col items-center">
             <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4">{t('pages.your_role', 'Your Role')}</label>
             <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl">
                {['buyer', 'seller', 'mediator'].map(r => (
                  <button key={r} onClick={() => setValue('creator_role', r as any)} className={`px-6 py-2 rounded-xl font-black uppercase text-[10px] transition-all ${creatorRole === r ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400'}`}>
                    {t(`pages.${r}`, r)}
                  </button>
                ))}
             </div>
          </div>
        </div>
      );

      case 'parties': return (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-2">{t('pages.who_is_involved', 'Who is involved?')}</h2>
          </div>
          <div className="max-w-md mx-auto space-y-6">
            {(creatorRole === 'seller' || creatorRole === 'mediator') && (
              <PartySearchField label={t('pages.the_buyer', 'Buyer Email')} selected={selectedBuyer} role="buyer" searchTerm={searchTerm} activeSearchRole={activeSearchRole} searchResults={searchResults} onSearch={handleSearch} onSelect={selectUser} onClear={() => { setSelectedBuyer(null); setValue('buyer_id', undefined); }} />
            )}
            {(creatorRole === 'buyer' || creatorRole === 'mediator') && (
              <PartySearchField label={t('pages.the_seller', 'Seller Email')} selected={selectedSeller} role="seller" searchTerm={searchTerm} activeSearchRole={activeSearchRole} searchResults={searchResults} onSearch={handleSearch} onSelect={selectUser} onClear={() => { setSelectedSeller(null); setValue('seller_id', undefined); }} />
            )}
            {escrowType === 'project' && creatorRole !== 'mediator' && (
              <PartySearchField label={t('pages.mediator_optional', 'Mediator (Optional)')} selected={selectedMediator} role="mediator" searchTerm={searchTerm} activeSearchRole={activeSearchRole} searchResults={searchResults} onSearch={handleSearch} onSelect={selectUser} onClear={() => { setSelectedMediator(null); setValue('mediator_id', undefined); }} isOptional />
            )}
          </div>
        </div>
      );

      case 'basics': return (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-2">{t('pages.agreement_basics', 'Basics')}</h2>
          </div>
          <div className="max-w-md mx-auto space-y-6">
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{escrowType === 'item' ? 'Item Name' : 'Project Title'}</label>
              <input type="text" {...register('title')} className="input w-full h-14 rounded-2xl bg-gray-50 border-none font-bold px-6" placeholder={escrowType === 'item' ? "e.g. MacBook Pro M3" : "e.g. Website Development"} />
              {formErrors.title && <p className="text-red-500 text-[9px] mt-1 font-bold uppercase">{formErrors.title.message}</p>}
            </div>
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">Description</label>
              <textarea rows={4} {...register('description')} className="textarea w-full rounded-2xl bg-gray-50 border-none font-medium p-6" placeholder="Provide key details..." />
              {formErrors.description && <p className="text-red-500 text-[9px] mt-1 font-bold uppercase">{formErrors.description.message}</p>}
            </div>
          </div>
        </div>
      );

      case 'timeline': return (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-2">{t('pages.agreement_timeline', 'Timeline')}</h2>
          </div>
          <div className="max-w-md mx-auto space-y-6">
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">Delivery Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="date" {...register('delivery_date')} className="input w-full h-14 rounded-2xl bg-gray-50 border-none font-bold pl-12" />
              </div>
            </div>
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">Inspection Period (Days)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="number" {...register('inspection_period')} className="input w-full h-14 rounded-2xl bg-gray-50 border-none font-bold pl-12" placeholder="3" />
              </div>
              <p className="text-[8px] font-medium text-gray-400 mt-2">Time after delivery to check and approve/dispute.</p>
            </div>
          </div>
        </div>
      );

      case 'financial': return (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-2">{escrowType === 'item' ? 'Total Amount' : 'Milestones'}</h2>
          </div>
          
          {escrowType === 'item' ? (
            <div className="max-w-md mx-auto p-10 bg-primary-50 rounded-[2.5rem] border-4 border-white shadow-xl">
               <label className="text-[9px] font-black text-primary-600 uppercase tracking-widest block mb-4">Contract Amount (ETB)</label>
               <div className="relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-primary-200 text-3xl">ETB</div>
                  <input type="number" {...register('amount')} className="input w-full h-20 bg-transparent border-none font-black text-5xl text-primary-900 pl-20 pr-0 outline-none focus:ring-0" placeholder="0" />
               </div>
               {formErrors.amount && <p className="text-red-500 text-[9px] mt-4 font-black uppercase tracking-tight">{formErrors.amount.message}</p>}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <p className="text-sm font-black text-primary-600 uppercase tracking-widest">Total: {Number(watch('amount')).toLocaleString()} ETB</p>
                <button type="button" onClick={() => append({ title: '', amount: 0 })} className="btn btn-primary btn-sm rounded-xl font-black">+ Add Milestone</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[45vh] p-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="p-6 bg-white border-2 border-gray-100 rounded-3xl relative group">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                         <input placeholder="Deliverable name..." {...register(`milestones.${i}.title`)} className="w-full font-black text-sm outline-none border-b border-transparent focus:border-primary-600 transition-all bg-transparent" />
                         <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 ml-2"><Trash2 size={16} /></button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase block mb-1">Amount</label>
                          <input type="number" {...register(`milestones.${i}.amount`)} className="w-full font-black text-primary-600 outline-none bg-transparent" placeholder="0" />
                        </div>
                        <div className="w-24">
                          <label className="text-[8px] font-black text-gray-400 uppercase block mb-1">Due</label>
                          <input type="date" {...register(`milestones.${i}.due_date`)} className="w-full font-bold text-[10px] outline-none bg-transparent" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );

      case 'review': {
        const data = watch();
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-black text-gray-900 mb-2">Legal Review</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
               <div className="p-8 bg-primary-900 text-white rounded-[2.5rem] shadow-xl space-y-8">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2">Agreement Summary</p>
                    <h3 className="text-xl font-black leading-tight">{data.title}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Budget</p>
                      <p className="text-lg font-black">{Number(data.amount).toLocaleString()} ETB</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Target</p>
                      <p className="text-sm font-bold">{data.delivery_date || 'N/A'}</p>
                    </div>
                  </div>
               </div>

               <div className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-white space-y-4">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                    <Scale size={14} className="text-primary-600" /> System Clauses
                  </h4>
                  <div className="space-y-3 text-[11px] font-bold text-gray-600 leading-relaxed">
                    <p>• <span className="text-gray-900">Buyer</span> has <span className="text-primary-600">{data.inspection_period} days</span> to inspect deliverables.</p>
                    <p>• <span className="italic">Auto-Release:</span> Funds move automatically if no dispute is raised within inspection window.</p>
                    {escrowType === 'project' && <p>• Payments released milestone-by-milestone upon approval.</p>}
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
      <div className="max-w-5xl mx-auto py-8 px-4 pb-32">
        {/* Simplified Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} className="p-4 bg-white shadow-lg rounded-2xl hover:bg-gray-50 border border-gray-100 group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex-1 max-w-md mx-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary-600" initial={{ width: 0 }} animate={{ width: `${(step / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{step + 1} / {steps.length}</div>
        </div>

        {/* Unified Content Box */}
        <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 p-8 sm:p-16 min-h-[50vh] flex flex-col relative overflow-hidden">
          <div className="relative flex-1">
            <AnimatePresence mode="wait">
              <motion.div key={steps[step].id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-12 flex justify-center">
            {step < steps.length - 1 ? (
              <button onClick={nextStep} className="btn btn-primary px-12 h-16 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/30 transition-all flex items-center gap-3">
                {t('pages.continue', 'Continue')} →
              </button>
            ) : (
              <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || !isValid} className="btn btn-primary px-12 h-16 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/30 flex items-center gap-3">
                {isSubmitting ? 'Launching...' : 'Secure Launch'}
                <Check size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const PartySearchField = ({ label, selected, role, searchTerm, activeSearchRole, searchResults, onSearch, onSelect, onClear, isOptional = false }: any) => {
  return (
    <div className="space-y-3">
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block flex justify-between">
        <span>{label}</span>
        {isOptional && <span className="lowercase italic opacity-60">(Optional)</span>}
      </label>
      {selected ? (
        <div className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border-2 border-primary-600 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center font-black text-xs uppercase">{selected.first_name[0]}</div>
            <div>
              <p className="font-black text-sm text-gray-900">{selected.first_name} {selected.last_name}</p>
              <p className="text-[10px] text-primary-700 font-bold">{selected.email}</p>
            </div>
          </div>
          <button onClick={onClear} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder={`Enter ${role} email...`} className="input w-full h-14 rounded-2xl pl-12 bg-gray-50 border-none font-bold text-sm" value={activeSearchRole === role ? searchTerm : ''} onChange={e => onSearch(e.target.value, role)} />
          {activeSearchRole === role && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 border border-gray-100 rounded-2xl overflow-hidden shadow-xl bg-white">
              {searchResults.map((u: any) => (
                <button key={u.id || u.email} onClick={() => onSelect(u, role)} className="w-full p-4 hover:bg-primary-50 border-b border-gray-50 last:border-0 text-left transition-all flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-black text-[10px]">{u.first_name[0]}</div>
                      <div>
                        <p className="font-black text-xs text-gray-900">{u.first_name} {u.last_name}</p>
                        <p className="text-[9px] text-gray-400 font-bold">{u.email}</p>
                      </div>
                   </div>
                   {u.id === 0 && <span className="text-[8px] font-black text-blue-500">Invite</span>}
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
