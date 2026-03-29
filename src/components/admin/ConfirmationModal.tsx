import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isProcessing?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isProcessing = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className={clsx(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
              type === 'danger' ? "bg-red-100 text-red-600 shadow-red-100" : 
              type === 'warning' ? "bg-amber-100 text-amber-600 shadow-amber-100" :
              "bg-blue-100 text-blue-600 shadow-blue-100"
            )}>
              <AlertTriangle className="w-7 h-7" />
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <p className="text-slate-500 leading-relaxed">{message}</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-6 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-2xl transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className={clsx(
                "flex-1 px-6 py-3 text-white font-bold rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                type === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-200" :
                type === 'warning' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" :
                "bg-tillmax-blue hover:bg-tillmax-blue/90 shadow-tillmax-blue/20"
              )}
            >
              {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
