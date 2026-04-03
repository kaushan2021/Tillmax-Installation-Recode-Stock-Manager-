import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  RefreshCw, 
  Package, 
  ChevronRight, 
  Trash2 
} from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs, startAfter, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { Business } from '../types';
import { formatDate, cn } from '../lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader } from './PageHeader';

const BusinessManagement: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [postcodeSearch, setPostcodeSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();

  const PAGE_SIZE = 20;

  const fetchBusinesses = async (isNext = false) => {
    if (!profile) return;
    if (isNext) setLoadingMore(true);
    else setLoading(true);

    try {
      let q;
      if (search) {
        const s = search.toLowerCase();
        q = query(
          collection(db, 'businesses'),
          where('name_lowercase', '>=', s),
          where('name_lowercase', '<=', s + '\uf8ff'),
          orderBy('name_lowercase'),
          limit(PAGE_SIZE)
        );
      } else if (postcodeSearch) {
        const s = postcodeSearch.toLowerCase().replace(/\s+/g, '');
        q = query(
          collection(db, 'businesses'),
          where('postcode_normalized', '>=', s),
          where('postcode_normalized', '<=', s + '\uf8ff'),
          orderBy('postcode_normalized'),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'businesses'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      if (isNext && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newBusinesses = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Business));
      
      if (isNext) {
        setBusinesses(prev => [...prev, ...newBusinesses]);
      } else {
        setBusinesses(newBusinesses);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'businesses');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBusinesses();
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [search, postcodeSearch, profile]);

  const [businessToDelete, setBusinessToDelete] = useState<{ id: string, name: string } | null>(null);

  const handleDeleteBusiness = async () => {
    if (!isAdmin || !businessToDelete) return;
    try {
      await deleteDoc(doc(db, 'businesses', businessToDelete.id));
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `deleted business: ${businessToDelete.name}`,
        timestamp: new Date().toISOString(),
      });
      setBusinessToDelete(null);
      fetchBusinesses(); // Refresh list
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `businesses/${businessToDelete.id}`);
    }
  };

  const filtered = businesses.filter(b => {
    if (!search && !postcodeSearch) return true;
    const s = search.toLowerCase().replace(/\s+/g, '');
    const p = postcodeSearch.toLowerCase().replace(/\s+/g, '');
    const bName = (b.name || '').toLowerCase().replace(/\s+/g, '');
    const bPostcode = (b.postcode || '').toLowerCase().replace(/\s+/g, '');
    return (
      (search && bName.includes(s)) ||
      (postcodeSearch && bPostcode.includes(p))
    );
  });

  return (
    <div>
      <PageHeader 
        title="Businesses" 
        subtitle="Manage your customer business profiles."
        action={isAdmin && (
          <Link to="/businesses/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Business
          </Link>
        )}
      />

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="card p-4 flex-1 flex items-center gap-3 relative">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by business name..." 
            className="flex-1 outline-none text-slate-900"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPostcodeSearch('');
            }}
          />
          {loading && search && (
            <RefreshCw className="w-4 h-4 text-tillmax-blue animate-spin absolute right-4" />
          )}
        </div>
        <div className="card p-4 flex-1 flex items-center gap-3 relative">
          <MapPin className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by postcode..." 
            className="flex-1 outline-none text-slate-900"
            value={postcodeSearch}
            onChange={(e) => {
              setPostcodeSearch(e.target.value);
              setSearch('');
            }}
          />
          {loading && postcodeSearch && (
            <RefreshCw className="w-4 h-4 text-tillmax-blue animate-spin absolute right-4" />
          )}
        </div>
      </div>

      {loading && businesses.length === 0 ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Business Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Postcode</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Telephone</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(business => (
                  <tr 
                    key={business.id} 
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/businesses/${business.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:bg-tillmax-blue group-hover:text-white transition-colors">
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900">{business.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {business.postcode}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {business.ownerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {business.telephone}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(business.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setBusinessToDelete({ id: business.id!, name: business.name });
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            title="Delete Business"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-tillmax-blue group-hover:translate-x-1 transition-all" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-20 text-center bg-slate-50 border-dashed border-t border-slate-100">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No businesses found matching your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="mt-12 flex justify-center">
          <button 
            onClick={() => fetchBusinesses(true)}
            disabled={loadingMore}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loadingMore ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {loadingMore ? 'Loading...' : 'Load More Businesses'}
          </button>
        </div>
      )}

      {/* Delete Business Confirmation Modal */}
      <AnimatePresence>
        {businessToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Business?</h3>
              <p className="text-slate-600 mb-8">
                Are you sure you want to delete <span className="font-bold text-slate-900">{businessToDelete.name}</span>? This will NOT delete its installation records, but the business profile will be removed.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setBusinessToDelete(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteBusiness}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BusinessManagement;
