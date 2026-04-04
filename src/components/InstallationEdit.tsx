import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc,
  query, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  where,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { InstallationRecord, Business, Equipment, SimpleEntity } from '../types';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  ClipboardList, 
  Building2, 
  Info, 
  HardDrive, 
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const InstallationEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [record, setRecord] = useState<Partial<InstallationRecord>>({
    supportType: 'Online and telephone support',
    supportStatus: 'Active',
    supportStartDate: new Date().toISOString().split('T')[0],
    supportEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    installationDate: new Date().toISOString().split('T')[0],
    equipment: [],
    paymentAmount: 0,
    vatStatus: 'Inc VAT',
    paymentStatus: 'Payment cleared',
    paymentDueAmount: 0,
    licenseNumbers: [],
    teamViewerIds: [],
  });
  const [softwareTypes, setSoftwareTypes] = useState<SimpleEntity[]>([]);
  const [salesPeople, setSalesPeople] = useState<SimpleEntity[]>([]);
  const [engineers, setEngineers] = useState<SimpleEntity[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<SimpleEntity[]>([]);
  const [businessSearch, setBusinessSearch] = useState('');
  const [isSearchingBusinesses, setIsSearchingBusinesses] = useState(false);
  const [showBusinessResults, setShowBusinessResults] = useState(false);

  useEffect(() => {
    const unsubSoftware = onSnapshot(query(collection(db, 'softwareTypes'), orderBy('name')), (snap) => {
      setSoftwareTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimpleEntity)));
    });
    const unsubSales = onSnapshot(query(collection(db, 'salesPeople'), orderBy('name')), (snap) => {
      setSalesPeople(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimpleEntity)));
    });
    const unsubEngineers = onSnapshot(query(collection(db, 'engineers'), orderBy('name')), (snap) => {
      setEngineers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimpleEntity)));
    });
    const unsubEquipment = onSnapshot(query(collection(db, 'equipmentTypes'), orderBy('name')), (snap) => {
      setEquipmentTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimpleEntity)));
    });

    return () => {
      unsubSoftware();
      unsubSales();
      unsubEngineers();
      unsubEquipment();
    };
  }, []);

  // Server-side business search
  useEffect(() => {
    if (businessSearch.length < 2) {
      setBusinesses([]);
      setShowBusinessResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingBusinesses(true);
      try {
        const s = businessSearch.toLowerCase();
        const q = query(
          collection(db, 'businesses'),
          where('name_lowercase', '>=', s),
          where('name_lowercase', '<=', s + '\uf8ff'),
          limit(10)
        );
        const snap = await getDocs(q);
        setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Business)));
        setShowBusinessResults(true);
      } catch (error) {
        console.error("Error searching businesses:", error);
      } finally {
        setIsSearchingBusinesses(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [businessSearch]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      if (!id || id === 'new') {
        const businessId = searchParams.get('businessId');
        if (businessId) {
          try {
            const bDoc = await getDoc(doc(db, 'businesses', businessId));
            if (bDoc.exists()) {
              const bData = bDoc.data() as Business;
              setRecord(prev => ({ 
                ...prev, 
                businessId, 
                businessName: bData.name,
                postcode: bData.postcode || ''
              }));
            }
          } catch (err) {
            console.warn("Failed to fetch business for new record:", err);
          }
        }
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch record
        const recordDoc = await getDoc(doc(db, 'installationRecords', id));
        if (recordDoc.exists()) {
          setRecord({ id: recordDoc.id, ...recordDoc.data() } as InstallationRecord);
        } else {
          toast.error("Record not found");
          navigate('/records');
          return;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `installationRecords/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, profile, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const business = businesses.find(b => b.id === record.businessId);
      const data = {
        ...record,
        businessName: business?.name || record.businessName || '',
        businessName_lowercase: (business?.name || record.businessName || '').toLowerCase(),
        postcode: business?.postcode || record.postcode || '',
        postcode_normalized: (business?.postcode || record.postcode || '').replace(/\s+/g, '').toLowerCase(),
        updatedAt: new Date().toISOString(),
        // Ensure lowercase fields for search
        invoiceNumber_lowercase: record.invoiceNumber?.toLowerCase() || '',
      };
      
      if (id && id !== 'new') {
        // Remove id from data before update
        const { id: _, ...updateData } = data as any;
        await updateDoc(doc(db, 'installationRecords', id), updateData);
        
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `updated installation record: ${record.invoiceNumber}`,
          timestamp: new Date().toISOString(),
        });
        toast.success('Record updated successfully');
      } else {
        await addDoc(collection(db, 'installationRecords'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `created installation record: ${record.invoiceNumber}`,
          timestamp: new Date().toISOString(),
        });
        toast.success('Record created successfully');
      }
      
      navigate('/records');
    } catch (error) {
      handleFirestoreError(error, id && id !== 'new' ? OperationType.UPDATE : OperationType.CREATE, `installationRecords/${id}`);
      toast.error('Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const addEquipment = () => {
    setRecord({
      ...record,
      equipment: [...(record.equipment || []), { name: '', quantity: 1 }]
    });
  };

  const removeEquipment = (index: number) => {
    const newEquipment = [...(record.equipment || [])];
    newEquipment.splice(index, 1);
    setRecord({ ...record, equipment: newEquipment });
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: any) => {
    const newEquipment = [...(record.equipment || [])];
    newEquipment[index] = { ...newEquipment[index], [field]: value };
    setRecord({ ...record, equipment: newEquipment });
  };

  const addLicenseNumber = () => {
    setRecord({ ...record, licenseNumbers: [...(record.licenseNumbers || []), ''] });
  };

  const removeLicenseNumber = (index: number) => {
    const newList = [...(record.licenseNumbers || [])];
    newList.splice(index, 1);
    setRecord({ ...record, licenseNumbers: newList });
  };

  const updateLicenseNumber = (index: number, value: string) => {
    const newList = [...(record.licenseNumbers || [])];
    newList[index] = value;
    setRecord({ ...record, licenseNumbers: newList });
  };

  const addTeamViewerId = () => {
    setRecord({ ...record, teamViewerIds: [...(record.teamViewerIds || []), ''] });
  };

  const removeTeamViewerId = (index: number) => {
    const newList = [...(record.teamViewerIds || [])];
    newList.splice(index, 1);
    setRecord({ ...record, teamViewerIds: newList });
  };

  const updateTeamViewerId = (index: number, value: string) => {
    const newList = [...(record.teamViewerIds || [])];
    newList[index] = value;
    setRecord({ ...record, teamViewerIds: newList });
  };

  const SearchableSelect: React.FC<{
    value: string;
    options: SimpleEntity[];
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
  }> = ({ value, options, onChange, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
      opt.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="relative" ref={containerRef}>
        <div 
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-between w-full px-4 py-2 bg-transparent border-none focus:ring-0 font-bold text-slate-900",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          )}
        >
          <span className={cn(!value && "text-slate-400 font-medium")}>
            {value || placeholder}
          </span>
          {!disabled && <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />}
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search..."
                  className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm font-bold"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="p-1 hover:bg-slate-100 rounded-lg">
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.name);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all",
                        value === opt.name ? "bg-tillmax-blue text-white" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      {opt.name}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs font-bold italic">
                    No matching equipment found
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue mb-4"></div>
        <p className="text-slate-500 font-medium">Loading record details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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
              {id === 'new' ? 'New Installation' : (!isAdmin ? 'View Installation' : 'Edit Installation')}
            </h1>
            <p className="text-slate-500 font-medium">
              {id === 'new' ? 'Create a new technical record' : `Record: ${record.invoiceNumber}`}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        <div className="card p-8 space-y-10">
          {/* Section: Basic Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-tillmax-blue" />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Business & Billing</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Business Name</label>
                {id === 'new' ? (
                  <div className="relative">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-tillmax-blue transition-all">
                      <Search className="w-5 h-5 text-slate-400 mr-3" />
                      <input 
                        type="text" 
                        placeholder="Search business by name..."
                        className="flex-1 bg-transparent outline-none font-bold text-slate-900"
                        value={record.businessName || businessSearch}
                        onChange={(e) => {
                          setBusinessSearch(e.target.value);
                          if (record.businessId) {
                            setRecord({ ...record, businessId: undefined, businessName: undefined, postcode: undefined });
                          }
                        }}
                        onFocus={() => setShowBusinessResults(true)}
                      />
                      {isSearchingBusinesses && <RefreshCw className="w-4 h-4 text-tillmax-blue animate-spin" />}
                    </div>

                    <AnimatePresence>
                      {showBusinessResults && (businessSearch.length >= 2 || businesses.length > 0) && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto"
                        >
                          {isSearchingBusinesses ? (
                            <div className="p-4 text-center text-slate-400 text-xs font-bold">Searching...</div>
                          ) : businesses.length > 0 ? (
                            businesses.map(b => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setRecord({ ...record, businessId: b.id, businessName: b.name, postcode: b.postcode });
                                  setBusinessSearch(b.name);
                                  setShowBusinessResults(false);
                                }}
                                className="w-full p-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                              >
                                <p className="font-bold text-slate-900">{b.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{b.postcode}</p>
                              </button>
                            ))
                          ) : businessSearch.length >= 2 && (
                            <div className="p-4 text-center text-slate-400 text-xs font-bold">No businesses found</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <input 
                    disabled
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-bold text-slate-500 cursor-not-allowed"
                    value={record.businessName || ''}
                  />
                )}
                {id !== 'new' && <p className="text-[10px] text-slate-400 font-bold">Business cannot be changed once record is created.</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Invoice Number</label>
                <input 
                  required
                  disabled={!isAdmin}
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  value={record.invoiceNumber || ''}
                  onChange={e => setRecord({...record, invoiceNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment Amount (£)</label>
                <input 
                  required
                  disabled={!isAdmin}
                  type="number" 
                  step="0.01"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  value={record.paymentAmount || 0}
                  onChange={e => setRecord({...record, paymentAmount: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment Status</label>
                <select 
                  required
                  disabled={!isAdmin}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  value={record.paymentStatus || 'Payment cleared'}
                  onChange={e => setRecord({...record, paymentStatus: e.target.value as any})}
                >
                  <option value="Payment cleared">Payment cleared</option>
                  <option value="Payment due">Payment due</option>
                </select>
              </div>
              {record.paymentStatus === 'Payment due' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Amount Due (£)</label>
                  <input 
                    disabled={!isAdmin}
                    type="number" 
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    value={record.paymentDueAmount || 0}
                    onChange={e => setRecord({...record, paymentDueAmount: parseFloat(e.target.value)})}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">VAT Status</label>
                <select 
                  disabled={!isAdmin}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  value={record.vatStatus || 'Inc VAT'}
                  onChange={e => setRecord({...record, vatStatus: e.target.value as any})}
                >
                  <option value="Inc VAT">Inc VAT</option>
                  <option value="No VAT">No VAT</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Support & Dates */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5 text-tillmax-blue" />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Support & Timeline</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Support Status</label>
                <select 
                  required
                  disabled={!isAdmin}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  value={record.supportStatus || 'Active'}
                  onChange={e => setRecord({...record, supportStatus: e.target.value})}
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Support Type</label>
                <select 
                  required
                  disabled={!isAdmin}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  value={record.supportType || 'Online and telephone support'}
                  onChange={e => setRecord({...record, supportType: e.target.value as any})}
                >
                  <option value="Online and telephone support">Online and telephone support</option>
                  <option value="Return to base">Return to base</option>
                  <option value="On site">On site</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Installation Date</label>
                <input 
                  required
                  disabled={!isAdmin}
                  type="date" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  value={record.installationDate || ''}
                  onChange={e => setRecord({...record, installationDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Support End Date</label>
                <input 
                  required
                  disabled={!isAdmin}
                  type="date" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  value={record.supportEndDate || ''}
                  onChange={e => setRecord({...record, supportEndDate: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Section: Technical Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <HardDrive className="w-5 h-5 text-tillmax-blue" />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Technical Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Software Type</label>
                <SearchableSelect 
                  disabled={!isAdmin}
                  value={record.softwareType || ''}
                  options={softwareTypes}
                  onChange={val => setRecord({...record, softwareType: val})}
                  placeholder="Select Software Type"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Sales Person</label>
                <SearchableSelect 
                  disabled={!isAdmin}
                  value={record.salesPerson || ''}
                  options={salesPeople}
                  onChange={val => setRecord({...record, salesPerson: val})}
                  placeholder="Select Sales Person"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Engineer</label>
                <SearchableSelect 
                  disabled={!isAdmin}
                  value={record.engineer || ''}
                  options={engineers}
                  onChange={val => setRecord({...record, engineer: val})}
                  placeholder="Select Engineer"
                />
              </div>
              <div className="space-y-4 col-span-full">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">License Numbers</label>
                  {isAdmin && (
                    <button 
                      type="button"
                      onClick={addLicenseNumber}
                      className="text-tillmax-blue font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Add License
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {record.licenseNumbers?.map((ln, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        disabled={!isAdmin}
                        type="text" 
                        placeholder="License Number"
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        value={ln}
                        onChange={e => updateLicenseNumber(idx, e.target.value)}
                      />
                      {isAdmin && (
                        <button 
                          type="button"
                          onClick={() => removeLicenseNumber(idx)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!record.licenseNumbers || record.licenseNumbers.length === 0) && (
                    <p className="text-[10px] text-slate-400 font-bold italic">No license numbers added.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 col-span-full">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">TeamViewer IDs</label>
                  {isAdmin && (
                    <button 
                      type="button"
                      onClick={addTeamViewerId}
                      className="text-tillmax-blue font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Add ID
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {record.teamViewerIds?.map((tv, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        disabled={!isAdmin}
                        type="text" 
                        placeholder="TeamViewer ID"
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        value={tv}
                        onChange={e => updateTeamViewerId(idx, e.target.value)}
                      />
                      {isAdmin && (
                        <button 
                          type="button"
                          onClick={() => removeTeamViewerId(idx)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!record.teamViewerIds || record.teamViewerIds.length === 0) && (
                    <p className="text-[10px] text-slate-400 font-bold italic">No TeamViewer IDs added.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Equipment */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-tillmax-blue" />
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Equipment List</h3>
              </div>
              {isAdmin && (
                <button 
                  type="button"
                  onClick={addEquipment}
                  className="text-tillmax-blue font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {record.equipment?.map((item, index) => (
                <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex-1">
                    <SearchableSelect 
                      disabled={!isAdmin}
                      value={item.name}
                      options={equipmentTypes}
                      onChange={val => updateEquipment(index, 'name', val)}
                      placeholder="Select Equipment"
                    />
                  </div>
                  <div className="w-24">
                    <input 
                      disabled={!isAdmin}
                      type="number" 
                      placeholder="Qty"
                      className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                      value={item.quantity}
                      onChange={e => updateEquipment(index, 'quantity', parseInt(e.target.value))}
                    />
                  </div>
                  {isAdmin && (
                    <button 
                      type="button"
                      onClick={() => removeEquipment(index)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {(!record.equipment || record.equipment.length === 0) && (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm font-medium">No equipment added yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Comments / Notes</label>
            <textarea 
              disabled={!isAdmin}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              value={record.comments || ''}
              onChange={e => setRecord({...record, comments: e.target.value})}
            />
          </div>

          <div className="pt-6 flex items-center justify-end gap-4">
            <button 
              type="button"
              onClick={() => {
                if (record.businessId) {
                  navigate(`/businesses/${record.businessId}`);
                } else {
                  navigate('/records');
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
                  <Save className="w-5 h-5" />
                )}
                {saving ? 'Saving...' : (id === 'new' ? 'Create Record' : 'Save Changes')}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
