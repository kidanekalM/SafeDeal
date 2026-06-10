import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield, DollarSign, 
  Search, Check, FileText, 
  ChevronLeft, Trash2,
  ListChecks, Gavel, Scale,
  AlertTriangle
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
  
  // Structured Logic
  completion_type: z.string().min(1, 'Completion type is required'),
  release_trigger: z.string().min(1, 'Release trigger is required'),
  verification_authority: z.string().min(1, 'Verification authority is required'),
  evidence_types: z.array(z.string()).min(1, 'At least one evidence type is required'),
  
  // Business Logic
  auto_accept_days: z.coerce.number().min(0).max(30).optional(),
  inspection_period_days: z.coerce.number().min(0).default(7),
  required_approvals: z.coerce.number().min(1).default(1),
  
  acceptance_criteria: z.string().optional(),
}).refine(data => {
  if (data.release_trigger === 'inspection_passed' && (!data.inspection_period_days || data.inspection_period_days <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Inspection trigger requires inspection_period_days > 0",
  path: ["inspection_period_days"]
}).refine(data => {
  if (data.release_trigger === 'auto_accept' && (!data.auto_accept_days || data.auto_accept_days <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Auto-accept requires auto_accept_days > 0",
  path: ["auto_accept_days"]
});

const CreateEscrowSchema = z.object({
  creator_role: z.enum(['seller', 'buyer', 'mediator'], { required_error: 'Role is required' }),
  isDetailed: z.boolean().default(false),
  title: z.string().min(3, 'Title is required'),
  sub_type: z.string().optional(),
  inspection_period: z.coerce.number().min(0).default(0),
  buyer_id: z.number().optional(),
  buyer_email: z.string().optional(),
  seller_id: z.number().optional(),
  seller_email: z.string().optional(),
  mediator_id: z.number().optional(),
  mediator_email: z.string().optional(),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  conditions: z.string().min(10, 'Conditions must be at least 10 characters').max(2000),
  jurisdiction: z.string().min(2, 'Jurisdiction is required').optional(),
  governing_law: z.string().min(2, 'Governing law is required').optional(),
  dispute_resolution: z.string().default('AI Arbitration via SafeDeal'),
  milestones: z.array(MilestoneSchema).optional(),
});

type CreateEscrowForm = z.infer<typeof CreateEscrowSchema>;

const ErrorMessage = ({ error }: { error?: { message?: string } }) => {
  if (!error) return null;
  return <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-tight">{error.message}</p>;
};

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
      isDetailed: false,
      milestones: [],
      jurisdiction: 'Ethiopia',
      governing_law: 'Commercial Code of Ethiopia',
      dispute_resolution: 'AI Arbitration via SafeDeal',
      sub_type: 'freelance',
      inspection_period: 3,
      amount: 0,
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });

  const creatorRole = watch('creator_role');
  const isDetailed = watch('isDetailed');
  const amount = watch('amount');
  const milestonesWatch = watch('milestones') || [];

  // Sync amount from milestones
  useEffect(() => {
    if (isDetailed && milestonesWatch.length > 0) {
      const total = milestonesWatch.reduce((sum: number, m: any) => sum + (Number(m.amount) || 0), 0);
      setValue('amount', total, { shouldValidate: true });
    }
  }, [milestonesWatch, isDetailed, setValue]);

  useEffect(() => {
    if (isDetailed && milestonesWatch.length === 0) {
      append({ 
        title: 'Initial Milestone', 
        amount: 0, 
        description: '', 
        completion_type: 'delivery',
        release_trigger: 'buyer_approval',
        verification_authority: 'buyer',
        evidence_types: ['photo'],
        auto_accept_days: 0,
        inspection_period_days: 7,
        required_approvals: 1
      });
    }
  }, [isDetailed, milestonesWatch.length, append]);

  const handleSearch = async (term: string, role: 'buyer' | 'seller' | 'mediator') => {
    setSearchTerm(term);
    setActiveSearchRole(role);
    if (term.length < 1) { 
      setSearchResults([]); 
      return; 
    }
    
    try {
      const response = await userApi.searchUsers(term);
      if (response.data.data.invited) {
        const tempUser: SearchUser = {
          id: 0,
          first_name: term.split('@')[0],
          last_name: term.split('@')[1]?.split('.')[0] || 'Invited',
          profession: 'Invited User',
          activated: false,
          email: term,
        };
        setSearchResults([tempUser]);
      } else {
        setSearchResults(response.data.data.users || []);
      }
    } catch (error) { 
      setSearchResults([]);
    }
  };

  const steps = useMemo(() => {
    const s = [
      { id: 'role', title: t('pages.role', 'Role'), icon: Shield },
      { id: 'parties', title: t('pages.parties', 'Parties'), icon: Search },
      { id: 'details', title: t('pages.terms', 'Terms'), icon: FileText },
    ];
    if (isDetailed) s.push({ id: 'milestones', title: t('pages.milestones', 'Milestones'), icon: ListChecks });
    s.push({ id: 'final', title: t('pages.finalize', 'Finalize'), icon: Check });
    return s;
  }, [isDetailed, t]);

  const selectUser = (user: SearchUser, role: 'buyer' | 'seller' | 'mediator') => {
    const isInvitedUser = user.id === 0 && user.email;
    
    if (role === 'buyer') { 
      setSelectedBuyer(user); 
      if (isInvitedUser) {
        setValue('buyer_id', undefined);
        setValue('buyer_email', user.email);
      } else {
        setValue('buyer_id', user.id); 
        setValue('buyer_email', undefined);
      }
    }
    else if (role === 'seller') { 
      setSelectedSeller(user); 
      if (isInvitedUser) {
        setValue('seller_id', undefined);
        setValue('seller_email', user.email);
      } else {
        setValue('seller_id', user.id); 
        setValue('seller_email', undefined);
      }
    }
    else if (role === 'mediator') {
      setSelectedMediator(user);
      if (isInvitedUser) {
        setValue('mediator_id', undefined);
        setValue('mediator_email', user.email);
      } else {
        setValue('mediator_id', user.id);
        setValue('mediator_email', undefined);
      }
    }
    setSearchResults([]);
    setSearchTerm('');
    setActiveSearchRole(null);
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    const currentStepId = steps[step].id;
    
    if (currentStepId === 'role') {
      fieldsToValidate = ['creator_role', 'isDetailed'];
    } 
    else if (currentStepId === 'parties') {
      if (creatorRole === 'mediator') {
        if (!selectedBuyer || !selectedSeller) {
          toast.error(t('pages.select_buyer_seller', 'Select both parties')); 
          return; 
        }
      } else if (creatorRole === 'buyer') {
        if (!selectedSeller) {
          toast.error(t('pages.select_seller', 'Select seller')); 
          return; 
        }
      } else if (creatorRole === 'seller') {
        if (!selectedBuyer) {
          toast.error(t('pages.select_buyer', 'Select buyer')); 
          return; 
        }
      }
    }
    else if (currentStepId === 'details') {
      fieldsToValidate = ['title', 'conditions'];
      if (!isDetailed) fieldsToValidate.push('amount');
    } 
    else if (currentStepId === 'milestones') {
      const total = milestonesWatch.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
      if (total <= 0) { 
        toast.error(t('pages.milestones_amount_error', 'Total amount must be greater than 0')); 
        return; 
      }
      fieldsToValidate = ['milestones'];
    }

    const isStepValid = await trigger(fieldsToValidate as any);
    
    if (isStepValid) {
      setStep(s => Math.min(s + 1, steps.length - 1));
    } else if (fieldsToValidate.length > 0) {
      toast.error(t('common.fix_errors', 'Please fix validation errors before continuing'));
    }
  };

  const onSubmit = async (data: CreateEscrowForm) => {
    try {
      const payload: any = { 
        creator_role: data.creator_role, 
        amount: Number(data.amount), 
        conditions: data.conditions,
        title: data.title,
        sub_type: data.sub_type,
        inspection_period: Number(data.inspection_period),
      };
      
      if (data.isDetailed && data.milestones) {
        payload.jurisdiction = data.jurisdiction; 
        payload.governing_law = data.governing_law; 
        payload.dispute_resolution = data.dispute_resolution;
        
        payload.milestones = data.milestones.map((m: any, i: number) => ({ 
          ...m, 
          order_index: i, 
          amount: Number(m.amount),
          evidence_types: m.evidence_types.join(',')
        }));
      }
      
      // Assign participants
      if (creatorRole === 'mediator') { 
        payload.buyer_id = data.buyer_id;
        payload.seller_id = data.seller_id;
        payload.buyer_email = data.buyer_email;
        payload.seller_email = data.seller_email;
        payload.mediator_id = currentUser?.id; 
      }
      else {
        if (creatorRole === 'seller') {
          payload.seller_id = currentUser?.id;
          payload.buyer_id = data.buyer_id;
          payload.buyer_email = data.buyer_email;
        } else { // buyer
          payload.buyer_id = currentUser?.id;
          payload.seller_id = data.seller_id;
          payload.seller_email = data.seller_email;
        }
        if (data.mediator_id || data.mediator_email) {
          payload.mediator_id = data.mediator_id;
          payload.mediator_email = data.mediator_email;
        }
      }
      
      await escrowApi.create(payload);
      toast.success(t('pages.escrow_created_success', 'Deal Launched!')); 
      navigate('/escrows');
    } catch (error: any) {
      console.error("Error creating escrow:", error);
      toast.error(error?.response?.data?.message || t('pages.escrow_create_failed', 'Failed to create deal'));
    }
  };

  const renderStepContent = () => {
    switch (steps[step].id) {
      case 'role': return (
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-gray-900">{t('pages.start_new_deal', 'Start New Deal')}</h2>
            <p className="text-gray-500 font-medium">{t('pages.choose_how_to_begin', 'Select your role and flow complexity')}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['buyer', 'seller', 'mediator'].map(r => (
              <label key={r} className={`p-6 border-2 rounded-3xl cursor-pointer transition-all flex flex-col items-center gap-3 ${creatorRole === r ? 'border-primary-600 bg-primary-50 ring-4 ring-primary-100' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="radio" value={r} {...register('creator_role')} className="sr-only" />
                <div className={`p-3 rounded-2xl ${creatorRole === r ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {r === 'buyer' && <DollarSign size={24} />}
                  {r === 'seller' && <Shield size={24} />}
                  {r === 'mediator' && <Gavel size={24} />}
                </div>
                <span className="font-black uppercase text-[10px] tracking-widest">{t(`pages.${r}`, r)}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6 border-t pt-8">
            {[false, true].map(m => (
              <label key={m.toString()} className={`p-6 border-2 rounded-3xl cursor-pointer transition-all relative ${isDetailed === m ? 'border-primary-600 bg-primary-50' : 'border-gray-100'}`}>
                <input type="radio" checked={isDetailed === m} onChange={() => setValue('isDetailed', m)} className="sr-only" />
                <div className="flex justify-between items-start mb-2">
                  <span className="font-black text-lg">{m ? t('pages.detailed_mode', 'Detailed') : t('pages.quick_mode', 'Quick')}</span>
                  {isDetailed === m && <Check size={20} className="text-primary-600" />}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {m 
                    ? t('pages.detailed_desc', 'Deterministic legal enums, mandatory evidence, and milestone triggers.') 
                    : t('pages.quick_desc', 'Fast and simple for trusted standard trades.')}
                </p>
              </label>
            ))}
          </div>
        </div>
      );

      case 'parties': return (
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-gray-900">{t('pages.identify_parties', 'Identify Parties')}</h2>
            <p className="text-gray-500 font-medium">{t('pages.who_is_involved', 'Add the participants of this agreement')}</p>
          </div>
          
          <div className="max-w-xl mx-auto space-y-8">
            {(creatorRole === 'seller' || creatorRole === 'mediator') && (
              <PartySearchField 
                label={t('pages.buyer', 'Buyer')}
                selected={selectedBuyer}
                role="buyer"
                searchTerm={searchTerm}
                activeSearchRole={activeSearchRole}
                searchResults={searchResults}
                onSearch={handleSearch}
                onSelect={selectUser}
                onClear={() => { setSelectedBuyer(null); setValue('buyer_id', undefined); setValue('buyer_email', undefined); }}
              />
            )}

            {(creatorRole === 'buyer' || creatorRole === 'mediator') && (
              <PartySearchField 
                label={t('pages.seller', 'Seller')}
                selected={selectedSeller}
                role="seller"
                searchTerm={searchTerm}
                activeSearchRole={activeSearchRole}
                searchResults={searchResults}
                onSearch={handleSearch}
                onSelect={selectUser}
                onClear={() => { setSelectedSeller(null); setValue('seller_id', undefined); setValue('seller_email', undefined); }}
              />
            )}

            {isDetailed && creatorRole !== 'mediator' && (
              <div className="pt-4 border-t border-dashed">
                <PartySearchField 
                  label={t('pages.mediator_arbitrator', 'Mediator / Arbitrator (Optional)')}
                  selected={selectedMediator}
                  role="mediator"
                  searchTerm={searchTerm}
                  activeSearchRole={activeSearchRole}
                  searchResults={searchResults}
                  onSearch={handleSearch}
                  onSelect={selectUser}
                  onClear={() => { setSelectedMediator(null); setValue('mediator_id', undefined); setValue('mediator_email', undefined); }}
                  isOptional
                />
              </div>
            )}
          </div>
        </div>
      );

      case 'details': return (
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-gray-900">{t('pages.agreement_terms', 'Agreement Terms')}</h2>
            <p className="text-gray-500 font-medium">{t('pages.define_the_deal', 'Specify exactly what is being traded and how')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="form-control">
                <label className="label-text font-black text-[10px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.deal_title', 'Deal Title')}</label>
                <input 
                  type="text"
                  {...register('title')} 
                  className="input w-full h-14 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary-600 transition-all font-bold" 
                  placeholder={t('pages.title_placeholder', 'e.g. Website Redesign Project')} 
                />
                <ErrorMessage error={formErrors.title} />
              </div>

              {!isDetailed && (
                <div className="form-control">
                  <label className="label-text font-black text-[10px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.total_amount', 'Total Amount (ETB)')}</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">ETB</div>
                    <input 
                      type="number" 
                      {...register('amount')} 
                      className="input w-full h-14 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary-600 transition-all font-black text-xl pl-14" 
                      placeholder="0.00" 
                    />
                  </div>
                  <ErrorMessage error={formErrors.amount} />
                </div>
              )}

              <div className="form-control">
                <label className="label-text font-black text-[10px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.core_conditions', 'Core Conditions')}</label>
                <textarea 
                  rows={isDetailed ? 12 : 6} 
                  {...register('conditions')} 
                  className="textarea w-full rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary-600 transition-all font-medium p-5 leading-relaxed" 
                  placeholder={t('pages.conditions_placeholder', 'Describe the agreement in detail...')} 
                />
                <ErrorMessage error={formErrors.conditions} />
              </div>
            </div>

            {isDetailed ? (
              <div className="space-y-8 p-8 bg-gray-50 rounded-[2.5rem] border-2 border-white shadow-inner">
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Scale size={14} className="text-primary-600" />
                    {t('pages.legal_parameters', 'Legal Parameters')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">{t('pages.agreement_type', 'Agreement Type')}</label>
                      <select {...register('sub_type')} className="select select-sm w-full rounded-xl bg-white border-none shadow-sm h-10">
                        <option value="freelance">Freelance</option>
                        <option value="consulting">Consulting</option>
                        <option value="development">Development</option>
                        <option value="design">Design</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">{t('pages.inspection_days', 'Inspection (Days)')}</label>
                      <input type="number" {...register('inspection_period')} className="input input-sm w-full rounded-xl bg-white border-none shadow-sm h-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">{t('pages.jurisdiction', 'Jurisdiction')}</label>
                      <input type="text" {...register('jurisdiction')} className="input input-sm w-full rounded-xl bg-white border-none shadow-sm h-10" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">{t('pages.governing_law', 'Governing Law')}</label>
                      <input type="text" {...register('governing_law')} className="input input-sm w-full rounded-xl bg-white border-none shadow-sm h-10" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-primary-100 rounded-3xl">
                  <div className="flex gap-3 text-primary-900">
                    <Shield size={24} className="shrink-0" />
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-widest">{t('pages.legal_strength', 'Legal Strength: High')}</h4>
                      <p className="text-[10px] opacity-80 leading-relaxed font-medium">
                        All milestones in detailed mode are fully deterministic. Triggers and evidence are strictly enforced.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-12 bg-primary-50 rounded-[3rem] border-4 border-white shadow-xl max-w-sm">
                  <Shield size={48} className="text-primary-600 mx-auto mb-4" />
                  <h3 className="font-black text-xl text-primary-900 mb-2">{t('pages.secure_by_default', 'SafeDeal Protected')}</h3>
                  <p className="text-sm text-primary-700 leading-relaxed">
                    Quick trades are anchored on-chain with basic cryptographic signatures.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );

      case 'milestones': return (
        <div className="space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-gray-900">{t('pages.milestones', 'Deterministic Milestones')}</h2>
              <p className="text-gray-500 font-medium">{t('pages.break_down_payments', 'Each payment must have a clear, non-text trigger')}</p>
            </div>
            <button 
              type="button" 
              onClick={() => append({ 
                title: '', 
                amount: 0, 
                description: '', 
                completion_type: 'delivery',
                release_trigger: 'buyer_approval',
                verification_authority: 'buyer',
                evidence_types: ['photo'],
                auto_accept_days: 0,
                inspection_period_days: 7,
                required_approvals: 1
              })}
              className="btn btn-primary px-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary-500/30"
            >
              + {t('pages.add_milestone', 'Add Milestone')}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-8 overflow-y-auto max-h-[55vh] pr-4">
            {fields.map((f, i) => (
              <motion.div 
                key={f.id} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="p-8 bg-white border-2 border-gray-100 rounded-[2.5rem] relative group hover:border-primary-200 transition-all shadow-sm"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">#{i + 1} {t('pages.milestone_title', 'Deliverable Name')}</label>
                        <input 
                          placeholder="e.g. Completed Mobile App Foundation" 
                          {...register(`milestones.${i}.title`)} 
                          className="w-full font-black text-lg outline-none border-b-2 border-transparent focus:border-primary-600 transition-all bg-transparent" 
                        />
                        <ErrorMessage error={formErrors.milestones?.[i]?.title} />
                      </div>
                      <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.payout_amount', 'Payout (ETB)')}</label>
                        <input 
                          type="number" 
                          {...register(`milestones.${i}.amount`)} 
                          className="w-full font-black text-primary-600 text-xl outline-none bg-transparent" 
                        />
                        <ErrorMessage error={formErrors.milestones?.[i]?.amount} />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.due_date', 'Due Date')}</label>
                        <input type="date" {...register(`milestones.${i}.due_date`)} className="w-full font-bold text-sm outline-none bg-transparent" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 rounded-3xl">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.completion_type', 'What is done?')}</label>
                      <select {...register(`milestones.${i}.completion_type`)} className="select select-xs w-full rounded-lg h-10 border-none bg-white font-bold">
                        <option value="delivery">Physical Delivery</option>
                        <option value="service_performed">Service Performed</option>
                        <option value="document_submitted">Document Submitted</option>
                        <option value="inspection_passed">Inspection Passed</option>
                        <option value="certificate_issued">Certificate Issued</option>
                        <option value="ownership_transferred">Ownership Transferred</option>
                        <option value="system_deployed">System Deployed</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.verification_auth', 'Who verifies?')}</label>
                      <select {...register(`milestones.${i}.verification_authority`)} className="select select-xs w-full rounded-lg h-10 border-none bg-white font-bold">
                        <option value="buyer">Buyer</option>
                        <option value="mutual">Mutual (Both)</option>
                        <option value="platform_mediator">Platform Mediator</option>
                        <option value="licensed_third_party">Licensed 3rd Party</option>
                        <option value="government_body">Government Body</option>
                        <option value="system_verification">System Check</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.release_trigger', 'When to pay?')}</label>
                      <select {...register(`milestones.${i}.release_trigger`)} className="select select-xs w-full rounded-lg h-10 border-none bg-white font-bold">
                        <option value="buyer_approval">Buyer Approval</option>
                        <option value="inspection_passed">Inspection Passed</option>
                        <option value="certificate_issued">Certificate Issued</option>
                        <option value="document_verified">Document Verified</option>
                        <option value="auto_accept">Auto-Accept</option>
                        <option value="time_expiry">Time Expiry</option>
                        <option value="court_order">Court Order</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('pages.evidence_required', 'Evidence Type')}</label>
                      <div className="flex flex-wrap gap-1">
                        {['photo', 'video', 'document', 'signature'].map(et => (
                          <label key={et} className="cursor-pointer">
                            <input type="checkbox" value={et} {...register(`milestones.${i}.evidence_types`)} className="sr-only peer" />
                            <span className="px-2 py-1 bg-white border rounded text-[8px] font-black uppercase peer-checked:bg-primary-600 peer-checked:text-white peer-checked:border-primary-600 transition-all">{et}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {watch(`milestones.${i}.release_trigger`) === 'inspection_passed' && (
                      <div className="col-span-2">
                         <label className="text-[9px] font-black text-primary-600 uppercase tracking-widest mb-1 block">{t('pages.inspection_window', 'Inspection Period (Days)')}</label>
                         <input type="number" {...register(`milestones.${i}.inspection_period_days`)} className="input input-xs w-full rounded-lg h-10 bg-primary-50 border-primary-200 font-black text-primary-900" />
                         <ErrorMessage error={(formErrors.milestones as any)?.[i]?.inspection_period_days} />
                      </div>
                    )}

                    {watch(`milestones.${i}.release_trigger`) === 'auto_accept' && (
                      <div className="col-span-2">
                         <label className="text-[9px] font-black text-primary-600 uppercase tracking-widest mb-1 block">{t('pages.auto_accept_window', 'Auto-Accept After (Days)')}</label>
                         <input type="number" {...register(`milestones.${i}.auto_accept_days`)} className="input input-xs w-full rounded-lg h-10 bg-primary-50 border-primary-200 font-black text-primary-900" />
                         <ErrorMessage error={(formErrors.milestones as any)?.[i]?.auto_accept_days} />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-6 bg-primary-600 rounded-[2rem] text-white flex justify-between items-center shadow-xl">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('pages.legal_total', 'Total Legally Structured Amount')}</p>
              <p className="text-3xl font-black">{Number(amount).toLocaleString()} ETB</p>
            </div>
            <Scale size={32} className="opacity-40" />
          </div>
        </div>
      );

      case 'final': return (
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-gray-900">{t('pages.finalize_deal', 'Finalize Deal')}</h2>
            <p className="text-gray-500 font-medium">{t('pages.review_and_launch', 'Review the deterministic logic before anchoring on-chain')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 bg-primary-900 text-white rounded-[3rem] shadow-2xl space-y-8">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-2">{t('pages.contract_title', 'Agreement ID')}</p>
                <h3 className="text-2xl font-black leading-tight truncate">{watch('title')}</h3>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-2">{t('pages.total_etb_value', 'Escrow Value')}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">{Number(amount).toLocaleString()}</span>
                  <span className="text-xl font-bold opacity-60">ETB</span>
                </div>
              </div>

              <div className="space-y-4 pt-8 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold opacity-60">{t('pages.platform_fee', 'Secure Platform Fee (2%)')}</span>
                  <span className="font-black">{(Number(amount) * 0.02).toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-primary-400">
                  <span className="text-xs font-black uppercase tracking-widest">{t('pages.net_payout', 'Net Payout')}</span>
                  <span className="text-xl font-black">{(Number(amount) * 0.98).toLocaleString()} ETB</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-white space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Check size={20} className="text-green-600" />
                  <h4 className="font-black uppercase text-xs tracking-widest text-gray-500">{t('pages.validation_status', 'Validation: Pass')}</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('pages.logic_type', 'Escrow Logic')}</p>
                    <p className="font-bold text-sm capitalize">{isDetailed ? 'Deterministic' : 'Standard'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('pages.resolution', 'Arbitration')}</p>
                    <p className="font-bold text-sm truncate">{watch('dispute_resolution')}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('pages.legal_integrity', 'Legal Integrity')}</p>
                    <div className="flex items-center gap-2 font-mono text-[9px] bg-white p-3 rounded-xl border border-gray-200 text-primary-700">
                       <Scale size={12} />
                       Keccak256 Anchored (Ethereum Status Layer)
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-amber-50 rounded-[2rem] border-2 border-amber-100 flex gap-4">
                <AlertTriangle className="text-amber-600 shrink-0" />
                <p className="text-[10px] text-amber-800 leading-relaxed font-bold">
                  {t('pages.legal_binding_warning', 'By launching, you acknowledge that all release triggers are deterministic and based on the selected enums. Fraudulent submission of evidence is punishable by law.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-12 px-4 pb-24">
        {/* Navigation / Progress */}
        <div className="flex items-center justify-between mb-16 px-4">
          <button 
            onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} 
            className="p-4 bg-white shadow-lg rounded-2xl hover:bg-gray-50 transition-all group border border-gray-100"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex-1 max-w-2xl mx-12 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary-600" 
              initial={{ width: 0 }}
              animate={{ width: `${(step / (steps.length - 1)) * 100}%` }} 
              transition={{ duration: 0.5, ease: "circOut" }}
            />
          </div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
            {step + 1} / {steps.length}
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-gray-100 p-8 sm:p-16 min-h-[65vh] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Scale size={300} />
          </div>
          
          <div className="relative flex-1">
            <AnimatePresence mode="wait">
              <motion.div 
                key={steps[step].id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }} 
                transition={{ duration: 0.4, ease: "circOut" }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-16 flex justify-end gap-4">
            {step < steps.length - 1 ? (
              <button 
                onClick={nextStep} 
                className="btn btn-primary px-12 h-16 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl shadow-primary-500/40 hover:shadow-primary-500/60 transition-all flex items-center gap-3 group"
              >
                {t('pages.continue', 'Continue')} 
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            ) : (
              <button 
                onClick={handleSubmit(onSubmit)} 
                disabled={isSubmitting || !isValid} 
                className="btn btn-primary px-12 h-16 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl shadow-primary-500/40 flex items-center gap-3"
              >
                {isSubmitting ? t('pages.launching', 'Launching...') : t('pages.launch_agreement', 'Secure Agreement')}
                <Check size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Component for party search
const PartySearchField = ({ 
  label, selected, role, searchTerm, activeSearchRole, searchResults, onSearch, onSelect, onClear, isOptional = false 
}: any) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block flex justify-between">
        <span>{label}</span>
        {isOptional && <span className="lowercase italic opacity-60 font-medium">({t('common.optional', 'Optional')})</span>}
      </label>
      {selected ? (
        <div className="flex items-center justify-between p-5 bg-primary-50 rounded-[1.5rem] border-2 border-primary-600 shadow-sm animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-black text-lg uppercase">
              {selected.first_name[0]}{selected.last_name[0]}
            </div>
            <div>
              <p className="font-black text-gray-900">{selected.first_name} {selected.last_name}</p>
              <p className="text-xs text-primary-700 font-medium">{selected.email}</p>
            </div>
          </div>
          <button onClick={onClear} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all rounded-xl">
            <Trash2 size={20} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder={t(`pages.search_${role}_placeholder`, `Search ${role} by email...`)} 
            className="input w-full h-16 rounded-[1.5rem] pl-14 pr-12 bg-gray-50 border-2 border-transparent focus:border-primary-600 transition-all font-bold" 
            value={activeSearchRole === role ? searchTerm : ''}
            onChange={e => onSearch(e.target.value, role)} 
          />
          {activeSearchRole === role && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-3 border-2 border-gray-100 rounded-[2rem] overflow-hidden shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] bg-white">
              {searchResults.map((u: any) => (
                <button 
                  key={u.id || u.email} 
                  onClick={() => onSelect(u, role)} 
                  className="w-full p-5 hover:bg-primary-50 border-b border-gray-50 last:border-0 text-left transition-all flex justify-between items-center group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-primary-600 group-hover:text-white flex items-center justify-center font-black text-xs transition-all">
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-sm">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                    </div>
                  </div>
                  {u.id === 0 && <span className="badge badge-info uppercase text-[8px] font-black tracking-widest py-3 px-3 rounded-lg border-none">{t('pages.invite', 'Invite')}</span>}
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
