import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Search, 
  Plus, 
  ChevronRight, 
  History, 
  CreditCard, 
  UserPlus, 
  Shield, 
  Menu, 
  X,
  Phone,
  MapPin,
  Mail,
  User as UserIcon,
  Package,
  Wrench,
  Code,
  Tag,
  Monitor,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Trash2,
  Edit2,
  Save,
  MoreVertical,
  Download,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  serverTimestamp,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { AuthProvider, useAuth } from './AuthProvider';
import { Business, InstructionRecord, UserProfile, LogEntry, SimpleEntity, UserRole } from './types';
import { format, addYears, isAfter, parseISO, addMonths } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Import components
import { BusinessForm } from './components/BusinessForm';
import { BusinessDetail } from './components/BusinessDetail';
import { InstructionRecordForm } from './components/InstructionRecordForm';
import { AdminPanel } from './components/AdminPanel';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center", className)}>
    <svg viewBox="0 0 460 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-12 w-auto overflow-visible">
      {/* 3x3 Grid of Squares */}
      <rect x="10" y="20" width="22" height="22" rx="4" fill="#E31E24" />
      <rect x="42" y="20" width="22" height="22" rx="4" fill="#E31E24" />
      <rect x="74" y="20" width="22" height="22" rx="4" fill="#E31E24" />
      
      <rect x="10" y="52" width="22" height="22" rx="4" fill="#2E3192" />
      <rect x="42" y="52" width="22" height="22" rx="4" fill="#E31E24" />
      <rect x="74" y="52" width="22" height="22" rx="4" fill="#2E3192" />
      
      <rect x="10" y="84" width="22" height="22" rx="4" fill="#2E3192" />
      <rect x="42" y="84" width="22" height="22" rx="4" fill="#2E3192" />
      <rect x="74" y="84" width="22" height="22" rx="4" fill="#2E3192" />

      {/* TILLMAX Text */}
      <text x="110" y="75" fontFamily="Arial, sans-serif" fontSize="68" fontWeight="900" letterSpacing="-2">
        <tspan fill="#2E3192">TILL</tspan>
        <tspan fill="#E31E24">MAX</tspan>
      </text>

      {/* Subtitle with lines */}
      <line x1="110" y1="95" x2="145" y2="95" stroke="#E31E24" strokeWidth="1" />
      <text x="155" y="100" fontFamily="Arial, sans-serif" fontSize="20" fill="#333" letterSpacing="2">
        Quality Comes First
      </text>
      <line x1="345" y1="95" x2="380" y2="95" stroke="#E31E24" strokeWidth="1" />
      
      {/* Registered Trademark Symbol */}
      <text x="385" y="25" fontFamily="Arial, sans-serif" fontSize="14" fill="#E31E24">®</text>
    </svg>
  </div>
);

const SidebarLink: React.FC<{ to: string, icon: any, label: string, active?: boolean }> = ({ to, icon: Icon, label, active }) => (
  <Link 
    to={to} 
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
      active ? "bg-tillmax-blue text-white shadow-md shadow-tillmax-blue/20" : "text-slate-500 hover:bg-slate-100 hover:text-tillmax-blue"
    )}
  >
    <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", active ? "text-white" : "text-slate-400 group-hover:text-tillmax-blue")} />
    <span className="font-medium">{label}</span>
  </Link>
);

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex items-center gap-3">{action}</div>}
  </div>
);

// --- Pages ---

