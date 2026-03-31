import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  ClipboardList, 
  RefreshCw, 
  Users, 
  TrendingUp, 
  AlertCircle,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Business, InstallationRecord } from '../types';
import { formatDate, parseDate } from '../lib/utils';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalInstallations: 0,
    upcomingRenewals: 0,
    activeSupport: 0
  });
  const [recentInstallations, setRecentInstallations] = useState<InstallationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [businessesSnap, installationsSnap] = await Promise.all([
          getDocs(collection(db, 'businesses')),
          getDocs(collection(db, 'installationRecords'))
        ]);

        const businesses = businessesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
        const installations = installationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstallationRecord));

        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

        const upcoming = installations.filter(r => r.supportEndDate && r.supportEndDate <= thirtyDaysStr && r.supportEndDate >= now.toISOString().split('T')[0]).length;
        const active = installations.filter(r => r.supportEndDate && r.supportEndDate >= now.toISOString().split('T')[0]).length;

        setStats({
          totalBusinesses: businesses.length,
          totalInstallations: installations.length,
          upcomingRenewals: upcoming,
          activeSupport: active
        });

        // Get 5 most recent installations
        const recent = installations
          .sort((a, b) => new Date(b.installationDate).getTime() - new Date(a.installationDate).getTime())
          .slice(0, 5);
        
        setRecentInstallations(recent);
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { name: 'Total Businesses', value: stats.totalBusinesses, icon: Building2, color: 'bg-blue-500', trend: '+12%', trendUp: true },
    { name: 'Total Installations', value: stats.totalInstallations, icon: ClipboardList, color: 'bg-indigo-500', trend: '+5%', trendUp: true },
    { name: 'Upcoming Renewals', value: stats.upcomingRenewals, icon: RefreshCw, color: 'bg-amber-500', trend: '-2%', trendUp: false },
    { name: 'Active Support', value: stats.activeSupport, icon: TrendingUp, color: 'bg-emerald-500', trend: '+8%', trendUp: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Dashboard</h1>
          <p className="text-slate-500 font-medium">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <Calendar className="w-5 h-5 text-slate-400 ml-2" />
          <span className="text-sm font-bold text-slate-700 pr-4">{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={stat.color + " w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${stat.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-bold mb-1 uppercase tracking-wider">{stat.name}</h3>
            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recent Installations</h2>
            <Link to="/installations" className="text-tillmax-blue font-bold text-sm hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Business</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentInstallations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-tillmax-blue transition-colors">{item.businessName || 'Unknown Business'}</div>
                        <div className="text-xs text-slate-500">{item.softwareType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-600">{formatDate(item.installationDate)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                          {item.supportStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-bold text-slate-900">#{item.invoiceNumber}</div>
                      </td>
                    </tr>
                  ))}
                  {recentInstallations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        No recent installations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4">
            <Link 
              to="/businesses" 
              className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-tillmax-blue hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-tillmax-blue group-hover:text-white transition-colors">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">Add New Business</h3>
                <p className="text-xs text-slate-500">Register a new client business</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-tillmax-blue" />
            </Link>

            <Link 
              to="/installations" 
              className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-tillmax-blue hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-tillmax-blue group-hover:text-white transition-colors">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">New Installation</h3>
                <p className="text-xs text-slate-500">Record a new system setup</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-tillmax-blue" />
            </Link>

            <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-xl font-black mb-2 tracking-tight">Need Support?</h3>
                <p className="text-slate-400 text-sm mb-6 font-medium">Check our documentation or contact the system administrator.</p>
                <button className="px-6 py-2 bg-white text-slate-900 font-black text-sm rounded-xl hover:bg-slate-100 transition-all">
                  Get Help
                </button>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-tillmax-blue/20 rounded-full blur-3xl group-hover:bg-tillmax-blue/40 transition-all"></div>
              <AlertCircle className="absolute top-4 right-4 w-12 h-12 text-white/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
