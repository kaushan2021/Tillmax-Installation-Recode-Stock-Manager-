import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { secondaryAuth, createUserWithEmailAndPassword, db, handleFirestoreError, OperationType } from '../firebase';
import { setDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, writeBatch, getDocs, limit, startAfter, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '../AuthProvider';
import { UserProfile, SimpleEntity, UserRole, Business, InstructionRecord } from '../types';
import { 
  Users, 
  Shield, 
  Trash2, 
  Plus, 
  Edit2, 
  Save, 
  X, 
  Package, 
  Wrench, 
  Code, 
  UserPlus,
  Mail,
  User as UserIcon,
  Search,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  FileText
} from 'lucide-react';
import { clsx } from 'clsx';

export const AdminPanel = () => {
  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'lookups' | 'maintenance'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), orderBy('username'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return () => unsubscribe();
  }, [isAdmin]);

  if (!isAdmin) return <div className="p-20 text-center card text-red-500 font-bold">Access Denied</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Panel</h1>
          <p className="text-slate-500 mt-1">Manage users and system configuration.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('users')}
            className={clsx(
              "px-6 py-2 rounded-lg font-bold text-sm transition-all",
              activeTab === 'users' ? "bg-tillmax-blue text-white shadow-md" : "text-slate-500 hover:text-tillmax-blue"
            )}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('lookups')}
            className={clsx(
              "px-6 py-2 rounded-lg font-bold text-sm transition-all",
              activeTab === 'lookups' ? "bg-tillmax-blue text-white shadow-md" : "text-slate-500 hover:text-tillmax-blue"
            )}
          >
            Lookup Tables
          </button>
          <button 
            onClick={() => setActiveTab('maintenance')}
            className={clsx(
              "px-6 py-2 rounded-lg font-bold text-sm transition-all",
              activeTab === 'maintenance' ? "bg-tillmax-blue text-white shadow-md" : "text-slate-500 hover:text-tillmax-blue"
            )}
          >
            Maintenance
          </button>
        </div>
      </div>

      {activeTab === 'users' && <UserManagement users={users} loading={loading} />}
      {activeTab === 'lookups' && <LookupManagement />}
      {activeTab === 'maintenance' && <MaintenancePanel />}
    </div>
  );
};

