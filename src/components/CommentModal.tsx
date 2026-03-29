import React, { useState, useEffect } from 'react';
import { X, Save, MessageSquare, AlertCircle } from 'lucide-react';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { InstallationRecord } from '../types';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: InstallationRecord | null;
  onUpdate: () => void;
}

export const CommentModal = ({ isOpen, onClose, record, onUpdate }: CommentModalProps) => {
  const { profile } = useAuth();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setComment(record.comments || '');
      setError(null);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const recordRef = doc(db, 'installationRecords', record.id!);
      await updateDoc(recordRef, {
        comments: comment,
        updatedAt: serverTimestamp()
      });

      // Log the action
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid || 'unknown',
        username: profile?.username || 'unknown',
        action: `updated comments for installation record: ${record.invoiceNumber || 'N/A'}`,
        timestamp: new Date().toISOString(),
      });

      onUpdate();
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `installationRecords/${record.id}`);
      setError('Failed to update comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-tillmax-blue" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Record Comments</h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Invoice: {record.invoiceNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Comments</label>
            <textarea 
              rows={6}
              className="input-field w-full resize-none" 
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Enter record comments here..."
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2 px-6 py-3 shadow-lg shadow-tillmax-blue/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
