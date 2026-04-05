import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield, DollarSign, 
  Search, Check, FileText, 
  ChevronLeft, Trash2,
  ListChecks, Gavel
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import api, { userApi } from '../lib/api';
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
  creator_role: z.enum(['seller', 'buyer', 'mediator'], { required_error: 'Role is required' }),
  isDetailed: z.boolean().default(false),
  counterparty_id: z.number().optional(),
  counterparty_email: z.string().optional(),
  buyer_id: z.number().optional(),
  buyer_email: z.string().optional(),
  seller_id: z.number().optional(),
  seller_email: z.string().optional(),
  mediator_id: z.number().optional(),
  mediator_email: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be positive').min(1, 'Amount must be at least 1'),
  conditions: z.string().min(10, 'Conditions must be at least 10 characters').max(2000),
  jurisdiction: z.string().min(2, 'Jurisdiction is required').optional(),
  governing_law: z.string().min(2, 'Governing law is required').optional(),
  dispute_resolution: z.string().min(2, 'Dispute resolution method is required').optional(),
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
  const [selectedCounterparty, setSelectedCounterparty] = useState<SearchUser | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isValid },
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
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });

  const creatorRole = watch('creator_role');
  const isDetailed = watch('isDetailed');
  const amount = watch('amount');
  const milestones = watch('milestones') || [];

  const steps = useMemo(() => {
    const baseSteps = [
      { id: 'role', title: t('pages.role', 'Role'), icon: Shield },
      { id: 'parties', title: t('pages.parties', 'Parties'), icon: Search },
      { id: 'details', title: t('pages.terms', 'Terms'), icon: FileText },
    ];
    if (isDetailed) baseSteps.push({ id: 'milestones', title: t('pages.milestones', 'Milestones'), icon: ListChecks });
    baseSteps.push({ id: 'final', title: t('pages.finalize', 'Finalize'), icon: Check });
    return baseSteps;
  }, [isDetailed, t]);

  useEffect(() => {
    if (isDetailed) {
      if (milestones.length === 0) append({ title: '', amount: 0, description: '' });
      const total = milestones.reduce((sum: number, m: any) => sum + (Number(m.amount) || 0), 0);
      if (total > 0 && total !== amount) setValue('amount', total);
    }
  }, [milestones, isDetailed, amount, setValue, append]);

  const handleSearch = async (term: string) => {
    if (term.length < 3) { setSearchResults([]); return; }
    try {
      const response = await userApi.searchUsers(term);
      // Check if an invitation was sent (indicates the email doesn't exist but was invited)
      if (response.data.data.invited) {
        // Create a temporary user object for the email
        const tempUser: SearchUser = {
          id: 0, // Placeholder ID for non-existent user
          first_name: term.split('@')[0], // Use email prefix as first name
          last_name: term.split('@')[1]?.split('.')[0] || 'Invited', // Use domain prefix as last name
          profession: 'Invited User',
          activated: false,
          email: term,
        };
        setSearchResults([tempUser]);
      } else {
        setSearchResults(response.data.data.users || []);
      }
    } catch (error) { console.error('Search failed', error); }
  };

  const selectUser = (user: SearchUser, type: string) => {
    // Check if this is an invited user (id = 0 and has email)
    const isInvitedUser = user.id === 0 && user.email && !user.activated;
    
    if (type === 'buyer') { 
      setSelectedBuyer(user); 
      if (isInvitedUser && user.email) {
        setValue('buyer_id', undefined); // Don't set ID for invited user
        setValue('buyer_email', user.email);
      } else {
        setValue('buyer_id', user.id); 
        setValue('buyer_email', undefined);
      }
      setValue('counterparty_id', user.id);
    }
    else if (type === 'seller') { 
      setSelectedSeller(user); 
      if (isInvitedUser && user.email) {
        setValue('seller_id', undefined); // Don't set ID for invited user
        setValue('seller_email', user.email);
      } else {
        setValue('seller_id', user.id); 
        setValue('seller_email', undefined);
      }
      setValue('counterparty_id', user.id);
    }
    else { // counterparty
      setSelectedCounterparty(user); 
      if (isInvitedUser && user.email) {
        setValue('counterparty_id', undefined); // Don't set ID for invited user
        
        // Also set specific email based on creator role
        if (creatorRole === 'seller') {
          setValue('buyer_id', undefined);
          setValue('buyer_email', user.email);
        } else if (creatorRole === 'mediator') {
          // For mediator, we need to determine if this is buyer or seller based on current state
          if (!selectedBuyer) {
            // This is the buyer
            setValue('buyer_id', undefined);
            setValue('buyer_email', user.email);
          } else {
            // This is the seller
            setValue('seller_id', undefined);
            setValue('seller_email', user.email);
          }
        } else {
          // Creator is buyer, so this is the seller
          setValue('seller_id', undefined);
          setValue('seller_email', user.email);
        }
      } else {
        setValue('counterparty_id', user.id); 
        // Clear the specific email fields
        if (creatorRole === 'seller') {
          setValue('buyer_email', undefined);
        } else if (creatorRole === 'mediator') {
          if (!selectedBuyer) {
            setValue('buyer_email', undefined);
          } else {
            setValue('seller_email', undefined);
          }
        } else {
          setValue('seller_email', undefined);
        }
      }
    }
    setSearchResults([]);
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    const currentStepId = steps[step].id;
    if (currentStepId === 'role') fieldsToValidate = ['creator_role', 'isDetailed'];
    else if (currentStepId === 'parties') {
      if (creatorRole === 'mediator' && (!selectedBuyer || !selectedSeller)) { 
        toast.error(t('pages.select_buyer_seller', 'Select both parties')); 
        return; 
      }
      if (creatorRole !== 'mediator' && !selectedCounterparty) { 
        toast.error(t('pages.select_counterparty', 'Select counterparty')); 
        return; 
      }
      fieldsToValidate = creatorRole === 'mediator' ? ['buyer_id', 'seller_id'] : ['counterparty_id'];
    } else if (currentStepId === 'details') fieldsToValidate = ['amount', 'conditions'];
    else if (currentStepId === 'milestones') {
      const total = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
      if (total <= 0) { 
        toast.error(t('pages.milestones_amount_error', 'Invalid total')); 
        return; 
      }
      fieldsToValidate = ['milestones'];
    }
    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) setStep(s => Math.min(s + 1, steps.length - 1));
  };

  const onSubmit = async (data: CreateEscrowForm) => {
    try {
      const payload: any = { 
        creator_role: data.creator_role, 
        amount: Number(data.amount), 
        conditions: data.conditions 
      };
      
      if (data.isDetailed) {
        payload.jurisdiction = data.jurisdiction; 
        payload.governing_law = data.governing_law; 
        payload.dispute_resolution = data.dispute_resolution;
        if (data.milestones) {
          payload.milestones = data.milestones.map((m: any, i: number) => ({ 
            ...m, 
            order_index: i, 
            amount: Number(m.amount) 
          }));
        }
      }
      
      if (creatorRole === 'mediator') { 
        // Include buyer and seller IDs if they exist, otherwise include emails
        if (data.buyer_id) payload.buyer_id = data.buyer_id;
        if (data.seller_id) payload.seller_id = data.seller_id;
        if (data.buyer_email) payload.buyer_email = data.buyer_email;
        if (data.seller_email) payload.seller_email = data.seller_email;
        payload.mediator_id = currentUser?.id; 
      }
      else if (creatorRole === 'seller') { 
        // Include buyer ID if it exists, otherwise include buyer email
        if (data.counterparty_id) {
          payload.buyer_id = data.counterparty_id;
        } else if (data.buyer_email) {
          payload.buyer_email = data.buyer_email;
        }
        payload.seller_id = currentUser?.id; 
      }
      else { // buyer role
        payload.buyer_id = currentUser?.id; 
        // Include seller ID if it exists, otherwise include seller email
        if (data.counterparty_id) {
          payload.seller_id = data.counterparty_id;
        } else if (data.seller_email) {
          payload.seller_email = data.seller_email;
        }
      }
      
      await api.post(`/api/escrows`, payload);
      toast.success(t('pages.escrow_created_success', 'Created!')); 
      navigate('/escrows');
    } catch (error: any) {
      console.error("Error creating escrow:", error);
      toast.error(error?.response?.data?.message || t('pages.escrow_create_failed', 'Failed'));
    }
  };

  const renderStepContent = () => {
    switch (steps[step].id) {
      case 'role': return (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-center">{t('pages.new_safedeal', 'New SafeDeal')}</h2>
          <div className="grid grid-cols-3 gap-4">
            {['buyer', 'seller', 'mediator'].map(r => (
              <label key={r} className={`p-6 border-2 rounded-2xl cursor-pointer transition-all ${creatorRole === r ? 'border-[#014d46] bg-[#e6f7f4]' : 'border-gray-100'}`}>
                <input type="radio" value={r} {...register('creator_role')} className="sr-only" />
                <span className="font-bold block text-center uppercase text-xs">{t(`pages.${r}`, r)}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 border-t pt-8">
            {[false, true].map(m => (
              <label key={m.toString()} className={`p-5 border-2 rounded-2xl cursor-pointer transition-all ${isDetailed === m ? 'border-[#014d46] bg-[#e6f7f4]' : 'border-gray-100'}`}>
                <input type="radio" checked={isDetailed === m} onChange={() => setValue('isDetailed', m)} className="sr-only" />
                <span className="font-bold block">{m ? t('pages.ultra_comprehensive', 'Detailed') : t('pages.quick_escrow', 'Quick')}</span>
              </label>
            ))}
          </div>
        </div>
      );
      case 'parties': return (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-center">{t('pages.counterparties', 'Parties')}</h2>
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder={t('pages.search_people_placeholder', 'Search...')} 
                className="input w-full h-14 rounded-2xl pl-12" 
                onChange={e => handleSearch(e.target.value)} 
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-4 border rounded-2xl overflow-hidden shadow-xl bg-white">
                {searchResults.map(u => (
                  <button 
                    key={u.id} 
                    onClick={() => selectUser(u, creatorRole === 'mediator' ? (selectedBuyer ? 'seller' : 'buyer') : 'counterparty')} 
                    className="w-full p-4 hover:bg-gray-50 border-b last:border-0 text-left transition-colors"
                  >
                    {u.first_name} {u.last_name}
                  </button>
                ))}
              </div>
            )}
            {(selectedCounterparty || selectedBuyer || selectedSeller) && (
              <div className="mt-4 p-4 bg-[#e6f7f4] rounded-2xl border border-[#014d46] font-bold text-center">
                {selectedCounterparty && `${selectedCounterparty.first_name} ${selectedCounterparty.last_name}`}
                {selectedBuyer && `${selectedBuyer.first_name} ${selectedBuyer.last_name}`}
                {selectedSeller && `${selectedSeller.first_name} ${selectedSeller.last_name}`}
              </div>
            )}
          </div>
        </div>
      );
      case 'details': return (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-center">{t('pages.agreement_terms', 'Terms')}</h2>
          <textarea 
            rows={8} 
            {...register('conditions')} 
            className="w-full p-5 border-2 rounded-2xl focus:border-[#014d46] outline-none transition-all" 
            placeholder={t('pages.terms_placeholder', 'Enter the conditions of your agreement...')} 
          />
          <div className="relative max-w-xs mx-auto">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="number" 
              {...register('amount')} 
              className="input pl-12 h-14 rounded-2xl text-xl font-bold w-full" 
              placeholder="0.00" 
            />
          </div>
        </div>
      );
      case 'milestones': return (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('pages.project_milestones', 'Milestones')}</h2>
            <button 
              type="button" 
              onClick={() => append({ title: '', amount: 0, description: '' })} 
              className="btn btn-primary btn-sm rounded-xl"
            >
              + {t('pages.add', 'Add')}
            </button>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {fields.map((f, i) => (
              <div key={f.id} className="p-5 bg-white border-2 rounded-2xl relative shadow-sm">
                <input 
                  placeholder={t('pages.milestone_title', 'Title')} 
                  {...register(`milestones.${i}.title`)} 
                  className="w-full mb-2 font-bold border-b outline-none focus:border-[#014d46]" 
                />
                <textarea 
                  placeholder={t('pages.milestone_description', 'Description')} 
                  {...register(`milestones.${i}.description`)} 
                  className="w-full mb-2 text-sm outline-none border-b resize-none" 
                  rows={2}
                />
                <input 
                  type="number" 
                  placeholder={t('pages.milestone_amount', 'Amount')} 
                  {...register(`milestones.${i}.amount`)} 
                  className="w-full text-sm outline-none" 
                />
                {fields.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => remove(i)} 
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      );
      case 'final': return (
        <div className="space-y-8 text-center">
          <h2 className="text-2xl font-bold">{t('pages.finalize_deal', 'Finalize')}</h2>
          <div className="p-8 bg-[#014d46] text-white rounded-3xl shadow-2xl">
            <p className="text-xs uppercase opacity-60 mb-2">{t('pages.total_amount', 'Total Amount')}</p>
            <p className="text-4xl font-black">{Number(amount).toLocaleString()} ETB</p>
          </div>
          <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3 text-left">
            <Gavel className="text-blue-600 shrink-0" size={20} />
            <p className="text-xs text-blue-800">{t('pages.legally_enforceable', 'This deal is protected by SafeDeal.')}</p>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-8 px-4 pb-12">
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} 
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 max-w-2xl mx-12 h-1 bg-gray-100 rounded-full relative">
            <div 
              className="absolute left-0 top-0 h-full bg-[#014d46] transition-all duration-500 rounded-full" 
              style={{ width: `${(step / (steps.length - 1)) * 100}%` }} 
            />
          </div>
          <div className="w-10" />
        </div>
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 sm:p-12 min-h-[60vh] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div 
              key={steps[step].id} 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }} 
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-12 flex justify-between items-center px-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {t('pages.step_indicator', 'Step')} {step + 1} / {steps.length}
          </div>
          <div className="flex gap-4">
            {step < steps.length - 1 ? (
              <button 
                onClick={nextStep} 
                className="btn btn-primary px-8 h-14 rounded-2xl font-bold uppercase shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 group"
              >
                {t('pages.continue', 'Continue')} 
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            ) : (
              <button 
                onClick={handleSubmit(onSubmit)} 
                disabled={isSubmitting || !isValid} 
                className="btn btn-primary px-8 h-14 rounded-2xl font-bold uppercase shadow-xl hover:shadow-2xl transition-all flex items-center gap-2"
              >
                {isSubmitting ? t('pages.launching', 'Launching...') : t('pages.start_secure_escrow_btn', 'Start Deal')}
                <Check size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEscrow;