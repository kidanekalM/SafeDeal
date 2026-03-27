import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Shield, Zap, Award, CheckCircle } from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon: any;
}

const steps: Step[] = [
  {
    title: "Welcome to SafeDeal!",
    description: "Your secure gateway to trust-based transactions is now active. We use blockchain to ensure transparency and trust in every deal.",
    icon: Shield,
  },
  {
    title: "Start a New Deal",
    description: "Ready to trade? Click 'Start New Deal' to create a secure escrow. You can choose between a Quick Escrow or a detailed project with milestones.",
    icon: Zap,
  },
  {
    title: "Build Your Trust Score",
    description: "Complete deals successfully to increase your Trust Score. Higher scores unlock lower platform fees and build your reputation as a verified professional.",
    icon: Award,
  }
];

const GuidedTour = () => {
  useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("has_seen_tour");
    if (!hasSeenTour) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("has_seen_tour", "true");
  };

  if (!isVisible) return null;

  const StepIcon = steps[currentStep].icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border-2 border-[#014d46]/10 relative"
        >
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-all z-10"
          >
            <X size={20} />
          </button>

          <div className="p-8 sm:p-10 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <motion.div
                key={currentStep}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-[#e6f7f4] rounded-[2rem] flex items-center justify-center text-[#014d46]"
              >
                <StepIcon size={40} />
              </motion.div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  {steps[currentStep].title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {steps[currentStep].description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 pt-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-8 bg-[#014d46]" : "w-2 bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleClose}
                className="flex-1 py-4 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="flex-[2] py-4 bg-[#014d46] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#014d46]/20 flex items-center justify-center gap-2 group"
              >
                {currentStep === steps.length - 1 ? (
                  <>Get Started <CheckCircle size={18} /></>
                ) : (
                  <>Next Step <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GuidedTour;
