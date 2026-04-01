import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Shield, Mail, DollarSign, ArrowLeft, 
  Search, Check, UserPlus, FileText, Scale, 
  ChevronRight, ChevronLeft, Trash2, Calendar,
  Settings, Zap, ListChecks, Gavel, LayoutTemplate, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import api, { escrowApi, userApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchUser, CreateEscrowRequest } from '../types';

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

const TEMPLATES = [
  { 
    id: 'freelance', 
    name: 'Freelance Work', 
    conditions: '1. Deliverables: [List deliverables here]\n2. Revisions: [Number] rounds included.\n3. Timeline: Completion within [X] days of funding.\n4. Intellectual Property: Assigned to buyer upon full payment.'
  },
  { 
    id: 'product', 
    name: 'Product Sale', 
    conditions: '1. Item: [Name and Quantity]\n2. Shipping: Within [X] days of funding via [Carrier].\n3. Inspection: Buyer has [X] days to verify product quality.\n4. Returns: [Return policy details].'
  },
  { 
    id: 'service', 
    name: 'Consulting Service', 
    conditions: '1. Scope: [Describe service scope]\n2. Performance: Professional standard of care.\n3. Payment: Based on [Hours/Deliverables].\n4. Confidentiality: Both parties agree to NDA terms.'
  }
];

