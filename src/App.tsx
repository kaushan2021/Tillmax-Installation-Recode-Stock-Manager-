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
  Database,
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
  Filter,
  RefreshCw,
  MessageSquare,
  TrendingUp
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
  getDocs,
  getCountFromServer,
  startAfter,
  or,
  and
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { AuthProvider, useAuth } from './AuthProvider';
import { Business, InstallationRecord, UserProfile, LogEntry, SimpleEntity, UserRole } from './types';
import { addYears, isAfter, addMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { cn, formatDate, parseDate, formatDateTime } from './lib/utils';

// Import components
import { AdminPanel } from './components/AdminPanel';
import { StockManagement } from './components/StockManagement';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallationEdit } from './components/InstallationEdit';
import { BusinessDetail } from './components/BusinessDetail';
import { BusinessEdit } from './components/BusinessEdit';

// --- Components ---

const LoadingScreen = ({ message = "Authenticating..." }: { message?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
      className="mb-12"
    >
      <Logo className="scale-150" />
    </motion.div>
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-tillmax-blue rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">{message}</p>
    </div>
  </div>
);

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

      {/* TILLMAX LTD Text */}
      <text x="110" y="75" fontFamily="Arial, sans-serif" fontSize="68" fontWeight="900" letterSpacing="-2">
        <tspan fill="#2E3192">TILL</tspan>
        <tspan fill="#E31E24">MAX</tspan>
        <tspan fill="#2E3192" fontSize="32" dx="8" dy="-20">LTD</tspan>
      </text>

      {/* Subtitle with lines */}
      <line x1="110" y1="95" x2="145" y2="95" stroke="#E31E24" strokeWidth="1" />
      <text x="155" y="100" fontFamily="Arial, sans-serif" fontSize="20" fill="#333" letterSpacing="2">
        Quality Comes First
      </text>
      <line x1="345" y1="95" x2="380" y2="95" stroke="#E31E24" strokeWidth="1" />
      
      {/* Registered Trademark Symbol */}
      <text x="410" y="25" fontFamily="Arial, sans-serif" fontSize="14" fill="#E31E24">®</text>
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
      // Successful login - the AppRoutes will handle the switch to Layout
      // but we force a navigation to dashboard to clear any previous restricted URL
      navigate('/', { replace: true });
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

  if (loading || isLoggingIn) return <LoadingScreen message={isLoggingIn ? "Signing you in..." : "Authenticating..."} />;

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
                placeholder="Email"
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
                placeholder="Password"
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
    { to: '/records', icon: FileText, label: 'Installation Records' },
    { to: '/businesses', icon: Package, label: 'Businesses' },
    { to: '/stock', icon: Database, label: 'Stock Management' },
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalRecords: 0,
    paymentDue: 0,
    activeSupport: 0,
    expiringSoon: 0,
    expiredSupport: 0,
    monthlyRecords: 0
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profile) return;
    let unsubscribe: () => void = () => {};

    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(10));
    unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as LogEntry)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'logs');
    });

    // Fetch stats (optimized for performance)
    const fetchStats = async () => {
      try {
        const now = new Date();
        const nextMonth = addMonths(now, 1);
        const nowIso = now.toISOString();
        const nextMonthIso = nextMonth.toISOString();
        
        const monthStart = startOfMonth(now).toISOString();
        const monthEnd = endOfMonth(now).toISOString();

        // Use getCountFromServer for total counts (very fast)
        const [businessesCount, recordsCount, monthlyCount] = await Promise.all([
          getCountFromServer(collection(db, 'businesses')),
          getCountFromServer(collection(db, 'installationRecords')),
          getCountFromServer(query(collection(db, 'installationRecords'), where('installationDate', '>=', monthStart), where('installationDate', '<=', monthEnd)))
        ]);

        // Targeted queries for support status counts
        const [activeCount, expiringCount, expiredCount] = await Promise.all([
          getCountFromServer(query(collection(db, 'installationRecords'), where('supportEndDate', '>', nowIso))),
          getCountFromServer(query(collection(db, 'installationRecords'), where('supportEndDate', '>', nowIso), where('supportEndDate', '<=', nextMonthIso))),
          getCountFromServer(query(collection(db, 'installationRecords'), where('supportEndDate', '<=', nowIso)))
        ]);

        // For payment due, we still need to fetch to sum the amounts
        // But we only fetch the records that ARE due, not all 100k
        const dueQuery = query(collection(db, 'installationRecords'), where('paymentStatus', '==', 'Payment due'));
        const dueSnap = await getDocs(dueQuery);
        let dueAmount = 0;
        dueSnap.forEach(d => {
          dueAmount += (d.data() as InstallationRecord).paymentDueAmount || 0;
        });

        setStats({
          totalBusinesses: businessesCount.data().count,
          totalRecords: recordsCount.data().count,
          paymentDue: dueAmount,
          activeSupport: activeCount.data().count,
          expiringSoon: expiringCount.data().count,
          expiredSupport: expiredCount.data().count,
          monthlyRecords: monthlyCount.data().count
        });
      } catch (error) {
        console.error("Stats fetch error:", error);
        // Fallback to 0 if stats fail
      }
    };

    fetchStats();
    return () => unsubscribe();
  }, [profile]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  } as const;

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  } as const;

  const quickActions = [
    { label: 'New Installation', icon: Plus, to: '/records/new', color: 'bg-tillmax-blue' },
    { label: 'Add Business', icon: UserPlus, to: '/businesses/new', color: 'bg-emerald-500' },
    { label: 'Check Stock', icon: Database, to: '/stock', color: 'bg-amber-500' },
    { label: 'System Logs', icon: History, to: '/admin', color: 'bg-slate-700' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10"
    >
      <motion.div variants={itemVariants}>
        <PageHeader 
          title={`Welcome back, ${profile?.username}`} 
          subtitle="Here's what's happening with Tillmax records today."
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Businesses', value: stats.totalBusinesses, icon: Package, color: 'tillmax-blue', bg: 'bg-tillmax-blue/10', text: 'text-tillmax-blue', border: 'border-tillmax-blue', path: '/businesses' },
          { label: 'Total Records', value: stats.totalRecords, icon: FileText, color: 'emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500', path: '/records' },
          { label: 'Payments Due', value: `£${stats.paymentDue.toLocaleString()}`, icon: DollarSign, color: 'tillmax-red', bg: 'bg-tillmax-red/10', text: 'text-tillmax-red', border: 'border-tillmax-red', path: '/records?status=Payment due' },
          { label: 'Expiring Soon', value: stats.expiringSoon, icon: Clock, color: 'amber-500', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500', path: '/records?filter=expiring' },
          { label: 'Expired Support', value: stats.expiredSupport, icon: AlertCircle, color: 'red-600', bg: 'bg-red-600/10', text: 'text-red-600', border: 'border-red-600', path: '/records?filter=expired' },
          { label: 'Active Support', value: stats.activeSupport, icon: Phone, color: 'indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500', path: '/records' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={cn(
              "card p-6 flex items-center gap-5 border-l-4 cursor-pointer group transition-all relative overflow-hidden",
              stat.border
            )}
            onClick={() => navigate(stat.path)}
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300 shadow-lg",
              stat.bg, stat.text
            )}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div className="min-w-0 relative z-10">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
            </div>
            <div className={cn(
              "absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] transition-transform group-hover:scale-125 duration-500",
              stat.text
            )}>
              <stat.icon className="w-full h-full" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <motion.div variants={itemVariants} className="card border-none shadow-xl shadow-slate-200/50">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-black text-slate-900 flex items-center gap-3 uppercase tracking-wider text-sm">
                <div className="w-8 h-8 bg-tillmax-blue/10 rounded-lg flex items-center justify-center">
                  <History className="w-4 h-4 text-tillmax-blue" />
                </div>
                Recent Activity Logs
              </h3>
              <button className="text-xs font-bold text-tillmax-blue hover:underline">View All Logs</button>
            </div>
            <div className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-medium">No recent activity found</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <motion.div 
                    key={log.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-black text-xs shadow-sm group-hover:border-tillmax-blue group-hover:text-tillmax-blue transition-all">
                          {log.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">
                          <span className="font-black text-slate-900">{log.username}</span> {log.action}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {log.timestamp ? formatDateTime(log.timestamp) : 'Just now'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <div className="space-y-8">
          <motion.div variants={itemVariants} className="card p-8 bg-slate-900 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                  <Calendar className="w-7 h-7 text-tillmax-red animate-pulse" />
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black tracking-tighter text-tillmax-red drop-shadow-[0_0_10px_rgba(238,28,37,0.3)]">{format(currentTime, 'HH:mm:ss')}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{format(currentTime, 'EEEE, MMMM do')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-3xl p-6 border border-white/10 relative overflow-hidden group/card">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Monthly Performance</p>
                  <div className="flex items-end justify-between relative z-10">
                    <div>
                      <p className="text-5xl font-black text-tillmax-blue tracking-tight drop-shadow-[0_0_15px_rgba(0,51,153,0.4)]">{stats.monthlyRecords}</p>
                      <p className="text-xs font-bold text-slate-400 mt-2">Installations this month</p>
                    </div>
                    <div className="w-14 h-14 bg-tillmax-blue/20 rounded-2xl flex items-center justify-center text-tillmax-blue border border-tillmax-blue/20 shadow-lg shadow-tillmax-blue/20 transition-transform group-hover/card:scale-110 duration-300">
                      <TrendingUp className="w-7 h-7" />
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-tillmax-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <span key={`${day}-${idx}`} className="text-[10px] font-black text-slate-600 mb-1">{day}</span>
                  ))}
                  {Array.from({ length: 31 }).map((_, i) => {
                    const day = i + 1;
                    const isToday = day === currentTime.getDate();
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "aspect-square flex items-center justify-center text-[10px] font-black rounded-xl transition-all duration-300",
                          isToday 
                            ? "bg-tillmax-red text-white shadow-[0_0_20px_rgba(238,28,37,0.4)] scale-110 ring-2 ring-white/20" 
                            : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                        )}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Dynamic Brand Accents */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-tillmax-red/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-tillmax-blue/20 rounded-full blur-[100px]"></div>
          </motion.div>

          <motion.div variants={itemVariants} className="card p-8 bg-gradient-to-br from-tillmax-blue to-blue-900 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Support Center
              </h3>
              <p className="text-blue-100/70 text-xs mb-6 leading-relaxed font-medium">Access technical documentation or contact the IT administrator for system assistance.</p>
              <button className="w-full bg-white text-tillmax-blue font-black py-3 px-6 rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl shadow-blue-950/50 active:scale-95">
                Open Documentation
              </button>
            </div>
            <Logo className="absolute -bottom-8 -right-8 w-48 h-48 opacity-10 -rotate-12 pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Business Management ---

const Businesses = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [postcodeSearch, setPostcodeSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();

  const PAGE_SIZE = 20;

  const fetchBusinesses = async (isNext = false) => {
    if (!profile) return;
    if (isNext) setLoadingMore(true);
    else setLoading(true);

    try {
      let q;
      if (search) {
        const s = search.toLowerCase();
        q = query(
          collection(db, 'businesses'),
          where('name_lowercase', '>=', s),
          where('name_lowercase', '<=', s + '\uf8ff'),
          orderBy('name_lowercase'),
          limit(PAGE_SIZE)
        );
      } else if (postcodeSearch) {
        const s = postcodeSearch.toLowerCase().replace(/\s+/g, '');
        q = query(
          collection(db, 'businesses'),
          where('postcode_normalized', '>=', s),
          where('postcode_normalized', '<=', s + '\uf8ff'),
          orderBy('postcode_normalized'),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'businesses'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      if (isNext && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newBusinesses = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Business));
      
      if (isNext) {
        setBusinesses(prev => [...prev, ...newBusinesses]);
      } else {
        setBusinesses(newBusinesses);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'businesses');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBusinesses();
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [search, postcodeSearch, profile]);

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

  const filtered = businesses.filter(b => {
    if (!search && !postcodeSearch) return true;
    const s = search.toLowerCase().replace(/\s+/g, '');
    const p = postcodeSearch.toLowerCase().replace(/\s+/g, '');
    const bName = (b.name || '').toLowerCase().replace(/\s+/g, '');
    const bPostcode = (b.postcode || '').toLowerCase().replace(/\s+/g, '');
    return (
      (search && bName.includes(s)) ||
      (postcodeSearch && bPostcode.includes(p))
    );
  });

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

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="card p-4 flex-1 flex items-center gap-3 relative">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by business name..." 
            className="flex-1 outline-none text-slate-900"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPostcodeSearch('');
            }}
          />
          {loading && search && (
            <RefreshCw className="w-4 h-4 text-tillmax-blue animate-spin absolute right-4" />
          )}
        </div>
        <div className="card p-4 flex-1 flex items-center gap-3 relative">
          <MapPin className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by postcode..." 
            className="flex-1 outline-none text-slate-900"
            value={postcodeSearch}
            onChange={(e) => {
              setPostcodeSearch(e.target.value);
              setSearch('');
            }}
          />
          {loading && postcodeSearch && (
            <RefreshCw className="w-4 h-4 text-tillmax-blue animate-spin absolute right-4" />
          )}
        </div>
      </div>

      {loading && businesses.length === 0 ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Business Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Postcode</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Telephone</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(business => (
                  <tr 
                    key={business.id} 
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/businesses/${business.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:bg-tillmax-blue group-hover:text-white transition-colors">
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900">{business.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {business.postcode}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {business.ownerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {business.telephone}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(business.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setBusinessToDelete({ id: business.id!, name: business.name });
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            title="Delete Business"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-tillmax-blue group-hover:translate-x-1 transition-all" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-20 text-center bg-slate-50 border-dashed border-t border-slate-100">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No businesses found matching your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="mt-12 flex justify-center">
          <button 
            onClick={() => fetchBusinesses(true)}
            disabled={loadingMore}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loadingMore ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {loadingMore ? 'Loading...' : 'Load More Businesses'}
          </button>
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
                Are you sure you want to delete <span className="font-bold text-slate-900">{businessToDelete.name}</span>? This will NOT delete its installation records, but the business profile will be removed.
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

// --- Installation Records List ---

const InstallationRecords = () => {
  const [records, setRecords] = useState<(InstallationRecord & { businessName?: string })[]>([]);
  const [search, setSearch] = useState('');
  const [postcodeSearch, setPostcodeSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const quickFilter = searchParams.get('filter');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();

  const PAGE_SIZE = 20;

  const fetchRecords = async (isNext = false) => {
    if (!profile) return;
    if (isNext) setLoadingMore(true);
    else setLoading(true);

    try {
      let q = query(collection(db, 'installationRecords'));

      // Server-side filtering
      if (statusFilter) {
        q = query(q, where('paymentStatus', '==', statusFilter));
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const nextMonth = addMonths(now, 1);
      const nextMonthIso = nextMonth.toISOString();

      if (quickFilter === 'expiring') {
        q = query(q, where('supportEndDate', '>', nowIso), where('supportEndDate', '<=', nextMonthIso));
      } else if (quickFilter === 'expired') {
        q = query(q, where('supportEndDate', '<=', nowIso));
      }

      // Server-side search
      if (search) {
        const s = search.toLowerCase();
        q = query(
          q, 
          where('businessName_lowercase', '>=', s), 
          where('businessName_lowercase', '<=', s + '\uf8ff'),
          orderBy('businessName_lowercase')
        );
      } else if (postcodeSearch) {
        const s = postcodeSearch.toLowerCase().replace(/\s+/g, '');
        
        // 1. Find businesses with this postcode first (more reliable for old records)
        const bQuery = query(
          collection(db, 'businesses'),
          where('postcode_normalized', '>=', s),
          where('postcode_normalized', '<=', s + '\uf8ff'),
          limit(30)
        );
        const bSnap = await getDocs(bQuery);
        const bIds = bSnap.docs.map(d => d.id);
        
        if (bIds.length > 0) {
          // 2. Find records for these businesses (limit to 10 for 'in' query)
          q = query(q, where('businessId', 'in', bIds.slice(0, 10)));
        } else {
          // 3. Fallback to direct search on records (for new records that have denormalized postcode)
          q = query(
            q, 
            where('postcode_normalized', '>=', s), 
            where('postcode_normalized', '<=', s + '\uf8ff')
          );
        }
      } else if (invoiceSearch) {
        const s = invoiceSearch.toLowerCase();
        q = query(
          q, 
          where('invoiceNumber_lowercase', '>=', s), 
          where('invoiceNumber_lowercase', '<=', s + '\uf8ff'),
          orderBy('invoiceNumber_lowercase')
        );
      } else {
        // Order and limit
        q = query(q, orderBy('installationDate', 'desc'));
      }

      q = query(q, limit(PAGE_SIZE));

      if (isNext && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const recordsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as InstallationRecord));
      
      console.log(`Fetched ${recordsData.length} records`);

      // Fetch business names and postcodes for these records only if not already present
      const businessIds = [...new Set(recordsData.filter(r => !r.businessName || !r.postcode).map(r => r.businessId))];
      const businessMap = new Map<string, { name: string, postcode: string }>();
      
      if (businessIds.length > 0) {
        await Promise.all(businessIds.map(async (bid) => {
          try {
            const bDoc = await getDoc(doc(db, 'businesses', bid));
            if (bDoc.exists()) {
              const bData = bDoc.data() as any;
              businessMap.set(bid, { name: bData.name, postcode: bData.postcode || '' });
            }
          } catch (err) {
            console.warn(`Failed to fetch business ${bid}:`, err);
          }
        }));
      }

      const enrichedRecords = recordsData.map(r => {
        const bInfo = businessMap.get(r.businessId);
        return {
          ...r,
          businessName: r.businessName || bInfo?.name || 'Unknown Business',
          postcode: r.postcode || bInfo?.postcode || ''
        };
      });

      if (isNext) {
        setRecords(prev => [...prev, ...enrichedRecords]);
      } else {
        setRecords(enrichedRecords);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'installationRecords');
      setError("Failed to load records. Please check your connection or permissions.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRecords();
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [search, postcodeSearch, invoiceSearch, statusFilter, quickFilter, profile]);

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
      fetchRecords(); // Refresh current view
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `installationRecords/${recordToDelete.id}`);
    }
  };

  const filtered = records.filter(r => {
    if (!search && !postcodeSearch && !invoiceSearch) return true;
    const s = search.toLowerCase().replace(/\s+/g, '');
    const p = postcodeSearch.toLowerCase().replace(/\s+/g, '');
    const i = invoiceSearch.toLowerCase().replace(/\s+/g, '');
    
    const recordName = (r.businessName || '').toLowerCase().replace(/\s+/g, '');
    const recordPostcode = (r.postcode || '').toLowerCase().replace(/\s+/g, '');
    const recordInvoice = (r.invoiceNumber || '').toLowerCase().replace(/\s+/g, '');

    return (
      (search && recordName.includes(s)) ||
      (postcodeSearch && recordPostcode.includes(p)) ||
      (invoiceSearch && recordInvoice.includes(i))
    );
  });

  if (loading && records.length === 0) {
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
        title="Installation Records" 
        subtitle="View and manage all installation records."
      />

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="card p-4 flex-1 flex items-center gap-3 relative">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by business name..." 
            className="flex-1 outline-none text-slate-900"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPostcodeSearch('');
              setInvoiceSearch('');
            }}
          />
          {loading && search && (
            <RefreshCw className="w-4 h-4 text-tillmax-blue animate-spin absolute right-4" />
          )}
        </div>
        <div className="card p-4 flex-1 flex items-center gap-3 relative">
          <MapPin className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by postcode..." 
            className="flex-1 outline-none text-slate-900"
            value={postcodeSearch}
            onChange={(e) => {
              setPostcodeSearch(e.target.value);
              setSearch('');
              setInvoiceSearch('');
            }}
          />
          {loading && postcodeSearch && (
            <RefreshCw className="w-4 h-4 text-tillmax-blue animate-spin absolute right-4" />
          )}
        </div>
        <div className="card p-4 flex-1 flex items-center gap-3 relative">
          <FileText className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by invoice number..." 
            className="flex-1 outline-none text-slate-900"
            value={invoiceSearch}
            onChange={(e) => {
              setInvoiceSearch(e.target.value);
              setSearch('');
              setPostcodeSearch('');
            }}
          />
          {loading && invoiceSearch && (
            <RefreshCw className="w-4 h-4 text-tillmax-blue animate-spin absolute right-4" />
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
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
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Payment</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-slate-400">No records found</td>
              </tr>
            ) : (
              filtered.map(record => {
                const isSupportActive = record.supportEndDate && isAfter(parseDate(record.supportEndDate), new Date());
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
                          return formatDate(record.installationDate);
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
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-sm font-bold",
                          record.paymentStatus === 'Payment cleared' ? "text-emerald-600" : "text-tillmax-red"
                        )}>
                          {record.paymentStatus}
                        </span>
                        {record.vatStatus && (
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {record.vatStatus}
                          </span>
                        )}
                      </div>
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
              })
            )}
          </tbody>
        </table>
        {hasMore && (
          <div className="p-4 border-t border-slate-100 flex justify-center">
            <button
              onClick={() => fetchRecords(true)}
              disabled={loadingMore}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load More Records'}
            </button>
          </div>
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
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user || !profile) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/businesses" element={<Businesses />} />
        <Route path="/businesses/new" element={<BusinessEdit />} />
        <Route path="/businesses/:id" element={<BusinessDetail />} />
        <Route path="/businesses/:id/edit" element={<BusinessEdit />} />
        <Route path="/records" element={<InstallationRecords />} />
        <Route path="/records/new" element={<InstallationEdit />} />
        <Route path="/records/:id/edit" element={<InstallationEdit />} />
        <Route 
          path="/admin" 
          element={isAdmin ? <AdminPanel /> : <Navigate to="/" replace />} 
        />
        <Route path="/stock" element={<StockManagement />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
