import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  User,
  Wallet,
  CreditCard,
  Copy,
  AlertCircle,
} from "lucide-react";
import Layout from "../components/Layout";
import { useAuthStore } from "../store/authStore";
import { userApi } from "../lib/api";
import { toast } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import { BankDetails, UpdateProfileRequest } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import { BANKS } from "../lib/banks";

const Profile = () => {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState<number | null>(null);
  const [trustInsights, setTrustInsights] = useState<{completed:number; disputed:number; refunded:number} | null>(null);

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<BankDetails>();

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
  } = useForm<UpdateProfileRequest>();

  const fetchProfile = async () => {
    setIsFetchingProfile(true);
    try {
      const response = await userApi.getProfile();
      setUser(response.data);
      try {
        const trustRes = await userApi.getTrustInsights();
        setTrustInsights(trustRes.data?.factors || null);
      } catch {
        setTrustInsights(null);
      }
    } catch (error: any) {
      toast.error(t('pages.error_loading_profile', 'Failed to load profile data'));
    } finally {
      setIsFetchingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user) {
      reset({
        account_name: user.account_name || "",
        account_number: user.account_number || "",
        bank_code: user.bank_code || 0,
      });
      resetProfile({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        profession: user.profession || "",
      });
      setSelectedBankCode(user.bank_code || null);
    }
  }, [user, reset, resetProfile]);

  const handleUpdateBankDetails = async (data: BankDetails) => {
    if (!selectedBankCode) {
      toast.error(t('pages.please_select_bank', 'Please select a bank'));
      return;
    }

    setIsLoading(true);
    try {
      const bankData = { ...data, bank_code: selectedBankCode };
      const response = await userApi.updateBankDetails(bankData);
      setUser(response.data);
      toast.success(t('pages.bank_details_updated', 'Bank details updated successfully!'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pages.bank_details_update_failed', 'Failed to update bank details'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    if (user?.wallet_address) {
      toast(t('pages.wallet_exists', 'Wallet already exists!'), { icon: "🦊" });
      return;
    }
    setIsCreatingWallet(true);
    try {
      const response = await userApi.createWallet();
      if (user) {
        setUser({ ...user, wallet_address: response.data.wallet_address });
      }
      toast.success(t('pages.wallet_created', 'Ethereum wallet created successfully!'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('pages.wallet_creation_failed', 'Failed to create wallet'));
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleUpdateProfile = async (data: UpdateProfileRequest) => {
    if (!user?.id) {
      toast.error(t('pages.user_id_not_available', 'User ID not available'));
      return;
    }
    setIsUpdatingProfile(true);
    try {
      const response = await userApi.updateProfile(data, user.id);
      setUser({ ...user, ...response.data });
      toast.success(t('pages.profile_updated', 'Profile updated successfully!'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pages.profile_update_failed', 'Failed to update profile'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('common.copied', 'Copied to clipboard!'));
  };

  const tabs = [
    { id: "profile", name: t('pages.profile', 'Profile'), icon: User },
    { id: "wallet", name: t('pages.wallet', 'Wallet'), icon: Wallet },
    { id: "banking", name: t('pages.banking', 'Banking'), icon: CreditCard },
  ];

  if (!user || isFetchingProfile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Onboarding Banner */}
        {(location.state as any)?.needsOnboarding && (
          <div className="mb-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-[2rem] flex items-center gap-6 shadow-xl">
            <div className="p-4 bg-yellow-100 rounded-2xl text-yellow-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase tracking-tight text-yellow-900">{t('pages.complete_your_profile', 'Complete Your Profile')}</h4>
              <p className="text-yellow-700 text-sm opacity-80">{t('pages.you_need_to_provide_your_profession', 'You need to provide your profession and bank details before you can create or accept escrows.')}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("pages.profile_settings", "Profile Settings")}</h1>
          <p className="text-gray-600 mt-2">
            {t("pages.manage_your_account_information_wallet_and_security_settings", "Manage your account information, wallet, and security settings")}
          </p>
          <div className="mt-4 p-3 rounded-lg bg-teal-50 border border-teal-100 text-sm text-teal-900">
            {t("pages.trust_score", "Trust Score")}: <span className="font-bold">{user.trust_score ?? 0}</span>
            {trustInsights && (
              <span className="ml-3 text-xs text-teal-800">
                {t("pages.completed", "Completed")}: {trustInsights.completed} | {t("pages.disputed", "Disputed")}: {trustInsights.disputed} | {t("pages.refunded", "Refunded")}: {trustInsights.refunded}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Top Tabs - Mobile Header */}
          <div className="lg:col-span-4 block lg:hidden mb-6">
            <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-none flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                      activeTab === tab.id
                        ? "bg-primary-600 text-white shadow-lg scale-105"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Tabs - Desktop */}
          <div className="lg:col-span-1 lg:block hidden">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-left transition-all font-bold ${
                      activeTab === tab.id
                        ? "bg-primary-600 text-white shadow-xl scale-[1.02]"
                        : "text-gray-600 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-bold">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{t('pages.personal_information', 'Personal Information')}</h3>
                  <button onClick={fetchProfile} disabled={isFetchingProfile} className="btn btn-outline btn-sm">
                    {isFetchingProfile ? t('pages.refreshing', 'Refreshing...') : t('pages.refresh', 'Refresh')}
                  </button>
                </div>
                <form onSubmit={handleSubmitProfile(handleUpdateProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('components.first_name', 'First Name')}</label>
                      <input {...registerProfile("first_name", { required: true })} type="text" className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('components.last_name', 'Last Name')}</label>
                      <input {...registerProfile("last_name", { required: true })} type="text" className="input w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('components.profession', 'Profession')}</label>
                    <input {...registerProfile("profession", { required: true })} type="text" className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.email_address', 'Email Address')}</label>
                    <input type="email" value={user.email} disabled className="input w-full bg-gray-50" />
                  </div>
                  <button type="submit" disabled={isUpdatingProfile} className="btn btn-primary btn-md">
                    {isUpdatingProfile ? t('pages.updating', "Updating...") : t('pages.update_profile', "Update Profile")}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === "wallet" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('pages.ethereum_wallet', 'Ethereum Wallet')}</h3>
                  {user.wallet_address ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input type="text" value={user.wallet_address} readOnly className="input flex-1 font-mono text-sm" />
                        <button onClick={() => copyToClipboard(user.wallet_address!)} className="btn btn-outline btn-sm"><Copy className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={handleCreateWallet} disabled={isCreatingWallet} className="btn btn-primary btn-md">
                      {isCreatingWallet ? t('pages.creating', "Creating...") : t('pages.create_wallet', "Create Wallet")}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "banking" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('pages.bank_details', 'Bank Details')}</h3>
                  <form onSubmit={handleSubmit(handleUpdateBankDetails)} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.account_name', 'Account Name')}</label>
                      <input {...register("account_name", { required: true })} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.account_number', 'Account Number')}</label>
                      <input {...register("account_number", { required: true })} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.bank', 'Bank')}</label>
                      <select value={selectedBankCode || ""} onChange={(e) => setSelectedBankCode(Number(e.target.value))} className="input w-full">
                        <option value="">Select Bank</option>
                        {BANKS.map(bank => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
                      </select>
                    </div>
                    <button type="submit" disabled={isLoading} className="btn btn-primary btn-md">Update Bank Details</button>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
