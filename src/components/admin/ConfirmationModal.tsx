import React from 'react';
import { AlertTriangle, X, Trash2, Info, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'success';
  isProcessing?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isProcessing = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'info': return <Info className="w-6 h-6 text-blue-600" />;
      case 'success': return <CheckCircle className="w-6 h-6 text-emerald-600" />;
      default: return <AlertTriangle className="w-6 h-6 text-rose-600" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'info': return "bg-blue-600 hover:bg-blue-700";
      case 'success': return "bg-emerald-600 hover:bg-emerald-700";
      default: return "bg-rose-600 hover:bg-rose-700";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
            type === 'info' ? "bg-blue-50" : type === 'success' ? "bg-emerald-50" : "bg-rose-50"
          )}>
            {getIcon()}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 text-sm">{message}</p>
        </div>

        <div className="p-6 bg-slate-50 flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2 px-4 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={cn(
              "flex-1 py-2 px-4 text-white rounded-lg font-medium transition-all disabled:opacity-50",
              getColors()
            )}
          >
            {isProcessing ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
