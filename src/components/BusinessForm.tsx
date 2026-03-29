import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { Business } from '../types';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const BusinessForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Business>>({
    name: '',
    ownerName: '',
    telephone: '',
    contactNumber: '',
    email: '',
    address: '',
    postcode: '',
  });

  useEffect(() => {
    if (id && id !== 'new') {
      const fetchBusiness = async () => {
        setInitialLoading(true);
        try {
          const docRef = doc(db, 'businesses', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setFormData(docSnap.data() as Business);
          } else {
            navigate('/businesses');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `businesses/${id}`);
          setError("Failed to load business details.");
        } finally {
          setInitialLoading(false);
        }
      };
      fetchBusiness();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        name_lowercase: formData.name?.toLowerCase(),
        postcode_lowercase: formData.postcode?.toLowerCase(),
        postcode_normalized: formData.postcode?.toLowerCase().replace(/\s+/g, ''),
        updatedAt: serverTimestamp(),
      };

      if (id && id !== 'new') {
        await updateDoc(doc(db, 'businesses', id), data);
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `updated business: ${formData.name}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        const docRef = await addDoc(collection(db, 'businesses'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `created business: ${formData.name}`,
          timestamp: new Date().toISOString(),
        });
        navigate(`/businesses/${docRef.id}`);
        return;
      }
      navigate(-1);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'businesses');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div></div>;

  if (error) {
    return (
      <div className="p-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-tillmax-blue font-bold hover:underline">
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-tillmax-blue mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="card p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">{id === 'new' ? 'Add New Business' : 'Edit Business'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Business Name *</label>
              <input 
                required
                type="text" 
                className="input-field" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Postcode *</label>
              <input 
                required
                type="text" 
                className="input-field" 
                value={formData.postcode}
                onChange={e => setFormData({...formData, postcode: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Owner Name</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.ownerName}
                onChange={e => setFormData({...formData, ownerName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <input 
                type="email" 
                className="input-field" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Shop Telephone</label>
              <input 
                type="tel" 
                className="input-field" 
                value={formData.telephone}
                onChange={e => setFormData({...formData, telephone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Owner Contact Number</label>
              <input 
                type="tel" 
                className="input-field" 
                value={formData.contactNumber}
                onChange={e => setFormData({...formData, contactNumber: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Business Address</label>
            <textarea 
              rows={3}
              className="input-field" 
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button 
              disabled={loading}
              type="submit" 
              className="btn-primary flex items-center gap-2 px-8"
            >
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
              {id === 'new' ? 'Create Business' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
