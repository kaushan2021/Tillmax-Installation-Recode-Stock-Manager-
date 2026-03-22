import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { Business, InstructionRecord } from '../types';
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
  History as HistoryIcon
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BusinessDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [records, setRecords] = useState<InstructionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setLoading(false);
      }
    };

    const q = query(
      collection(db, 'instructionRecords'), 
      where('businessId', '==', id),
      orderBy('installationDate', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstructionRecord)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'instructionRecords');
      setError("Failed to load instruction records.");
      setLoading(false);
    });

    fetchBusiness();
    return () => unsubscribe();
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
      await deleteDoc(doc(db, 'instructionRecords', recordToDelete.id));
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `deleted instruction record: ${recordToDelete.invoice}`,
        timestamp: new Date().toISOString(),
      });
      setRecordToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `instructionRecords/${recordToDelete.id}`);
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

          {records.length === 0 ? (
            <div className="card p-20 text-center bg-slate-50 border-dashed">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No instruction records found for this business.</p>
              <Link to={`/records/new?businessId=${id}`} className="text-tillmax-blue font-bold mt-2 inline-block hover:underline">
                Create the first record
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {records.map(record => {
                const isSupportActive = record.supportEndDate && isAfter(parseISO(record.supportEndDate), new Date());
                
                return (
                  <div key={record.id} className="card group">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                          isSupportActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                          {isSupportActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          Support {isSupportActive ? 'Active' : 'Expired'}
                        </div>
                        <span className="text-slate-400 font-mono text-sm">Inv: {record.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button 
                            onClick={() => setRecordToDelete({ id: record.id!, invoice: record.invoiceNumber })}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <Link to={`/records/${record.id}/edit`} className="p-2 text-slate-400 hover:text-tillmax-blue transition-colors opacity-0 group-hover:opacity-100">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Installation Date</p>
                              <p className="font-medium text-slate-900">
                                {(() => {
                                  try {
                                    return record.installationDate ? format(parseISO(record.installationDate), 'MMMM d, yyyy') : 'N/A';
                                  } catch (e) {
                                    return 'Invalid Date';
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-slate-400" />
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Support Period</p>
                              <p className="font-medium text-slate-900">
                                {(() => {
                                  try {
                                    const start = record.supportStartDate ? format(parseISO(record.supportStartDate), 'MMM yyyy') : 'N/A';
                                    const end = record.supportEndDate ? format(parseISO(record.supportEndDate), 'MMM yyyy') : 'N/A';
                                    return `${start} - ${end}`;
                                  } catch (e) {
                                    return 'Invalid Period';
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Monitor className="w-5 h-5 text-slate-400" />
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Software</p>
                              <p className="font-medium text-slate-900">{record.softwareType}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <DollarSign className="w-5 h-5 text-slate-400" />
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Payment Status</p>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-bold",
                                  record.paymentStatus === 'Payment cleared' ? "text-emerald-600" : "text-tillmax-red"
                                )}>
                                  {record.paymentStatus}
                                </span>
                                {record.paymentStatus === 'Payment due' && (
                                  <span className="text-slate-500 text-sm font-bold">(£{record.paymentDueAmount})</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-slate-400" />
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Staff</p>
                              <p className="font-medium text-slate-900">
                                Sales: {record.salesPerson} | Eng: {record.engineer}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {record.equipment && record.equipment.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-3">Equipment</p>
                          <div className="flex flex-wrap gap-2">
                            {record.equipment.map((eq, i) => (
                              <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-medium">
                                {eq.quantity}x {eq.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(record.licenseNumbers?.length > 0 || record.teamViewerIds?.length > 0) && (
                        <div className="mt-4 flex flex-wrap gap-4">
                          {record.licenseNumbers?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Licenses</p>
                              <div className="flex flex-wrap gap-1">
                                {record.licenseNumbers.map((lic, i) => (
                                  <span key={i} className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100 text-[10px] font-mono">
                                    {lic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {record.teamViewerIds?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">TeamViewer</p>
                              <div className="flex flex-wrap gap-1">
                                {record.teamViewerIds.map((tv, i) => (
                                  <span key={i} className="bg-blue-50 text-tillmax-blue px-2 py-0.5 rounded border border-blue-100 text-[10px] font-mono">
                                    {tv}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {record.renewalInformed && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-tillmax-blue" />
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Renewal Informed</p>
                              <p className="text-sm font-medium text-slate-700">
                                Via {record.renewalInformedMethod} on {record.renewalInformedDate ? format(parseISO(record.renewalInformedDate), 'MMM d, yyyy') : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      )}

                      {record.comments && (
                        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-900 text-sm italic">
                          "{record.comments}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
              Are you sure you want to delete <span className="font-bold text-slate-900">{business.name}</span>? This will NOT delete its instruction records, but the business profile will be removed.
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