const CreateEscrow = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'buyer' | 'seller' | 'counterparty' | 'mediator'>('counterparty');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<SearchUser | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<SearchUser | null>(null);
  const [selectedMediator, setSelectedMediator] = useState<SearchUser | null>(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState<SearchUser | null>(null);
  const [invitationSent, setInvitationSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
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

  // Debug logging for form validation
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('📝 Form Validation Errors: ' + JSON.stringify(errors));
    }
    console.log('📝 Form Status: ' + JSON.stringify({ isValid, isSubmitting }));
  }, [errors, isValid, isSubmitting]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'milestones',
  });

  const creatorRole = watch('creator_role');
  const isDetailed = watch('isDetailed');
  const amount = watch('amount');
  const milestones = watch('milestones') || [];

  // Dynamic Steps - Simplified
  const steps = isDetailed 
    ? [
        { id: 'role', title: 'Role', icon: Shield },
        { id: 'parties', title: 'Parties', icon: Search },
        { id: 'details', title: 'Terms', icon: FileText },
        { id: 'milestones', title: 'Milestones', icon: ListChecks },
        { id: 'final', title: 'Finalize', icon: Check },
      ]
    : [
        { id: 'role', title: 'Role', icon: Shield },
        { id: 'parties', title: 'Parties', icon: Search },
        { id: 'details', title: 'Terms', icon: FileText },
        { id: 'final', title: 'Finalize', icon: Check },
      ];

  // Sync total amount with milestones if enabled
  useEffect(() => {
    if (isDetailed) {
      if (milestones.length === 0) {
        append({ title: '', amount: 0 });
      }
      
      const total = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
      if (total > 0 && total !== amount) {
        setValue('amount', total);
      }
    }
  }, [milestones, isDetailed, amount, setValue, append]);

  const handleSearch = async (term: string, type: 'buyer' | 'seller' | 'counterparty' | 'mediator') => {
    setSearchTerm(term);
    setSearchType(type);
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await userApi.searchUsers(term);
      const users = response.data.data.users || [];
      console.log('📝 Search Results:', JSON.stringify(users));
      setSearchResults(users);
      if (response.data.data.invited) {
        setInvitationSent(term);
      } else {
        setInvitationSent(null);
      }
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectUser = (user: SearchUser, type: 'buyer' | 'seller' | 'counterparty' | 'mediator') => {
    if (type === 'buyer') {
      setSelectedBuyer(user);
      setValue('buyer_id', user.id);
      setValue('buyer_email', user.email);
    } else if (type === 'seller') {
      setSelectedSeller(user);
      setValue('seller_id', user.id);
      setValue('seller_email', user.email);
    } else if (type === 'mediator') {
      setSelectedMediator(user);
      setValue('mediator_id', user.id);
      setValue('mediator_email', user.email);
    } else {
      setSelectedCounterparty(user);
      setValue('counterparty_id', user.id);
      setValue('counterparty_email', user.email);
    }
    setSearchResults([]);
    setSearchTerm('');
  };

  const applyTemplate = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setValue('conditions', template.conditions);
      toast.success(`${template.name} template applied`);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    const currentStepId = steps[step].id;

    if (currentStepId === 'role') {
      fieldsToValidate = ['creator_role', 'isDetailed'];
    } else if (currentStepId === 'parties') {
      if (creatorRole === 'mediator') {
        if (!selectedBuyer || !selectedSeller) {
          toast.error('Please select both buyer and seller');
          return;
        }
        fieldsToValidate = ['buyer_id', 'seller_id'];
      } else {
        if (!selectedCounterparty) {
          toast.error('Please select a counterparty');
          return;
        }
        fieldsToValidate = ['counterparty_id'];
      }
    } else if (currentStepId === 'details') {
      fieldsToValidate = ['amount', 'conditions'];
      if (isDetailed) {
        fieldsToValidate.push('jurisdiction', 'governing_law', 'dispute_resolution');
      }
    } else if (currentStepId === 'milestones') {
      fieldsToValidate = ['milestones'];
      const totalMilestonesAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
      if (totalMilestonesAmount <= 0) {
        toast.error('Total milestones amount must be greater than 0');
        return;
      }
    }
    
    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) {
      setStep(s => Math.min(s + 1, steps.length - 1));
    } else {
      // Provide feedback for validation errors
      if (errors.conditions) {
        toast.error(errors.conditions.message || 'Conditions are required (min 10 characters)');
      } else if (errors.amount) {
        toast.error(errors.amount.message || 'Valid amount is required');
      } else {
        toast.error('Please fix the errors before continuing');
      }
    }
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const onSubmit = async (data: CreateEscrowForm) => {
    try {
      const payload: any = {
        creator_role: data.creator_role,
        amount: Number(data.amount),
        conditions: data.conditions,
      };

      if (data.isDetailed) {
        payload.jurisdiction = data.jurisdiction;
        payload.governing_law = data.governing_law;
        payload.dispute_resolution = data.dispute_resolution;
        payload.mediator_id = data.mediator_id;
        
        if (data.milestones && data.milestones.length > 0) {
          payload.milestones = data.milestones.map((m, i) => ({
            ...m,
            order_index: i,
            amount: Number(m.amount)
          }));
        }
      }

      if (creatorRole === 'mediator') {
        payload.buyer_id = data.buyer_id;
        payload.seller_id = data.seller_id;
        payload.mediator_id = currentUser?.id;
      } else if (creatorRole === 'seller') {
        payload.buyer_id = data.counterparty_id;
        payload.seller_id = currentUser?.id;
      } else {
        payload.buyer_id = currentUser?.id;
        payload.seller_id = data.counterparty_id;
      }

      const url = `/api/escrows?role=${data.creator_role}`;
      await api.post(url, payload);
      
      toast.success('Escrow created successfully!');
      navigate('/escrows');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create escrow');
    }
  };

  const renderStepContent = () => {
    const currentStepId = steps[step].id;

    switch (currentStepId) {
      case 'role':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">New SafeDeal</h2>
              <p className="text-gray-500 mt-2">Choose how you want to structure this transaction</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">I am the...</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'buyer', label: 'Buyer', icon: UserPlus },
                    { id: 'seller', label: 'Seller', icon: DollarSign },
                    { id: 'mediator', label: 'Mediator', icon: Shield },
                  ].map((role) => (
                    <label
                      key={role.id}
                      className={`flex flex-col items-center p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                        creatorRole === role.id
                          ? 'border-[#014d46] bg-[#e6f7f4] shadow-md scale-105'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input type="radio" value={role.id} {...register('creator_role')} className="sr-only" />
                      <role.icon size={28} className={creatorRole === role.id ? 'text-[#014d46]' : 'text-gray-400'} />
                      <span className="mt-3 font-bold text-gray-900">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Transaction Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: false, label: 'Quick Escrow', icon: Zap, desc: 'Simple 3-step setup' },
                    { id: true, label: 'Ultra Comprehensive', icon: Settings, desc: 'Milestones & legal protection' },
                  ].map((mode) => (
                    <label
                      key={mode.id.toString()}
                      className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                        isDetailed === mode.id
                          ? 'border-[#014d46] bg-[#e6f7f4] shadow-md'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        checked={isDetailed === mode.id}
                        onChange={() => setValue('isDetailed', mode.id)}
                        className="sr-only" 
                      />
                      <div className={`p-3 rounded-xl ${isDetailed === mode.id ? 'bg-[#014d46] text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <mode.icon size={20} />
                      </div>
                      <div>
                        <span className="block font-bold text-gray-900">{mode.label}</span>
                        <span className="block text-xs text-gray-500">{mode.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'parties':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Counterparties</h2>
              <p className="text-gray-500 mt-2">Who are you dealing with?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
              {creatorRole === 'mediator' ? (
                <>
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Buyer</label>
                    {selectedBuyer ? (
                      <div className="flex items-center justify-between p-4 bg-white border-2 border-[#014d46] rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#014d46] text-white flex items-center justify-center font-bold">{selectedBuyer.first_name[0]}</div>
                          <div className="text-sm font-bold">{selectedBuyer.first_name} {selectedBuyer.last_name}</div>
                        </div>
                        <button onClick={() => setSelectedBuyer(null)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Find buyer..." className="input pl-12 h-14 rounded-2xl" onChange={(e) => handleSearch(e.target.value, 'buyer')} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Seller</label>
                    {selectedSeller ? (
                      <div className="flex items-center justify-between p-4 bg-white border-2 border-[#014d46] rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#014d46] text-white flex items-center justify-center font-bold">{selectedSeller.first_name[0]}</div>
                          <div className="text-sm font-bold">{selectedSeller.first_name} {selectedSeller.last_name}</div>
                        </div>
                        <button onClick={() => setSelectedSeller(null)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Find seller..." className="input pl-12 h-14 rounded-2xl" onChange={(e) => handleSearch(e.target.value, 'seller')} />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    The {creatorRole === 'buyer' ? 'Seller' : 'Buyer'}
                  </label>
                  {selectedCounterparty ? (
                    <div className="flex items-center justify-between p-5 bg-white border-2 border-[#014d46] rounded-2xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#014d46] text-white flex items-center justify-center font-bold text-lg">{selectedCounterparty.first_name[0]}</div>
                        <div>
                          <p className="font-bold text-gray-900">{selectedCounterparty.first_name}</p>
                          <p className="text-xs text-gray-500">{selectedCounterparty.email}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedCounterparty(null)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={20} /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input type="text" placeholder={`Search by name or email...`} className="input pl-14 h-16 rounded-2xl text-lg shadow-sm" value={searchType === 'counterparty' ? searchTerm : ''} onChange={(e) => handleSearch(e.target.value, 'counterparty')} />
                    </div>
                  )}
                </div>
              )}

              {isDetailed && creatorRole !== 'mediator' && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Gavel size={14} /> Assign Mediator (Optional)</label>
                  {selectedMediator ? (
                    <div className="flex items-center justify-between p-5 bg-white border-2 border-dashed border-[#014d46] rounded-2xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">{selectedMediator.first_name[0]}</div>
                        <div className="font-bold text-gray-900">{selectedMediator.first_name}</div>
                      </div>
                      <button onClick={() => setSelectedMediator(null)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={20} /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input type="text" placeholder="Find a neutral mediator..." className="input pl-14 h-16 rounded-2xl text-lg shadow-sm bg-gray-50/50" value={searchType === 'mediator' ? searchTerm : ''} onChange={(e) => handleSearch(e.target.value, 'mediator')} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <AnimatePresence>
              {searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-md sm:max-w-lg mx-auto bg-white border-2 rounded-2xl shadow-xl overflow-hidden z-20 mt-4">
                  {searchResults.map((u) => (
                    <button key={u.id} onClick={() => selectUser(u, searchType)} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 border-b last:border-0 transition-all text-left">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${searchType === 'mediator' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>{u.first_name[0]}</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                      <Plus size={18} className="text-[#014d46]" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Agreement Terms</h2>
              <p className="text-gray-500 mt-2">Define the financial and descriptive terms</p>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Agreement Conditions</label>
                  <div className="flex gap-2">
                    {TEMPLATES.map(t => (
                      <button key={t.id} type="button" onClick={() => applyTemplate(t.id)} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1"><LayoutTemplate size={10} /> {t.name.split(' ')[0]}</button>
                    ))}
                  </div>
                </div>
                <textarea rows={10} placeholder="Describe the deliverables, timeline, and terms..." {...register('conditions')} className="w-full p-5 border-2 border-gray-100 rounded-2xl focus:border-[#014d46] outline-none transition-all"></textarea>
                {errors.conditions && <p className="text-red-500 text-xs">{errors.conditions.message}</p>}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Total Amount (ETB)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="number" step="0.01" placeholder="0.00" {...register('amount')} readOnly={isDetailed} className={`input pl-12 h-14 rounded-2xl text-xl font-bold ${isDetailed ? 'bg-gray-50 text-[#014d46]' : ''}`} />
                  </div>
                  {isDetailed && <p className="mt-2 text-[10px] text-[#014d46] font-bold uppercase tracking-tighter flex items-center gap-1"><Settings size={10} /> Auto-synced with milestones</p>}
                </div>
                
                <div className="p-5 bg-teal-50 rounded-2xl border border-teal-100">
                    <h4 className="text-xs font-black text-teal-800 uppercase mb-2">SafeDeal Guarantee</h4>
                    <p className="text-[10px] text-teal-700 leading-relaxed">Funds are held in a secure vault and only released when terms are met. Our AI Arbitrator stands by to resolve any disputes.</p>
                </div>

                {amount > 10000 && (
                  <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
                    <AlertCircle className="text-orange-600 shrink-0" size={18} />
                    <div>
                      <h4 className="text-xs font-black text-orange-800 uppercase mb-1">AI Risk Warning</h4>
                      <p className="text-[10px] text-orange-700 leading-relaxed">This amount is high for a new transaction. We recommend using <strong>Ultra Comprehensive</strong> mode with milestones for better protection.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'milestones':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Project Milestones</h2>
              <p className="text-gray-500 mt-2">Break down the payment into specific stages</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Milestones List</span>
                <button type="button" onClick={() => append({ title: '', amount: 0 })} className="btn btn-primary btn-sm rounded-xl gap-1"><Plus size={14} /> Add</button>
              </div>

              <div className="space-y-4 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                {fields.map((field, index) => (
                  <motion.div key={field.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-5 bg-white border-2 border-gray-100 rounded-2xl shadow-sm flex flex-col gap-4 relative">
                    <div className="flex gap-4">
                      <input placeholder="Milestone Title" {...register(`milestones.${index}.title` as const)} className="flex-1 text-sm font-bold border-b-2 border-gray-50 focus:border-[#014d46] outline-none py-1" />
                      <div className="w-32 relative">
                        <DollarSign className="absolute left-0 top-1.5 text-gray-400" size={14} />
                        <input type="number" placeholder="Amount" {...register(`milestones.${index}.amount` as const)} className="w-full pl-5 text-xs font-semibold border-b border-gray-100 focus:border-[#014d46] outline-none py-1" />
                      </div>
                    </div>
                    <textarea placeholder="Deliverable details..." {...register(`milestones.${index}.description` as const)} rows={2} className="w-full text-xs p-2 bg-gray-50 rounded-lg border-none focus:ring-1 focus:ring-[#014d46] outline-none resize-none" />
                    {fields.length > 1 && <button type="button" onClick={() => remove(index)} className="absolute -right-2 -top-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-all"><Trash2 size={14} /></button>}
                  </motion.div>
                ))}
              </div>

              <div className="p-4 bg-[#014d46] rounded-2xl flex justify-between items-center text-white">
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Total Budget</span>
                <span className="text-2xl font-black">{Number(amount).toLocaleString()} ETB</span>
              </div>
            </div>
          </div>
        );

      case 'final':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Finalize Deal</h2>
              <p className="text-gray-500 mt-2">Confirm compliance and launch your secure escrow</p>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white border-2 border-gray-100 rounded-3xl p-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Agreement Preview</h3>
                  <div className="max-h-40 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">{watch('conditions')}</div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase">Total Amount</span>
                    <span className="text-xl font-black text-[#014d46]">{Number(amount).toLocaleString()} ETB</span>
                  </div>
                </div>

                <div className="p-5 bg-[#014d46] rounded-3xl text-white flex gap-4 shadow-xl">
                  <Scale className="shrink-0 text-[#ccefe8]" size={28} />
                  <div>
                    <h5 className="font-bold text-sm">Legally Enforceable</h5>
                    <p className="text-[10px] text-[#ccefe8] mt-1 leading-relaxed opacity-80">This deal is backed by blockchain evidence and governed by {watch('governing_law') || 'local law'}.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Jurisdiction</label>
                    <select {...register('jurisdiction')} className="input h-12 rounded-xl bg-white text-xs">
                      <option value="Ethiopia">Ethiopia</option>
                      <option value="Kenya">Kenya</option>
                      <option value="International">International</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Governing Law</label>
                    <input type="text" {...register('governing_law')} className="input h-12 rounded-xl text-xs" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Dispute Resolution</label>
                  <select {...register('dispute_resolution')} className="input h-12 rounded-xl bg-white text-xs">
                    <option value="AI Arbitration via SafeDeal">AI Smart Resolution</option>
                    <option value="Ethiopian Arbitration and Conciliation Center (EACC)">EACC Formal</option>
                    <option value="Mediation via Third Party">Third-party Mediation</option>
                  </select>
                </div>

                <div className="bg-gray-50 rounded-3xl p-6 border-2 border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Stakeholders</h3>
                  <div className="space-y-2 text-xs">
                    <p className="flex justify-between"><span className="text-gray-400">Buyer:</span> <span className="font-bold">{creatorRole === 'buyer' ? 'You' : (selectedBuyer?.first_name || (creatorRole === 'seller' ? selectedCounterparty?.first_name : '...'))}</span></p>
                    <p className="flex justify-between"><span className="text-gray-400">Seller:</span> <span className="font-bold">{creatorRole === 'seller' ? 'You' : (selectedSeller?.first_name || (creatorRole === 'buyer' ? selectedCounterparty?.first_name : '...'))}</span></p>
                    {selectedMediator && <p className="flex justify-between"><span className="text-gray-400">Mediator:</span> <span className="font-bold text-indigo-600">{selectedMediator.first_name}</span></p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-12">
          <button onClick={() => step === 0 ? navigate(-1) : prevStep()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all">
            <div className="p-2 bg-gray-100 rounded-full"><ChevronLeft size={20} /></div>
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="flex-1 max-w-2xl mx-12">
            <div className="flex justify-between items-center relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 w-full z-0 rounded-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#014d46] z-0 rounded-full transition-all duration-700 ease-out" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
              {steps.map((s, i) => (
                <div key={s.id} className="relative z-10 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${i <= step ? 'bg-[#014d46] text-white shadow-xl shadow-[#014d46]/20 scale-110' : 'bg-white border-2 border-gray-100 text-gray-300'}`}><s.icon size={18} /></div>
                  <span className={`absolute -bottom-7 text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${i <= step ? 'text-[#014d46]' : 'text-gray-300'}`}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-20 hidden sm:block" />
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="gradient-primary h-2" />
          <div className="p-6 sm:p-8 lg:p-12 min-h-[70vh]">
            <AnimatePresence mode="wait"><motion.div key={steps[step].id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>{renderStepContent()}</motion.div></AnimatePresence>
          </div>
        </div>

        <div className="mt-12 flex justify-between items-center px-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step {step + 1} of {steps.length}</span>
            <span className="text-lg font-bold text-gray-900">{steps[step].title}</span>
          </div>
          
          <div className="flex gap-4">
            {step < steps.length - 1 ? (
              <button onClick={nextStep} className="px-10 py-4 rounded-2xl bg-[#014d46] text-white font-black hover:bg-[#02665c] shadow-2xl shadow-[#014d46]/30 transition-all flex items-center gap-2 group">Continue <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" /></button>
            ) : (
              <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || !isValid} className="px-10 py-4 rounded-2xl bg-[#014d46] text-white font-black hover:bg-[#02665c] shadow-2xl shadow-[#014d46]/30 disabled:opacity-50 transition-all flex items-center gap-2">{isSubmitting ? 'Launching...' : 'Start Secure Escrow'}<Check size={22} /></button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEscrow;
