import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { authApi, userApi } from "../lib/api";
import { toast } from "react-hot-toast";
import { LoginRequest, RegisterRequest } from "../types";
import { useNavigate } from "react-router-dom";
import { BANKS } from "../lib/banks";

interface AuthFormProps {
  initialMode?: "login" | "register";
}

const AuthForm = ({ initialMode = "login" }: AuthFormProps) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(initialMode === "login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResendActivation, setShowResendActivation] = useState(false);
  const [lastAttemptedEmail, setLastAttemptedEmail] = useState("");
  const [isResendingActivation, setIsResendingActivation] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    trigger,
  } = useForm<LoginRequest & Omit<RegisterRequest, "bank_code"> & { bank_code: string }>();

  const onSubmit = async (data: any) => {
    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await authApi.login({
          email: data.email,
          password: data.password
        });
        
        const { access_token, user: userData } = response.data;
        
        // Save token
        localStorage.setItem("access_token", access_token);
        
        // Update store
        setUser(userData);
        
        toast.success(`Welcome back, ${userData.first_name}!`);
        navigate("/dashboard");
      } else {
        const selectedBank = BANKS.find(b => b.code === parseInt(data.bank_code));
        const regData = {
          ...data,
          bank_code: parseInt(data.bank_code),
          bank_name: selectedBank ? selectedBank.name : "Unknown"
        };
        await authApi.register(regData as RegisterRequest);
        toast.success(t('components.account_created_successfully'));
        setIsLogin(true);
        setRegStep(1);
        reset();
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      const errorMessage = error.response?.data?.error || "Authentication failed. Please try again.";
      toast.error(errorMessage);
      
      if (errorMessage.toLowerCase().includes("activate")) {
        setLastAttemptedEmail(data.email);
        setShowResendActivation(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = ["first_name", "last_name", "profession", "email", "password"];
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) setRegStep(2);
  };

  const handleTabChange = (tab: "login" | "register") => {
    setIsLogin(tab === "login");
    setShowResendActivation(false);
    setRegStep(1);
    reset();
  };

  const handleResendActivation = async () => {
    if (!lastAttemptedEmail) return;
    
    setIsResendingActivation(true);
    try {
      await userApi.resendActivation(lastAttemptedEmail);
      toast.success(t('components.activation_email_sent'));
      setShowResendActivation(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to resend activation email";
      toast.error(errorMessage);
    } finally {
      setIsResendingActivation(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
      {/* Tabs: Login / Register */}
      <div className="flex mb-8">
        <button
          onClick={() => handleTabChange("login")}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-l-lg transition-colors ${
            isLogin
              ? "bg-primary-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t('components.sign_in')}
        </button>
        <button
          onClick={() => handleTabChange("register")}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-r-lg transition-colors ${
            !isLogin
              ? "bg-primary-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t('components.sign_up')}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Basic Info */}
        {!isLogin && regStep === 1 && (
          <>
            <div className="flex space-x-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('components.first_name')}</label>
                <input {...register("first_name", { required: "First name is required" })} className="input w-full" />
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('components.last_name')}</label>
                <input {...register("last_name", { required: "Last name is required" })} className="input w-full" />
                {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('components.profession')}</label>
              <input {...register("profession", { required: "Profession is required" })} className="input w-full" placeholder="e.g., Designer" />
            </div>
          </>
        )}

        {/* Step 2: Payout Details */}
        {!isLogin && regStep === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">{t('components.payout_details')}</h3>
            <p className="text-xs text-gray-500">{t('components.we_need_these_to_secure_your_payments')}</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('components.account_holder_name')}</label>
              <input {...register("account_name", { required: "Account name is required" })} className="input w-full" />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('components.bank_name')}</label>
                <select {...register("bank_code", { required: "Bank is required" })} className="input w-full">
                  <option value="">{t('components.select_a_bank')}</option>
                  {BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                {errors.bank_code && <p className="text-red-500 text-xs mt-1">{errors.bank_code.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('components.account_number')}</label>
              <input {...register("account_number", { required: "Required" })} className="input w-full" />
            </div>
          </div>
        )}

        {/* Email & Password (Login or Step 1 of Reg) */}
        {(isLogin || regStep === 1) && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('components.email')}</label>
              <input {...register("email", { required: "Email is required" })} type="email" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('components.password')}</label>
              <div className="relative">
                <input {...register("password", { required: "Required" })} type={showPassword ? "text" : "password"} className="input w-full pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Dynamic Buttons */}
        <div className="flex gap-3">
          {!isLogin && regStep === 2 && (
            <button type="button" onClick={() => setRegStep(1)} className="btn btn-secondary flex-1">{t('components.back')}</button>
          )}
          
          {isLogin ? (
            <button type="submit" disabled={isLoading} className="btn btn-primary btn-md w-full">
              {isLoading ? t('components.loading') : t('components.sign_in')}
            </button>
          ) : regStep === 1 ? (
            <button type="button" onClick={nextStep} className="btn btn-primary btn-md w-full">{t('components.next_payout_details')}</button>
          ) : (
            <button type="submit" disabled={isLoading} className="btn btn-primary btn-md flex-[2]">
              {isLoading ? t('components.creating') : t('components.complete_registration')}
            </button>
          )}
        </div>
      </form>

      {/* Resend Activation Button */}
      {showResendActivation && isLogin && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">{t('components.account_not_activated')}</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {t('components.your_account_needs_to_be_activated', 'Your account needs to be activated before you can login. Click below to resend the activation email to')}&nbsp;<strong>{lastAttemptedEmail}</strong>.
              </p>
              <button
                onClick={handleResendActivation}
                disabled={isResendingActivation}
                className="mt-3 btn btn-sm bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 hover:border-yellow-700 disabled:opacity-50"
              >
                {isResendingActivation ? t('components.sending') : t('components.resend_activation_email')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer link */}
      {isLogin && (
        <p className="text-center text-sm text-gray-600 mt-6">
          {t('components.dont_have_account', `Don't have an account?`)}&nbsp;
          <button
            onClick={() => handleTabChange("register")}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('components.create_new_account')}
          </button>
        </p>
      )}
    </div>
  );
};

export default AuthForm;

