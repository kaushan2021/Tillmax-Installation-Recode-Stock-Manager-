import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, deleteDoc, addDoc, getDocs, limit, startAfter } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { Business, InstallationRecord } from '../types';
import { 
  ArrowLeft, 
  Edit2, 
  Plus, 
  Trash2, 
  MapPin, 
  Phone, 
  Mail, 
  User,
  AlertCircle,
  Calendar, 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  Clock,
  ExternalLink,
  Tag,
  Monitor,
  DollarSign,
  History as HistoryIcon,
  MessageSquare
} from 'lucide-react';
import { isAfter } from 'date-fns';
import { CommentModal } from './CommentModal';
import { cn, formatDate, parseDate } from '../lib/utils';

export const BusinessDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [records, setRecords] = useState<InstallationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [commentRecord, setCommentRecord] = useState<InstallationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  const fetchRecords = async (isNext = false) => {
    if (!id || !profile) return;
    if (isNext) setLoadingMore(true);
    else setLoading(true);

    try {
      let q = query(
        collection(db, 'installationRecords'), 
        where('businessId', '==', id),
        orderBy('installationDate', 'desc'),
        limit(PAGE_SIZE)
      );

      if (isNext && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const recordsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as InstallationRecord));
      
      if (isNext) {
        setRecords(prev => [...prev, ...recordsData]);
      } else {
        setRecords(recordsData);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'installationRecords');
      setError("Failed to load installation records.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!id || !profile) return;
    
    const fetchBusiness = async () => {
      try {
        const docRef = doc(db, 'businesses', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBusiness({ id: docSnap.id, ...docSnap.data() } as Business);
        } else {
          navigate('/businesses');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `businesses/${id}`);
        setError("Failed to load business details.");
      }
    };

    fetchBusiness();
    fetchRecords();
  }, [id, navigate, profile]);

  const [showDeleteBusinessConfirm, setShowDeleteBusinessConfirm] = useState(false);

  const handleDeleteBusiness = async () => {
    if (!isAdmin || !id || !business) return;
    try {
      await deleteDoc(doc(db, 'businesses', id));
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `deleted business: ${business.name}`,
        timestamp: new Date().toISOString(),
      });
      setShowDeleteBusinessConfirm(false);
      navigate('/businesses');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `businesses/${id}`);
    }
  };

  const [recordToDelete, setRecordToDelete] = useState<{ id: string, invoice: string } | null>(null);

  const handleDeleteRecord = async () => {
    if (!isAdmin || !recordToDelete) return;
    try {
      await deleteDoc(doc(db, 'installationRecords', recordToDelete.id));
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `deleted installation record: ${recordToDelete.invoice}`,
        timestamp: new Date().toISOString(),
      });
      setRecordToDelete(null);
      fetchRecords();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `installationRecords/${recordToDelete.id}`);
    }
  };

  if (loading || (!business && !error)) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div></div>;
  
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

  if (!business) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button onClick={() => navigate('/businesses')} className="flex items-center gap-2 text-slate-500 hover:text-tillmax-blue transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Businesses
        </button>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <button 
                onClick={() => setShowDeleteBusinessConfirm(true)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Delete Business"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <Link to={`/businesses/${id}/edit`} className="btn-secondary flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Business
              </Link>
            </>
          )}
          {isAdmin && (
            <Link to={`/records/new?businessId=${id}`} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Record
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Business Info Card */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <div className="bg-tillmax-blue p-6 text-white">
              <h2 className="text-2xl font-bold mb-1">{business.name}</h2>
              <p className="text-blue-100 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                {business.postcode}
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Owner</p>
                    <p className="text-slate-900 font-medium">{business.ownerName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</p>
                    <p className="text-slate-900 font-medium">{business.telephone}</p>
                    {business.contactNumber && <p className="text-slate-500 text-sm">{business.contactNumber}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p>
                    <p className="text-slate-900 font-medium break-all">{business.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</p>
                    <p className="text-slate-900 font-medium whitespace-pre-wrap">{business.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-tillmax-blue" />
            Instruction History
          </h3>

          {records.length === 0 && !loading ? (
            <div className="card p-20 text-center bg-slate-50 border-dashed">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No installation records found for this business.</p>
              <Link to={`/records/new?businessId=${id}`} className="text-tillmax-blue font-bold mt-2 inline-block hover:underline">
                Create the first record
              </Link>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Install Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Support</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Comments</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {records.map(record => {
                      const isSupportActive = record.supportEndDate && isAfter(parseDate(record.supportEndDate), new Date());
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 font-mono text-sm text-slate-600">
                            {record.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(record.installationDate)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                              isSupportActive ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                            )}>
                              {isSupportActive ? 'Active' : 'Expired'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setCommentRecord(record)}
                              className="flex items-center gap-1.5 text-tillmax-blue hover:text-tillmax-blue/80 font-bold text-xs uppercase tracking-widest transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {record.comments ? 'View Comments' : 'Add Comment'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-sm font-bold",
                                record.paymentStatus === 'Payment cleared' ? "text-emerald-600" : "text-tillmax-red"
                              )}>
                                {record.paymentStatus}
                              </span>
                              {record.paymentStatus === 'Payment due' && (
                                <span className="text-[10px] font-bold text-slate-400">£{record.paymentDueAmount}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isAdmin && (
                                <button 
                                  onClick={() => setRecordToDelete({ id: record.id!, invoice: record.invoiceNumber })}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <Link to={`/records/${record.id}/edit`} className="p-2 text-slate-300 hover:text-tillmax-blue transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div className="p-4 border-t border-slate-100 flex justify-center">
                  <button
                    onClick={() => fetchRecords(true)}
                    disabled={loadingMore}
                    className="px-6 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Records'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CommentModal 
        isOpen={!!commentRecord}
        onClose={() => setCommentRecord(null)}
        record={commentRecord}
        onUpdate={() => {
          fetchRecords();
        }}
      />

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Record?</h3>
            <p className="text-slate-600 mb-8">
              Are you sure you want to delete record <span className="font-bold text-slate-900">{recordToDelete.invoice}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setRecordToDelete(null)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteRecord}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Business Confirmation Modal */}
      {showDeleteBusinessConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Business?</h3>
            <p className="text-slate-600 mb-8">
              Are you sure you want to delete <span className="font-bold text-slate-900">{business.name}</span>? This will NOT delete its installation records, but the business profile will be removed.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteBusinessConfirm(false)}
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
          </div>
        </div>
      )}
    </div>
  );
};
