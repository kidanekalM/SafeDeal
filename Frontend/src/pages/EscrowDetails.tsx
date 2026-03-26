import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MessageCircle,
  Phone,
  X,
  FileText,
  ExternalLink,
  RotateCcw,
  Edit3,
  Check,
  XCircle,
  Scale,
  Lock,
  Zap,
} from "lucide-react";
import { milestoneApi } from "../lib/api";
import type { Milestone } from "../types";
import Layout from "../components/Layout";
import { useAuthStore } from "../store/authStore";
import { escrowApi, paymentApi } from "../lib/api";
import { formatCurrency, getStatusColor } from "../lib/utils";
import { Escrow, EscrowPayment } from "../types";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import RealTimeChat from "../components/RealTimeChat";
import PaymentModal from "../components/PaymentModal";
import VerifiedBadge from "../components/VerifiedBadge";
import { motion, AnimatePresence } from "framer-motion";

const formatDateSafe = (date: string | number | Date | null | undefined) => {
  const { t } = useTranslation();
  if (!date) return "Unknown date";

  let d: Date;

  if (typeof date === "string") {
    // Convert "2025-09-14 12:49:29.00232+00" → "2025-09-14T12:49:29.002+00"
    const normalized = date.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1"); // trim microseconds
    d = new Date(normalized);
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) return "Unknown date";

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const EscrowDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [payment, setPayment] = useState<EscrowPayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCBEModal, setShowCBEModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editConditions, setEditConditions] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [cbeTransactionId, setCbeTransactionId] = useState("");
  const [cbeAccountSuffix, setCbeAccountSuffix] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const [isBackendBusy, setIsBackendBusy] = useState(false);

  const handleCBEVerify = async () => {
    if (!cbeTransactionId || !cbeAccountSuffix) {
      toast.error("Please fill in both Transaction ID and Account Suffix");
      return;
    }
    setIsProcessing(true);
    try {
      await escrowApi.verifyCBE(escrow!.id, cbeTransactionId, cbeAccountSuffix);
      toast.success("Payment verified successfully! Escrow is now funded.");
      setShowCBEModal(false);
      fetchEscrowDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Verification failed. Please check your details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editConditions || editConditions.trim().length < 10) {
      toast.error("Terms must be at least 10 characters");
      return;
    }
    setIsProcessing(true);
    try {
      await escrowApi.update(escrow!.id, { amount: editAmount, conditions: editConditions });
      toast.success("Terms updated!");
      setShowEditModal(false);
      fetchEscrowDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update terms");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLock = async () => {
    setIsProcessing(true);
    try {
      await escrowApi.lock(escrow!.id);
      toast.success("Terms locked! No further changes can be made.");
      fetchEscrowDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to lock terms");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadReceipt = async () => {
    if (!receiptUrl) return;
    setIsProcessing(true);
    try {
        await escrowApi.uploadReceipt(escrow!.id, receiptUrl);
        toast.success("Receipt submitted! Escrow status updated.");
        setShowReceiptModal(false);
        fetchEscrowDetails();
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Failed to upload receipt");
    } finally {
        setIsProcessing(false);
    }
};

// NEW: Milestones state
const [milestones, setMilestones] = useState<Milestone[]>([]);
const [loadingMilestones, setLoadingMilestones] = useState(false);

// Calculate user roles early so they can be used in useEffects
const isBuyer = user?.id === escrow?.buyer_id;
const isSeller = user?.id === escrow?.seller_id;

  useEffect(() => {
    if (id) {
      fetchEscrowDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // NEW: Fetch milestones when escrow loads
  useEffect(() => {
    if (escrow?.id && !loadingMilestones) {
      setLoadingMilestones(true);
      milestoneApi.getByEscrow(escrow.id as number)
        .then((res) => setMilestones(res.data))
        .catch(() => toast.error('Failed to load milestones'))
        .finally(() => setLoadingMilestones(false));
    }
  }, [escrow?.id, loadingMilestones]);

  // Auto-reload escrow details for buyer when seller accepts
  useEffect(() => {
    if (!escrow || !isBuyer) return;

    // Set up polling to check for escrow status changes
    const pollInterval = setInterval(async () => {
      // Only poll if escrow is funded but not yet active (waiting for seller acceptance)
      if (escrow.status === "Funded" && !escrow.active) {
        try {
          const response = await escrowApi.getById(parseInt(id!));
          const rawData = response.data as any;

          // Check if seller has accepted (escrow became active)
          const newActive = rawData.active !== undefined ? rawData.active : rawData.Active;
          if (newActive && !escrow.active) {
            toast.success("🎉 Seller has accepted the escrow! You can now chat and confirm receipt.");
            fetchEscrowDetails(); // Refresh the full details
          }
        } catch (error) {
          // silently fail the poll
        }
      }
    }, 15000); // Poll every 15 seconds to reduce backend load

    // Clean up interval
    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escrow?.status, escrow?.active, isBuyer, id]);

  const fetchEscrowDetails = async (retryCount = 0) => {
    if (!id) {
      return;
    }

    // Circuit breaker - stop making requests if too many errors
    if (errorCount > 5) {
      toast.error("🚫 Backend is experiencing issues. Please refresh the page in a few minutes.");
      return;
    }

    if (isBackendBusy) {
      return; // Skip this request if backend is busy
    }

    const escrowId = parseInt(id);
    if (isNaN(escrowId) || escrowId <= 0) {
      toast.error('Invalid escrow ID');
      return;
    }

    // Throttle requests
    setIsBackendBusy(true);
    setTimeout(() => setIsBackendBusy(false), 2000);

    // Don't show loading spinner on retries to make it seamless
    if (retryCount === 0) {
      setIsLoading(true);
    }

    try {
      const response = await escrowApi.getById(escrowId);

      // Validate response data
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response data from server');
      }

      const escrowData = response.data;

      // Validate essential fields - handle both lowercase and uppercase field names
      const rawData = escrowData as any; // Type assertion to handle backend field name differences
      const hasId = rawData.id || rawData.ID;
      const hasBuyerId = rawData.buyer_id;
      const hasSellerId = rawData.seller_id;

      if (!hasId || !hasBuyerId || !hasSellerId) {
        throw new Error('Incomplete escrow data received');
      }

      // Normalize field names to match frontend expectations
      const normalizedEscrowData: Escrow = {
        ...rawData,
        id: rawData.id || rawData.ID,
        active: rawData.active !== undefined ? rawData.active : rawData.Active,
        created_at: rawData.created_at || rawData.CreatedAt,
        updated_at: rawData.updated_at || rawData.UpdatedAt,
      };

      setEscrow(normalizedEscrowData);

      // If it succeeds on a retry, clear any potential error messages and reset error count
      if (retryCount > 0) {
        toast.success("Escrow details updated successfully!");
      }
      setErrorCount(0); // Reset error count on success
    } catch (error: any) {
      // Increment error count
      setErrorCount(prev => prev + 1);

      // If it's a server error and we haven't retried too many times, try again
      if (error?.response?.status === 500 && retryCount < 2) {
        const delay = Math.min(30000, 5000 * (retryCount + 1)); // Cap at 30 seconds
        toast.loading(
          `Server is busy, retrying... (Attempt ${retryCount + 1})`,
          { id: "retry-toast" }
        );

        setTimeout(() => {
          toast.dismiss("retry-toast");
          fetchEscrowDetails(retryCount + 1);
        }, delay);
        return; // Important: exit the function to avoid showing a final error prematurely
      }

      // Handle final error after all retries have failed
      toast.dismiss("retry-toast");
      const errorMessage =
        error.response?.data?.error || "Failed to fetch escrow details.";
      if (error.response?.status === 500) {
        toast.error(
          `🔧 Server Error: ${errorMessage} Please try refreshing the page.`
        );
      } else if (error.response?.status === 404) {
        toast.error("❌ Escrow not found.");
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    const escrowId = Number(id);
    if (!Number.isFinite(escrowId) || escrowId <= 0) {
      toast.error("Invalid escrow ID");
      return;
    }

    setIsProcessing(true);
    try {
      await escrowApi.accept(escrowId);
      toast.success("Escrow accepted successfully!");

      // Immediate refresh for better UX, then delayed refresh for safety
      fetchEscrowDetails();
      setTimeout(() => {
        fetchEscrowDetails();
      }, 1500);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to accept escrow"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReceipt = async () => {
    const escrowId = Number(id);
    if (!Number.isFinite(escrowId) || escrowId <= 0) {
      toast.error("Invalid escrow ID");
      return;
    }

    setIsProcessing(true);
    try {
      await escrowApi.confirmReceipt(escrowId);
      toast.success("Receipt confirmed! Funds will be released to the seller.");

      // Immediate refresh for better UX, then delayed refresh for safety
      fetchEscrowDetails();
      setTimeout(() => {
        fetchEscrowDetails();
      }, 1500);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to confirm receipt"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async () => {
    const escrowId = Number(id);
    if (!Number.isFinite(escrowId) || escrowId <= 0) {
      toast.error("Invalid escrow ID");
      return;
    }

    setIsProcessing(true);
    try {
      await escrowApi.refund(escrowId);
      toast.success("Refund successful! Funds will be released to the buyer.");

      // Immediate refresh for better UX, then delayed refresh for safety
      fetchEscrowDetails();
      setTimeout(() => {
        fetchEscrowDetails();
      }, 1500);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to refund"
      );
    } finally {
      setIsProcessing(false);
    }
  };
  const handleCancel = async () => {
    const escrowId = Number(id);
    if (!Number.isFinite(escrowId) || escrowId <= 0) {
      toast.error("Invalid escrow ID");
      return;
    }

    setIsProcessing(true);
    try {
      await escrowApi.cancel(escrowId);
      toast.success("Cancel successful! Funds will be released to the buyer.");

      // Immediate refresh for better UX, then delayed refresh for safety
      fetchEscrowDetails();
      setTimeout(() => {
        fetchEscrowDetails();
      }, 1500);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to cancel"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInitiatePayment = async () => {
    const escrowId = Number(id);
    if (!Number.isFinite(escrowId) || escrowId <= 0) {
      toast.error("Invalid escrow ID");
      return;
    }

    // Ensure phone number is available (required by payment provider)
    let profile: any = {};
    try {
      profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
    } catch {}
    let phone = profile?.phone_number as string | undefined;
    if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
      setPhoneNumber("");
      setShowPhoneModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const response = await paymentApi.initiateEscrowPayment(escrowId);
      setPayment(response.data);
      setShowPayment(true);
      toast.success("Payment initiated! Please complete the payment.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to initiate payment"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentComplete = () => {
    setShowPayment(false);
    toast.success("Payment completed successfully!");

    // Immediate refresh for better UX, then delayed refresh for safety
    fetchEscrowDetails();
    setTimeout(() => {
      fetchEscrowDetails();
    }, 2000);
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      toast.error("Please enter a valid phone number (at least 10 digits)");
      return;
    }

    const escrowId = Number(id);
    if (!Number.isFinite(escrowId) || escrowId <= 0) {
      toast.error("Invalid escrow ID");
      return;
    }

    // Save phone number for future use
    try {
      const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
      const nextProfile = { ...profile, phone_number: phoneNumber.trim() };
      localStorage.setItem("user_profile", JSON.stringify(nextProfile));
    } catch {}

    setShowPhoneModal(false);
    setIsProcessing(true);

    try {
      const response = await paymentApi.initiateEscrowPayment(escrowId);
      setPayment(response.data);
      setShowPayment(true);
      toast.success("Payment initiated! Please complete the payment.");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to initiate payment";

      // Enhanced error handling for bank details compatibility
      if (
        errorMessage.toLowerCase().includes("bank") ||
        errorMessage.toLowerCase().includes("account")
      ) {
        if (
          errorMessage.toLowerCase().includes("buyer") ||
          errorMessage.toLowerCase().includes("your")
        ) {
          toast.error(`❌ Your Bank Details Issue: ${errorMessage}`, {
            duration: 6000,
            style: {
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#DC2626",
            },
          });
        } else if (errorMessage.toLowerCase().includes("seller")) {
          toast.error(`❌ Seller Bank Details Issue: ${errorMessage}`, {
            duration: 6000,
            style: {
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#DC2626",
            },
          });
        } else {
          toast.error(`❌ Bank Details Issue: ${errorMessage}`, {
            duration: 6000,
            style: {
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#DC2626",
            },
          });
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisputeSubmit = async () => {
    if (!disputeReason || disputeReason.trim().length < 10) {
      toast.error(
        "Please provide a detailed reason for the dispute (at least 10 characters)"
      );
      return;
    }

    const escrowId = Number(id);
    if (!Number.isFinite(escrowId) || escrowId <= 0) {
      toast.error("Invalid escrow ID");
      return;
    }

    setShowDisputeModal(false);
    setIsProcessing(true);

    try {
      await escrowApi.dispute(escrowId, disputeReason.trim());
      toast.success("Dispute created successfully");

      // ✅ Automatically open chat after dispute
      setShowChat(true);

      // Add delay before refreshing to give backend time to process
      setTimeout(() => {
        fetchEscrowDetails();
      }, 1500);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to create dispute"
      );
    } finally {
      setIsProcessing(false);
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-5 w-5" />;
      case "Verifying":
        return <Clock className="h-5 w-5" />;
      case "Funded":
        return <Shield className="h-5 w-5" />;
      case "Released":
        return <CheckCircle className="h-5 w-5" />;
      case "Disputed":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };


  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  if (!escrow) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Escrow not found
          </h3>
          <p className="text-gray-600 mb-4">
            The escrow you're looking for doesn't exist.
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Escrow #{escrow.id}
              </h1>
              <p className="text-gray-600 mt-2">
                Created on {formatDateSafe(escrow.created_at)}
              </p>
            </div>
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                escrow.status
              )}`}
            >
              {getStatusIcon(escrow.status)}
              <span className="ml-2">{escrow.status}</span>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* NEW: Milestones Section */}
            {milestones.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Milestones ({milestones.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium text-gray-700">#</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-700">Title</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-700">Amount</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((m, i) => (
                        <tr key={m.id} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm">M{i+1}</td>
                          <td className="py-3 px-4 font-medium">{m.title}</td>
                          <td className="py-3 px-4">{formatCurrency(m.amount)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              m.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              m.status === 'Funded' ? 'bg-blue-100 text-blue-800' :
                              m.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800' :
                              m.status === 'Pending' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isSeller && m.status === 'Funded' && (
                              <button onClick={() => milestoneApi.submit(m.id).then(() => fetchEscrowDetails())} className="btn btn-sm btn-outline mr-1">
                                Submit
                              </button>
                            )}
                            {m.approver_id === user?.id && m.status === 'Submitted' && (
                              <>
                                <button onClick={() => milestoneApi.approve(m.id).then(() => fetchEscrowDetails())} className="btn btn-sm btn-success mr-1">
                                  <Check className="h-3 w-3" />
                                </button>
                                <button onClick={() => milestoneApi.reject(m.id).then(() => fetchEscrowDetails())} className="btn btn-sm btn-error">
                                  <XCircle className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {loadingMilestones && <p className="text-sm text-gray-500 mt-2">Loading milestones...</p>}
                {milestones.length === 0 && !loadingMilestones && (
                  <div className="text-center py-8">
                    <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No milestones yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Info */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Transaction Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Amount
                    </label>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(escrow.amount)}
                    </p>
                    {escrow.platform_fee > 0 && (
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        + {formatCurrency(escrow.platform_fee)} Platform Fee
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Total
                    </label>
                    <p className="text-lg font-black text-[#014d46]">
                      {formatCurrency(escrow.amount + (escrow.platform_fee || 0))}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Status
                    </label>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(escrow.status)}
                      <span className="font-medium">{escrow.status}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Escrow ID
                    </label>
                    <p className="text-sm font-mono text-gray-900">
                      #{escrow.id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Active Status
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${escrow.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`text-sm font-medium ${escrow.active ? 'text-green-700' : 'text-red-700'}`}>
                        {escrow.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {escrow.conditions && (() => {
                  const lines = escrow.conditions.split('\n').filter(line => line.trim());
                  const conditions: { [key: string]: string } = {};
                  let currentKey = '';
                  
                  // Parse the conditions text to extract individual fields
                  lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed.includes(':') && !trimmed.startsWith('-')) {
                      const [key, ...valueParts] = trimmed.split(':');
                      currentKey = key.trim();
                      const value = valueParts.join(':').trim();
                      if (value) conditions[currentKey] = value;
                    } else if (currentKey && trimmed && !trimmed.startsWith('Buyer:') && !trimmed.startsWith('Seller:')) {
                      if (trimmed.startsWith('-')) {
                        conditions[currentKey] = (conditions[currentKey] || '') + '\n' + trimmed;
                      } else {
                        conditions[currentKey] = trimmed;
                      }
                    }
                  });

                  return (
                    <div className="space-y-4 pt-2">
                      {conditions['Item Description'] && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Item Description
                          </label>
                          <p className="text-gray-900 text-sm mt-1">{conditions['Item Description']}</p>
                        </div>
                      )}

                      {(conditions['Delivery'] || lines.find(l => l.includes('Date:')) || lines.find(l => l.includes('Method:'))) && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Delivery Date
                            </label>
                            <p className="text-gray-900 text-sm mt-1">
                              {lines.find(l => l.includes('Date:'))?.replace('- Date:', '').trim() || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Delivery Method
                            </label>
                            <p className="text-gray-900 text-sm mt-1">
                              {lines.find(l => l.includes('Method:'))?.replace('- Method:', '').trim() || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      )}

                      {conditions['Payment Release'] && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Payment Release Condition
                          </label>
                          <p className="text-gray-900 text-sm mt-1">{conditions['Payment Release']}</p>
                        </div>
                      )}

                      {(lines.find(l => l.includes('Inspection Period:')) || conditions['Governing Law']) && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Inspection Period
                            </label>
                            <p className="text-gray-900 text-sm mt-1">
                              {lines.find(l => l.includes('Inspection Period:'))?.replace('Inspection Period:', '').trim() || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Governing Law
                            </label>
                            <p className="text-gray-900 text-sm mt-1">
                              {conditions['Governing Law']?.replace('Governing Law:', '').trim() || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      )}

                      {conditions['Refund Policy'] && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Refund Policy
                          </label>
                          <p className="text-gray-900 text-sm mt-1">{conditions['Refund Policy']}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {escrow.blockchain_tx_hash && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Blockchain Transaction
                    </label>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm font-mono text-gray-900 break-all flex-1 mr-3">
                        {escrow.blockchain_tx_hash}
                      </p>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${escrow.blockchain_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm flex-shrink-0"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Etherscan
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Verification Banner */}
            {escrow.status === "Verifying" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-6 bg-blue-50 border-2 border-blue-100 rounded-[2rem] text-blue-900 flex items-center gap-6 shadow-xl"
              >
                <div className="p-4 bg-blue-100 rounded-2xl">
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tight">Payment Verifying</h4>
                  <p className="text-blue-700 text-sm opacity-80">We are currently verifying your bank transfer. This usually takes 1-2 hours.</p>
                </div>
              </motion.div>
            )}

            {/* Funds Secured Indicator */}
            {escrow.status === "Funded" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-6 bg-[#014d46] rounded-[2rem] text-white flex items-center gap-6 shadow-xl relative overflow-hidden"
              >
                <div className="p-4 bg-white/10 rounded-2xl relative z-10">
                  <Lock className="h-8 w-8 text-teal-300" />
                </div>
                <div className="relative z-10">
                  <h4 className="text-xl font-black uppercase tracking-tight">Funds Secured</h4>
                  <p className="text-teal-100 text-sm opacity-80">SafeDeal has verified the payment. Funds are held in our secure vault.</p>
                </div>
                <Shield className="absolute -right-4 -bottom-4 h-32 w-32 opacity-5 rotate-12" />
              </motion.div>
            )}

            {/* Actions */}
            <div className="card p-6 rounded-[2rem]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                  Deal Actions
                </h3>
                {!escrow.is_locked && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditConditions(escrow.conditions || "");
                        setEditAmount(escrow.amount);
                        setShowEditModal(true);
                      }}
                      className="btn btn-outline btn-sm rounded-xl gap-1"
                    >
                      <Edit3 size={14} /> Edit Terms
                    </button>
                    <button
                      onClick={handleLock}
                      className="btn btn-primary btn-sm rounded-xl gap-1"
                    >
                      <Lock size={14} /> Lock & Agree
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {isBuyer && escrow.status === "Pending" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={handleInitiatePayment}
                        disabled={isProcessing}
                        className="btn btn-primary btn-lg rounded-2xl flex flex-col items-center py-8 h-auto gap-2"
                      >
                        <Zap className="h-6 w-6" />
                        <div className="text-center">
                          <p className="font-black">Pay with Chapa</p>
                          <p className="text-[10px] opacity-60">Instant Automated Verification</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setShowCBEModal(true)}
                        disabled={isProcessing}
                        className="btn btn-outline btn-lg rounded-2xl flex flex-col items-center py-8 h-auto gap-2 border-[#014d46] text-[#014d46]"
                      >
                        <Check className="h-6 w-6" />
                        <div className="text-center">
                          <p className="font-black">CBE Direct Verify</p>
                          <p className="text-[10px] opacity-60">Verify with Transaction ID</p>
                        </div>
                      </button>
                    </div>
                    <button
                      onClick={() => setShowReceiptModal(true)}
                      disabled={isProcessing}
                      className="btn btn-outline btn-md w-full rounded-2xl flex items-center justify-center gap-2 border-dashed"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Manual Receipt Upload</span>
                    </button>
                  </div>
                )}

                {escrow.receipt_url && (
                  <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-600" />
                      <span className="text-sm font-bold text-blue-900">Payment Receipt Attached</span>
                    </div>
                    <a href={escrow.receipt_url} target="_blank" rel="noreferrer" className="text-xs font-black text-blue-600 uppercase underline">View Receipt</a>
                  </div>
                )}

                {isSeller && !escrow.active && escrow.status === "Funded" && (
                  <button
                    onClick={handleAccept}
                    disabled={isProcessing}
                    className="btn btn-primary btn-lg w-full rounded-2xl h-16 font-black"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {isProcessing ? "Accepting..." : "Accept Funded Escrow"}
                  </button>
                )}

                {isSeller && escrow.active && escrow.status === "Funded" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-medium">
                        Escrow Accepted & Active
                      </span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      You have accepted the funded escrow. Waiting for buyer to confirm receipt.
                    </p>
                  </div>
                )}

                {isBuyer && escrow.active && escrow.status === "Funded" && (
                  <button
                    onClick={handleConfirmReceipt}
                    disabled={isProcessing}
                    className="btn btn-success btn-lg w-full"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {isProcessing ? "Confirming..." : "Confirm Receipt"}
                  </button>
                )}

                {(isBuyer || isSeller) && escrow.active && escrow.status === "Funded" && (
                  <button
                    onClick={() => {
                      setDisputeReason("");
                      setShowDisputeModal(true);
                    }}
                    disabled={isProcessing}
                    className="btn btn-outline btn-lg w-full"
                  >
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {isProcessing ? "Creating Dispute..." : "Create Dispute"}
                  </button>
                )}


                <button
                  onClick={() => setShowChat(true)}
                  disabled={
                    !escrow.active ||
                    (escrow.status !== "Funded" && escrow.status !== "Released" && escrow.status !== "Disputed")
                  }
                  className={`btn btn-lg w-full ${
                    !escrow.active ||
                    (escrow.status !== "Funded" && escrow.status !== "Released" && escrow.status !== "Disputed")
                      ? "btn-disabled cursor-not-allowed opacity-50"
                      : "btn-outline"
                  }`}
                  title={
                    escrow.status === "Pending"
                      ? "Chat will be available after payment is made"
                      : !escrow.active
                      ? "Chat will be available after seller accepts the funded escrow"
                      : escrow.status === "Disputed"
                      ? "Chat with other party"
                      : "Open chat"
                  }
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  {escrow.status === "Pending"
                    ? "Chat (Pending Payment)"
                    : !escrow.active
                    ? "Chat (Pending Acceptance)"
                    : escrow.status === "Disputed"
                    ? "Chat (Dispute Mode)"
                    : "Open Chat"}
                </button>
                {isSeller && escrow.active && escrow.status === "Disputed" && (
                  <button
                    onClick={handleRefund}
                    disabled={isProcessing}
                    className="btn btn-error btn-lg w-full"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    {isProcessing ? "Refunding..." : "Refund"}
                  </button>
                )}
                {isBuyer && (!escrow.active) && (escrow.status === "Funded") && (
                  <button
                    onClick={handleCancel}
                    disabled={isProcessing}
                    className="btn btn-error btn-lg w-full"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    {isProcessing ? "Canceling..." : "Cancel"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Participants
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">Buyer</p>
                      <VerifiedBadge isVerified={!!escrow.buyer?.activated} />
                    </div>
                    <p className="text-sm text-gray-600">You</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">Seller</p>
                      <VerifiedBadge isVerified={!!escrow.seller?.activated} />
                    </div>
                    <p className="text-sm text-gray-600">
                      {isSeller ? "You" : (escrow.seller?.first_name ? `${escrow.seller.first_name} ${escrow.seller.last_name}` : `User #${escrow.seller_id}`)}
                    </p>
                  </div>
                </div>
                {escrow.mediator_id && (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">Mediator</p>
                        <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-black uppercase">Resolver</span>
                      </div>
                      <p className="text-[10px] text-gray-500 italic mt-0.5">Neutral third-party to help resolve conflicts.</p>
                      <p className="text-sm text-gray-600">
                        {user?.id === escrow.mediator_id ? "You" : `User #${escrow.mediator_id}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Timeline */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Timeline
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Escrow Created
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatDateSafe(escrow.created_at)}
                    </p>
                  </div>
                </div>
                {escrow.status !== "Pending" && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Escrow Accepted
                      </p>
                      <p className="text-xs text-gray-600">Status updated</p>
                    </div>
                  </div>
                )}
                {escrow.status === "Released" && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Funds Released
                      </p>
                      <p className="text-xs text-gray-600">
                        Transaction completed
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Legal Compliance */}
            {(escrow.jurisdiction || escrow.governing_law || escrow.dispute_resolution) && (
              <div className="card p-6 bg-blue-50/50 border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-blue-600" />
                  Legal Compliance
                </h3>
                <div className="space-y-3">
                  {escrow.jurisdiction && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jurisdiction</label>
                      <p className="text-sm font-medium text-gray-900">{escrow.jurisdiction}</p>
                    </div>
                  )}
                  {escrow.governing_law && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Governing Law</label>
                      <p className="text-sm font-medium text-gray-900">{escrow.governing_law}</p>
                    </div>
                  )}
                  {escrow.dispute_resolution && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dispute Resolution</label>
                      <p className="text-sm font-medium text-gray-900">{escrow.dispute_resolution}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>


        {/* Modals */}
        <RealTimeChat
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          escrowId={Number(id)}
        />

        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          amount={escrow.amount}
          paymentUrl={payment?.payment_url}
          onPaymentComplete={handlePaymentComplete}
        />

        {/* Phone Number Modal */}
        <AnimatePresence>
          {showPhoneModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowPhoneModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-100 rounded-full">
                      <Phone className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Phone Number Required
                      </h3>
                      <p className="text-sm text-gray-600">
                        Enter your phone number to proceed with payment
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPhoneModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g., +1234567890 or 08012345678"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be used for payment verification and saved for
                      future transactions
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                  <button
                    onClick={() => setShowPhoneModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePhoneSubmit}
                    disabled={!phoneNumber || phoneNumber.trim().length < 10}
                    className="btn btn-primary btn-md"
                  >
                    Continue Payment
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dispute Reason Modal */}
        <AnimatePresence>
          {showDisputeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowDisputeModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl w-full max-w-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Create Dispute
                      </h3>
                      <p className="text-sm text-gray-600">
                        Provide a detailed reason for this dispute
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDisputeModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dispute Reason *
                    </label>
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Please provide a detailed explanation of the issue. Include any relevant information that will help resolve the situation..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                      rows={6}
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        Minimum 10 characters required
                      </p>
                      <p
                        className={`text-xs ${
                          disputeReason.length >= 10
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        {disputeReason.length}/10
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800 mb-1">
                          Important Information
                        </h4>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          <li>
                            • Your dispute will be reviewed within 24-48 hours
                          </li>
                          <li>
                            • Both parties will be notified of the decision
                          </li>
                          <li>
                            • Provide as much detail as possible for a fair
                            resolution
                          </li>
                          <li>
                            • You may be contacted for additional information
                            if needed
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                  <button
                    onClick={() => setShowDisputeModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisputeSubmit}
                    disabled={
                      !disputeReason || disputeReason.trim().length < 10
                    }
                    className="btn btn-primary btn-md bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
                  >
                    Create Dispute
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Edit Terms Modal */}
          {showEditModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border-2 border-[#014d46]/10">
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Edit Agreement Terms</h3>
                    <button onClick={() => setShowEditModal(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-all"><X size={20} /></button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Total Amount (ETB)</label>
                      <input 
                        type="number" 
                        className="input h-14 rounded-2xl bg-gray-50"
                        value={editAmount}
                        onChange={(e) => setEditAmount(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Terms & Conditions</label>
                      <textarea 
                        rows={10}
                        className="w-full p-5 border-2 border-gray-100 rounded-2xl focus:border-[#014d46] outline-none transition-all"
                        value={editConditions}
                        onChange={(e) => setEditConditions(e.target.value)}
                      />
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 flex gap-3">
                      <AlertCircle className="text-yellow-600 shrink-0" size={18} />
                      <p className="text-[10px] text-yellow-800">Note: Changing terms will notify the counterparty. Terms become immutable once both parties lock the deal.</p>
                    </div>
                    <button 
                      onClick={handleEditSubmit}
                      disabled={isProcessing || !editConditions}
                      className="btn btn-primary w-full h-14 rounded-2xl font-black uppercase tracking-widest"
                    >
                      {isProcessing ? 'Updating...' : 'Update Terms'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Receipt Upload Modal */}
          {showReceiptModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border-2 border-[#014d46]/10">
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Verify Payment</h3>
                    <button onClick={() => setShowReceiptModal(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-all"><X size={20} /></button>
                  </div>

                  <div className="p-5 bg-[#e6f7f4] rounded-2xl border-2 border-[#ccefe8] space-y-2">
                    <p className="text-[10px] font-black text-[#014d46] uppercase tracking-widest">Target Bank Account (CBE)</p>
                    <div className="flex justify-between items-center font-mono text-sm">
                      <span className="text-[#02665c]">Account:</span>
                      <span className="font-bold text-[#014d46]">1000123456789</span>
                    </div>
                    <p className="text-[8px] text-[#02665c] opacity-70 italic">Please transfer exactly {formatCurrency(escrow!.amount)} before uploading.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Receipt URL / Reference</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Paste reference or image link..." 
                          className="input pl-12 h-14 rounded-2xl bg-gray-50"
                          value={receiptUrl}
                          onChange={(e) => setReceiptUrl(e.target.value)}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleUploadReceipt}
                      disabled={isProcessing || !receiptUrl}
                      className="btn btn-primary w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#014d46]/20"
                    >
                      {isProcessing ? 'Verifying...' : 'Submit Evidence'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* CBE Verification Modal */}
          {showCBEModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={() => setShowCBEModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border-2 border-[#014d46]/10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#e6f7f4] rounded-xl text-[#014d46]">
                        <Shield size={24} />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">CBE Direct Verify</h3>
                    </div>
                    <button onClick={() => setShowCBEModal(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-all"><X size={20} /></button>
                  </div>

                  <div className="p-5 bg-blue-50 rounded-2xl border-2 border-blue-100">
                    <p className="text-[11px] font-bold text-blue-900 leading-relaxed">
                      Enter the Transaction ID and the last 9 digits of your account number (or the receiver's) from your CBE receipt.
                    </p>
                    <div className="mt-3 p-3 bg-white/50 rounded-xl font-mono text-[10px] text-blue-800 border border-blue-100">
                      Example: <br/>
                      ID: FT26072JFV9 <br/>
                      Suffix: 262856058
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Transaction ID (Reference)</label>
                      <input 
                        type="text" 
                        placeholder="FT..." 
                        className="input h-14 rounded-2xl bg-gray-50 uppercase"
                        value={cbeTransactionId}
                        onChange={(e) => setCbeTransactionId(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Account Number Suffix (9 digits)</label>
                      <input 
                        type="text" 
                        placeholder="262..." 
                        className="input h-14 rounded-2xl bg-gray-50"
                        maxLength={9}
                        value={cbeAccountSuffix}
                        onChange={(e) => setCbeAccountSuffix(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handleCBEVerify}
                      disabled={isProcessing || !cbeTransactionId || !cbeAccountSuffix}
                      className="btn btn-primary w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#014d46]/20"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <RotateCcw className="animate-spin" size={18} />
                          Verifying...
                        </div>
                      ) : 'Verify & Fund'}
                    </button>
                    <p className="text-center text-[9px] text-gray-400 italic">Verified via CBE Direct API Infrastructure</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </Layout>
  );
};

export default EscrowDetails;