const UserManagement = ({ users, loading }: { users: UserProfile[], loading: boolean }) => {
  const { profile } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ email: '', username: '', role: 'EMPLOYEE' as UserRole, password: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) return setError("Password must be at least 6 characters.");
    
    setIsCreating(true);
    setError(null);
    try {
      // Create user in Firebase Auth using secondary instance
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const newUser = userCredential.user;

      // Create profile in Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: formData.email,
        username: formData.username,
        role: formData.role,
        createdAt: new Date().toISOString(),
      });

      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `added new user: ${formData.username} (${formData.role})`,
        timestamp: new Date().toISOString(),
      });

      setFormData({ email: '', username: '', role: 'EMPLOYEE', password: '' });
      setShowAdd(false);
      // Sign out from secondary app to keep it clean
      await secondaryAuth.signOut();
    } catch (err: any) {
      console.error("Failed to create user", err);
      setError(err.message || "Failed to create user");
      if (err.code !== 'auth/email-already-in-use') {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (uid: string, username: string) => {
    if (uid === profile?.uid) return alert("You cannot delete yourself.");
    if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `deleted user: ${username}`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {showAdd && (
        <div className="card p-8 border-tillmax-blue bg-blue-50/30">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900">Add New User</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
          </div>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <input 
                required
                type="email" 
                className="input-field" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Username</label>
              <input 
                required
                type="text" 
                className="input-field" 
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Password</label>
              <input 
                required
                type="password" 
                className="input-field" 
                placeholder="Min 6 chars"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Role</label>
              <select 
                className="input-field"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {error && (
              <div className="lg:col-span-4 bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="lg:col-span-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isCreating}
                className="btn-primary px-10 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(user => (
              <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-tillmax-blue/10 rounded-full flex items-center justify-center text-tillmax-blue font-bold text-xs">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900">{user.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={clsx(
                    "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                    user.role === 'ADMIN' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDeleteUser(user.uid, user.username)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MaintenancePanel = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [confirming, setConfirming] = useState<'businesses' | 'records' | 'test-data' | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [recordProgress, setRecordProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState<string | null>(null);
  const [recordStatus, setRecordStatus] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const { profile } = useAuth();

  const generateTestData = async () => {
    setConfirming(null);
    setIsMigrating(true);
    setTestStatus("Initializing generation...");
    try {
      const businesses = [
        { name: "Tesco Express London", postcode: "SW1A 1AA", type: "Supermarket" },
        { name: "Manchester Curry House", postcode: "M1 1AE", type: "Restaurant" },
        { name: "Sainsbury's Local Birmingham", postcode: "B1 1BB", type: "Supermarket" },
        { name: "Glasgow Steakhouse", postcode: "G1 1XW", type: "Restaurant" },
        { name: "Liverpool Food Mart", postcode: "L1 0AA", type: "Supermarket" },
        { name: "Leeds Italian Bistro", postcode: "LS1 1UR", type: "Restaurant" },
        { name: "Sheffield Corner Shop", postcode: "S1 1AA", type: "Supermarket" },
        { name: "Bristol Tapas Bar", postcode: "BS1 1HT", type: "Restaurant" },
        { name: "Edinburgh Traditional Pub", postcode: "EH1 1RE", type: "Restaurant" },
        { name: "Cardiff Mini Market", postcode: "CF10 1AA", type: "Supermarket" },
        { name: "Belfast Seafood Grill", postcode: "BT1 1AA", type: "Restaurant" },
        { name: "Newcastle Pizza Co", postcode: "NE1 1AA", type: "Restaurant" },
        { name: "Nottingham Grocery", postcode: "NG1 1AA", type: "Supermarket" },
        { name: "Oxford Burger Joint", postcode: "OX1 1AA", type: "Restaurant" },
        { name: "Cambridge Deli", postcode: "CB1 1AA", type: "Supermarket" }
      ];

      const batch = writeBatch(db);
      const businessIds: string[] = [];
      const now = new Date();
      const nowIso = now.toISOString();

      setTestStatus("Creating 15 Businesses...");
      for (const b of businesses) {
        const bRef = doc(collection(db, 'businesses'));
        const businessData = {
          name: b.name,
          name_lowercase: b.name.toLowerCase(),
          postcode: b.postcode,
          postcode_lowercase: b.postcode.toLowerCase(),
          ownerName: "Test Owner",
          telephone: "01234 567890",
          contactNumber: "07700 900000",
          email: `contact@${b.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.co.uk`,
          address: `Unit ${Math.floor(Math.random() * 50) + 1}, High Street, ${b.name.split(' ')[0]}`,
          createdAt: nowIso
        };
        batch.set(bRef, businessData);
        businessIds.push(bRef.id);
      }

      setTestStatus("Generating 50 Instruction Records...");
      for (let i = 1; i <= 50; i++) {
        const bIndex = Math.floor(Math.random() * businesses.length);
        const bId = businessIds[bIndex];
        const bName = businesses[bIndex].name;
        
        let supportEndDate: Date;
        let supportStatus: string;
        let paymentStatus: 'Payment cleared' | 'Payment due';
        
        // Mix of statuses
        if (i <= 15) { // Active
          supportEndDate = new Date(now);
          supportEndDate.setMonth(now.getMonth() + 6);
          supportStatus = "Active";
          paymentStatus = "Payment cleared";
        } else if (i <= 30) { // Expired
          supportEndDate = new Date(now);
          supportEndDate.setMonth(now.getMonth() - 2);
          supportStatus = "Expired";
          paymentStatus = "Payment cleared";
        } else if (i <= 40) { // Expiring in 30 days
          supportEndDate = new Date(now);
          supportEndDate.setDate(now.getDate() + 15);
          supportStatus = "Expiring Soon";
          paymentStatus = "Payment cleared";
        } else { // Payment Due
          supportEndDate = new Date(now);
          supportEndDate.setMonth(now.getMonth() + 1);
          supportStatus = "Payment Due";
          paymentStatus = "Payment due";
        }

        const rRef = doc(collection(db, 'instructionRecords'));
        const recordData = {
          businessId: bId,
          businessName: bName,
          businessName_lowercase: bName.toLowerCase(),
          invoiceNumber: `INV-${2026}${String(i).padStart(3, '0')}`,
          invoiceNumber_lowercase: `inv-${2026}${String(i).padStart(3, '0')}`,
          supportType: i % 2 === 0 ? 'Online and telephone support' : 'On site',
          supportStatus: supportStatus,
          supportStartDate: new Date(now.getTime() - 31536000000).toISOString().split('T')[0],
          supportEndDate: supportEndDate.toISOString().split('T')[0],
          installationDate: new Date(now.getTime() - 31536000000).toISOString().split('T')[0],
          equipment: [
            { name: businesses[bIndex].type === "Supermarket" ? "POS Terminal" : "Kitchen Display", quantity: 1 },
            { name: "Receipt Printer", quantity: 1 }
          ],
          paymentAmount: 450 + (i * 10),
          paymentStatus: paymentStatus,
          paymentDueAmount: paymentStatus === "Payment due" ? 450 + (i * 10) : 0,
          salesPerson: "John Sales",
          engineer: "Dave Engineer",
          softwareType: "TillMax Pro v3",
          licenseNumbers: [`TMX-${10000 + i}`],
          teamViewerIds: [`${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`],
          comments: "Automated test data for performance verification.",
          createdAt: nowIso
        };
        batch.set(rRef, recordData);
      }

      setTestStatus("Committing data to database...");
      await batch.commit();

      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `Generated 15 businesses and 50 test records`,
        timestamp: nowIso,
      });

      setTestStatus("SUCCESS: 15 Businesses and 50 Records created! Data is now live.");
    } catch (error) {
      console.error("Test data generation failed:", error);
      setTestStatus(`ERROR: ${error instanceof Error ? error.message : "Unknown error during generation"}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const fixSearchIndex = async () => {
    setConfirming(null);
    setIsMigrating(true);
    setStatus("Starting migration...");
    try {
      let totalProcessed = 0;
      let lastVisible = null;
      let hasMore = true;
      const BATCH_LIMIT = 500;

      // Get actual total count for accurate progress bar
      setStatus("Calculating total businesses...");
      const countSnapshot = await getCountFromServer(collection(db, 'businesses'));
      const totalCount = countSnapshot.data().count;
      setProgress({ current: 0, total: totalCount });

      while (hasMore) {
        let q = query(collection(db, 'businesses'), limit(BATCH_LIMIT));
        if (lastVisible) {
          q = query(q, startAfter(lastVisible));
        }

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data() as Business;
          batch.update(docSnap.ref, {
            name_lowercase: data.name?.toLowerCase() || '',
            postcode_lowercase: data.postcode?.toLowerCase() || ''
          });
        });

        await batch.commit();
        totalProcessed += snapshot.docs.length;
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        setStatus(`Processed ${totalProcessed} of ${totalCount} businesses...`);
        setProgress({ current: totalProcessed, total: totalCount });

        if (snapshot.docs.length < BATCH_LIMIT) {
          hasMore = false;
        }
      }

      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `fixed search index for ${totalProcessed} businesses`,
        timestamp: new Date().toISOString(),
      });

      setStatus(`Search index fixed successfully! Total: ${totalProcessed}`);
    } catch (error) {
      console.error("Migration failed", error);
      setStatus("Migration failed. Check console for details.");
    } finally {
      setIsMigrating(false);
    }
  };

  const fixInstructionRecordsIndex = async () => {
    setConfirming(null);
    setIsMigrating(true);
    setRecordStatus("Starting migration...");
    try {
      let totalProcessed = 0;
      let lastVisible = null;
      let hasMore = true;
      const BATCH_LIMIT = 100;

      // Get actual total count
      setRecordStatus("Calculating total records...");
      const countSnapshot = await getCountFromServer(collection(db, 'instructionRecords'));
      const totalCount = countSnapshot.data().count;
      setRecordProgress({ current: 0, total: totalCount });

      const businessCache = new Map<string, string>();

      while (hasMore) {
        let q = query(collection(db, 'instructionRecords'), limit(BATCH_LIMIT));
        if (lastVisible) {
          q = query(q, startAfter(lastVisible));
        }

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        const batch = writeBatch(db);
        
        // Process this batch
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as InstructionRecord;
          
          // Fetch business name if missing or just to be sure
          let bName = data.businessName || 'Unknown Business';
          if (data.businessId) {
            if (businessCache.has(data.businessId)) {
              bName = businessCache.get(data.businessId)!;
            } else if (!data.businessName) {
              const bDoc = await getDoc(doc(db, 'businesses', data.businessId));
              if (bDoc.exists()) {
                bName = bDoc.data().name;
                businessCache.set(data.businessId, bName);
              }
            } else {
              businessCache.set(data.businessId, data.businessName);
            }
          }
          
          batch.update(docSnap.ref, {
            businessName: bName,
            businessName_lowercase: bName.toLowerCase(),
            invoiceNumber_lowercase: data.invoiceNumber?.toLowerCase() || ''
          });
        }

        await batch.commit();
        totalProcessed += snapshot.docs.length;
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        setRecordStatus(`Processed ${totalProcessed} of ${totalCount} records...`);
        setRecordProgress({ current: totalProcessed, total: totalCount });

        if (snapshot.docs.length < BATCH_LIMIT) {
          hasMore = false;
        }
      }

      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `fixed search index for ${totalProcessed} instruction records`,
        timestamp: new Date().toISOString(),
      });

      setRecordStatus(`Instruction records index fixed successfully! Total: ${totalProcessed}`);
    } catch (error) {
      console.error("Migration failed", error);
      setRecordStatus("Migration failed. Check console for details.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="card p-8">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <RefreshCw className="w-5 h-5 text-tillmax-blue" />
        System Maintenance
      </h3>
      
      <div className="space-y-8">
        {/* Business Search Index Fix */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Fix Business Search Index</h4>
              <p className="text-sm text-slate-500">Updates all businesses with lowercase fields to enable case-insensitive search and postcode search.</p>
            </div>
            {!confirming && !isMigrating && (
              <button 
                onClick={() => setConfirming('businesses')}
                className="btn-primary flex items-center gap-2 px-8 whitespace-nowrap"
              >
                <Search className="w-5 h-5" />
                Fix Search Index
              </button>
            )}
            {confirming === 'businesses' && (
              <div className="flex items-center gap-3">
                <button onClick={() => setConfirming(null)} className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700">Cancel</button>
                <button onClick={fixSearchIndex} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">Confirm Fix</button>
              </div>
            )}
            {isMigrating && status && !status.includes('successfully') && (
              <div className="flex items-center gap-2 text-tillmax-blue font-bold">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing...
              </div>
            )}
          </div>
          
          {isMigrating && status && !status.includes('successfully') && progress.total > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>{status}</span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-tillmax-blue transition-all duration-300" 
                  style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {status && status.includes('successfully') && (
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-bold">
              <CheckCircle className="w-5 h-5" />
              {status}
            </div>
          )}
        </div>

        {/* Instruction Records Search Index Fix */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Fix Instruction Records Search Index</h4>
              <p className="text-sm text-slate-500">Updates all instruction records with business names and lowercase fields for better searchability.</p>
            </div>
            {!confirming && !isMigrating && (
              <button 
                onClick={() => setConfirming('records')}
                className="btn-primary flex items-center gap-2 px-8 whitespace-nowrap"
              >
                <FileText className="w-5 h-5" />
                Fix Records Index
              </button>
            )}
            {confirming === 'records' && (
              <div className="flex items-center gap-3">
                <button onClick={() => setConfirming(null)} className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700">Cancel</button>
                <button onClick={fixInstructionRecordsIndex} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">Confirm Fix</button>
              </div>
            )}
            {isMigrating && recordStatus && !recordStatus.includes('successfully') && (
              <div className="flex items-center gap-2 text-tillmax-blue font-bold">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing...
              </div>
            )}
          </div>
          
          {isMigrating && recordStatus && !recordStatus.includes('successfully') && recordProgress.total > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>{recordStatus}</span>
                <span>{Math.round((recordProgress.current / recordProgress.total) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-tillmax-blue transition-all duration-300" 
                  style={{ width: `${Math.min(100, (recordProgress.current / recordProgress.total) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {recordStatus && recordStatus.includes('successfully') && (
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-bold">
              <CheckCircle className="w-5 h-5" />
              {recordStatus}
            </div>
          )}
        </div>

        {/* Test Data Generation */}
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900">Generate Test Data</h4>
              <p className="text-sm text-amber-700">Creates 15 UK businesses and 50 instruction records with mixed statuses for testing performance.</p>
            </div>
            
            {!confirming && !isMigrating && (
              <button 
                onClick={() => setConfirming('test-data')}
                className="px-8 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Generate Test Data
              </button>
            )}

            {confirming === 'test-data' && (
              <div className="flex items-center gap-3">
                <button onClick={() => setConfirming(null)} className="px-4 py-2 text-amber-500 font-bold hover:text-amber-700">Cancel</button>
                <button onClick={generateTestData} className="px-6 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-600/20">Confirm Generation</button>
              </div>
            )}

            {isMigrating && testStatus && !testStatus.includes('SUCCESS') && !testStatus.includes('ERROR') && (
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <RefreshCw className="w-5 h-5 animate-spin" />
                {testStatus}
              </div>
            )}
          </div>
          
          {testStatus && testStatus.includes('SUCCESS') && (
            <div className="mt-6 p-4 bg-white rounded-xl border border-amber-100 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold mb-3 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                {testStatus}
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Link 
                  to="/businesses" 
                  className="text-xs bg-tillmax-blue text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  View Businesses
                </Link>
                <Link 
                  to="/records" 
                  className="text-xs bg-tillmax-red text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 transition-colors"
                >
                  View Records
                </Link>
              </div>
            </div>
          )}

          {testStatus && testStatus.includes('ERROR') && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 text-red-600 text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {testStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LookupManagement = () => {
  const [activeLookup, setActiveLookup] = useState<'equipmentTypes' | 'salesPeople' | 'engineers' | 'softwareTypes'>('equipmentTypes');
  const [items, setItems] = useState<SimpleEntity[]>([]);
  const [newItem, setNewItem] = useState('');
  const { profile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, activeLookup), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimpleEntity)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, activeLookup);
    });
    return () => unsubscribe();
  }, [activeLookup]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    try {
      await addDoc(collection(db, activeLookup), { name: newItem.trim() });
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `added new ${activeLookup.slice(0, -1)}: ${newItem}`,
        timestamp: new Date().toISOString(),
      });
      setNewItem('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, activeLookup);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteDoc(doc(db, activeLookup, id));
        await addDoc(collection(db, 'logs'), {
          userId: profile?.uid,
          username: profile?.username,
          action: `deleted ${activeLookup.slice(0, -1)}: ${name}`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${activeLookup}/${id}`);
      }
    }
  };

  const tabs = [
    { id: 'equipmentTypes', label: 'Equipment', icon: Package },
    { id: 'salesPeople', label: 'Sales People', icon: UserIcon },
    { id: 'engineers', label: 'Engineers', icon: Wrench },
    { id: 'softwareTypes', label: 'Software', icon: Code },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
      <div className="lg:col-span-1 space-y-2">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveLookup(tab.id as any)}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
              activeLookup === tab.id ? "bg-tillmax-blue text-white shadow-lg shadow-tillmax-blue/20" : "bg-white text-slate-500 hover:bg-slate-100"
            )}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Manage {tabs.find(t => t.id === activeLookup)?.label}</h3>
          <form onSubmit={handleAdd} className="flex gap-3 mb-8">
            <input 
              required
              type="text" 
              placeholder={`Add new ${activeLookup.slice(0, -1)}...`} 
              className="input-field" 
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
            />
            <button type="submit" className="btn-primary flex items-center gap-2 px-8">
              <Plus className="w-5 h-5" />
              Add
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-tillmax-blue transition-all">
                <span className="font-bold text-slate-700">{item.name}</span>
                <button 
                  onClick={() => handleDelete(item.id!, item.name)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="col-span-full py-10 text-center text-slate-400 italic">
                No items found. Add one above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
