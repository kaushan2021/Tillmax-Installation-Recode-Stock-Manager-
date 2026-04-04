import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, addDoc, limit, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../AuthProvider';
import { useNavigate } from 'react-router-dom';
import { EquipmentType, Category, Supplier, StockMovement, StockMovementType, Business } from '../types';
import { 
  Search, 
  Plus, 
  Minus, 
  Database, 
  Filter, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  TrendingDown,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Calendar,
  User,
  MessageSquare,
  ChevronRight,
  Info,
  Building2,
  Tag
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export const StockManagement = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<EquipmentType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'audit'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [adjustingItem, setAdjustingItem] = useState<EquipmentType | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<StockMovementType>('IN');
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessSearch, setBusinessSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierResults, setShowSupplierResults] = useState(false);
  const [showBusinessResults, setShowBusinessResults] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (adjustmentType === 'IN' && supplierSearch.length >= 2) {
      const results = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).slice(0, 5);
      setFilteredSuppliers(results);
      setShowSupplierResults(true);
    } else {
      setFilteredSuppliers([]);
      setShowSupplierResults(false);
    }
  }, [supplierSearch, adjustmentType, suppliers]);

  useEffect(() => {
    if (adjustmentType === 'OUT' && businessSearch.length >= 2) {
      const fetchBusinesses = async () => {
        try {
          const s = businessSearch.toLowerCase();
          const q = query(
            collection(db, 'businesses'),
            where('name_lowercase', '>=', s),
            where('name_lowercase', '<=', s + '\uf8ff'),
            limit(5)
          );
          const snap = await getDocs(q);
          setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Business)));
          setShowBusinessResults(true);
        } catch (error) {
          console.error("Error fetching businesses:", error);
        }
      };
      const timer = setTimeout(fetchBusinesses, 300);
      return () => clearTimeout(timer);
    } else {
      setBusinesses([]);
      setShowBusinessResults(false);
    }
  }, [businessSearch, adjustmentType]);

  useEffect(() => {
    if (selectedBusiness) {
      setAdjustmentReason(`Installation for ${selectedBusiness.name}`);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    const unsubItems = onSnapshot(query(collection(db, 'equipmentTypes'), orderBy('name')), (snap) => {
      setItems(snap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          currentStock: typeof data.currentStock === 'number' ? data.currentStock : 0,
          lowStockThreshold: typeof data.lowStockThreshold === 'number' ? data.lowStockThreshold : 5
        } as EquipmentType;
      }));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'equipmentTypes'));

    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('name')), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'categories'));

    const unsubSups = onSnapshot(query(collection(db, 'suppliers'), orderBy('name')), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'suppliers'));

    const unsubMovements = onSnapshot(query(collection(db, 'stockMovements'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
      setMovements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'stockMovements'));

    return () => {
      unsubItems();
      unsubCats();
      unsubSups();
      unsubMovements();
    };
  }, []);

  const handleAdjustStock = async () => {
    if (!adjustingItem) return;
    
    // For IN/OUT, we need a positive value. For ADJUSTMENT, we allow 0 or more.
    if (adjustmentType !== 'ADJUSTMENT' && adjustmentValue <= 0) return;
    if (adjustmentType === 'ADJUSTMENT' && adjustmentValue < 0) return;

    let newStock: number;
    let delta: number;

    if (adjustmentType === 'ADJUSTMENT') {
      newStock = adjustmentValue;
      delta = newStock - (adjustingItem.currentStock || 0);
    } else {
      delta = adjustmentType === 'OUT' ? -adjustmentValue : adjustmentValue;
      newStock = Math.max(0, (adjustingItem.currentStock || 0) + delta);
    }
    
    const recordedQuantity = adjustmentType === 'ADJUSTMENT' ? Math.abs(delta) : adjustmentValue;
    
    let finalReason = adjustmentReason;
    if (adjustmentType === 'OUT' && selectedBusiness) {
      finalReason = `Installation for ${selectedBusiness.name}${adjustmentReason ? ': ' + adjustmentReason : ''}`;
    } else if (adjustmentType === 'IN' && selectedSupplier) {
      finalReason = `Stock received from ${selectedSupplier.name}${adjustmentReason ? ': ' + adjustmentReason : ''}`;
    } else if (!finalReason) {
      finalReason = adjustmentType === 'IN' ? 'Stock received' : adjustmentType === 'OUT' ? 'Stock issued' : 'Manual adjustment';
    }

    try {
      // Update inventory
      await updateDoc(doc(db, 'equipmentTypes', adjustingItem.id!), {
        currentStock: newStock
      });

      // Record movement
      await addDoc(collection(db, 'stockMovements'), {
        equipmentTypeId: adjustingItem.id,
        equipmentTypeName: adjustingItem.name,
        type: adjustmentType,
        quantity: recordedQuantity,
        previousStock: adjustingItem.currentStock,
        newStock: newStock,
        reason: finalReason,
        userId: profile?.uid,
        username: profile?.username,
        timestamp: new Date().toISOString(),
        businessId: selectedBusiness?.id || null,
        supplierId: selectedSupplier?.id || null
      });

      // Log action
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `${adjustmentType} adjustment for ${adjustingItem.name}: ${delta > 0 ? '+' : ''}${delta} (New: ${newStock})`,
        timestamp: new Date().toISOString(),
      });

      setAdjustingItem(null);
      setAdjustmentValue(0);
      setAdjustmentReason('');
      setBusinessSearch('');
      setSelectedBusiness(null);
      setSelectedSupplier(null);
      setSupplierSearch('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `equipmentTypes/${adjustingItem.id}`);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categories.find(c => c.id === item.categoryId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suppliers.find(s => s.id === item.supplierId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'in-stock') return item.currentStock > item.lowStockThreshold;
    if (filter === 'low-stock') return item.currentStock > 0 && item.currentStock <= item.lowStockThreshold;
    if (filter === 'out-of-stock') return item.currentStock === 0;
    
    return true;
  });

  const stats = {
    total: items.length,
    low: items.filter(i => i.currentStock > 0 && i.currentStock <= i.lowStockThreshold).length,
    out: items.filter(i => i.currentStock === 0).length,
    healthy: items.filter(i => i.currentStock > i.lowStockThreshold).length
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-tillmax-blue rounded-2xl flex items-center justify-center shadow-lg shadow-tillmax-blue/20">
              <Database className="w-7 h-7 text-white" />
            </div>
            Stock Management
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time inventory tracking and audit trail.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => navigate('/proforma')}
            className="bg-white border-2 border-slate-100 text-slate-600 hover:border-tillmax-blue hover:text-tillmax-blue px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            Generate Proforma Invoice
          </button>

          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('inventory')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'inventory' ? "bg-white text-tillmax-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Package className="w-4 h-4" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'audit' ? "bg-white text-tillmax-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <History className="w-4 h-4" />
            Audit Trail
          </button>
        </div>
      </div>
    </div>

    {activeTab === 'inventory' ? (
        <>
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Items', value: stats.total, icon: Package, color: 'blue', border: 'border-tillmax-blue' },
              { label: 'Healthy Stock', value: stats.healthy, icon: CheckCircle2, color: 'green', border: 'border-green-500' },
              { label: 'Low Stock', value: stats.low, icon: AlertTriangle, color: 'amber', border: 'border-amber-500' },
              { label: 'Out of Stock', value: stats.out, icon: XCircle, color: 'red', border: 'border-red-500' },
            ].map((stat, idx) => (
              <div 
                key={stat.label}
                className={cn(
                  "bg-white p-6 rounded-[2.5rem] shadow-sm border-l-8 flex items-center justify-between group hover:shadow-md transition-all",
                  stat.border
                )}
              >
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
                </div>
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                  `bg-${stat.color}-50 text-${stat.color}-500`
                )}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/30">
              <div className="flex flex-col lg:flex-row gap-6 justify-between">
                <div className="relative flex-1 max-w-2xl">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name, category or supplier..." 
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-700 focus:border-tillmax-blue focus:ring-0 transition-all outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                  {[
                    { id: 'all', label: 'All Items', icon: Package },
                    { id: 'in-stock', label: 'In Stock', icon: CheckCircle2 },
                    { id: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
                    { id: 'out-of-stock', label: 'Out of Stock', icon: XCircle },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setFilter(t.id as any)}
                      className={cn(
                        "px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap border-2",
                        filter === t.id 
                          ? "bg-tillmax-blue border-tillmax-blue text-white shadow-lg shadow-tillmax-blue/20" 
                          : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Details</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Supplier</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Stock</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map(item => (
                    <tr 
                      key={item.id} 
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-tillmax-blue group-hover:text-white transition-colors">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-lg leading-tight">{item.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-black mt-1 tracking-wider">ID: {item.id?.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider">
                          {categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-300" />
                          {suppliers.find(s => s.id === item.supplierId)?.name || 'No Supplier'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "text-2xl font-black",
                            item.currentStock === 0 ? "text-red-600" : 
                            item.currentStock <= item.lowStockThreshold ? "text-amber-600" : 
                            "text-green-600"
                          )}>
                            {item.currentStock}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                              Min: {item.lowStockThreshold}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => {
                            setAdjustingItem(item);
                            setAdjustmentType('IN');
                            setAdjustmentValue(0);
                          }}
                          className="bg-white border-2 border-slate-100 text-slate-600 hover:border-tillmax-blue hover:text-tillmax-blue px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ml-auto transition-all shadow-sm hover:shadow-md"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-6">
                          <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                            <Search className="w-12 h-12" />
                          </div>
                          <div>
                            <p className="text-slate-900 font-black text-xl">No items found</p>
                            <p className="text-slate-500 font-medium mt-1">Try adjusting your search or filters.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Audit Trail Tab */
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Stock Audit Trail</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">History of all stock movements and adjustments.</p>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <Info className="w-4 h-4" />
              Showing last 100 movements
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quantity</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock Change</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reason / User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements.map((move, idx) => (
                  <tr 
                    key={move.id} 
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        <div>
                          <div className="font-bold text-slate-900">{format(new Date(move.timestamp), 'dd MMM yyyy')}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase">{format(new Date(move.timestamp), 'HH:mm:ss')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-900">{move.equipmentTypeName}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">ID: {move.equipmentTypeId.slice(0, 8)}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        move.type === 'IN' ? "bg-green-50 text-green-600" : 
                        move.type === 'OUT' ? "bg-red-50 text-red-600" : 
                        "bg-amber-50 text-amber-600"
                      )}>
                        {move.type === 'IN' ? <ArrowUpCircle className="w-3 h-3" /> : 
                         move.type === 'OUT' ? <ArrowDownCircle className="w-3 h-3" /> : 
                         <RefreshCw className="w-3 h-3" />}
                        {move.type === 'IN' ? 'Stock In' : move.type === 'OUT' ? 'Stock Out' : 'Adjustment'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className={cn(
                        "text-lg font-black",
                        move.type === 'IN' ? "text-green-600" : 
                        move.type === 'OUT' ? "text-red-600" : 
                        move.newStock > move.previousStock ? "text-green-600" : "text-red-600"
                      )}>
                        {move.type === 'OUT' || (move.type === 'ADJUSTMENT' && move.newStock < move.previousStock) ? '-' : '+'}{move.quantity}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-500">
                        <span>{move.previousStock}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-slate-900 font-black">{move.newStock}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-slate-700">{move.reason}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{move.username}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-32 text-center text-slate-400 font-bold">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            onClick={() => setAdjustingItem(null)}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
          />
          <div 
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-tillmax-blue p-8 text-white relative shrink-0">
              <div className="absolute top-6 right-6">
                <button 
                  onClick={() => setAdjustingItem(null)}
                  className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Inventory Adjustment</span>
                  <h3 className="text-2xl font-black mt-1">{adjustingItem.name}</h3>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <div className="bg-white/10 px-5 py-2.5 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Current Stock</p>
                  <p className="text-xl font-black">{adjustingItem.currentStock}</p>
                </div>
                <div className="bg-white/10 px-5 py-2.5 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Threshold</p>
                  <p className="text-xl font-black">{adjustingItem.lowStockThreshold}</p>
                </div>
              </div>
            </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-6">
                {/* Type Selector */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'IN', label: 'Stock In', icon: ArrowUpCircle, color: 'green' },
                    { id: 'OUT', label: 'Stock Out', icon: ArrowDownCircle, color: 'red' },
                    { id: 'ADJUSTMENT', label: 'Adjust', icon: RefreshCw, color: 'amber' },
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => {
                        setAdjustmentType(type.id as any);
                        setAdjustmentReason('');
                        setSelectedBusiness(null);
                        setBusinessSearch('');
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-4 transition-all",
                        adjustmentType === type.id 
                          ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-600 shadow-lg shadow-${type.color}-500/10` 
                          : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-100"
                      )}
                    >
                      <type.icon className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {adjustmentType === 'ADJUSTMENT' ? 'New Total Stock' : 'Quantity'}
                    </label>
                    <div className="flex items-center gap-6 bg-slate-50 p-3 rounded-2xl border-2 border-slate-50">
                      <button 
                        onClick={() => setAdjustmentValue(v => Math.max(0, v - 1))}
                        className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input 
                        type="number" 
                        className="flex-1 text-3xl font-black text-slate-900 text-center outline-none bg-transparent"
                        value={adjustmentValue}
                        onChange={e => setAdjustmentValue(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                      <button 
                        onClick={() => setAdjustmentValue(v => v + 1)}
                        className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {adjustmentType === 'OUT' ? 'Recipient / Business (Optional)' : 
                       adjustmentType === 'IN' ? 'Supplier (Optional)' : 'Reason / Note'}
                    </label>
                    {adjustmentType === 'OUT' ? (
                      <div className="relative">
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus-within:border-tillmax-blue transition-all">
                          <Building2 className="w-5 h-5 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search business..."
                            className="flex-1 bg-transparent font-bold text-slate-700 outline-none"
                            value={selectedBusiness ? selectedBusiness.name : businessSearch}
                            onChange={e => {
                              setBusinessSearch(e.target.value);
                              setSelectedBusiness(null);
                            }}
                          />
                          {selectedBusiness && (
                            <button onClick={() => setSelectedBusiness(null)} className="text-slate-400 hover:text-tillmax-red">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        {showBusinessResults && businesses.length > 0 && !selectedBusiness && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                            {businesses.map(b => (
                              <button
                                key={b.id}
                                onClick={() => {
                                  setSelectedBusiness(b);
                                  setShowBusinessResults(false);
                                }}
                                className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-slate-900">{b.name}</div>
                                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{b.postcode}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : adjustmentType === 'IN' ? (
                      <div className="relative">
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus-within:border-tillmax-blue transition-all">
                          <User className="w-5 h-5 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search supplier..."
                            className="flex-1 bg-transparent font-bold text-slate-700 outline-none"
                            value={selectedSupplier ? selectedSupplier.name : supplierSearch}
                            onChange={e => {
                              setSupplierSearch(e.target.value);
                              setSelectedSupplier(null);
                            }}
                          />
                          {selectedSupplier && (
                            <button onClick={() => setSelectedSupplier(null)} className="text-slate-400 hover:text-tillmax-red">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        {showSupplierResults && filteredSuppliers.length > 0 && !selectedSupplier && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                            {filteredSuppliers.map(s => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setSelectedSupplier(s);
                                  setShowSupplierResults(false);
                                }}
                                className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <User className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-slate-900">{s.name}</div>
                                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{s.contactNumber}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <textarea 
                        placeholder="Enter reason for adjustment..."
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 font-bold text-slate-700 focus:border-tillmax-blue focus:ring-0 transition-all outline-none h-24 resize-none"
                        value={adjustmentReason}
                        onChange={e => setAdjustmentReason(e.target.value)}
                      />
                    )}
                  </div>

                  {(adjustmentType === 'OUT' || adjustmentType === 'IN') && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Final Reason / Note</label>
                      <textarea 
                        placeholder="Enter additional notes..."
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 font-bold text-slate-700 focus:border-tillmax-blue focus:ring-0 transition-all outline-none h-20 resize-none"
                        value={adjustmentReason}
                        onChange={e => setAdjustmentReason(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">New Stock Level</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xl font-bold text-white/40 line-through">{adjustingItem.currentStock}</span>
                    <ChevronRight className="w-5 h-5 text-white/20" />
                    <span className={cn(
                      "text-3xl font-black",
                      (adjustmentType === 'ADJUSTMENT' ? adjustmentValue : Math.max(0, adjustingItem.currentStock + (adjustmentType === 'OUT' ? -adjustmentValue : adjustmentValue))) <= adjustingItem.lowStockThreshold ? "text-amber-400" : "text-green-400"
                    )}>
                      {adjustmentType === 'ADJUSTMENT' ? adjustmentValue : Math.max(0, adjustingItem.currentStock + (adjustmentType === 'OUT' ? -adjustmentValue : adjustmentValue))}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => setAdjustingItem(null)}
                    className="flex-1 sm:flex-none px-6 py-3 text-white/60 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAdjustStock}
                    disabled={adjustmentValue <= 0}
                    className="flex-1 sm:flex-none bg-tillmax-blue hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-tillmax-blue/40 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {adjustmentType === 'IN' ? <TrendingUp className="w-4 h-4" /> : adjustmentType === 'OUT' ? <TrendingDown className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

