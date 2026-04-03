import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Calendar, 
  ChevronRight,
  X,
  Check,
  Trash2,
  Edit2,
  Filter,
  Download,
  Info,
  Package,
  CreditCard,
  User as UserIcon,
  HardDrive,
  RefreshCw,
  Building2,
  Eye
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthProvider';
import { InstallationRecord, Business, Equipment, SimpleEntity } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const InstallationManagement: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<InstallationRecord[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InstallationRecord | null>(null);
  const [softwareTypes, setSoftwareTypes] = useState<SimpleEntity[]>([]);
  const [salesPeople, setSalesPeople] = useState<SimpleEntity[]>([]);
  const [engineers, setEngineers] = useState<SimpleEntity[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<SimpleEntity[]>([]);
  const [formData, setFormData] = useState<Partial<InstallationRecord>>({
    businessId: '',
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
    salesPerson: '',
    engineer: '',
    softwareType: '',
    licenseNumbers: [],
    teamViewerIds: [],
    invoiceNumber: '',
    comments: ''
  });

  useEffect(() => {
    fetchData();

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsSnap, businessesSnap] = await Promise.all([
        getDocs(query(collection(db, 'installationRecords'), orderBy('installationDate', 'desc'))),
        getDocs(query(collection(db, 'businesses'), orderBy('name', 'asc')))
      ]);

      const bList = businessesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
      setBusinesses(bList);

      const bMap = new Map(bList.map(b => [b.id, b.name]));
      const rList = recordsSnap.docs.map(doc => {
        const data = doc.data() as InstallationRecord;
        return { 
          id: doc.id, 
          ...data,
          businessName: bMap.get(data.businessId) || 'Unknown Business'
        } as InstallationRecord;
      });
      setRecords(rList);
    } catch (error) {
      console.error('Error fetching data', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (record: InstallationRecord | null = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData(record);
    } else {
      setEditingRecord(null);
      setFormData({
        businessId: businesses[0]?.id || '',
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
        salesPerson: '',
        engineer: '',
        softwareType: '',
        licenseNumbers: [],
        teamViewerIds: [],
        invoiceNumber: '',
        comments: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const business = businesses.find(b => b.id === formData.businessId);
      const data = {
        ...formData,
        businessName: business?.name || '',
        businessName_lowercase: business?.name?.toLowerCase() || '',
        postcode: business?.postcode || '',
        postcode_lowercase: business?.postcode?.toLowerCase() || '',
        postcode_normalized: business?.postcode?.replace(/\s+/g, '').toLowerCase() || '',
        invoiceNumber_lowercase: formData.invoiceNumber?.toLowerCase() || '',
        updatedAt: new Date().toISOString()
      };

      if (editingRecord) {
        await updateDoc(doc(db, 'installationRecords', editingRecord.id!), data);
        toast.success('Record updated successfully');
      } else {
        await addDoc(collection(db, 'installationRecords'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        toast.success('Record added successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving record', error);
      toast.error('Failed to save record');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this installation record?')) return;
    try {
      await deleteDoc(doc(db, 'installationRecords', id));
      toast.success('Record deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting record', error);
      toast.error('Failed to delete record');
    }
  };

  const filteredRecords = records.filter(r => 
    r.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.softwareType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addEquipment = () => {
    setFormData({
      ...formData,
      equipment: [...(formData.equipment || []), { name: '', quantity: 1 }]
    });
  };

  const removeEquipment = (index: number) => {
    const newEquipment = [...(formData.equipment || [])];
    newEquipment.splice(index, 1);
    setFormData({ ...formData, equipment: newEquipment });
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: any) => {
    const newEquipment = [...(formData.equipment || [])];
    newEquipment[index] = { ...newEquipment[index], [field]: value };
    setFormData({ ...formData, equipment: newEquipment });
  };

  const addLicenseNumber = () => {
    setFormData({ ...formData, licenseNumbers: [...(formData.licenseNumbers || []), ''] });
  };

  const removeLicenseNumber = (index: number) => {
    const newList = [...(formData.licenseNumbers || [])];
    newList.splice(index, 1);
    setFormData({ ...formData, licenseNumbers: newList });
  };

  const updateLicenseNumber = (index: number, value: string) => {
    const newList = [...(formData.licenseNumbers || [])];
    newList[index] = value;
    setFormData({ ...formData, licenseNumbers: newList });
  };

  const addTeamViewerId = () => {
    setFormData({ ...formData, teamViewerIds: [...(formData.teamViewerIds || []), ''] });
  };

  const removeTeamViewerId = (index: number) => {
    const newList = [...(formData.teamViewerIds || [])];
    newList.splice(index, 1);
    setFormData({ ...formData, teamViewerIds: newList });
  };

  const updateTeamViewerId = (index: number, value: string) => {
    const newList = [...(formData.teamViewerIds || [])];
    newList[index] = value;
    setFormData({ ...formData, teamViewerIds: newList });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Installations</h1>
          <p className="text-slate-500 font-medium">Track system setups, support status, and renewals.</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by business, invoice, or software..." 
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Business & Invoice</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Support Status</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Dates</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Software</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRecords.map((record) => {
                  const isExpired = new Date(record.supportEndDate) < new Date();
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-tillmax-blue transition-colors">{record.businessName}</div>
                        <div className="text-xs text-slate-500 font-bold">Inv: #{record.invoiceNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full",
                          isExpired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {isExpired ? 'Expired' : record.supportStatus}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-bold">{record.supportType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Inst: {formatDate(record.installationDate)}
                          </div>
                          <div className={cn(
                            "flex items-center gap-2 text-xs font-bold",
                            isExpired ? "text-red-500" : "text-slate-400"
                          )}>
                            <RefreshCw className="w-3 h-3" />
                            End: {formatDate(record.supportEndDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-700">{record.softwareType}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{record.engineer}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => navigate(`/records/${record.id}/edit`)}
                            className="p-2 text-slate-400 hover:text-tillmax-blue hover:bg-slate-50 rounded-lg transition-all"
                            title={isAdmin ? "Edit Record" : "View Record"}
                          >
                            {isAdmin ? <Edit2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={() => handleDelete(record.id!)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                      No installation records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
              className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-tillmax-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-tillmax-blue/20">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {editingRecord ? 'Edit Installation' : 'New Installation'}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">Fill in the technical and billing details.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-10">
                {/* Section: Basic Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-tillmax-blue" />
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Business & Billing</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Business</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                        value={formData.businessId}
                        onChange={e => setFormData({...formData, businessId: e.target.value})}
                      >
                        <option value="">Select a business...</option>
                        {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Invoice Number</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                        value={formData.invoiceNumber}
                        onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment Amount (£)</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                        value={formData.paymentAmount}
                        onChange={e => setFormData({...formData, paymentAmount: parseFloat(e.target.value)})}
                      />
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
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Support Type</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                        value={formData.supportType}
                        onChange={e => setFormData({...formData, supportType: e.target.value as any})}
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
                        type="date" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                        value={formData.installationDate}
                        onChange={e => setFormData({...formData, installationDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Support End Date</label>
                      <input 
                        required
                        type="date" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                        value={formData.supportEndDate}
                        onChange={e => setFormData({...formData, supportEndDate: e.target.value})}
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
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                        value={formData.softwareType}
                        onChange={e => setFormData({...formData, softwareType: e.target.value})}
                      >
                        <option value="">Select Software Type</option>
                        {softwareTypes.map(st => (
                          <option key={st.id} value={st.name}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Sales Person</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                        value={formData.salesPerson}
                        onChange={e => setFormData({...formData, salesPerson: e.target.value})}
                      >
                        <option value="">Select Sales Person</option>
                        {salesPeople.map(sp => (
                          <option key={sp.id} value={sp.name}>{sp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Engineer</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold"
                        value={formData.engineer}
                        onChange={e => setFormData({...formData, engineer: e.target.value})}
                      >
                        <option value="">Select Engineer</option>
                        {engineers.map(en => (
                          <option key={en.id} value={en.name}>{en.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-4 col-span-full">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">License Numbers</label>
                        <button 
                          type="button"
                          onClick={addLicenseNumber}
                          className="text-tillmax-blue font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Add License
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {formData.licenseNumbers?.map((ln, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              placeholder="License Number"
                              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold text-sm"
                              value={ln}
                              onChange={e => updateLicenseNumber(idx, e.target.value)}
                            />
                            <button 
                              type="button"
                              onClick={() => removeLicenseNumber(idx)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {(!formData.licenseNumbers || formData.licenseNumbers.length === 0) && (
                          <p className="text-[10px] text-slate-400 font-bold italic">No license numbers added.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 col-span-full">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">TeamViewer IDs</label>
                        <button 
                          type="button"
                          onClick={addTeamViewerId}
                          className="text-tillmax-blue font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Add ID
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {formData.teamViewerIds?.map((tv, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              placeholder="TeamViewer ID"
                              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold text-sm"
                              value={tv}
                              onChange={e => updateTeamViewerId(idx, e.target.value)}
                            />
                            <button 
                              type="button"
                              onClick={() => removeTeamViewerId(idx)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {(!formData.teamViewerIds || formData.teamViewerIds.length === 0) && (
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
                    <button 
                      type="button"
                      onClick={addEquipment}
                      className="text-tillmax-blue font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.equipment?.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex-1">
                          <select 
                            className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900"
                            value={item.name}
                            onChange={e => updateEquipment(index, 'name', e.target.value)}
                          >
                            <option value="">Select Equipment</option>
                            {equipmentTypes.map(et => (
                              <option key={et.id} value={et.name}>{et.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <input 
                            type="number" 
                            placeholder="Qty"
                            className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900 text-center"
                            value={item.quantity}
                            onChange={e => updateEquipment(index, 'quantity', parseInt(e.target.value))}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeEquipment(index)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!formData.equipment || formData.equipment.length === 0) && (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-sm font-medium">No equipment added yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Comments / Notes</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue outline-none transition-all font-bold resize-none"
                    value={formData.comments}
                    onChange={e => setFormData({...formData, comments: e.target.value})}
                  />
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
                    {editingRecord ? 'Save Changes' : 'Create Record'}
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

export default InstallationManagement;
