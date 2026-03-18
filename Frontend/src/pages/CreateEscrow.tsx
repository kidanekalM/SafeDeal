import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Shield, Mail, DollarSign, ArrowLeft, 
  Search, Check, UserPlus, FileText, Scale, 
  ChevronRight, ChevronLeft, Trash2, Calendar,
  Settings, Zap, ListChecks, Gavel
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
      milestones: [{ title: '', amount: 0 }],
      jurisdiction: 'Ethiopia',
      governing_law: 'Commercial Code of Ethiopia',
      dispute_resolution: 'AI Arbitration via SafeDeal',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'milestones',
  });

  const creatorRole = watch('creator_role');
  const isDetailed = watch('isDetailed');
  const amount = watch('amount');
  const milestones = watch('milestones') || [];

  // Dynamic Steps based on isDetailed
  const steps = isDetailed 
    ? [
        { id: 'role', title: 'Role', icon: Shield },
        { id: 'parties', title: 'Parties', icon: Search },
        { id: 'details', title: 'Basic Terms', icon: FileText },
        { id: 'milestones', title: 'Milestones', icon: ListChecks },
        { id: 'legal', title: 'Legal', icon: Scale },
        { id: 'review', title: 'Final Review', icon: Check },
      ]
    : [
        { id: 'role', title: 'Role', icon: Shield },
        { id: 'parties', title: 'Parties', icon: Search },
        { id: 'details', title: 'Details & Submit', icon: Check },
      ];

  // Sync total amount with milestones if enabled
  useEffect(() => {
    if (isDetailed && milestones.length > 0) {
      const total = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
      if (total > 0 && total !== amount) {
        setValue('amount', total);
      }
    }
  }, [milestones, isDetailed, amount, setValue]);

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

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 0) fieldsToValidate = ['creator_role', 'isDetailed'];
    if (step === 1) {
      if (creatorRole === 'mediator') {
        if (!selectedBuyer || !selectedSeller) {
          toast.error('Please select both buyer and seller');
          return;
        }
      } else {
        if (!selectedCounterparty) {
          toast.error('Please select a counterparty');
          return;
        }
      }
    }
    if (step === 2) fieldsToValidate = ['amount', 'conditions'];
    
    // Comprehensive steps validation
    if (isDetailed) {
      if (step === 3) fieldsToValidate = ['milestones'];
      if (step === 4) fieldsToValidate = ['jurisdiction', 'governing_law', 'dispute_resolution'];
    }

    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) {
      setStep(s => Math.min(s + 1, steps.length - 1));
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

      // Append role query param for backend logic
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
              <h2 className="text-2xl font-bold text-gray-900">Configure Your Deal</h2>
              <p className="text-gray-500 mt-2">Start by defining your role and complexity level</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">I am the...</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'buyer', label: 'Buyer', icon: UserPlus, desc: 'Paying for service' },
                    { id: 'seller', label: 'Seller', icon: DollarSign, desc: 'Providing service' },
                    { id: 'mediator', label: 'Mediator', icon: Shield, desc: 'Neutral third party' },
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
                      <span className="mt-1 text-[10px] text-center text-gray-500 uppercase tracking-tighter">{role.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Deal Complexity</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: false, label: 'Simple Mode', icon: Zap, desc: 'Quick setup, one-time payment' },
                    { id: true, label: 'Ultra Comprehensive', icon: Settings, desc: 'Mediators, milestones, legal compliance' },
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
              <h2 className="text-2xl font-bold text-gray-900">Identify Parties</h2>
              <p className="text-gray-500 mt-2">Search for SafeDeal users to include in the transaction</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {creatorRole === 'mediator' ? (
                <>
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Buyer Party</label>
                    {selectedBuyer ? (
                      <div className="flex items-center justify-between p-4 bg-white border-2 border-[#014d46] rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#014d46] text-white flex items-center justify-center font-bold">
                            {selectedBuyer.first_name[0]}{selectedBuyer.last_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{selectedBuyer.first_name} {selectedBuyer.last_name}</p>
                            <p className="text-xs text-gray-500">{selectedBuyer.email}</p>
                          </div>
                        </div>
                        <button onClick={() => setSelectedBuyer(null)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Search buyer..."
                          className="input pl-12 h-14 rounded-2xl"
                          onChange={(e) => handleSearch(e.target.value, 'buyer')}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Seller Party</label>
                    {selectedSeller ? (
                      <div className="flex items-center justify-between p-4 bg-white border-2 border-[#014d46] rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#014d46] text-white flex items-center justify-center font-bold">
                            {selectedSeller.first_name[0]}{selectedSeller.last_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{selectedSeller.first_name} {selectedSeller.last_name}</p>
                            <p className="text-xs text-gray-500">{selectedSeller.email}</p>
                          </div>
                        </div>
                        <button onClick={() => setSelectedSeller(null)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Search seller..."
                          className="input pl-12 h-14 rounded-2xl"
                          onChange={(e) => handleSearch(e.target.value, 'seller')}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4 md:col-span-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Counterparty ({creatorRole === 'buyer' ? 'Seller' : 'Buyer'})
                  </label>
                  {selectedCounterparty ? (
                    <div className="flex items-center justify-between p-5 bg-white border-2 border-[#014d46] rounded-2xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#014d46] text-white flex items-center justify-center font-bold text-lg">
                          {selectedCounterparty.first_name[0]}{selectedCounterparty.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{selectedCounterparty.first_name} {selectedCounterparty.last_name}</p>
                          <p className="text-sm text-gray-500">{selectedCounterparty.email}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedCounterparty(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder={`Find your ${creatorRole === 'buyer' ? 'seller' : 'buyer'}...`}
                        className="input pl-14 h-16 rounded-2xl text-lg shadow-sm"
                        value={searchType === 'counterparty' ? searchTerm : ''}
                        onChange={(e) => handleSearch(e.target.value, 'counterparty')}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Optional Mediator Selection (Only in Detailed mode for non-mediator creators) */}
              {isDetailed && creatorRole !== 'mediator' && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Gavel size={14} className="text-[#014d46]" /> Assign Mediator (Optional)
                  </label>
                  {selectedMediator ? (
                    <div className="flex items-center justify-between p-5 bg-white border-2 border-[#014d46] rounded-2xl shadow-sm border-dashed">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                          {selectedMediator.first_name[0]}{selectedMediator.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{selectedMediator.first_name} {selectedMediator.last_name}</p>
                          <p className="text-sm text-gray-500">{selectedMediator.email}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedMediator(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Search for a neutral mediator..."
                        className="input pl-14 h-16 rounded-2xl text-lg shadow-sm bg-gray-50/50"
                        value={searchType === 'mediator' ? searchTerm : ''}
                        onChange={(e) => handleSearch(e.target.value, 'mediator')}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Results */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-xl mx-auto bg-white border-2 rounded-2xl shadow-xl overflow-hidden z-20"
                >
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => selectUser(u, searchType)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 border-b last:border-0 transition-all group"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        searchType === 'mediator' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                      } group-hover:bg-[#014d46] group-hover:text-white`}>
                        {u.first_name[0]}{u.last_name[0]}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-gray-900">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                      <Plus size={18} className="text-[#014d46] opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {invitationSent && (
              <div className="max-w-xl mx-auto p-4 bg-green-50 border-2 border-green-100 rounded-2xl flex items-center gap-3">
                <Check className="text-green-600" size={20} />
                <p className="text-sm text-green-800">User not found. We've sent an invite to <strong>{invitationSent}</strong>.</p>
              </div>
            )}
          </div>
        );

      case 'details':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Transaction Details</h2>
              <p className="text-gray-500 mt-2">Define the financial and descriptive terms of the deal</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Amount (ETB)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register('amount')}
                      readOnly={isDetailed}
                      className={`input pl-12 h-14 rounded-2xl text-xl font-bold ${isDetailed ? 'bg-gray-50 cursor-not-allowed text-[#014d46]' : ''}`}
                    />
                  </div>
                  {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
                  {isDetailed && <p className="mt-2 text-xs text-[#014d46] font-medium flex items-center gap-1"><Settings size={12} /> Auto-calculated from milestones</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Agreement Conditions</label>
                  <textarea
                    rows={8}
                    placeholder="Provide specific details about deliverables, timelines, and acceptance criteria..."
                    {...register('conditions')}
                    className="w-full p-5 border-2 border-gray-100 rounded-2xl focus:border-[#014d46] focus:ring-0 outline-none transition-all"
                  ></textarea>
                  {errors.conditions && <p className="mt-1 text-xs text-red-600">{errors.conditions.message}</p>}
                </div>
              </div>

              <div className="hidden md:flex flex-col items-center justify-center p-8 bg-[#e6f7f4] rounded-3xl border-2 border-[#ccefe8]">
                <FileText size={64} className="text-[#014d46] opacity-20 mb-4" />
                <h4 className="font-bold text-[#014d46]">Why detailed conditions matter?</h4>
                <p className="text-xs text-center text-[#02665c] mt-2 leading-relaxed max-w-xs">
                  Clearly defined terms help our AI Arbitrator and manual mediators resolve disputes fairly by referencing your original agreement.
                </p>
              </div>
            </div>
          </div>
        );

      case 'milestones':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Project Milestones</h2>
              <p className="text-gray-500 mt-2">Break down the payment into specific deliverables</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Milestones List</span>
                <button
                  type="button"
                  onClick={() => append({ title: '', amount: 0 })}
                  className="btn btn-primary btn-sm rounded-xl gap-1"
                >
                  <Plus size={14} /> Add Milestone
                </button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {fields.map((field, index) => (
                  <motion.div 
                    key={field.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-5 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:border-gray-200 transition-all flex flex-col md:flex-row gap-4 relative group"
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-4">
                        <input
                          placeholder="Milestone Title (e.g. Design Phase)"
                          {...register(`milestones.${index}.title` as const)}
                          className="flex-1 text-sm font-bold border-b-2 border-gray-50 focus:border-[#014d46] outline-none py-1 transition-all"
                        />
                        <div className="w-32 relative">
                          <DollarSign className="absolute left-0 top-1.5 text-gray-400" size={14} />
                          <input
                            type="number"
                            placeholder="Amount"
                            {...register(`milestones.${index}.amount` as const)}
                            className="w-full pl-5 text-xs font-semibold border-b border-gray-100 focus:border-[#014d46] outline-none py-1 transition-all"
                          />
                        </div>
                      </div>
                      
                      <textarea
                        placeholder="Deliverable description and acceptance criteria..."
                        {...register(`milestones.${index}.description` as const)}
                        rows={2}
                        className="w-full text-xs p-2 bg-gray-50 rounded-lg border-none focus:ring-1 focus:ring-[#014d46] outline-none transition-all resize-none"
                      />

                      <div className="flex gap-4 items-center">
                        <div className="flex-1 relative">
                          <Calendar className="absolute left-0 top-1.5 text-gray-400" size={14} />
                          <input
                            type="date"
                            {...register(`milestones.${index}.due_date` as const)}
                            className="w-full pl-5 text-xs text-gray-500 border-b border-gray-100 focus:border-[#014d46] outline-none py-1 transition-all"
                          />
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                          Approver: {creatorRole === 'seller' ? (selectedCounterparty?.first_name || 'Buyer') : 'You'}
                        </div>
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="self-start p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="p-4 bg-white border-2 border-[#014d46] rounded-2xl flex justify-between items-center shadow-lg shadow-[#014d46]/5">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Calculated Amount</span>
                <span className="text-2xl font-black text-[#014d46]">{Number(amount).toLocaleString()} ETB</span>
              </div>
            </div>
          </div>
        );

      case 'legal':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Legal Enforcement</h2>
              <p className="text-gray-500 mt-2">Ensure the agreement is compliant with your jurisdiction</p>
            </div>

            <div className="max-w-xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Jurisdiction</label>
                  <select
                    {...register('jurisdiction')}
                    className="input h-14 rounded-2xl bg-white shadow-sm"
                  >
                    <option value="Ethiopia">Ethiopia</option>
                    <option value="Kenya">Kenya</option>
                    <option value="International">International</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Governing Law</label>
                  <input
                    type="text"
                    {...register('governing_law')}
                    placeholder="e.g. Commercial Code"
                    className="input h-14 rounded-2xl shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Dispute Resolution</label>
                <select
                  {...register('dispute_resolution')}
                  className="input h-14 rounded-2xl bg-white shadow-sm"
                >
                  <option value="AI Arbitration via SafeDeal">AI Arbitration (Smart Resolution)</option>
                  <option value="Ethiopian Arbitration and Conciliation Center (EACC)">EACC (Formal Arbitration)</option>
                  <option value="Mediation via Third Party">Third-party Mediation</option>
                </select>
              </div>

              <div className="p-5 bg-[#014d46] rounded-3xl text-white flex gap-4 shadow-xl">
                <Scale className="shrink-0 text-[#ccefe8]" size={28} />
                <div>
                  <h5 className="font-bold text-sm">Blockchain-Backed Evidence</h5>
                  <p className="text-[10px] text-[#ccefe8] mt-1 leading-relaxed opacity-80">
                    SafeDeal transaction states are recorded on Ethereum. In case of legal proceedings, this immutable record provides strong evidence of agreement terms and payment status.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Final Confirmation</h2>
              <p className="text-gray-500 mt-2">One last look at your secure deal configuration</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Agreement Terms</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{watch('conditions')}</p>
                </div>

                {isDetailed && milestones.length > 0 && (
                  <div className="bg-[#e6f7f4] border-2 border-[#ccefe8] rounded-3xl p-6">
                    <h3 className="text-xs font-bold text-[#014d46] uppercase tracking-widest mb-4">Milestone Breakdown</h3>
                    <div className="space-y-2">
                      {milestones.map((m, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-3 bg-white rounded-xl shadow-sm">
                          <span className="font-bold text-gray-800">{i+1}. {m.title}</span>
                          <span className="font-black text-[#014d46]">{Number(m.amount).toLocaleString()} ETB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-[#014d46] text-white rounded-3xl p-6 shadow-xl">
                  <h3 className="text-xs font-bold opacity-60 uppercase tracking-widest mb-4">Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <span className="text-xs">Total Amount</span>
                      <span className="text-2xl font-black">{Number(amount).toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="opacity-60">Buyer</span>
                      <span className="font-bold">{creatorRole === 'buyer' ? 'You' : (selectedBuyer?.first_name || (creatorRole === 'seller' ? selectedCounterparty?.first_name : '...'))}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="opacity-60">Seller</span>
                      <span className="font-bold">{creatorRole === 'seller' ? 'You' : (selectedSeller?.first_name || (creatorRole === 'buyer' ? selectedCounterparty?.first_name : '...'))}</span>
                    </div>
                    {isDetailed && selectedMediator && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="opacity-60">Mediator</span>
                        <span className="font-bold text-indigo-300">{selectedMediator.first_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {isDetailed && (
                  <div className="bg-gray-50 rounded-3xl p-6 border-2 border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Compliance</h3>
                    <div className="space-y-2 text-xs">
                      <p><span className="text-gray-400">Jurisdiction:</span> <span className="font-bold">{watch('jurisdiction')}</span></p>
                      <p><span className="text-gray-400">Law:</span> <span className="font-bold">{watch('governing_law')}</span></p>
                    </div>
                  </div>
                )}
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
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={() => step === 0 ? navigate(-1) : prevStep()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all"
          >
            <div className="p-2 bg-gray-100 rounded-full"><ChevronLeft size={20} /></div>
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="flex-1 max-w-2xl mx-12">
            <div className="flex justify-between items-center relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 w-full z-0 rounded-full" />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#014d46] z-0 rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
              />
              
              {steps.map((s, i) => (
                <div key={s.id} className="relative z-10">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      i <= step 
                        ? 'bg-[#014d46] text-white shadow-xl shadow-[#014d46]/20 scale-110' 
                        : 'bg-white border-2 border-gray-100 text-gray-300'
                    }`}
                  >
                    <s.icon size={18} />
                  </div>
                  <span className={`absolute -bottom-7 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${
                    i <= step ? 'text-[#014d46]' : 'text-gray-300'
                  }`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-20 hidden sm:block" />
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="gradient-primary h-2" />
          <div className="p-8 sm:p-12 min-h-[500px]">
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
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex justify-between items-center px-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step {step + 1} of {steps.length}</span>
            <span className="text-lg font-bold text-gray-900">{steps[step].title}</span>
          </div>
          
          <div className="flex gap-4">
            {step < steps.length - 1 ? (
              <button
                onClick={nextStep}
                className="px-10 py-4 rounded-2xl bg-[#014d46] text-white font-black hover:bg-[#02665c] shadow-2xl shadow-[#014d46]/30 transition-all flex items-center gap-2 group"
              >
                Continue
                <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || !isValid}
                className="px-10 py-4 rounded-2xl bg-[#014d46] text-white font-black hover:bg-[#02665c] shadow-2xl shadow-[#014d46]/30 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Finalizing...' : 'Create Escrow Now'}
                <Check size={22} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEscrow;