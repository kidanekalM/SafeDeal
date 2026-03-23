import { ShieldCheck } from "lucide-react";

interface VerifiedBadgeProps {
  isVerified: boolean;
  className?: string;
}

const VerifiedBadge = ({ isVerified, className = "" }: VerifiedBadgeProps) => {
  if (!isVerified) return null;

  return (
    <div className={`inline-flex items-center gap-1 text-[#014d46] ${className}`} title="Verified User">
      <ShieldCheck size={16} fill="currentColor" className="text-white" />
      <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
    </div>
  );
};

export default VerifiedBadge;
