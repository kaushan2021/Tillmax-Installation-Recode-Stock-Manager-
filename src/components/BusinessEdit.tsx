import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { Business } from '../types';
import { 
  ArrowLeft, 
  Save, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  User as UserIcon,
  RefreshCw,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const BusinessEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<Partial<Business>>({
    name: '',
    ownerName: '',
    telephone: '',
    contactNumber: '',
    email: '',
    address: '',
    postcode: ''
  });

  const isNew = !id;

  useEffect(() => {
    const fetchData = async () => {
      if (isNew) {
        setLoading(false);
        return;
      }
      if (!id || !profile) return;
      setLoading(true);
      try {
        const bDoc = await getDoc(doc(db, 'businesses', id));
        if (bDoc.exists()) {
          setBusiness({ id: bDoc.id, ...bDoc.data() } as Business);
        } else {
          toast.error("Business not found");
          navigate('/businesses');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `businesses/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, profile, navigate, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const data = {
        ...business,
        name_lowercase: business.name?.toLowerCase() || '',
        postcode_lowercase: business.postcode?.toLowerCase() || '',
        postcode_normalized: business.postcode?.replace(/\s+/g, '').toLowerCase() || '',
        updatedAt: new Date().toISOString()
      };
      
      if (isNew) {
        const docRef = await addDoc(collection(db, 'businesses'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `created business: ${business.name}`,
          timestamp: new Date().toISOString(),
        });
        toast.success('Business created successfully');
        navigate(`/businesses/${docRef.id}`);
      } else {
        const { id: _, ...updateData } = data as any;
        await updateDoc(doc(db, 'businesses', id!), updateData);
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `updated business: ${business.name}`,
          timestamp: new Date().toISOString(),
        });
        toast.success('Business updated successfully');
        navigate(`/businesses/${id}`);
      }
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, `businesses/${id || 'new'}`);
      toast.error('Failed to save business');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue mb-4"></div>
        <p className="text-slate-500 font-medium">Loading business details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isNew ? 'Add New Business' : (!isAdmin ? 'View Business Profile' : 'Edit Business Profile')}
            </h1>
            <p className="text-slate-500 font-medium">
              {isNew ? 'Create a new business profile.' : `Business: ${business.name}`}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        <div className="card p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Business Name</label>
              <input 
                required
                disabled={!isAdmin}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                value={business.name || ''}
                onChange={e => setBusiness({...business, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Owner Name</label>
              <input 
                required
                disabled={!isAdmin}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                value={business.ownerName || ''}
                onChange={e => setBusiness({...business, ownerName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</label>
              <input 
                required
                disabled={!isAdmin}
                type="email" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                value={business.email || ''}
                onChange={e => setBusiness({...business, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
              <input 
                required
                disabled={!isAdmin}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                value={business.contactNumber || business.telephone || ''}
                onChange={e => setBusiness({...business, contactNumber: e.target.value, telephone: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Address</label>
              <textarea 
                required
                disabled={!isAdmin}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                value={business.address || ''}
                onChange={e => setBusiness({...business, address: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Postcode</label>
              <input 
                required
                disabled={!isAdmin}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                value={business.postcode || ''}
                onChange={e => setBusiness({...business, postcode: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-6 flex items-center justify-end gap-4">
            <button 
              type="button"
              onClick={() => {
                if (id) {
                  navigate(`/businesses/${id}`);
                } else {
                  navigate('/businesses');
                }
              }}
              className="px-6 py-3 text-slate-500 font-bold hover:text-slate-900 transition-all"
            >
              Back
            </button>
            {isAdmin && (
              <button 
                type="submit"
                disabled={saving}
                className="btn-primary px-10 py-3 shadow-lg shadow-tillmax-blue/20 flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {saving ? 'Saving...' : isNew ? 'Add Business' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
