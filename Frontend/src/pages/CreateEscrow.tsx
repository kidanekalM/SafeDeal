import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Plus, Shield, User, Mail, DollarSign, FileText, ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import { escrowApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const CreateEscrowSchema = z.object({
  creator_role: z.enum(['seller', 'buyer', 'mediator'], { required_error: 'Role is required' }),
  counterparty_email: z.string().min(1, 'Counterparty email/username is required').optional(),
  buyer_email: z.string().min(1, 'Buyer email/username is required').optional(),
  seller_email: z.string().min(1, 'Seller email/username is required').optional(),
  amount: z.coerce.number().positive('Amount must be positive').min(1, 'Amount must be at least 1'),
  conditions: z.string().min(10, 'Conditions must be at least 10 characters').max(2000),
});

type CreateEscrowForm = z.infer<typeof CreateEscrowSchema>;

const CreateEscrow = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    watch,
    control,
  } = useForm<CreateEscrowForm>({
    resolver: zodResolver(CreateEscrowSchema),
    mode: 'onChange',
  });

  const creatorRole = watch('creator_role');

  const onSubmit = async (data: CreateEscrowForm) => {
    try {
      // Prepare payload - backend resolves emails/usernames to ids
      const payload = {
        creator_role: data.creator_role,
        ...(creatorRole === 'mediator' ? { buyer_email: data.buyer_email, seller_email: data.seller_email } : { counterparty_email: data.counterparty_email }),
        amount: Number(data.amount),
        conditions: data.conditions,
      };

      await escrowApi.createEscrow(payload);
      toast.success('Escrow created successfully!');
      navigate('/escrows');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create escrow');
    }
  };

  const isMediator = creatorRole === 'mediator';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="card p-8">
          <div className="text-center mb-8">
            <Shield className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Escrow</h1>
            <p className="text-gray-600 max-w-md mx-auto">
              Securely create an escrow as seller, buyer, or mediator
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Role Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Role as Creator <span className="text-red-500">*</span>
              </label>
              <select
                {...register('creator_role')}
                className="input w-full"
                disabled={isSubmitting}
              >
                <option value="">Select your role</option>
                <option value="seller">Seller (select buyer)</option>
                <option value="buyer">Buyer (select seller)</option>
                <option value="mediator">Mediator (select buyer & seller)</option>
              </select>
              {errors.creator_role && (
                <p className="mt-1 text-sm text-red-600">{errors.creator_role.message}</p>
              )}
            </div>

            {/* Counterparty / Buyer & Seller */}
            {!isMediator ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Counterparty Email/Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('counterparty_email')}
                    placeholder="Enter counterparty email or username"
                    className="input pl-10"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.counterparty_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.counterparty_email.message}</p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Email/Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('buyer_email')}
                      placeholder="Enter buyer email or username"
                      className="input pl-10"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.buyer_email && (
                    <p className="mt-1 text-sm text-red-600">{errors.buyer_email.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller Email/Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('seller_email')}
                      placeholder="Enter seller email or username"
                      className="input pl-10"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.seller_email && (
                    <p className="mt-1 text-sm text-red-600">{errors.seller_email.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="input pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('conditions')}
                rows={6}
                placeholder="Describe the item/service, delivery method, inspection period, payment release conditions, governing law, etc.&#10;&#10;Example:&#10;- Item: Laptop (Dell XPS 13)&#10;- Delivery Method: In-person handover&#10;- Delivery Date: Within 3 days&#10;- Inspection Period: 7 days&#10;- Payment Release: Upon buyer confirmation of receipt in good condition"
                className="input resize-vertical"
                disabled={isSubmitting}
              />
              {errors.conditions && (
                <p className="mt-1 text-sm text-red-600">{errors.conditions.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="btn btn-primary btn-lg w-full"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                  </svg>
                  Creating Escrow...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Secure Escrow
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEscrow;

