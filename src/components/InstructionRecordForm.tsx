import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { InstructionRecord, Equipment, SimpleEntity } from '../types';
import { ArrowLeft, Save, Plus, Trash2, Tag, Monitor, Wrench, Code, User, DollarSign, Calendar, FileText, Phone, CreditCard, Users, AlertCircle, Package, ChevronUp, ChevronDown, Mail } from 'lucide-react';
import { format, addYears } from 'date-fns';

export const InstructionRecordForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('businessId');
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lookup data
  const [salesPeople, setSalesPeople] = useState<SimpleEntity[]>([]);
  const [engineers, setEngineers] = useState<SimpleEntity[]>([]);
  const [softwareTypes, setSoftwareTypes] = useState<SimpleEntity[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<SimpleEntity[]>([]);

  const [formData, setFormData] = useState<Partial<InstructionRecord>>({
    businessId: businessId || '',
    supportType: 'Online and telephone support',
    supportStatus: 'Active',
    supportStartDate: format(new Date(), 'yyyy-MM-dd'),
    supportEndDate: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
    installationDate: format(new Date(), 'yyyy-MM-dd'),
    equipment: [],
    paymentAmount: 0,
    paymentStatus: 'Payment due',
    paymentDueAmount: 0,
    salesPerson: '',
    engineer: '',
    softwareType: '',
    licenseNumbers: [],
    teamViewerIds: [],
    invoiceNumber: '',
    comments: '',
    renewalInformed: false,
    renewalInformedMethod: 'Email',
    renewalInformedDate: '',
  });

  const [businessName, setBusinessName] = useState<string>('');
  const [newEquipment, setNewEquipment] = useState({ name: '', quantity: 1 });
  const [customName, setCustomName] = useState('');

  const [newLicense, setNewLicense] = useState('');
  const [newTeamViewer, setNewTeamViewer] = useState('');

  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      setInitialLoading(true);
      try {
        // Fetch lookups
        const [sp, eng, sw, eq] = await Promise.all([
          getDocs(query(collection(db, 'salesPeople'), orderBy('name'))),
          getDocs(query(collection(db, 'engineers'), orderBy('name'))),
          getDocs(query(collection(db, 'softwareTypes'), orderBy('name'))),
          getDocs(query(collection(db, 'equipmentTypes'), orderBy('name'))),
        ]);
        
        setSalesPeople(sp.docs.map(d => ({ id: d.id, ...d.data() } as SimpleEntity)));
        setEngineers(eng.docs.map(d => ({ id: d.id, ...d.data() } as SimpleEntity)));
        setSoftwareTypes(sw.docs.map(d => ({ id: d.id, ...d.data() } as SimpleEntity)));
        setEquipmentTypes(eq.docs.map(d => ({ id: d.id, ...d.data() } as SimpleEntity)));

        // Fetch record if editing
        if (id && id !== 'new') {
          const docRef = doc(db, 'instructionRecords', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as InstructionRecord;
            setFormData(prev => ({
              ...prev,
              ...data,
              equipment: data.equipment || [],
              licenseNumbers: data.licenseNumbers || [],
              teamViewerIds: data.teamViewerIds || [],
              invoiceNumber: data.invoiceNumber || '',
              comments: data.comments || '',
              renewalInformed: data.renewalInformed || false,
              renewalInformedMethod: data.renewalInformedMethod || 'Email',
              renewalInformedDate: data.renewalInformedDate || '',
            }));
            
            // Fetch business name for existing record
            if (data.businessId) {
              const bDoc = await getDoc(doc(db, 'businesses', data.businessId));
              if (bDoc.exists()) {
                setBusinessName(bDoc.data().name);
              }
            }
          }
        } else if (businessId) {
          // Fetch business name for new record if businessId is in URL
          const bDoc = await getDoc(doc(db, 'businesses', businessId));
          if (bDoc.exists()) {
            setBusinessName(bDoc.data().name);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'form-data');
        setError("Failed to load form data. Please try again.");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [id, businessId, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        businessName: businessName,
        businessName_lowercase: businessName.toLowerCase(),
        invoiceNumber_lowercase: formData.invoiceNumber?.toLowerCase() || '',
        updatedAt: serverTimestamp(),
      };

      if (id && id !== 'new') {
        await updateDoc(doc(db, 'instructionRecords', id), data);
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `updated instruction record for business: ${businessName}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'instructionRecords'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `created instruction record for business: ${businessName}`,
          timestamp: new Date().toISOString(),
        });
      }
      navigate(-1);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'instructionRecords');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (field: 'licenseNumbers' | 'teamViewerIds', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value]
    }));
  };

  const addEquipment = (equipment: Equipment) => {
    setFormData(prev => {
      const current = prev.equipment || [];
      const existingIndex = current.findIndex(item => item.name.toLowerCase() === equipment.name.toLowerCase());
      
      if (existingIndex > -1) {
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + equipment.quantity
        };
        return { ...prev, equipment: updated };
      }

      return {
        ...prev,
        equipment: [...current, equipment]
      };
    });
  };

  const removeItem = (field: 'equipment' | 'licenseNumbers' | 'teamViewerIds', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }));
  };

  const updateItem = (field: 'equipment', index: number, updates: any) => {
    setFormData(prev => {
      const current = prev[field] || [];
      const updated = [...current];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, [field]: updated };
    });
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!isAdmin || id === 'new') return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'instructionRecords', id!));
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `deleted instruction record for business ID: ${formData.businessId}`,
        timestamp: new Date().toISOString(),
      });
      navigate(-1);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `instructionRecords/${id}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const isReadOnly = !isAdmin && id !== 'new';
  const canNotCreate = !isAdmin && id === 'new';

  if (canNotCreate) {
    return (
      <div className="p-20 text-center card">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Access Denied. Only administrators can create new records.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-tillmax-blue font-bold hover:underline">
          Go Back
        </button>
      </div>
    );
  }

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
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-tillmax-blue mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <FileText className="w-7 h-7 text-tillmax-blue" />
            {id === 'new' ? 'New Instruction Record' : 'Edit Instruction Record'}
          </h2>
          {businessName && (
            <p className="text-slate-500 font-medium mb-8 flex items-center gap-2">
              <Users className="w-4 h-4" />
              For: <span className="text-tillmax-blue font-bold">{businessName}</span>
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Support Section */}
            <div className="md:col-span-3">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Phone className="w-5 h-5 text-tillmax-blue" />
                Support Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Support Type</label>
                  <select 
                    disabled={isReadOnly}
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500"
                    value={formData.supportType}
                    onChange={e => setFormData({...formData, supportType: e.target.value as any})}
                  >
                    <option value="Online and telephone support">Online and telephone support</option>
                    <option value="Return to base">Return to base</option>
                    <option value="On site">On site</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Support Status</label>
                  <input 
                    disabled={isReadOnly}
                    type="text" 
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500" 
                    value={formData.supportStatus}
                    onChange={e => setFormData({...formData, supportStatus: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Installation Date</label>
                  <input 
                    disabled={isReadOnly}
                    type="date" 
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500" 
                    value={formData.installationDate}
                    onChange={e => setFormData({...formData, installationDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Support Start Date</label>
                  <input 
                    disabled={isReadOnly}
                    type="date" 
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500" 
                    value={formData.supportStartDate}
                    onChange={e => setFormData({...formData, supportStartDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Support End Date</label>
                  <input 
                    disabled={isReadOnly}
                    type="date" 
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500" 
                    value={formData.supportEndDate}
                    onChange={e => setFormData({...formData, supportEndDate: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Equipment Section */}
            <div className="md:col-span-3">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Monitor className="w-5 h-5 text-tillmax-blue" />
                Equipment Purchased
              </h3>
              <div className="space-y-6">
                {/* Add Item Row */}
                {!isReadOnly && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex flex-col lg:flex-row gap-4 items-end">
                      <div className="flex-[3] space-y-2 w-full">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Equipment</label>
                        <select 
                          className="input-field w-full"
                          value={newEquipment.name}
                          onChange={e => {
                            setNewEquipment({...newEquipment, name: e.target.value});
                            if (e.target.value !== 'CUSTOM') setCustomName('');
                          }}
                        >
                          <option value="">Select Predefined Equipment...</option>
                          {equipmentTypes.map(et => <option key={et.id} value={et.name}>{et.name}</option>)}
                          <option value="CUSTOM">-- Add Custom Item --</option>
                        </select>
                      </div>
                      
                      {newEquipment.name === 'CUSTOM' && (
                        <div className="flex-[2] space-y-2 w-full animate-in fade-in slide-in-from-left-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Name</label>
                          <input 
                            type="text"
                            className="input-field w-full"
                            placeholder="Enter custom name..."
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                            autoFocus
                          />
                        </div>
                      )}

                      <div className="w-24 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</label>
                        <input 
                          type="number" 
                          min="1"
                          className="input-field w-full text-center font-bold text-tillmax-blue" 
                          value={newEquipment.quantity}
                          onChange={e => setNewEquipment({...newEquipment, quantity: parseInt(e.target.value) || 1})}
                        />
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => {
                          const finalName = newEquipment.name === 'CUSTOM' ? customName.trim() : newEquipment.name;
                          if (finalName) {
                            addEquipment({ name: finalName, quantity: newEquipment.quantity });
                            setNewEquipment({ name: '', quantity: 1 });
                            setCustomName('');
                          }
                        }}
                        className="btn-primary h-[42px] px-6 flex items-center justify-center gap-2 whitespace-nowrap w-full lg:w-auto"
                      >
                        <Plus className="w-5 h-5" />
                        Add Item
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Items List (The "Preview") */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      Selected Items ({formData.equipment?.length || 0})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.equipment?.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm group hover:border-tillmax-blue transition-all">
                        {!isReadOnly && (
                          <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                            <button 
                              type="button"
                              onClick={() => updateItem('equipment', i, { quantity: item.quantity + 1 })}
                              className="text-slate-400 hover:text-tillmax-blue p-0.5 transition-colors"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-black text-tillmax-blue w-6 text-center leading-none">{item.quantity}</span>
                            <button 
                              type="button"
                              onClick={() => updateItem('equipment', i, { quantity: Math.max(1, item.quantity - 1) })}
                              className="text-slate-400 hover:text-tillmax-blue p-0.5 transition-colors"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {isReadOnly && (
                          <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 text-sm font-black text-tillmax-blue">
                            {item.quantity}x
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <input 
                            disabled={isReadOnly}
                            type="text" 
                            className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-800 p-0 text-sm truncate disabled:text-slate-500"
                            value={item.name}
                            onChange={e => updateItem('equipment', i, { name: e.target.value })}
                          />
                        </div>
                        {!isReadOnly && (
                          <button 
                            type="button" 
                            onClick={() => removeItem('equipment', i)} 
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {(!formData.equipment || formData.equipment.length === 0) && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-sm">
                        No equipment selected yet. Add items above to see them here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Section */}
            <div className="md:col-span-3">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                <CreditCard className="w-5 h-5 text-tillmax-blue" />
                Financial Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Total Amount (£)</label>
                  <input 
                    disabled={isReadOnly}
                    type="number" 
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500" 
                    value={formData.paymentAmount}
                    onChange={e => setFormData({...formData, paymentAmount: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Payment Status</label>
                  <select 
                    disabled={isReadOnly}
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500"
                    value={formData.paymentStatus}
                    onChange={e => setFormData({...formData, paymentStatus: e.target.value as any})}
                  >
                    <option value="Payment cleared">Payment cleared</option>
                    <option value="Payment due">Payment due</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Due Amount (£)</label>
                  <input 
                    disabled={isReadOnly}
                    type="number" 
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500" 
                    value={formData.paymentDueAmount}
                    onChange={e => setFormData({...formData, paymentDueAmount: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Invoice Number</label>
                  <input 
                    disabled={isReadOnly}
                    type="text" 
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500" 
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Staff & Software Section */}
            <div className="md:col-span-3">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Users className="w-5 h-5 text-tillmax-blue" />
                Staff & Software
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Sales Person</label>
                  <select 
                    disabled={isReadOnly}
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500"
                    value={formData.salesPerson}
                    onChange={e => setFormData({...formData, salesPerson: e.target.value})}
                  >
                    <option value="">Select Sales Person...</option>
                    {salesPeople.map(sp => <option key={sp.id} value={sp.name}>{sp.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Engineer</label>
                  <select 
                    disabled={isReadOnly}
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500"
                    value={formData.engineer}
                    onChange={e => setFormData({...formData, engineer: e.target.value})}
                  >
                    <option value="">Select Engineer...</option>
                    {engineers.map(eng => <option key={eng.id} value={eng.name}>{eng.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Software Type</label>
                  <select 
                    disabled={isReadOnly}
                    className="input-field disabled:bg-slate-50 disabled:text-slate-500"
                    value={formData.softwareType}
                    onChange={e => setFormData({...formData, softwareType: e.target.value})}
                  >
                    <option value="">Select Software...</option>
                    {softwareTypes.map(sw => <option key={sw.id} value={sw.name}>{sw.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* IDs Section */}
            <div className="md:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Tag className="w-5 h-5 text-tillmax-blue" />
                    License Numbers
                  </h3>
                  {!isReadOnly && (
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        placeholder="Add license..." 
                        className="input-field" 
                        value={newLicense}
                        onChange={e => setNewLicense(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (newLicense) {
                            addItem('licenseNumbers', newLicense);
                            setNewLicense('');
                          }
                        }}
                        className="btn-primary p-2"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.licenseNumbers?.map((lic, i) => (
                      <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        {lic}
                        {!isReadOnly && (
                          <button type="button" onClick={() => removeItem('licenseNumbers', i)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Monitor className="w-5 h-5 text-tillmax-blue" />
                    TeamViewer IDs
                  </h3>
                  {!isReadOnly && (
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        placeholder="Add ID..." 
                        className="input-field" 
                        value={newTeamViewer}
                        onChange={e => setNewTeamViewer(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (newTeamViewer) {
                            addItem('teamViewerIds', newTeamViewer);
                            setNewTeamViewer('');
                          }
                        }}
                        className="btn-primary p-2"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {formData.teamViewerIds?.map((tv, i) => (
                      <span key={i} className="bg-blue-50 text-tillmax-blue px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        {tv}
                        {!isReadOnly && (
                          <button type="button" onClick={() => removeItem('teamViewerIds', i)} className="text-blue-300 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="md:col-span-3">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="w-5 h-5 text-tillmax-blue" />
                Comments
              </h3>
              <textarea 
                rows={4}
                className="input-field" 
                value={formData.comments}
                onChange={e => setFormData({...formData, comments: e.target.value})}
                placeholder="Add any additional notes or details here..."
              />
            </div>

            {/* Renewal Information Section */}
            <div className="md:col-span-3">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Mail className="w-5 h-5 text-tillmax-blue" />
                Renewal Notification
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        disabled={isReadOnly}
                        type="checkbox" 
                        className="peer sr-only"
                        checked={formData.renewalInformed}
                        onChange={e => setFormData({...formData, renewalInformed: e.target.checked, renewalInformedDate: e.target.checked ? format(new Date(), 'yyyy-MM-dd') : ''})}
                      />
                      <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-tillmax-blue transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700">Customer Informed about Renewal</span>
                  </label>
                </div>

                {formData.renewalInformed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Communication Method</label>
                      <select 
                        disabled={isReadOnly}
                        className="input-field"
                        value={formData.renewalInformedMethod}
                        onChange={e => setFormData({...formData, renewalInformedMethod: e.target.value as any})}
                      >
                        <option value="Email">Email</option>
                        <option value="Text">Text</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Date Informed</label>
                      <input 
                        disabled={isReadOnly}
                        type="date" 
                        className="input-field" 
                        value={formData.renewalInformedDate}
                        onChange={e => setFormData({...formData, renewalInformedDate: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          {isAdmin && id !== 'new' && (
            <button 
              type="button" 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-8 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>
          )}
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button 
            disabled={loading}
            type="submit" 
            className="btn-primary flex items-center gap-2 px-12 py-3 shadow-xl shadow-tillmax-blue/20"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
            {id === 'new' ? 'Create Record' : 'Update Record'}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Record?</h3>
            <p className="text-slate-600 mb-8">
              Are you sure you want to delete this instruction record? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex justify-center items-center"
              >
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
