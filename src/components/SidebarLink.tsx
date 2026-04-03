import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon: Icon, label, active, onClick }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all group",
        active 
          ? "bg-tillmax-blue text-white shadow-md shadow-tillmax-blue/20"
          : "text-slate-500 hover:bg-slate-50 hover:text-tillmax-blue"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-white" : "text-slate-400 group-hover:text-tillmax-blue")} />
      {label}
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </Link>
  );
};

export default SidebarLink;
