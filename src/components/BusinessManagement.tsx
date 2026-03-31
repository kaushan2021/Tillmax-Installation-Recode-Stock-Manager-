import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  MoreVertical, 
  Phone, 
  Mail, 
  MapPin, 
  ChevronRight,
  X,
  Check,
  Trash2,
  Edit2
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Business } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const BusinessManagement: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [formData, setFormData] = useState<Partial<Business>>({
    name: '',
    ownerName: '',
    telephone: '',
    contactNumber: '',
    email: '',
    address: '',
    postcode: ''
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'businesses'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
      setBusinesses(list);
    } catch (error) {
      console.error('Error fetching businesses', error);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (business: Business | null = null) => {
    if (business) {
      setEditingBusiness(business);
      setFormData(business);
    } else {
      setEditingBusiness(null);
      setFormData({
        name: '',
        ownerName: '',
        telephone: '',
        contactNumber: '',
        email: '',
        address: '',
        postcode: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        name_lowercase: formData.name?.toLowerCase(),
        postcode_lowercase: formData.postcode?.toLowerCase(),
        postcode_normalized: formData.postcode?.replace(/\s+/g, '').toLowerCase(),
        updatedAt: new Date().toISOString()
      };

      if (editingBusiness) {
        await updateDoc(doc(db, 'businesses', editingBusiness.id!), data);
        toast.success('Business updated successfully');
      } else {
        await addDoc(collection(db, 'businesses'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        toast.success('Business added successfully');
      }
      setIsModalOpen(false);
      fetchBusinesses();
    } catch (error) {
      console.error('Error saving business', error);
      toast.error('Failed to save business');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this business? This will not delete associated installation records.')) return;
    try {
      await deleteDoc(doc(db, 'businesses', id));
      toast.success('Business deleted');
      fetchBusinesses();
    } catch (error) {
      console.error('Error deleting business', error);
      toast.error('Failed to delete business');
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.postcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Businesses</h1>
          <p className="text-slate-500 font-medium">Manage your client businesses and contact information.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-tillmax-blue/20"
        >
          <Plus className="w-5 h-5" />
          Add Business
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, postcode, or email..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-tillmax-blue focus:border-tillmax-blue transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredBusinesses.map((business, index) => (
              <motion.div
                key={business.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-tillmax-blue group-hover:bg-tillmax-blue group-hover:text-white transition-all duration-500">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenModal(business)}
                      className="p-2 text-slate-400 hover:text-tillmax-blue hover:bg-slate-50 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(business.id!)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-tillmax-blue transition-colors">{business.name}</h3>
                <p className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">{business.ownerName}</p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{business.contactNumber || business.telephone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="font-medium truncate">{business.email}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="font-medium leading-relaxed">
                      {business.address}, {business.postcode}
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Added {formatDate(business.createdAt)}</span>
                  <button className="text-tillmax-blue font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                    View Details <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredBusinesses.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-900 mb-2">No businesses found</h3>
              <p className="text-slate-500 font-medium">Try adjusting your search or add a new business.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingBusiness ? 'Edit Business' : 'Add New Business'}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium">Enter the business details below.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Business Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Owner Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                      value={formData.ownerName}
                      onChange={e => setFormData({...formData, ownerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                      value={formData.contactNumber}
                      onChange={e => setFormData({...formData, contactNumber: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Address</label>
                    <textarea 
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold resize-none"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Postcode</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                      value={formData.postcode}
                      onChange={e => setFormData({...formData, postcode: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-end gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-slate-500 font-bold hover:text-slate-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary px-10 py-3 shadow-lg shadow-tillmax-blue/20 flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {editingBusiness ? 'Save Changes' : 'Add Business'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BusinessManagement;
