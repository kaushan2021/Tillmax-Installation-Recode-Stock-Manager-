import React, { useState, useEffect } from 'react';
import { secondaryAuth, createUserWithEmailAndPassword, db, handleFirestoreError, OperationType } from '../firebase';
import { setDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../AuthProvider';
import { UserProfile, SimpleEntity, UserRole } from '../types';
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
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';

export const AdminPanel = () => {
  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'lookups'>('users');
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
        </div>
      </div>

      {activeTab === 'users' ? <UserManagement users={users} loading={loading} /> : <LookupManagement />}
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