const Login = () => {
  const { user, profile, loading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user && profile) {
      navigate('/');
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    setIsLoggingIn(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error("Login failed", err);
      const isUserNotFound = err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential';
      if (isUserNotFound && email === 'pasi@tillmax.co.uk') {
        setError("Admin account not found or invalid credentials. If this is your first time, click below to bootstrap the system.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. If you forgot your password, click 'Forgot Password' below.");
      } else {
        setError(err.message || "Invalid email or password");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBootstrap = async () => {
    if (email !== 'pasi@tillmax.co.uk') return;
    setIsBootstrapping(true);
    setError(null);
    try {
      const { createUserWithEmailAndPassword } = await import('./firebase');
      await createUserWithEmailAndPassword(auth, email, password);
      // AuthProvider will handle profile creation
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This admin account already exists. Please use the correct password to sign in. If you forgot it, use the 'Forgot Password' button.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return setError("Please enter your email address first.");
    setIsResetting(true);
    setError(null);
    try {
      const { sendPasswordResetEmail } = await import('./firebase');
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div>
  </div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-slate-200 p-10 text-center border border-slate-100"
      >
        <Logo className="justify-center mb-10 scale-125" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
        <p className="text-slate-500 mb-8">Sign in with your Tillmax credentials.</p>
        
        {user && !profile ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Access Denied</p>
              <p>Your account ({user.email}) is not authorized to access this system. Please contact an administrator.</p>
              <button onClick={logout} className="mt-2 font-bold underline">Sign Out</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Email Address</label>
              <input 
                type="email" 
                required
                className="input-field w-full" 
                placeholder="pasi@tillmax.co.uk"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Password</label>
              <input 
                type="password" 
                required
                className="input-field w-full" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {resetSent && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Password reset email sent! Please check your inbox.
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-tillmax-blue hover:bg-tillmax-blue/90 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-tillmax-blue/20 disabled:opacity-50"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="flex justify-center">
              <button 
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting}
                className="text-xs font-bold text-slate-400 hover:text-tillmax-blue transition-colors disabled:opacity-50"
              >
                {isResetting ? 'Sending...' : 'Forgot Password?'}
              </button>
            </div>

            {error?.includes('bootstrap') && (
              <button 
                type="button"
                onClick={handleBootstrap}
                disabled={isBootstrapping}
                className="w-full mt-4 border-2 border-tillmax-blue text-tillmax-blue hover:bg-tillmax-blue hover:text-white font-bold py-3 px-6 rounded-2xl transition-all disabled:opacity-50"
              >
                {isBootstrapping ? 'Bootstrapping...' : 'Create First Admin Account'}
              </button>
            )}
          </form>
        )}
        
        <div className="mt-10 pt-8 border-t border-slate-100">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Tillmax LTD &copy; 2026</p>
        </div>
      </motion.div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/records', icon: FileText, label: 'Instruction Records' },
    { to: '/businesses', icon: Package, label: 'Businesses' },
  ];

  if (profile?.role === 'ADMIN') {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin Panel' });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <Logo className="scale-75 origin-left" />
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(mobileMenuOpen || window.innerWidth >= 768) && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "bg-white border-r border-slate-200 w-72 flex-shrink-0 flex flex-col fixed md:sticky top-0 h-screen z-40 transition-transform",
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}
          >
            <div className="p-8 hidden md:block">
              <Logo />
            </div>
            
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {navItems.map(item => {
                const { to, icon, label } = item;
                return (
                  <SidebarLink 
                    key={to} 
                    to={to}
                    icon={icon}
                    label={label}
                    active={location.pathname === to} 
                  />
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-tillmax-blue rounded-full flex items-center justify-center text-white font-bold">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{profile?.username}</p>
                  <p className="text-[10px] font-bold text-tillmax-blue uppercase tracking-wider">{profile?.role}</p>
                </div>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-tillmax-red hover:bg-red-50 rounded-xl transition-all group"
              >
                <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

// --- Dashboard ---

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalRecords: 0,
    paymentDue: 0,
    activeSupport: 0,
    expiringSoon: 0,
    expiredSupport: 0
  });

  useEffect(() => {
    if (!profile) return;
    let unsubscribe: () => void = () => {};

    if (profile?.role === 'ADMIN') {
      const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(10));
      unsubscribe = onSnapshot(q, (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'logs');
      });
    }

    // Fetch stats (simplified for now)
    const fetchStats = async () => {
      try {
        const businesses = await getDocs(collection(db, 'businesses'));
        const records = await getDocs(collection(db, 'instructionRecords'));
        
        let due = 0;
        let active = 0;
        let expiring = 0;
        let expired = 0;
        const now = new Date();
        const nextMonth = addMonths(now, 1);

        records.docs.forEach(d => {
          const data = d.data() as InstructionRecord;
          if (data.paymentStatus === 'Payment due') due += data.paymentDueAmount || 0;
          try {
            if (data.supportEndDate) {
              const endDate = parseISO(data.supportEndDate);
              if (isAfter(endDate, now)) {
                active++;
                if (!isAfter(endDate, nextMonth)) {
                  expiring++;
                }
              } else {
                expired++;
              }
            } else {
              expired++;
            }
          } catch (e) {
            console.warn("Invalid date in record:", data.supportEndDate);
          }
        });

        setStats({
          totalBusinesses: businesses.size,
          totalRecords: records.size,
          paymentDue: due,
          activeSupport: active,
          expiringSoon: expiring,
          expiredSupport: expired
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'stats');
      }
    };

    fetchStats();
    return () => unsubscribe();
  }, [profile]);

  return (
    <div>
      <PageHeader 
        title={`Welcome back, ${profile?.username}`} 
        subtitle="Here's what's happening with Tillmax records today."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div 
          className="card p-4 flex items-center gap-3 border-l-4 border-tillmax-blue cursor-pointer hover:bg-blue-50/50 transition-all"
          onClick={() => navigate('/businesses')}
        >
          <div className="w-10 h-10 bg-tillmax-blue/10 rounded-xl flex items-center justify-center text-tillmax-blue shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Total Businesses</p>
            <p className="text-xl font-bold text-slate-900">{stats.totalBusinesses}</p>
          </div>
        </div>
        <div 
          className="card p-4 flex items-center gap-3 border-l-4 border-emerald-500 cursor-pointer hover:bg-emerald-50/50 transition-all"
          onClick={() => navigate('/records')}
        >
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Total Records</p>
            <p className="text-xl font-bold text-slate-900">{stats.totalRecords}</p>
          </div>
        </div>
        <div 
          className="card p-4 flex items-center gap-3 border-l-4 border-tillmax-red cursor-pointer hover:bg-red-50/50 transition-all"
          onClick={() => navigate('/records?status=Payment due')}
        >
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-tillmax-red shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Payments Due</p>
            <p className="text-xl font-bold text-slate-900">£{stats.paymentDue.toLocaleString()}</p>
          </div>
        </div>
        <div 
          className="card p-4 flex items-center gap-3 border-l-4 border-amber-500 cursor-pointer hover:bg-amber-50/50 transition-all"
          onClick={() => navigate('/records?filter=expiring')}
        >
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Expiring Soon</p>
            <p className="text-xl font-bold text-slate-900">{stats.expiringSoon}</p>
          </div>
        </div>
        <div 
          className="card p-4 flex items-center gap-3 border-l-4 border-red-600 cursor-pointer hover:bg-red-50/50 transition-all"
          onClick={() => navigate('/records?filter=expired')}
        >
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Expired Support</p>
            <p className="text-xl font-bold text-slate-900">{stats.expiredSupport}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 border-l-4 border-indigo-500">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Active Support</p>
            <p className="text-xl font-bold text-slate-900">{stats.activeSupport}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-tillmax-blue" />
                Recent Activity Logs
              </h3>
            </div>
            <div className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <div className="p-10 text-center text-slate-400">No recent activity</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs">
                        {log.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          <span className="font-bold">{log.username}</span> {log.action}
                        </p>
                        <p className="text-xs text-slate-400">{log.timestamp ? format(new Date(log.timestamp), 'MMM d, h:mm a') : 'Just now'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card bg-tillmax-blue text-white p-8 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Need Help?</h3>
              <p className="text-blue-100 text-sm mb-6">Access the Tillmax internal knowledge base or contact the IT administrator.</p>
              <button className="bg-white text-tillmax-blue font-bold py-2 px-6 rounded-xl text-sm hover:bg-blue-50 transition-colors">
                View Documentation
              </button>
            </div>
            <Shield className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 rotate-12" />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Business Management ---

const Businesses = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'businesses'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBusinesses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'businesses');
    });
    return () => unsubscribe();
  }, [profile]);

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
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `businesses/${businessToDelete.id}`);
    }
  };

  const filtered = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    b.postcode.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="card p-4 mb-8 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by business name or postcode..." 
          className="flex-1 outline-none text-slate-900"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(business => (
            <motion.div 
              layout
              key={business.id} 
              className="card hover:border-tillmax-blue transition-all cursor-pointer group"
              onClick={() => navigate(`/businesses/${business.id}`)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-tillmax-blue group-hover:text-white transition-colors">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setBusinessToDelete({ id: business.id!, name: business.name });
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete Business"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-tillmax-blue group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{business.name}</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                  <MapPin className="w-4 h-4" />
                  {business.postcode}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <UserIcon className="w-3 h-3" />
                    {business.ownerName}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3 h-3" />
                    {business.telephone}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center card bg-slate-50 border-dashed">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No businesses found matching your search.</p>
            </div>
          )}
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
                Are you sure you want to delete <span className="font-bold text-slate-900">{businessToDelete.name}</span>? This will NOT delete its instruction records, but the business profile will be removed.
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

// --- Instruction Records List ---

const InstructionRecords = () => {
  const [records, setRecords] = useState<(InstructionRecord & { businessName?: string })[]>([]);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const quickFilter = searchParams.get('filter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();

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

  useEffect(() => {
    if (!profile) return;
    let unsubscribeRecords: () => void;
    
    const setupListeners = async () => {
      try {
        // Fetch businesses once for the map
        const businessesSnap = await getDocs(collection(db, 'businesses'));
        const businessMap = new Map(businessesSnap.docs.map(d => [d.id, (d.data() as Business).name]));

        const q = query(collection(db, 'instructionRecords'), orderBy('installationDate', 'desc'));
        unsubscribeRecords = onSnapshot(q, (snapshot) => {
          const recordsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstructionRecord));
          
          setRecords(recordsData.map(r => ({
            ...r,
            businessName: businessMap.get(r.businessId) || 'Unknown Business'
          })));
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'instructionRecords');
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'instructionRecords-init');
        setError("Failed to initialize records view.");
        setLoading(false);
      }
    };

    setupListeners();
    return () => {
      if (unsubscribeRecords) unsubscribeRecords();
    };
  }, [profile]);

  const filtered = records.filter(r => {
    const matchesSearch = (r.businessName || '').toLowerCase().includes(search.toLowerCase()) || 
                         (r.invoiceNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || r.paymentStatus === statusFilter;
    
    let matchesQuickFilter = true;
    if (quickFilter === 'expiring') {
      const now = new Date();
      const nextMonth = addMonths(now, 1);
      try {
        if (r.supportEndDate) {
          const endDate = parseISO(r.supportEndDate);
          matchesQuickFilter = isAfter(endDate, now) && !isAfter(endDate, nextMonth);
        } else {
          matchesQuickFilter = false;
        }
      } catch (e) {
        matchesQuickFilter = false;
      }
    } else if (quickFilter === 'expired') {
      const now = new Date();
      try {
        if (r.supportEndDate) {
          const endDate = parseISO(r.supportEndDate);
          matchesQuickFilter = !isAfter(endDate, now);
        } else {
          matchesQuickFilter = true; // No end date means expired/not set
        }
      } catch (e) {
        matchesQuickFilter = true;
      }
    }

    return matchesSearch && matchesStatus && matchesQuickFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div>
      </div>
    );
  }

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
    <div>
      <PageHeader 
        title="Instruction Records" 
        subtitle="View and manage all installation records."
      />

      <div className="card p-4 mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 flex items-center gap-3 w-full">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by business name or invoice number..." 
            className="flex-1 outline-none text-slate-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {statusFilter && (
          <div className="flex items-center gap-2 bg-tillmax-red/10 text-tillmax-red px-4 py-2 rounded-xl text-sm font-bold">
            <Filter className="w-4 h-4" />
            Status: {statusFilter}
            <button 
              onClick={() => {
                searchParams.delete('status');
                setSearchParams(searchParams);
              }}
              className="ml-2 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {quickFilter === 'expiring' && (
          <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-sm font-bold">
            <Clock className="w-4 h-4" />
            Expiring within 30 days
            <button 
              onClick={() => {
                searchParams.delete('filter');
                setSearchParams(searchParams);
              }}
              className="ml-2 hover:text-amber-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {quickFilter === 'expired' && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold">
            <AlertCircle className="w-4 h-4" />
            Support Expired
            <button 
              onClick={() => {
                searchParams.delete('filter');
                setSearchParams(searchParams);
              }}
              className="ml-2 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Business</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Install Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Support Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Renewal</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Payment</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(record => {
              const isSupportActive = record.supportEndDate && isAfter(parseISO(record.supportEndDate), new Date());
              return (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    {record.businessId ? (
                      <Link to={`/businesses/${record.businessId}`} className="font-bold text-slate-900 hover:text-tillmax-blue transition-colors">
                        {record.businessName}
                      </Link>
                    ) : (
                      <span className="font-bold text-slate-900">{record.businessName}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">{record.invoiceNumber}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {(() => {
                      try {
                        return record.installationDate ? format(parseISO(record.installationDate), 'MMM d, yyyy') : 'N/A';
                      } catch (e) {
                        return 'Invalid Date';
                      }
                    })()}
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
                    {record.renewalInformed ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-tillmax-blue uppercase tracking-widest">Informed</span>
                        <span className="text-[10px] text-slate-400">{record.renewalInformedMethod}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-sm font-bold",
                      record.paymentStatus === 'Payment cleared' ? "text-emerald-600" : "text-tillmax-red"
                    )}>
                      {record.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && (
                        <button 
                          onClick={() => setRecordToDelete({ id: record.id!, invoice: record.invoiceNumber })}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <Link to={`/records/${record.id}/edit`} className="p-2 text-slate-400 hover:text-tillmax-blue transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <div className="p-20 text-center text-slate-400">No records found.</div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {recordToDelete && (
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div>
    </div>
  );

  if (!user || !profile) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/businesses" element={<Businesses />} />
        <Route path="/businesses/:id" element={<BusinessDetail />} />
        <Route path="/businesses/:id/edit" element={<BusinessForm />} />
        <Route path="/businesses/new" element={<BusinessForm />} />
        <Route path="/records" element={<InstructionRecords />} />
        <Route path="/records/:id/edit" element={<InstructionRecordForm />} />
        <Route path="/records/new" element={<InstructionRecordForm />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
