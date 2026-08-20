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
import { Card, Button, Input, Select, FieldLabel } from "../components/ui";

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
      <div className="mx-auto max-w-5xl px-4 py-6 pb-12 sm:py-8">
        {(location.state as any)?.needsOnboarding && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm sm:gap-5 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-yellow-900">{t('pages.complete_your_profile', 'Complete Your Profile')}</h4>
              <p className="text-sm text-yellow-700 opacity-80">{t('pages.you_need_to_provide_your_profession', 'You need to provide your profession and bank details before you can create or accept escrows.')}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t("pages.profile_settings", "Profile Settings")}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("pages.manage_your_account_information_wallet_and_security_settings", "Manage your account information, wallet, and security settings")}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-900">
            {t("pages.trust_score", "Trust Score")}: <span className="font-bold">{user.trust_score ?? 0}</span>
            {trustInsights && (
              <span className="text-xs text-teal-800">
                {t("pages.completed", "Completed")}: {trustInsights.completed} | {t("pages.disputed", "Disputed")}: {trustInsights.disputed} | {t("pages.refunded", "Refunded")}: {trustInsights.refunded}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
          <div className="block lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-none items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                      activeTab === tab.id
                        ? "bg-[#014d46] text-white"
                        : "border border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:block">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ${
                      activeTab === tab.id
                        ? "bg-[#014d46] text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card padding="sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">{t('pages.personal_information', 'Personal Information')}</h3>
                    <Button variant="outline" size="sm" onClick={fetchProfile} disabled={isFetchingProfile}>
                      {isFetchingProfile ? t('pages.refreshing', 'Refreshing...') : t('pages.refresh', 'Refresh')}
                    </Button>
                  </div>
                  <form onSubmit={handleSubmitProfile(handleUpdateProfile)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>{t('components.first_name', 'First Name')}</FieldLabel>
                        <Input {...registerProfile("first_name", { required: true })} type="text" />
                      </div>
                      <div>
                        <FieldLabel>{t('components.last_name', 'Last Name')}</FieldLabel>
                        <Input {...registerProfile("last_name", { required: true })} type="text" />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>{t('components.profession', 'Profession')}</FieldLabel>
                      <Input {...registerProfile("profession", { required: true })} type="text" />
                    </div>
                    <div>
                      <FieldLabel>{t('pages.email_address', 'Email Address')}</FieldLabel>
                      <Input type="email" value={user.email} disabled className="bg-gray-50" />
                    </div>
                    <Button type="submit" disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? t('pages.updating', "Updating...") : t('pages.update_profile', "Update Profile")}
                    </Button>
                  </form>
                </Card>
              </motion.div>
            )}

            {activeTab === "wallet" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card padding="sm">
                  <h3 className="mb-4 text-base font-semibold text-gray-900">{t('pages.ethereum_wallet', 'Ethereum Wallet')}</h3>
                  {user.wallet_address ? (
                    <div className="flex items-center gap-2">
                      <Input type="text" value={user.wallet_address} readOnly className="font-mono" />
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(user.wallet_address!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={handleCreateWallet} disabled={isCreatingWallet}>
                      {isCreatingWallet ? t('pages.creating', "Creating...") : t('pages.create_wallet', "Create Wallet")}
                    </Button>
                  )}
                </Card>
              </motion.div>
            )}

            {activeTab === "banking" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card padding="sm">
                  <h3 className="mb-4 text-base font-semibold text-gray-900">{t('pages.bank_details', 'Bank Details')}</h3>
                  <form onSubmit={handleSubmit(handleUpdateBankDetails)} className="space-y-4">
                    <div>
                      <FieldLabel>{t('pages.account_name', 'Account Name')}</FieldLabel>
                      <Input {...register("account_name", { required: true })} />
                    </div>
                    <div>
                      <FieldLabel>{t('pages.account_number', 'Account Number')}</FieldLabel>
                      <Input {...register("account_number", { required: true })} />
                    </div>
                    <div>
                      <FieldLabel>{t('pages.bank', 'Bank')}</FieldLabel>
                      <Select value={selectedBankCode || ""} onChange={(e) => setSelectedBankCode(Number(e.target.value))}>
                        <option value="">Select Bank</option>
                        {BANKS.map(bank => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
                      </Select>
                    </div>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? t('pages.updating', "Updating...") : t('pages.update_bank_details', 'Update Bank Details')}
                    </Button>
                  </form>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;