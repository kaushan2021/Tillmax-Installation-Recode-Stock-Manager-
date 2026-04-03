import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { Business, InstallationRecord } from '../types';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  User as UserIcon,
  Calendar,
  FileText,
  Plus,
  ChevronRight,
  Clock,
  AlertCircle,
  Eye
} from 'lucide-react';
import { formatDate, cn, parseDate } from '../lib/utils';
import { toast } from 'sonner';
import { isAfter } from 'date-fns';

export const BusinessDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [records, setRecords] = useState<InstallationRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !profile) return;
      setLoading(true);
      try {
        const bDoc = await getDoc(doc(db, 'businesses', id));
        if (bDoc.exists()) {
          setBusiness({ id: bDoc.id, ...bDoc.data() } as Business);
          
          // Fetch installation records for this business
          const rQuery = query(
            collection(db, 'installationRecords'), 
            where('businessId', '==', id),
            orderBy('installationDate', 'desc')
          );
          const rSnap = await getDocs(rQuery);
          setRecords(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as InstallationRecord)));
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
  }, [id, profile, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue mb-4"></div>
        <p className="text-slate-500 font-medium">Loading business details...</p>
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/businesses')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{business.name}</h1>
            <p className="text-slate-500 font-medium">Business Profile</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <Link 
                to={`/records/new?businessId=${id}`}
                className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                New Installation
              </Link>
              <Link 
                to={`/businesses/${id}/edit`}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-8">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-tillmax-blue mb-6">
              <Building2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-6">Contact Information</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Owner / Contact</p>
                  <p className="font-bold text-slate-900">{business.ownerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telephone</p>
                  <p className="font-bold text-slate-900">{business.telephone}</p>
                  {business.contactNumber && (
                    <p className="text-sm text-slate-500">{business.contactNumber}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                  <p className="font-bold text-slate-900 truncate">{business.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                  <p className="font-bold text-slate-900 leading-relaxed">{business.address}</p>
                  <p className="font-black text-tillmax-blue mt-1">{business.postcode}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Installation History</h3>
              <div className="flex items-center gap-4">
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                  {records.length} Records
                </span>
                {isAdmin && (
                  <Link 
                    to={`/records/new?businessId=${id}`}
                    className="text-tillmax-blue font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add New
                  </Link>
                )}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {records.length === 0 ? (
                <div className="p-20 text-center text-slate-400 italic">
                  No installation records found for this business.
                </div>
              ) : (
                records.map(record => {
                  const isSupportActive = record.supportEndDate && isAfter(parseDate(record.supportEndDate), new Date());
                  return (
                    <div key={record.id} className="p-8 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-black text-slate-900">Inv: #{record.invoiceNumber}</p>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                              isSupportActive ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                            )}>
                              {isSupportActive ? 'Active' : 'Expired'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(record.installationDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Ends: {formatDate(record.supportEndDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                          <p className="text-sm font-bold text-slate-900">{record.softwareType}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{record.paymentStatus}</p>
                        </div>
                        <Link 
                          to={`/records/${record.id}/edit`}
                          className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-tillmax-blue hover:border-tillmax-blue transition-all group/btn"
                          title={isAdmin ? "Edit Record" : "View Record"}
                        >
                          {isAdmin ? <Edit2 className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
