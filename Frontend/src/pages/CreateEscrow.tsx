import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, User as UserIcon, DollarSign, Shield, CheckCircle, Plus, Minus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { escrowApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { CreateEscrowRequest, Milestone } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

const CreateEscrow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedSeller, setSelectedSeller] = useState<{ id: number; name: string } | null>(null);
  const [useMilestones, setUseMilestones] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { 
      id: Date.now(), 
      title: '', 
      description: '', 
      amount: 0, 
      due_date: '', 
      order_index: 0, 
      status: 'Pending' as const,
      escrow_id: 0,
      approver_id: user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Court-compliant fields (with defaults)
      milestone_name: '',
      completion_status: 'Pending',
      completion_timestamp: '',
      approved_by: undefined,
      evidence_uri: '',
      auto_release: false,
      required_approvals: 1
    }
  ]);
  const [totalMilestoneAmount, setTotalMilestoneAmount] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<
    CreateEscrowRequest & {
      seller_name: string;
      seller_id: string;
      item_description?: string;
      delivery_date?: string;
      delivery_method?: string;
      payment_release_condition?: string;
      inspection_period_days?: number;
      refund_policy?: string;
      governing_law?: string;
      contact_details?: string;
      additional_notes?: string;
    }
  >();

  // Pre-fill seller name/id if coming from search
  useEffect(() => {
    const sellerName = searchParams.get('seller');
    const sellerId = searchParams.get('seller_id');
    if (sellerName && sellerId) {
      const seller = {
        id: parseInt(sellerId),
        name: sellerName
      };
      setSelectedSeller(seller);
      setValue('seller_name', sellerName);
      setValue('seller_id' as any, sellerId);
    }
  }, [searchParams, setValue]);

  // Recalculate total milestone amount when milestones change
  useEffect(() => {
    const total = milestones.reduce((sum, milestone) => sum + milestone.amount, 0);
    setTotalMilestoneAmount(total);
  }, [milestones]);

  // Function to add a new milestone
  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now() + Math.floor(Math.random() * 1000), // Ensure uniqueness
      title: '',
      description: '',
      amount: 0,
      due_date: '',
      order_index: milestones.length,
      status: 'Pending',
      escrow_id: 0,
      approver_id: user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Court-compliant fields
      milestone_name: '',
      completion_status: '',
      completion_timestamp: '',
      approved_by: undefined,
      evidence_uri: '',
    };
    setMilestones([...milestones, newMilestone]);
  };

  // Remove a milestone
  const removeMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    const newMilestones = [...milestones];
    newMilestones.splice(index, 1);
    setMilestones(newMilestones);
  };

  // Update a milestone property
  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const newMilestones = [...milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setMilestones(newMilestones);
  };

  const buildConditionsText = (
    data: Partial<{
      item_description?: string;
      delivery_date?: string;
      delivery_method?: string;
      payment_release_condition?: string;
      inspection_period_days?: number | string;
      refund_policy?: string;
      governing_law?: string;
      contact_details?: string;
      additional_notes?: string;
    }>
  ) => {
    const buyerName = user ? `${user.first_name} ${user.last_name}`.trim() : 'Buyer';
    const sellerName = selectedSeller?.name || 'Seller';
  
    const lines: string[] = [];
    

    lines.push(`Buyer: ${buyerName}`);
    lines.push('');
    lines.push(`Seller: ${sellerName}`);
    lines.push('');
  
    if (data.item_description) {
      lines.push('Item Description:');
      lines.push(data.item_description);
      lines.push('');
    }
  
    if (data.delivery_date || data.delivery_method) {
      lines.push('Delivery:');
      if (data.delivery_date) lines.push(`- Date: ${data.delivery_date}`);
      if (data.delivery_method) lines.push(`- Method: ${data.delivery_method}`);
      lines.push('');
    }
  
    if (data.payment_release_condition) {
      lines.push('Payment Release:');
      lines.push(data.payment_release_condition);
      lines.push('');
    }
  
    if (data.inspection_period_days) {
      lines.push(`Inspection Period: ${data.inspection_period_days} day(s)`);
      lines.push('');
    }
  
    if (data.refund_policy) {
      lines.push('Refund Policy:');
      lines.push(data.refund_policy);
      lines.push('');
    }
  
    if (data.governing_law) {
      lines.push(`Governing Law: ${data.governing_law}`);
      lines.push('');
    }
  
    if (data.contact_details) {
      lines.push(`Contact: ${data.contact_details}`);
      lines.push('');
    }
  
    if (data.additional_notes) {
      lines.push('Additional Notes:');
      lines.push(data.additional_notes);
    }
  
    return lines.join('\n');
  };  

  const onSubmit = async (
    data: CreateEscrowRequest & {
      seller_name: string;
      seller_id: string;
      item_description?: string;
      delivery_date?: string;
      delivery_method?: string;
      payment_release_condition?: string;
      inspection_period_days?: number;
      refund_policy?: string;
      governing_law?: string;
      contact_details?: string;
      additional_notes?: string;
    }
  ) => {
    setIsLoading(true);
    try {
      
      if (!isAuthenticated || !user) {
        toast.error('You must be logged in to create an escrow');
        navigate('/login');
        return;
      }
      
      // Check user activation status
      if (!user?.activated) {
        toast.error('Your account is not activated. Please check your email and activate your account.');
        return;
      }
      
      // Validate seller selection - only allow search-selected sellers
      if (!selectedSeller) {
        toast.error('Please search and select a seller to create an escrow.');
        return;
      }
      
      const sellerId = selectedSeller.id;

      // Validate amount
      if (!data.amount || data.amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // If using milestones, validate them
      if (useMilestones) {
        if (milestones.some(m => !m.title.trim())) {
          toast.error('All milestones must have titles');
          return;
        }
        
        if (milestones.some(m => m.amount <= 0)) {
          toast.error('All milestones must have positive amounts');
          return;
        }
        
        if (totalMilestoneAmount !== data.amount) {
          toast.error(`Milestone total (${formatCurrency(totalMilestoneAmount)}) must match escrow amount (${formatCurrency(data.amount)})`);
          return;
        }
      }

      // Create the escrow request with only the required fields
      // The backend will automatically set buyer_id from the authenticated user
      // Compose a presentable conditions string from all inputs
      const composedConditions = buildConditionsText({
        item_description: data.item_description,
        delivery_date: data.delivery_date,
        delivery_method: data.delivery_method,
        payment_release_condition: data.payment_release_condition,
        inspection_period_days: data.inspection_period_days,
        refund_policy: data.refund_policy,
        governing_law: data.governing_law,
        contact_details: data.contact_details,
        additional_notes: data.additional_notes,
      });

      const escrowData: CreateEscrowRequest = {
        seller_id: sellerId,
        amount: parseFloat(data.amount.toString()),
        conditions: composedConditions,
        ...(useMilestones && { milestones: milestones.map(({ id, ...rest }) => rest) }),
      };

      
      // Validate that buyer and seller are different
      if (user?.id === sellerId) {
        toast.error('You cannot create an escrow with yourself as the seller');
        return;
      }

      // Check buyer activation status before submitting
      if (!user?.activated && user?.activated !== true) {
        
        toast.error('🚫 Your account is not activated. Please complete your account activation before creating an escrow.', {
          duration: 8000,
          style: {
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
          },
        });
        return;
      }

      // Check if seller activation status is available (if we have that info)
      if (selectedSeller && (selectedSeller as any).activated === false) {
        toast.error('🚫 The selected seller\'s account is not activated. Please choose a different seller.', {
          duration: 8000,
          style: {
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
          },
        });
        return;
      }
      
      const response = await escrowApi.create(escrowData);
      toast.success('Escrow created successfully!');
      navigate(`/escrow/${response.data.id}`);
    } catch (error: any) {
      
      // Specific handling for activation errors
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.error || '';
        
        if (errorMessage.includes('Buyer account is not activated')) {
          toast.error('🚫 Your account appears to be inactive. Please check your profile activation status or contact support.', {
            duration: 8000,
            style: {
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
            },
          });
          
          
        } else if (errorMessage.includes('Seller account is not activated')) {
          toast.error('🚫 The selected seller\'s account is not activated. Please choose a different seller or contact them to activate their account.', {
            duration: 8000,
            style: {
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
            },
          });
        } else if (errorMessage.includes('not activated')) {
          toast.error('🚫 Account Activation Issue: One or both accounts are not properly activated. Please verify activation status.', {
            duration: 8000,
            style: {
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
            },
          });
        } else {
          toast.error(`🚫 Access Denied: ${errorMessage}`, {
            duration: 6000,
            style: {
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
            },
          });
        }
      } else {
        // Enhanced error handling for bank details compatibility
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create escrow';
        
        // Check if error is related to bank details compatibility
        if (errorMessage.toLowerCase().includes('bank') || errorMessage.toLowerCase().includes('account')) {
          // Try to determine if it's buyer or seller bank details issue
          if (errorMessage.toLowerCase().includes('buyer') || errorMessage.toLowerCase().includes('your')) {
            toast.error(`❌ Buyer Bank Details Issue: ${errorMessage}`, {
              duration: 6000,
              style: {
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
              },
            });
          } else if (errorMessage.toLowerCase().includes('seller')) {
            toast.error(`❌ Seller Bank Details Issue: ${errorMessage}`, {
              duration: 6000,
              style: {
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
              },
            });
          } else {
            // Generic bank details error with perspective clarification
            toast.error(`❌ Bank Details Compatibility Issue: ${errorMessage}. Please check both buyer and seller bank account details.`, {
              duration: 6000,
              style: {
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
              },
            });
          }
        } else {
          toast.error(errorMessage);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Seller Details', icon: UserIcon },
    { number: 2, title: 'Amount & Conditions', icon: DollarSign },
    { number: 3, title: 'Review & Create', icon: Shield },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Escrow</h1>
          <p className="text-gray-600 mt-2">
            Set up a secure escrow transaction to protect your deal
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((stepItem, index) => {
              const Icon = stepItem.icon;
              const isActive = step >= stepItem.number;
              const isCompleted = step > stepItem.number;
              
              return (
                <div key={stepItem.number} className="flex items-center">
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-4 h-4 sm:w-10 sm:h-10 rounded-full border-2 ${
                        isCompleted
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : isActive
                          ? 'border-primary-600 text-primary-600'
                          : 'border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Shield className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-xs sm:text-sm font-medium ${
                        isActive ? 'text-primary-600' : 'text-gray-500'
                      }`}>
                        {stepItem.title}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      step > stepItem.number ? 'bg-primary-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 sm:p-8"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Step 1: Seller Details */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seller ID
                  </label>
                  <input
                    {...register('seller_id' as any, { required: true })}
                    type="number"
                    disabled={!!selectedSeller}
                    className="input w-full"
                    placeholder="Enter seller ID or select from search"
                  />
                  {errors.seller_id && (
                    <p className="mt-1 text-sm text-red-600">Seller ID is required</p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Selected Seller</h3>
                  {selectedSeller ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedSeller.name}</p>
                        <p className="text-sm text-gray-600">ID: {selectedSeller.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSeller(null);
                          setValue('seller_id' as any, '');
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-600">No seller selected. Search for a user first.</p>
                  )}
                </div>

                <div className="flex justify-center">
                  <Link
                    to="/search"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Search for Seller
                  </Link>
                </div>
              </div>
            )}

            {/* Step 2: Amount & Conditions */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (ETB)
                  </label>
                  <input
                    {...register('amount', { required: true, valueAsNumber: true })}
                    type="number"
                    className="input w-full"
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">Amount is required</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Description (optional)
                  </label>
                  <textarea
                    {...register('item_description')}
                    className="input input-bordered w-full"
                    placeholder="Describe the item or service being purchased"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Date (optional)
                    </label>
                    <input
                      type="date"
                      {...register('delivery_date')}
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Method (optional)
                    </label>
                    <input
                      type="text"
                      {...register('delivery_method')}
                      className="input input-bordered w-full"
                      placeholder="How will the item/service be delivered?"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Release Condition (optional)
                  </label>
                  <input
                    type="text"
                    {...register('payment_release_condition')}
                    className="input input-bordered w-full"
                    placeholder="Under what conditions should payment be released?"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inspection Period (days, optional)
                    </label>
                    <input
                      type="number"
                      {...register('inspection_period_days', { valueAsNumber: true })}
                      className="input input-bordered w-full"
                      placeholder="Days for inspection"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Governing Law (optional)
                    </label>
                    <input
                      type="text"
                      {...register('governing_law')}
                      className="input input-bordered w-full"
                      placeholder="Which jurisdiction governs this agreement?"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jurisdiction (optional)
                    </label>
                    <input
                      type="text"
                      {...register('jurisdiction')}
                      className="input input-bordered w-full"
                      placeholder="Legal jurisdiction for disputes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deadline (optional)
                    </label>
                    <input
                      type="date"
                      {...register('deadline')}
                      className="input input-bordered w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Hash (optional)
                    </label>
                    <input
                      type="text"
                      {...register('contract_hash')}
                      className="input input-bordered w-full"
                      placeholder="Hash of contract document"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Storage URI (optional)
                    </label>
                    <input
                      type="text"
                      {...register('document_storage_uri')}
                      className="input input-bordered w-full"
                      placeholder="URI to full contract document"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deposit Timestamp (optional)
                    </label>
                    <input
                      type="datetime-local"
                      {...register('deposit_timestamp')}
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto Release (optional)
                    </label>
                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        {...register('auto_release')}
                        className="h-4 w-4 text-primary-600 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600">Enable automatic release after deadline</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Approvals (optional)
                    </label>
                    <input
                      type="number"
                      {...register('required_approvals', { valueAsNumber: true })}
                      className="input input-bordered w-full"
                      placeholder="Number of approvals required"
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Evidence URI (optional)
                    </label>
                    <input
                      type="text"
                      {...register('evidence_uri')}
                      className="input input-bordered w-full"
                      placeholder="URI to evidence document"
                    />
                  </div>
                </div>

                {/* Milestone Toggle */}
                <div className="pt-4">
                  <div className="flex items-center">
                    <div className="relative inline-block w-10 mr-2 align-middle select-none">
                      <input
                        type="checkbox"
                        checked={useMilestones}
                        onChange={() => setUseMilestones(!useMilestones)}
                        id="milestone-toggle"
                        className="sr-only"
                      />
                      <label
                        htmlFor="milestone-toggle"
                        className={`block h-6 w-10 rounded-full cursor-pointer ${
                          useMilestones ? 'bg-primary-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                            useMilestones ? 'transform translate-x-4' : ''
                          }`}
                        />
                      </label>
                    </div>
                    <label htmlFor="milestone-toggle" className="text-sm font-medium text-gray-700">
                      Split into Milestones
                    </label>
                  </div>
                </div>

                {/* Milestone Form */}
                {useMilestones && (
                  <div className="space-y-6 pt-4 border-t border-gray-200">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-blue-800">Milestones</h3>
                        <div className="text-sm text-blue-700">
                          Total: {formatCurrency(totalMilestoneAmount)} / {formatCurrency(watch('amount') || 0)}
                        </div>
                      </div>
                      
                      {milestones.map((milestone, index) => (
                        <div key={milestone.id} className="card p-4 mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Title *
                              </label>
                              <input
                                type="text"
                                value={milestone.title}
                                onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                                className="input input-bordered w-full"
                                placeholder="Milestone title"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount *
                              </label>
                              <input
                                type="number"
                                value={milestone.amount}
                                onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value) || 0)}
                                className="input input-bordered w-full"
                                placeholder="Amount"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date (optional)
                              </label>
                              <input
                                type="date"
                                value={milestone.due_date || ''}
                                onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                                className="input input-bordered w-full"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Order Index
                              </label>
                              <input
                                type="number"
                                value={milestone.order_index}
                                onChange={(e) => updateMilestone(index, 'order_index', parseInt(e.target.value) || 0)}
                                className="input input-bordered w-full"
                                min="0"
                              />
                            </div>
                            
                            {/* Court-compliant fields for milestones */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Completion Status
                              </label>
                              <select
                                value={milestone.completion_status || 'Pending'}
                                onChange={(e) => updateMilestone(index, 'completion_status', e.target.value)}
                                className="input input-bordered w-full"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Auto Release
                              </label>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={!!milestone.auto_release}
                                  onChange={(e) => updateMilestone(index, 'auto_release', e.target.checked)}
                                  className="h-4 w-4 text-primary-600 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-600">Enable automatic release</span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Required Approvals
                              </label>
                              <input
                                type="number"
                                value={milestone.required_approvals || 1}
                                onChange={(e) => updateMilestone(index, 'required_approvals', parseInt(e.target.value) || 1)}
                                className="input input-bordered w-full"
                                min="1"
                                max="10"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Evidence URI
                              </label>
                              <input
                                type="text"
                                value={milestone.evidence_uri || ''}
                                onChange={(e) => updateMilestone(index, 'evidence_uri', e.target.value)}
                                className="input input-bordered w-full"
                                placeholder="URI to evidence document"
                              />
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={milestone.description}
                              onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                              className="input input-bordered w-full"
                              placeholder="Description of milestone requirements"
                              rows={2}
                            />
                          </div>
                          
                          {milestones.length > 1 && (
                            <div className="mt-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeMilestone(index)}
                                className="btn btn-sm btn-error"
                              >
                                Remove Milestone
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={addMilestone}
                          className="btn btn-outline btn-sm w-full"
                        >
                          + Add Another Milestone
                        </button>
                      </div>
                      
                      {totalMilestoneAmount > 0 && totalMilestoneAmount !== (watch('amount') || 0) && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-700">
                            ⚠️ Milestone total ({formatCurrency(totalMilestoneAmount)}) does not match escrow amount ({formatCurrency(watch('amount') || 0)})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Review Escrow Details</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Please review the details before creating the escrow
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Seller</p>
                      <p className="font-medium">
                        {selectedSeller ? selectedSeller.name : 'Not selected'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Amount</p>
                      <p className="font-medium">{formatCurrency(watch('amount') || 0)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Conditions</p>
                      <p className="font-medium text-sm whitespace-pre-line">
                        {watch('conditions') || 'No conditions specified'}
                      </p>
                    </div>
                  </div>

                  {useMilestones && milestones.length > 0 && (
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Milestones</h4>
                      <div className="space-y-2">
                        {milestones.map((milestone, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>
                              {milestone.title || 'Untitled Milestone'} - {formatCurrency(milestone.amount)}
                              {milestone.due_date && ` (Due: ${milestone.due_date})`}
                            </span>
                            <span className="text-gray-500">
                              {milestone.order_index + 1}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t border-gray-200 font-medium">
                          <span>Total:</span>
                          <span>{formatCurrency(totalMilestoneAmount)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="btn btn-outline btn-sm sm:btn-md w-full sm:w-auto"
              >
                Previous
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    // Validate seller ID before proceeding to next step
                    if (step === 1) {
                      const sellerId = watch('seller_id' as any);
                      if (!sellerId || isNaN(Number(sellerId))) {
                        toast.error('Please enter a valid seller ID');
                        return;
                      }
                    }
                    
                    // Validate amount on step 2
                    if (step === 2) {
                      const amount = watch('amount');
                      if (!amount || amount <= 0) {
                        toast.error('Please enter a valid amount');
                        return;
                      }
                      
                      if (useMilestones) {
                        if (milestones.some(m => !m.title.trim())) {
                          toast.error('All milestones must have titles');
                          return;
                        }
                        
                        if (milestones.some(m => m.amount <= 0)) {
                          toast.error('All milestones must have positive amounts');
                          return;
                        }
                        
                        if (totalMilestoneAmount !== amount) {
                          toast.error(`Milestone total (${formatCurrency(totalMilestoneAmount)}) must match escrow amount (${formatCurrency(amount)})`);
                          return;
                        }
                      }
                    }
                    
                    setStep(step + 1);
                  }}
                  className="btn btn-primary btn-md"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary btn-md"
                >
                  {isLoading ? 'Creating...' : 'Create Escrow'}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
};

export default CreateEscrow;