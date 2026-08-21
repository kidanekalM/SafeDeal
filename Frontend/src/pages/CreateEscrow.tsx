import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, Check, 
  ChevronLeft, Trash2,
  Scale,
  Briefcase, ShoppingCart, Calendar,
  User, DollarSign, ListChecks, FileX2, ShieldCheck, TextQuote
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

const DeliverableSchema = z.object({
  title: z.string().min(2, 'What is required'),
  amount: z.coerce.number().min(0.1, 'Amount required').default(1),
  unit: z.string().default('flat'),
  standard: z.string().default('buyer_approves'),
  standard_ref: z.string().optional(),
  due_date: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
});

const ExclusionSchema = z.object({
  title: z.string().min(2, 'Exclusion is required'),
});

const ScopeSchema = z.object({
  deliverables: z.array(DeliverableSchema).optional(),
  exclusions: z.array(ExclusionSchema).optional(),
  acceptance_method: z.string().optional(),
  acceptance_detail: z.string().optional(),
  acceptance_days: z.coerce.number().min(1).default(5),
  deemed_accept: z.boolean().optional(),
  rejection_policy: z.string().optional(),
  cure_period_days: z.coerce.number().min(0).default(0),
  breach_terms: z.string().optional(),
  termination_notice_days: z.coerce.number().min(0).default(7),
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

  jurisdiction: z.string().optional(),
  governing_law: z.string().optional(),
  dispute_resolution: z.enum(['arbitration', 'mediation', 'court']).optional(),

  scope: ScopeSchema.optional(),
  milestones: z.array(MilestoneSchema).optional(),
}).refine(data => {
  if (data.escrow_type === 'item' && data.amount <= 0) return false;
  return true;
}, {
  message: "Amount must be greater than zero for items",
  path: ["amount"]
});

type CreateEscrowForm = z.infer<typeof CreateEscrowSchema>;

const ACCEPTANCE_METHODS = [
  { value: 'buyer_approval', label: 'Buyer approval' },
  { value: 'inspection_passed', label: 'Independent inspection passed' },
  { value: 'test_results', label: 'Test results / measurement' },
  { value: 'certificate', label: 'Certificate issued' },
  { value: 'mutual', label: 'Mutual sign-off' },
];

const DEFINITION_OF_DONE_OPTIONS = [
  { value: 'buyer_approves', label: 'Buyer approves in app' },
  { value: 'matches_file', label: 'Matches attached file' },
  { value: 'buyer_inspects', label: 'Buyer inspects in person' },
  { value: 'written_spec', label: 'Meets written spec below' },
];

