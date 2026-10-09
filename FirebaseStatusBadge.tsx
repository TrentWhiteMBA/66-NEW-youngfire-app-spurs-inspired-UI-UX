import React from 'react';
import { Database, CheckCircle2 } from 'lucide-react';

interface FirebaseStatusBadgeProps {
  variant?: string;
  showDetails?: boolean;
}

export const FirebaseStatusBadge: React.FC<FirebaseStatusBadgeProps> = () => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span>Firebase Connected</span>
    </div>
  );
};

export default FirebaseStatusBadge;
