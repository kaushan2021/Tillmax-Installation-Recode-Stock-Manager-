import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  Phone, 
  History, 
  Shield 
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, getCountFromServer, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthProvider';
import { InstallationRecord, LogEntry } from '../types';
import { addMonths } from 'date-fns';
import { formatDateTime } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from './PageHeader';

const Dashboard: React.FC = () => {
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

        // Use getCountFromServer for total counts (very fast)
        const [businessesCount, recordsCount] = await Promise.all([
          getCountFromServer(collection(db, 'businesses')),
          getCountFromServer(collection(db, 'installationRecords'))
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
          expiredSupport: expiredCount.data().count
        });
      } catch (error) {
        console.error("Stats fetch error:", error);
        // Fallback to 0 if stats fail
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
                        <p className="text-xs text-slate-400">{log.timestamp ? formatDateTime(log.timestamp) : 'Just now'}</p>
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

export default Dashboard;