const UNIT_OPTIONS = [
  { value: 'flat', label: 'Flat (one-off)' },
  { value: 'pages', label: 'Pages' },
  { value: 'hours', label: 'Hours' },
  { value: 'units', label: 'Units' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'cars', label: 'Cars' },
  { value: 'items', label: 'Items' },
];

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
    formState: { isSubmitting, errors: formErrors },
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
      dispute_resolution: 'arbitration',
      jurisdiction: 'Ethiopia',
      governing_law: 'Commercial Code of Ethiopia',
      milestones: [],
      scope: {
        acceptance_method: 'buyer_approval',
        acceptance_days: 5,
        deemed_accept: false,
        cure_period_days: 0,
        termination_notice_days: 7,
        deliverables: [],
        exclusions: [],
      },
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });
  const { fields: delivFields, append: appendDeliv, remove: removeDeliv } = useFieldArray({ control, name: 'scope.deliverables' });
  const { fields: exclFields, append: appendExcl, remove: removeExcl } = useFieldArray({ control, name: 'scope.exclusions' });

  const escrowType = watch('escrow_type');
  const creatorRole = watch('creator_role');
  const milestonesWatch = watch('milestones') || [];

  // Sync total amount from deliverables for project flow
  useEffect(() => {
    if (escrowType === 'project' && delivFields.length > 0) {
      const total = delivFields.reduce((sum, _, index) => {
        const p = Number(watch(`scope.deliverables.${index}.price`)) || 0;
        return sum + p;
      }, 0);
      if (total > 0) {
        setValue('amount', total, { shouldValidate: true });
      }
    }
  }, [delivFields, escrowType, watch, setValue]);

  // Seed one empty deliverable row for the project/Detailed flow (item/Quick skips deliverables).
  useEffect(() => {
    if (escrowType === 'project' && delivFields.length === 0) {
      appendDeliv({ title: '', amount: 1, unit: 'flat', standard: 'buyer_approves', standard_ref: '', due_date: '', price: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escrowType]);

  // Sync amount from milestones for projects
  useEffect(() => {
    if (escrowType === 'project' && milestonesWatch.length > 0) {
      const total = milestonesWatch.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
      setValue('amount', total, { shouldValidate: true });
    }
  }, [milestonesWatch, escrowType, setValue]);

  const steps = useMemo(() => {
    const detailed = [
      { id: 'type', title: t('pages.step_deal', 'Deal'), icon: Briefcase },
      { id: 'parties', title: t('pages.step_parties', 'Parties'), icon: User },
      { id: 'basics', title: t('pages.step_basics', 'Basics'), icon: TextQuote },
      { id: 'deliverables', title: t('pages.step_deliver', 'Deliver'), icon: ListChecks },
      { id: 'acceptance', title: t('pages.step_accept', 'Accept'), icon: ShieldCheck },
      { id: 'exclusions', title: t('pages.step_exclude', 'Exclude'), icon: FileX2 },
      { id: 'terms', title: t('pages.step_terms', 'Terms'), icon: Scale },
      { id: 'financial', title: t('pages.step_budget', 'Budget'), icon: DollarSign },
      { id: 'review', title: t('pages.step_review', 'Review'), icon: Check },
    ];
    const simple = [
      { id: 'type', title: t('pages.step_deal', 'Deal'), icon: Briefcase },
      { id: 'parties', title: t('pages.step_parties', 'Parties'), icon: User },
      { id: 'basics', title: t('pages.step_basics', 'Basics'), icon: TextQuote },
      { id: 'financial', title: t('pages.step_budget', 'Budget'), icon: DollarSign },
      { id: 'review', title: t('pages.step_review', 'Review'), icon: Check },
    ];
    return escrowType === 'item' ? simple : detailed;
  }, [t, escrowType]);

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
      if (creatorRole === 'buyer' && !selectedSeller) { toast.error(t('pages.select_a_seller', 'Select a seller')); return; }
      if (creatorRole === 'seller' && !selectedBuyer) { toast.error(t('pages.select_a_buyer', 'Select a buyer')); return; }
      if (creatorRole === 'mediator' && (!selectedBuyer || !selectedSeller)) { toast.error(t('pages.select_both_parties', 'Select both parties')); return; }
    }
    else if (currentId === 'basics') fieldsToValidate = ['title', 'description'];
    else if (currentId === 'deliverables') fieldsToValidate = ['scope.deliverables'];
    else if (currentId === 'exclusions') fieldsToValidate = ['scope.exclusions'];
    else if (currentId === 'financial') {
      if (escrowType === 'item') fieldsToValidate = ['amount'];
      else {
        if (milestonesWatch.length === 0) { toast.error(t('pages.add_at_least_one_milestone', 'Add at least one milestone')); return; }
        fieldsToValidate = ['milestones'];
      }
    }

    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) setStep(s => Math.min(s + 1, steps.length - 1));
    else toast.error(t('pages.complete_required_fields', 'Please complete the required fields to continue.'));
  };

  const onSubmit = async (data: CreateEscrowForm) => {
    try {
      const payload: any = {
        ...data,
        amount: Number(data.amount),
        inspection_period: Number(data.inspection_period),
        jurisdiction: data.jurisdiction || 'Ethiopia',
        governing_law: data.governing_law || 'Commercial Code of Ethiopia',
        dispute_resolution: data.dispute_resolution || 'arbitration',
        buyer_id: creatorRole === 'buyer' ? currentUser?.id : data.buyer_id,
        seller_id: creatorRole === 'seller' ? currentUser?.id : data.seller_id,
        mediator_id: creatorRole === 'mediator' ? currentUser?.id : data.mediator_id,
        scope: {
          ...data.scope,
          acceptance_days: Number(data.scope?.acceptance_days) || 5,
          cure_period_days: Number(data.scope?.cure_period_days) || 0,
          termination_notice_days: Number(data.scope?.termination_notice_days) || 7,
          deliverables: (data.scope?.deliverables || []).filter(d => d.title.trim()).map(d => ({
            title: d.title.trim(), standard: d.standard || 'none', standard_ref: d.standard_ref || '',
          })),
          exclusions: (data.scope?.exclusions || []).filter(e => e.title.trim()).map(e => ({ title: e.title.trim() })),
        },
      };
      if (data.milestones) payload.milestones = data.milestones.map((m, i) => ({ ...m, order_index: i, amount: Number(m.amount) }));

      await escrowApi.create(payload);
      toast.success(t('pages.deal_launched', 'Deal Launched!'));
      navigate('/escrows');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('pages.failed_to_create_deal', 'Failed to create deal'));
    }
  };

  const stepTitle = (text: string, sub?: string) => (
    <div className="text-center mb-6">
      <h2 className="text-2xl font-black text-gray-900 mb-2">{text}</h2>
      {sub && <p className="text-gray-500 font-medium text-sm">{sub}</p>}
    </div>
  );

  const renderStepContent = () => {
    switch (steps[step].id) {
      case 'type': return (
        <div className="space-y-5 sm:space-y-6">
          {stepTitle(t('pages.choose_path', 'Select your deal type'))}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button onClick={() => setValue('escrow_type', 'item')} className={`p-5 sm:p-8 border rounded-2xl text-left transition-all relative group ${escrowType === 'item' ? 'border-primary-600 bg-primary-50' : 'border-gray-100 bg-white'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${escrowType === 'item' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                <ShoppingCart size={24} />
              </div>
              <h3 className="text-lg font-black">{t('pages.buy_sell_item', 'Quick')}</h3>
              <p className="text-[10px] text-gray-400 font-medium">{t('pages.simple_5_step_flow', 'A single deliverable with clear acceptance terms. For goods, vehicles, one-off items.')}</p>
              {escrowType === 'item' && <Check size={18} className="absolute top-6 right-6 text-primary-600" />}
            </button>
            <button onClick={() => setValue('escrow_type', 'project')} className={`p-5 sm:p-8 border rounded-2xl text-left transition-all relative group ${escrowType === 'project' ? 'border-primary-600 bg-primary-50' : 'border-gray-100 bg-white'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${escrowType === 'project' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                <Briefcase size={24} />
              </div>
              <h3 className="text-lg font-black">{t('pages.project_service', 'Detailed')}</h3>
              <p className="text-[10px] text-gray-400 font-medium">{t('pages.milestone_based_flow', 'Multiple deliverables and milestone payments. For software, services, consulting.')}</p>
              {escrowType === 'project' && <Check size={18} className="absolute top-6 right-6 text-primary-600" />}
            </button>
          </div>
          <div className="pt-6 border-t border-gray-100 flex flex-col items-center">
             <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4">{t('pages.your_role', 'Your Role')}</label>
             <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl">
                {['buyer', 'seller', 'mediator'].map(r => (
                  <button key={r} onClick={() => setValue('creator_role', r as any)} className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${creatorRole === r ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400'}`}>
                    {t(`pages.${r}`, r)}
                  </button>
                ))}
             </div>
          </div>
        </div>
      );

      case 'parties': return (
        <div className="space-y-5 sm:space-y-6">
          {stepTitle(t('pages.who_is_involved', 'Who is involved?'))}
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
        <div className="space-y-5 sm:space-y-6">
          {stepTitle(t('pages.what_is_it', 'What is it?'), t('pages.what_is_it_sub', 'A clear name and short description.'))}
          <div className="max-w-md mx-auto space-y-6">
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{escrowType === 'item' ? t('pages.item_name', 'Item Name') : t('pages.project_title', 'Project Title')}</label>
              <input type="text" {...register('title')} className="input w-full h-12 rounded-xl bg-gray-50 border-none font-bold px-6" placeholder={escrowType === 'item' ? t('pages.title_placeholder_item', 'e.g. MacBook Pro M3') : t('pages.title_placeholder_project', 'e.g. Website Development')} />
              {formErrors.title && <p className="text-red-500 text-[9px] mt-1 font-bold uppercase">{formErrors.title.message}</p>}
            </div>
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.description', 'Description')}</label>
              <textarea rows={4} {...register('description')} className="textarea w-full rounded-xl bg-gray-50 border-none font-medium p-6" placeholder={t('pages.description_placeholder', 'Provide key details...')} />
              {formErrors.description && <p className="text-red-500 text-[9px] mt-1 font-bold uppercase">{formErrors.description.message}</p>}
            </div>
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.delivery_date', 'Delivery Date')}</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="date" {...register('delivery_date')} className="input w-full h-12 rounded-xl bg-gray-50 border-none font-bold pl-12" />
              </div>
            </div>
          </div>
        </div>
      );

      case 'deliverables': return (
        <div className="space-y-5 sm:space-y-6">
          {stepTitle(t('pages.what_is_delivered', 'What is delivered?'), t('pages.what_is_delivered_sub', 'Define what, how much, definition of done, and price per row.'))}
          <div className="max-w-4xl mx-auto space-y-4">
            {delivFields.map((f, i) => (
              <div key={f.id} className="p-5 sm:p-6 bg-white border border-gray-100 rounded-2xl space-y-5 relative group shadow-sm">
                <button type="button" onClick={() => removeDeliv(i)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
                  <div className="md:col-span-5">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1.5">{t('pages.deliverable_what', 'What (Task or Item)')}</label>
                    <input placeholder="e.g. Homepage design" {...register(`scope.deliverables.${i}.title`)} className="w-full h-12 px-4 rounded-xl bg-gray-50 border-none font-black text-sm outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1.5">{t('pages.deliverable_amount', 'Amount')}</label>
                    <input type="number" step="any" placeholder="1" {...register(`scope.deliverables.${i}.amount`)} className="w-full h-12 px-4 rounded-xl bg-gray-50 border-none font-black text-sm outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1.5">{t('pages.deliverable_unit', 'Unit')}</label>
                    <select {...register(`scope.deliverables.${i}.unit`)} className="w-full h-12 px-3 rounded-xl bg-gray-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-primary-200">
                      {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1.5">{t('pages.deliverable_price', 'Price (ETB)')}</label>
                    <input type="number" placeholder="0" {...register(`scope.deliverables.${i}.price`)} className="w-full h-12 px-4 rounded-xl bg-primary-50 border-none font-black text-sm text-primary-900 outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 pt-5 border-t border-gray-100">
                  <div className="md:col-span-6">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1.5">{t('pages.deliverable_standard', 'Definition of Done')}</label>
                    <select {...register(`scope.deliverables.${i}.standard`)} className="w-full h-12 px-3 rounded-xl bg-gray-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-primary-200">
                      {DEFINITION_OF_DONE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1.5">{t('pages.deliverable_due', 'By When (Due Date)')}</label>
                    <input type="date" {...register(`scope.deliverables.${i}.due_date`)} className="w-full h-12 px-3 rounded-xl bg-gray-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1.5">{t('pages.deliverable_note', 'Spec Note')}</label>
                    <input placeholder="Optional note" {...register(`scope.deliverables.${i}.standard_ref`)} className="w-full h-12 px-3 rounded-xl bg-gray-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4">
              <p className="text-xs font-black text-primary-600 uppercase tracking-widest">
                {t('pages.deliverable_total', 'Total from deliverables: {{amount}} ETB', { amount: delivFields.reduce((sum, _, index) => sum + (Number(watch(`scope.deliverables.${index}.price`)) || 0), 0).toLocaleString() })}
              </p>
              <button type="button" onClick={() => appendDeliv({ title: '', amount: 1, unit: 'flat', standard: 'buyer_approves', standard_ref: '', due_date: '', price: 0 })} className="btn btn-primary btn-sm rounded-xl font-black">{t('pages.add_deliverable_row', '+ Add Another Row')}</button>
            </div>
          </div>
        </div>
      );

      case 'acceptance': return (
        <div className="space-y-5 sm:space-y-6">
          {stepTitle(t('pages.how_done_confirmed', "How is 'done' confirmed?"), t('pages.how_done_confirmed_sub', 'Make it checkable, not a feeling.'))}
          <div className="max-w-md mx-auto space-y-6">
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.acceptance_method', 'Acceptance Method')}</label>
              <select {...register('scope.acceptance_method')} className="w-full h-12 rounded-xl bg-gray-50 border-none font-bold px-6">
                {ACCEPTANCE_METHODS.map(m => <option key={m.value} value={m.value}>{t(`pages.accept_method_${m.value}`, m.label)}</option>)}
              </select>
            </div>
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.acceptance_detail_optional', 'Acceptance Detail (optional)')}</label>
              <textarea rows={3} {...register('scope.acceptance_detail')} className="textarea w-full rounded-xl bg-gray-50 border-none font-medium p-6" placeholder={t('pages.acceptance_detail_placeholder', 'e.g. Buyer confirms in the app that the delivered item matches its standard')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.days_to_review', 'Days to Review')}</label>
                <input type="number" {...register('scope.acceptance_days')} className="input w-full h-12 rounded-xl bg-gray-50 border-none font-bold px-6" defaultValue={5} />
              </div>
              <div className="form-control">
                <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.cure_period_days', 'Cure Period (Days)')}</label>
                <input type="number" {...register('scope.cure_period_days')} className="input w-full h-12 rounded-xl bg-gray-50 border-none font-bold px-6" placeholder="0" />
              </div>
            </div>
          </div>
        </div>
      );

      case 'exclusions': return (
        <div className="space-y-5 sm:space-y-6">
          {stepTitle(t('pages.what_is_not_included', 'What is NOT included?'), t('pages.what_is_not_included_sub', 'List what is out of scope so there is no surprise.'))}
          <div className="max-w-xl mx-auto space-y-3">
            {exclFields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl">
                <input placeholder={t('pages.exclusion_placeholder', 'e.g. Mobile app version, extra pages, logo design')} {...register(`scope.exclusions.${i}.title`)} className="flex-1 font-bold text-sm outline-none border-b-2 border-transparent focus:border-primary-600 transition-all bg-transparent" />
                <button type="button" onClick={() => removeExcl(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => appendExcl({ title: '' })} className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-600 hover:text-primary-600 font-black text-sm">{t('pages.add_exclusion', '+ Add Exclusion')}</button>
          </div>
        </div>
      );

      case 'terms': return (
        <div className="space-y-5 sm:space-y-6">
          {stepTitle(t('pages.breaking_deal', 'Breaking the deal'), t('pages.breaking_deal_sub', 'What happens if either side does not perform.'))}
          <div className="max-w-md mx-auto space-y-6">
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.rejection_policy', 'Rejection Policy')}</label>
              <textarea rows={3} {...register('scope.rejection_policy')} className="textarea w-full rounded-xl bg-gray-50 border-none font-medium p-6" placeholder={t('pages.rejection_policy_placeholder', 'e.g. Buyer can request 2 revisions free; further changes are paid via a Change Order.')} />
            </div>
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.breach_terms', 'Breach Terms')}</label>
              <textarea rows={3} {...register('scope.breach_terms')} className="textarea w-full rounded-xl bg-gray-50 border-none font-medium p-6" placeholder={t('pages.breach_terms_placeholder', 'e.g. If the Seller fails to deliver, the Buyer may cancel and be refunded.')} />
            </div>
            <div className="form-control">
              <label className="label-text font-black text-[9px] uppercase tracking-widest text-gray-400 mb-2 block">{t('pages.termination_notice_days', 'Termination Notice (Days)')}</label>
              <input type="number" {...register('scope.termination_notice_days')} className="input w-full h-12 rounded-xl bg-gray-50 border-none font-bold px-6" defaultValue={7} />
            </div>
          </div>
        </div>
      );

      case 'financial': return (
        <div className="space-y-5 sm:space-y-6">
          {stepTitle(escrowType === 'item' ? t('pages.total_amount_step', 'Total Amount') : t('pages.milestones_step', 'Milestones'))}

          {escrowType === 'item' ? (
            <div className="max-w-md mx-auto p-6 sm:p-8 bg-primary-50 rounded-2xl border border-white shadow-md">
               <label className="text-[9px] font-black text-primary-600 uppercase tracking-widest block mb-4">{t('pages.contract_amount_etb', 'Contract Amount (ETB)')}</label>
               <div className="relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-primary-200 text-3xl">ETB</div>
                  <input type="number" {...register('amount')} className="input w-full h-20 bg-transparent border-none font-black text-5xl text-primary-900 pl-20 pr-0 outline-none focus:ring-0" placeholder="0" />
               </div>
               {formErrors.amount && <p className="text-red-500 text-[9px] mt-4 font-black uppercase tracking-tight">{formErrors.amount.message}</p>}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4 max-w-2xl mx-auto">
                <p className="text-sm font-black text-primary-600 uppercase tracking-widest">{t('pages.total_label', 'Total: {{amount}} ETB', { amount: Number(watch('amount')).toLocaleString() })}</p>
                <button type="button" onClick={() => append({ title: '', amount: 0 })} className="btn btn-primary btn-sm rounded-xl font-black">{t('pages.add_milestone', '+ Add Milestone')}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[45vh] p-2 max-w-2xl mx-auto">
                {fields.map((f, i) => (
                  <div key={f.id} className="p-6 bg-white border border-gray-100 rounded-2xl relative group">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                         <input placeholder={t('pages.milestone_deliverable_placeholder', 'Deliverable name...')} {...register(`milestones.${i}.title`)} className="w-full font-black text-sm outline-none border-b border-transparent focus:border-primary-600 transition-all bg-transparent" />
                         <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 ml-2"><Trash2 size={16} /></button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase block mb-1">{t('pages.amount', 'Amount')}</label>
                          <input type="number" {...register(`milestones.${i}.amount`)} className="w-full font-black text-primary-600 outline-none bg-transparent" placeholder="0" />
                        </div>
                        <div className="w-24">
                          <label className="text-[8px] font-black text-gray-400 uppercase block mb-1">{t('pages.due', 'Due')}</label>
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
          <div className="space-y-5 sm:space-y-6">
            {stepTitle(t('pages.legal_review', 'Legal Review'))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
               <div className="p-5 sm:p-8 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Review & Confirm</h3>
                  <h4 className="text-xl font-black text-gray-900">{data.title}</h4>
                  <p className="text-sm text-gray-600 font-medium">{data.description}</p>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500">Total Value</span>
                    <span className="text-lg font-black text-primary-700">{Number(data.amount).toLocaleString()} ETB</span>
                  </div>
               </div>

               <div className="p-5 sm:p-8 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Scale size={14} className="text-primary-600" /> Summary of Terms
                  </h4>
                  <div className="space-y-2 text-xs font-medium text-gray-700">
                    <p>• <strong>Inspection:</strong> {data.inspection_period} days</p>
                    <p>• <strong>Review Window:</strong> {data.scope?.acceptance_days || 5} days</p>
                    <p>• <strong>Dispute Resolution:</strong> Simple Platform Mediation</p>
                    {escrowType === 'project' && (
                      <p>• <strong>Deliverables:</strong> {(data.scope?.deliverables || []).length} item(s)</p>
                    )}
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
      <div className="max-w-5xl mx-auto py-6 px-4 pb-32">
        {/* Simplified Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} className="p-3 bg-white shadow-md rounded-xl hover:bg-gray-50 border border-gray-100 group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex-1 max-w-md mx-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary-600" initial={{ width: 0 }} animate={{ width: `${(step / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{step + 1} / {steps.length}</div>
        </div>

        {/* Unified Content Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-10 min-h-[50vh] flex flex-col relative overflow-hidden">
          <div className="relative flex-1">
            <AnimatePresence mode="wait">
              <motion.div key={steps[step].id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex justify-center">
            {step < steps.length - 1 ? (
              <button onClick={nextStep} className="btn btn-primary px-8 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-md shadow-primary-500/20 transition-all flex items-center gap-3">
                {t('pages.continue', 'Continue')} →
              </button>
            ) : (
              <button onClick={handleSubmit(onSubmit, () => toast.error(t('pages.complete_required_fields', 'Please complete the required fields to continue.')))} disabled={isSubmitting} className="btn btn-primary px-8 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-md shadow-primary-500/20 flex items-center gap-3">
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
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block flex justify-between">
        <span>{label}</span>
        {isOptional && <span className="lowercase italic opacity-60">{t('pages.optional', '(Optional)')}</span>}
      </label>
      {selected ? (
        <div className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border border-primary-600 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center font-black text-xs uppercase shrink-0">{selected.first_name[0]}</div>
            <div className="min-w-0">
              <p className="font-black text-sm text-gray-900">{selected.first_name} {selected.last_name}</p>
              <p className="text-[10px] text-primary-700 font-bold truncate">{selected.email}</p>
            </div>
          </div>
          <button onClick={onClear} className="p-2.5 text-gray-400 hover:text-red-500 shrink-0"><Trash2 size={18} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder={t('pages.enter_email_placeholder', 'Enter {{role}} email...', { role: String(t(`pages.${role}`, role)).toLowerCase() })} className="input w-full h-12 rounded-xl pl-12 bg-gray-50 border-none font-bold text-sm" value={activeSearchRole === role ? searchTerm : ''} onChange={e => onSearch(e.target.value, role)} />
          {activeSearchRole === role && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 border border-gray-100 rounded-xl overflow-hidden shadow-lg bg-white">
              {searchResults.map((u: any) => (
                <button key={u.id || u.email} onClick={() => onSelect(u, role)} className="w-full p-4 hover:bg-primary-50 border-b border-gray-50 last:border-0 text-left transition-all flex justify-between items-center">
                   <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-black text-[10px] shrink-0">{u.first_name[0]}</div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-gray-900">{u.first_name} {u.last_name}</p>
                        <p className="text-[9px] text-gray-400 font-bold truncate">{u.email}</p>
                      </div>
                   </div>
                   {u.id === 0 && <span className="text-[8px] font-black text-blue-500 shrink-0">{t('pages.invite', 'Invite')}</span>}
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