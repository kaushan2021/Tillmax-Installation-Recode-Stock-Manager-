import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType, auth as clientAuth } from '../firebase';
import { setDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, writeBatch, getDocs, limit, startAfter, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '../AuthProvider';
import { UserProfile, SimpleEntity, UserRole, Business, InstallationRecord, EmailTemplate, SystemSetting, Category, Supplier } from '../types';
import { 
  Users, 
  Shield, 
  ShieldAlert,
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
  Phone,
  User as UserIcon,
  Search,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  FileText,
  Download,
  Settings,
  History,
  Send,
  Copy,
  FileSpreadsheet,
  Check,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Filter,
  MapPin,
  Tag
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import { cn, formatDate, parseDate } from '../lib/utils';
import { useUserManagement } from '../hooks/useUserManagement';
import { UserForm } from './admin/UserForm';
import { UserList } from './admin/UserList';
import { ConfirmationModal } from './admin/ConfirmationModal';

export const AdminPanel = () => {
  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'lookups' | 'renewals' | 'templates' | 'settings' | 'maintenance'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      // Sort in memory instead to avoid filtering out users missing the 'username' field
      allUsers.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
      setUsers(allUsers);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return () => unsubscribe();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500 max-w-md">
            You do not have administrative privileges to access this panel.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'lookups', label: 'Lookup Tables', icon: Package },
    { id: 'renewals', label: 'Renewals', icon: RefreshCw },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'settings', label: 'SMTP Settings', icon: Settings },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-tillmax-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-tillmax-blue/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Control Panel</h1>
            <p className="text-slate-500 text-sm">Manage users, system settings, and maintenance</p>
          </div>
        </div>

        <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 shadow-sm gap-1">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
                activeTab === tab.id ? "bg-tillmax-blue text-white shadow-md" : "text-slate-500 hover:text-tillmax-blue"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users' && <UserManagement users={users} loading={loading} />}
      {activeTab === 'lookups' && <LookupManagement />}
      {activeTab === 'renewals' && <RenewalManagement onSwitchTab={setActiveTab} />}
      {activeTab === 'templates' && <TemplateManager />}
      {activeTab === 'settings' && <SmtpSettings />}
      {activeTab === 'maintenance' && <MaintenancePanel />}
    </div>
  );
};

const RenewalManagement = ({ onSwitchTab }: { onSwitchTab?: (tab: any) => void }) => {
  const [records, setRecords] = useState<InstallationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchRenewals = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

        // Query for records expiring soon or already expired
        const q = query(collection(db, 'installationRecords'), orderBy('supportEndDate', 'asc'));
        const snapshot = await getDocs(q);
        
        const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstallationRecord));
        
        // Filter: supportEndDate <= thirtyDaysStr
        const renewals = showAll ? allRecords : allRecords.filter(r => r.supportEndDate && r.supportEndDate <= thirtyDaysStr);

        // Fetch business details for each renewal record
        const businessesSnap = await getDocs(collection(db, 'businesses'));
        const businessesMap = new Map(businessesSnap.docs.map(doc => [doc.id, doc.data() as Business]));

        const enrichedRenewals = renewals.map(r => ({
          ...r,
          businessName: businessesMap.get(r.businessId)?.name || 'Unknown Business',
          businessEmail: businessesMap.get(r.businessId)?.email || 'N/A',
          businessContact: businessesMap.get(r.businessId)?.contactNumber || 'N/A'
        }));

        setRecords(enrichedRenewals as any);

        // Fetch templates
        const tSnap = await getDocs(query(collection(db, 'emailTemplates'), orderBy('name')));
        const tList = tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailTemplate));
        setTemplates(tList);
        if (tList.length > 0) setSelectedTemplateId(tList[0].id!);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'installationRecords');
      } finally {
        setLoading(false);
      }
    };

    fetchRenewals();
  }, [showAll]);

  const handleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map(r => r.id!));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const exportToExcel = () => {
    try {
      const headers = ["Business Name", "Support End Date", "Support Status", "Invoice Number", "Email", "Contact Number", "Informed?", "Informed Date"];
      const rows = records.map((r: any) => [
        r.businessName,
        r.supportEndDate,
        r.supportStatus,
        r.invoiceNumber,
        r.businessEmail || 'N/A',
        r.businessContact || 'N/A',
        r.renewalInformed ? 'Yes' : 'No',
        r.renewalInformedDate || 'N/A'
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `renewals_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed", error);
    }
  };

  const sendBulkEmails = async () => {
    if (selectedIds.length === 0 || !selectedTemplateId) return;
    
    setSending(true);
    setProgress({ current: 0, total: selectedIds.length });
    setStatus("Preparing to send emails...");

    try {
      // 1. Fetch SMTP settings
      const smtpDoc = await getDoc(doc(db, 'systemSettings', 'smtp'));
      if (!smtpDoc.exists()) {
        throw new Error("SMTP settings not found. Please configure them in the Settings tab.");
      }
      const smtpSettings = smtpDoc.data() as SystemSetting;

      // 2. Get the selected template
      const template = templates.find(t => t.id === selectedTemplateId);
      if (!template) {
        throw new Error("Selected template not found.");
      }

      const selectedRecords = records.filter(r => selectedIds.includes(r.id!));
      
      for (let i = 0; i < selectedRecords.length; i++) {
        const record = selectedRecords[i];
        setStatus(`Sending email to ${record.businessName}...`);
        
        // Fetch business email
        const bDoc = await getDoc(doc(db, 'businesses', record.businessId));
        const businessData = bDoc.exists() ? bDoc.data() : null;
        const recipientEmail = businessData?.email;

        if (!recipientEmail) {
          console.warn(`No email found for business: ${record.businessName}`);
          setProgress(prev => ({ ...prev, current: i + 1 }));
          continue;
        }

        // 3. Replace tags in template body and subject
        let htmlBody = template.body;
        let subject = template.subject;

        const replacements = {
          '{businessName}': record.businessName,
          '{supportEndDate}': formatDate(record.supportEndDate, 'dd MMM yyyy'),
          '{invoiceNumber}': record.invoiceNumber
        };

        Object.entries(replacements).forEach(([tag, val]) => {
          htmlBody = htmlBody.split(tag).join(val);
          subject = subject.split(tag).join(val);
        });

        // 4. Call our backend API
        const response = await fetch('/api/send-renewal-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientEmail,
            subject: subject,
            html: htmlBody,
            smtpConfig: {
              user: smtpSettings.gmailUser,
              pass: smtpSettings.gmailAppPassword,
              senderName: smtpSettings.senderName
            }
          })
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          let errData;
          if (contentType && contentType.includes("application/json")) {
            errData = await response.json();
          } else {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
          }
          throw new Error(errData.error || "Failed to send email");
        }

        // Update record in Firestore to mark as informed
        await updateDoc(doc(db, 'installationRecords', record.id!), {
          renewalInformed: true,
          renewalInformedDate: new Date().toISOString().split('T')[0],
          renewalInformedMethod: 'Email'
        });

        setProgress(prev => ({ ...prev, current: i + 1 }));
      }

      setStatus("All selected emails have been sent successfully!");
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `sent bulk renewal emails to ${selectedIds.length} customers`,
        timestamp: new Date().toISOString(),
      });

      // Clear selection
      setSelectedIds([]);
      
      // Refresh records to show updated "Informed" status
      const updatedRecords = records.map(r => 
        selectedIds.includes(r.id!) 
          ? { ...r, renewalInformed: true, renewalInformedDate: new Date().toISOString().split('T')[0], renewalInformedMethod: 'Email' as const } 
          : r
      );
      setRecords(updatedRecords);

    } catch (error) {
      console.error("Bulk email failed", error);
      setStatus(`ERROR: ${error instanceof Error ? error.message : "Failed to send some emails"}`);
    } finally {
      setSending(false);
      setTimeout(() => setStatus(null), 10000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <RefreshCw className="w-7 h-7 text-tillmax-blue" />
          Renewal Management
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-slate-300 text-tillmax-blue focus:ring-tillmax-blue"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            <span className="text-sm font-bold text-slate-700">Show All Records</span>
          </label>
          <button 
            onClick={exportToExcel}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSelectAll}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all text-sm"
            >
              {selectedIds.length === records.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm font-medium text-slate-500">
              {selectedIds.length} records selected
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Template:</label>
              <select 
                className="input-field py-2 text-sm"
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
              >
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                {templates.length === 0 && <option value="">No templates found</option>}
              </select>
            </div>
            <button 
              disabled={selectedIds.length === 0 || sending || templates.length === 0}
              onClick={sendBulkEmails}
              className="btn-primary flex items-center gap-2 px-6 py-2 shadow-lg shadow-tillmax-blue/20 disabled:opacity-50 w-full md:w-auto"
            >
              {sending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Send className="w-4 h-4" />}
              Send Renewal Emails
            </button>
          </div>
        </div>

        {status && (
          <div className={clsx(
            "mb-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
            status.includes('ERROR') ? "bg-red-50 border-red-100 text-red-600" : "bg-blue-50 border-blue-100 text-tillmax-blue"
          )}>
            {status.includes('ERROR') ? <AlertCircle className="w-5 h-5" /> : <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tillmax-blue"></div>}
            <div className="flex-1">
              <p className="font-bold text-sm">{status}</p>
              {sending && (
                <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-tillmax-blue h-full transition-all duration-500" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 text-left w-10"></th>
                <th className="pb-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Business Name</th>
                <th className="pb-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Support End Date</th>
                <th className="pb-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="pb-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Informed?</th>
                <th className="pb-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map(record => {
                const supportEndDate = parseDate(record.supportEndDate);
                const isExpired = supportEndDate < new Date();
                const isExpiringSoon = !isExpired && supportEndDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                return (
                  <tr key={record.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-tillmax-blue focus:ring-tillmax-blue"
                        checked={selectedIds.includes(record.id!)}
                        onChange={() => toggleSelect(record.id!)}
                      />
                    </td>
                    <td className="py-4">
                      <div className="font-bold text-slate-900">{record.businessName}</div>
                      <div className="text-xs text-slate-500">Inv: {record.invoiceNumber}</div>
                    </td>
                    <td className="py-4">
                      <div className={clsx(
                        "text-sm font-bold",
                        isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-slate-700"
                      )}>
                        {formatDate(record.supportEndDate, 'dd MMM yyyy')}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={clsx(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        isExpired ? "bg-red-100 text-red-700" : isExpiringSoon ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      )}>
                        {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                      </span>
                    </td>
                    <td className="py-4">
                      {record.renewalInformed ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Yes
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {record.renewalInformedDate} via {record.renewalInformedMethod}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">No</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <Link 
                        to={`/installation-records/${record.id}`}
                        className="text-tillmax-blue hover:underline text-sm font-bold"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <RefreshCw className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-slate-900 font-bold">No renewal records found</p>
                        <p className="text-slate-500 text-sm">No records are expiring within the next 30 days or already expired.</p>
                      </div>
                      <div className="flex gap-3">
                        <Link 
                          to="/records" 
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
                        >
                          View All Records
                        </Link>
                        <button 
                          onClick={() => onSwitchTab?.('maintenance')}
                          className="px-4 py-2 bg-amber-50 text-amber-700 font-bold rounded-xl hover:bg-amber-100 transition-all text-sm"
                        >
                          Generate Test Data
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tillmax-blue mx-auto"></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TemplateManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<{id: string, name: string} | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'emailTemplates'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailTemplate)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'emailTemplates');
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate?.name || !editingTemplate?.subject || !editingTemplate?.body) return;

    setIsSaving(true);
    try {
      const data = {
        ...editingTemplate,
        updatedAt: new Date().toISOString()
      };

      if (editingTemplate.id) {
        await updateDoc(doc(db, 'emailTemplates', editingTemplate.id), data);
      } else {
        await addDoc(collection(db, 'emailTemplates'), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }

      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `${editingTemplate.id ? 'updated' : 'created'} email template: ${editingTemplate.name}`,
        timestamp: new Date().toISOString(),
      });

      setEditingTemplate(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'emailTemplates');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeletingTemplate({ id, name });
  };

  const confirmDelete = async () => {
    if (!deletingTemplate) return;
    try {
      await deleteDoc(doc(db, 'emailTemplates', deletingTemplate.id));
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `deleted email template: ${deletingTemplate.name}`,
        timestamp: new Date().toISOString(),
      });
      setDeletingTemplate(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `emailTemplates/${deletingTemplate.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <FileText className="w-7 h-7 text-tillmax-blue" />
          Email Templates
        </h2>
        <button 
          onClick={() => setEditingTemplate({ name: '', subject: '', body: '' })}
          className="btn-primary flex items-center gap-2 px-6 py-2"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {templates.map(template => (
            <div 
              key={template.id} 
              className={clsx(
                "p-4 rounded-2xl border transition-all cursor-pointer group",
                editingTemplate?.id === template.id ? "bg-tillmax-blue border-tillmax-blue text-white shadow-lg" : "bg-white border-slate-200 hover:border-tillmax-blue"
              )}
              onClick={() => setEditingTemplate(template)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold truncate">{template.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(template.id!, template.name); }}
                  className={clsx(
                    "p-1 rounded-lg transition-colors",
                    editingTemplate?.id === template.id ? "hover:bg-white/20 text-white" : "text-slate-300 hover:text-red-500"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className={clsx(
                "text-xs truncate",
                editingTemplate?.id === template.id ? "text-white/70" : "text-slate-500"
              )}>
                Subject: {template.subject}
              </p>
            </div>
          ))}
          {templates.length === 0 && !loading && (
            <div className="py-10 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
              No templates created yet.
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {editingTemplate ? (
            <form onSubmit={handleSave} className="card p-8 space-y-6 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-slate-900">{editingTemplate.id ? 'Edit Template' : 'New Template'}</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Template Name</label>
                <input 
                  required
                  type="text" 
                  className="input-field" 
                  placeholder="e.g., Renewal Reminder"
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email Subject</label>
                <input 
                  required
                  type="text" 
                  className="input-field" 
                  placeholder="e.g., Your Tillmax Support is Expiring Soon"
                  value={editingTemplate.subject}
                  onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Email Body (HTML supported)</label>
                  <div className="flex gap-2">
                    {['{businessName}', '{supportEndDate}', '{invoiceNumber}'].map(tag => (
                      <button 
                        key={tag}
                        type="button"
                        onClick={() => setEditingTemplate({...editingTemplate, body: (editingTemplate.body || '') + tag})}
                        className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 font-mono"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea 
                  required
                  rows={12}
                  className="input-field font-mono text-sm" 
                  placeholder="Dear {businessName}, your support expires on {supportEndDate}..."
                  value={editingTemplate.body}
                  onChange={e => setEditingTemplate({...editingTemplate, body: e.target.value})}
                />
                <p className="text-[10px] text-slate-400">
                  Tip: Use the tags above to insert dynamic data into your emails.
                </p>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setEditingTemplate(null)}
                  className="px-6 py-2 text-slate-500 font-bold hover:underline"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSaving}
                  type="submit" 
                  className="btn-primary px-10 py-2 flex items-center gap-2"
                >
                  {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save className="w-4 h-4" />}
                  Save Template
                </button>
              </div>
            </form>
          ) : (
            <div className="card p-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/50">
              <FileText className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">Select a template to edit or create a new one</h3>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deletingTemplate}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={confirmDelete}
        title="Delete Template"
        message={`Are you sure you want to delete the template "${deletingTemplate?.name}"? This action cannot be undone.`}
        confirmText="Delete Template"
        type="danger"
      />
    </div>
  );
};

const SmtpSettings = () => {
  const [settings, setSettings] = useState<Partial<SystemSetting>>({
    gmailUser: '',
    gmailAppPassword: '',
    senderName: 'Tillmax Ltd Support'
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'systemSettings', 'smtp');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SystemSetting);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'systemSettings/smtp');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'systemSettings', 'smtp'), {
        ...settings,
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `updated SMTP system settings`,
        timestamp: new Date().toISOString(),
      });

      setSuccessMessage("SMTP Settings updated successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'systemSettings/smtp');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue mx-auto"></div></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Settings className="w-7 h-7 text-tillmax-blue" />
          SMTP Configuration
        </h2>
        <p className="text-slate-500 mb-8">Configure your Gmail SMTP settings for sending renewal notifications.</p>

        <form onSubmit={handleSave} className="space-y-6">
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-bold">{successMessage}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Gmail Address</label>
            <input 
              required
              type="email" 
              className="input-field" 
              placeholder="your-email@gmail.com"
              value={settings.gmailUser}
              onChange={e => setSettings({...settings, gmailUser: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Google App Password</label>
            <div className="relative">
              <input 
                required
                type={showPassword ? "text" : "password"} 
                className="input-field pr-12" 
                placeholder="xxxx xxxx xxxx xxxx"
                value={settings.gmailAppPassword}
                onChange={e => setSettings({...settings, gmailAppPassword: e.target.value})}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-tillmax-blue"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Note: Use a 16-character App Password generated from your Google Account security settings.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Sender Display Name</label>
            <input 
              required
              type="text" 
              className="input-field" 
              placeholder="Tillmax Ltd Support"
              value={settings.senderName}
              onChange={e => setSettings({...settings, senderName: e.target.value})}
            />
          </div>

          <div className="pt-6 border-t border-slate-100">
            <button 
              disabled={isSaving}
              type="submit" 
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 shadow-xl shadow-tillmax-blue/20"
            >
              {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
              Save SMTP Settings
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-3xl border border-blue-100">
        <h4 className="font-bold text-tillmax-blue mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Setup Instructions
        </h4>
        <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4">
          <li>Enable 2-Step Verification on your Google Account.</li>
          <li>Go to Security {'>'} App Passwords.</li>
          <li>Select 'Mail' and 'Other (Custom name)' as Tillmax.</li>
          <li>Copy the 16-character code and paste it above.</li>
        </ol>
      </div>
    </div>
  );
};

const UserManagement = ({ users, loading }: { users: UserProfile[], loading: boolean }) => {
  const { profile } = useAuth();
  const { createUser, updateUser, deleteUser, isProcessing, error, clearError } = useUserManagement();
  
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ uid: string; username: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setShowForm(true);
    clearError();
  };

  const handleAdd = () => {
    setEditingUser(null);
    setShowForm(true);
    clearError();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    clearError();
  };

  const handleSave = async (data: any) => {
    let success = false;
    if (editingUser) {
      success = await updateUser({
        uid: editingUser.uid,
        ...data
      });
    } else {
      success = await createUser(data);
    }

    if (success) {
      setShowForm(false);
      setEditingUser(null);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    const success = await deleteUser(userToDelete.uid, userToDelete.username);
    if (success) {
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && error.includes('FIREBASE_SERVICE_ACCOUNT') && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-2">Firebase Admin Setup Required</h3>
              <p className="text-red-700 mb-4">
                To create, edit, or delete users, you must configure the Firebase Admin SDK. The application needs a Service Account key to perform these administrative actions securely.
              </p>
              <div className="bg-white rounded-lg p-4 border border-red-100 space-y-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Follow these steps to fix this issue:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Firebase Console</a>.</li>
                  <li>Click the gear icon (⚙️) next to "Project Overview" and select <strong>Project settings</strong>.</li>
                  <li>Go to the <strong>Service accounts</strong> tab.</li>
                  <li>Click the <strong>Generate new private key</strong> button. This will download a JSON file.</li>
                  <li>Open the downloaded JSON file in a text editor and copy its <strong>entire contents</strong>.</li>
                  <li>In AI Studio, open the <strong>Settings</strong> menu (gear icon) and go to <strong>Secrets</strong>.</li>
                  <li>Add a new secret with the name <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-mono">FIREBASE_SERVICE_ACCOUNT</code> and paste the JSON content as the value.</li>
                  <li>Restart the development server.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="card p-4 flex-1 flex items-center gap-3 relative w-full md:w-96">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search users by email or username..." 
            className="flex-1 outline-none text-slate-900"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {!showForm && (
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={handleAdd} className="btn-primary flex items-center gap-2 flex-1 md:flex-initial">
              <UserPlus className="w-5 h-5" />
              Add User
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <UserForm 
            editingUser={editingUser || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            isProcessing={isProcessing}
            error={error || undefined}
          />
        </div>
      )}

      <UserList 
        users={filteredUsers}
        loading={loading}
        onEdit={handleEdit}
        onDelete={(uid, username) => setUserToDelete({ uid, username })}
        currentUserId={profile?.uid}
      />

      {userToDelete && (
        <ConfirmationModal 
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={confirmDelete}
          title="Delete User"
          message={`Are you sure you want to delete user "${userToDelete.username}"? This action cannot be undone and will permanently remove their access to the system.`}
          confirmText="Delete User"
          type="danger"
          isProcessing={isProcessing}
        />
      )}
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
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [passwordError, setPasswordError] = useState(false);
  const { profile } = useAuth();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '80808') {
      if (pendingAction) {
        pendingAction();
      }
      setShowPasswordModal(false);
      setPassword('');
      setPendingAction(null);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const triggerAction = (action: () => void) => {
    setPendingAction(() => action);
    setShowPasswordModal(true);
    setPassword('');
    setPasswordError(false);
  };

  const migrateInstructionRecords = async () => {
    setConfirming(null);
    setIsMigrating(true);
    setMigrationStatus("Checking for old instruction records...");
    try {
      const oldSnap = await getDocs(collection(db, 'instructionRecords'));
      if (oldSnap.empty) {
        setMigrationStatus("No old instruction records found to migrate.");
        setIsMigrating(false);
        return;
      }

      const total = oldSnap.docs.length;
      setMigrationStatus(`Found ${total} records. Migrating to installationRecords...`);
      
      const batch = writeBatch(db);
      for (const docSnap of oldSnap.docs) {
        const data = docSnap.data();
        const newRef = doc(collection(db, 'installationRecords'));
        batch.set(newRef, {
          ...data,
          businessName_lowercase: (data.businessName || '').toLowerCase(),
          invoiceNumber_lowercase: (data.invoiceNumber || '').toLowerCase(),
          postcode_lowercase: (data.postcode || '').toLowerCase(),
          postcode_normalized: (data.postcode || '').toLowerCase().replace(/\s+/g, ''),
          updatedAt: serverTimestamp()
        });
        // Delete old record
        batch.delete(docSnap.ref);
      }

      await batch.commit();
      
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `migrated ${total} records from instructionRecords to installationRecords`,
        timestamp: new Date().toISOString(),
      });

      setMigrationStatus(`SUCCESS: Migrated ${total} records successfully!`);
    } catch (error) {
      console.error("Migration failed:", error);
      setMigrationStatus(`ERROR: ${error instanceof Error ? error.message : "Migration failed"}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const exportRecordsToCSV = async () => {
    setIsBackingUp(true);
    setBackupStatus("Fetching records...");
    try {
      const q = query(collection(db, 'installationRecords'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setBackupStatus("No records found to export.");
        setIsBackingUp(false);
        return;
      }

      setBackupStatus(`Processing ${snapshot.docs.length} records...`);
      
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstallationRecord));
      
      // Sort by business name
      records.sort((a, b) => {
        const nameA = (a.businessName || '').toLowerCase();
        const nameB = (b.businessName || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      // CSV Header
      const headers = [
        "Business Name",
        "Invoice Number",
        "Installation Date",
        "Support Type",
        "Support Status",
        "Support Start Date",
        "Support End Date",
        "Software Type",
        "Payment Amount",
        "VAT Status",
        "Payment Status",
        "Payment Due Amount",
        "Sales Person",
        "Engineer",
        "License Numbers",
        "TeamViewer IDs",
        "Comments",
        "Created At"
      ];

      const csvRows = [headers.join(',')];

      for (const r of records) {
        const row = [
          `"${(r.businessName || '').replace(/"/g, '""')}"`,
          `"${(r.invoiceNumber || '').replace(/"/g, '""')}"`,
          `"${r.installationDate || ''}"`,
          `"${(r.supportType || '').replace(/"/g, '""')}"`,
          `"${(r.supportStatus || '').replace(/"/g, '""')}"`,
          `"${r.supportStartDate || ''}"`,
          `"${r.supportEndDate || ''}"`,
          `"${(r.softwareType || '').replace(/"/g, '""')}"`,
          r.paymentAmount || 0,
          `"${r.vatStatus || ''}"`,
          `"${r.paymentStatus || ''}"`,
          r.paymentDueAmount || 0,
          `"${(r.salesPerson || '').replace(/"/g, '""')}"`,
          `"${(r.engineer || '').replace(/"/g, '""')}"`,
          `"${(r.licenseNumbers || []).join('; ').replace(/"/g, '""')}"`,
          `"${(r.teamViewerIds || []).join('; ').replace(/"/g, '""')}"`,
          `"${(r.comments || '').replace(/"/g, '""')}"`,
          `"${r.createdAt || ''}"`
        ];
        csvRows.push(row.join(','));
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `tillmax_backup_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `exported ${records.length} records to CSV`,
        timestamp: new Date().toISOString(),
      });

      setBackupStatus(`SUCCESS: Exported ${records.length} records.`);
      setTimeout(() => setBackupStatus(null), 5000);
    } catch (error) {
      console.error("CSV Export failed:", error);
      setBackupStatus(`ERROR: ${error instanceof Error ? error.message : "Export failed"}`);
    } finally {
      setIsBackingUp(false);
    }
  };

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

      setTestStatus("Generating 50 Installation Records...");
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

        const rRef = doc(collection(db, 'installationRecords'));
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
            postcode_lowercase: data.postcode?.toLowerCase() || '',
            postcode_normalized: data.postcode?.toLowerCase().replace(/\s+/g, '') || ''
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

  const fixInstallationRecordsIndex = async () => {
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
      const countSnapshot = await getCountFromServer(collection(db, 'installationRecords'));
      const totalCount = countSnapshot.data().count;
      setRecordProgress({ current: 0, total: totalCount });

      const businessCache = new Map<string, { name: string, postcode: string }>();

      while (hasMore) {
        let q = query(collection(db, 'installationRecords'), limit(BATCH_LIMIT));
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
          const data = docSnap.data() as InstallationRecord;
          
          // Fetch business info if missing or just to be sure
          let bName = data.businessName || 'Unknown Business';
          let bPostcode = data.postcode || '';

          if (data.businessId) {
            if (businessCache.has(data.businessId)) {
              const info = businessCache.get(data.businessId)!;
              bName = info.name;
              bPostcode = info.postcode;
            } else {
              const bDoc = await getDoc(doc(db, 'businesses', data.businessId));
              if (bDoc.exists()) {
                const bData = bDoc.data();
                bName = bData.name;
                bPostcode = bData.postcode || '';
                businessCache.set(data.businessId, { name: bName, postcode: bPostcode });
              }
            }
          }
          
          batch.update(docSnap.ref, {
            businessName: bName,
            businessName_lowercase: bName.toLowerCase(),
            invoiceNumber_lowercase: data.invoiceNumber?.toLowerCase() || '',
            postcode: bPostcode,
            postcode_lowercase: bPostcode.toLowerCase(),
            postcode_normalized: bPostcode.toLowerCase().replace(/\s+/g, '')
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
        action: `fixed search index for ${totalProcessed} installation records`,
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
                <button onClick={() => triggerAction(fixSearchIndex)} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">Confirm Fix</button>
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

        {/* Installation Records Search Index Fix */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Fix Installation Records Search Index</h4>
              <p className="text-sm text-slate-500">Updates all installation records with business names and lowercase fields for better searchability.</p>
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
                <button onClick={() => triggerAction(fixInstallationRecordsIndex)} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">Confirm Fix</button>
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

        {/* Legacy Data Migration */}
        <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-red-900">Migrate Legacy Records</h4>
              <p className="text-sm text-red-700">Checks for records in the old "instructionRecords" collection and moves them to the new "installationRecords" collection.</p>
            </div>
            {!confirming && !isMigrating && (
              <button 
                onClick={() => setConfirming('legacy-migration' as any)}
                className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex items-center gap-2"
              >
                <History className="w-5 h-5" />
                Migrate Legacy Data
              </button>
            )}
            {confirming === ('legacy-migration' as any) && (
              <div className="flex items-center gap-3">
                <button onClick={() => setConfirming(null)} className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700">Cancel</button>
                <button onClick={() => triggerAction(migrateInstructionRecords)} className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20">Confirm Migration</button>
              </div>
            )}
            {isMigrating && migrationStatus && !migrationStatus.includes('successfully') && (
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Migrating...
              </div>
            )}
          </div>
          
          {migrationStatus && (
            <div className={clsx(
              "mt-4 flex items-center gap-2 text-sm font-bold",
              migrationStatus.includes('ERROR') ? "text-red-600" : 
              migrationStatus.includes('SUCCESS') ? "text-emerald-600" : "text-red-600"
            )}>
              {migrationStatus.includes('ERROR') ? <AlertCircle className="w-5 h-5" /> : 
               migrationStatus.includes('SUCCESS') ? <CheckCircle className="w-5 h-5" /> : 
               <RefreshCw className="w-5 h-5 animate-spin" />}
              {migrationStatus}
            </div>
          )}
        </div>

        {/* Data Backup Section */}
        <div className="p-6 bg-tillmax-blue/5 rounded-2xl border border-tillmax-blue/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Data Backup (CSV)</h4>
              <p className="text-sm text-slate-500">Download all installation records as a CSV file, sorted by business name.</p>
            </div>
            
            <button 
              onClick={() => triggerAction(exportRecordsToCSV)}
              disabled={isBackingUp}
              className="btn-primary flex items-center gap-2 px-8 whitespace-nowrap disabled:opacity-50"
            >
              {isBackingUp ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Backup to CSV
            </button>
          </div>
          
          {backupStatus && (
            <div className={clsx(
              "mt-4 flex items-center gap-2 text-sm font-bold",
              backupStatus.includes('ERROR') ? "text-red-600" : 
              backupStatus.includes('SUCCESS') ? "text-emerald-600" : "text-tillmax-blue"
            )}>
              {backupStatus.includes('ERROR') ? <AlertCircle className="w-5 h-5" /> : 
               backupStatus.includes('SUCCESS') ? <CheckCircle className="w-5 h-5" /> : 
               <RefreshCw className="w-5 h-5 animate-spin" />}
              {backupStatus}
            </div>
          )}
        </div>

        {/* Test Data Generation */}
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900">Generate Test Data</h4>
              <p className="text-sm text-amber-700">Creates 15 UK businesses and 50 installation records with mixed statuses for testing performance.</p>
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
                <button onClick={() => triggerAction(generateTestData)} className="px-6 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-600/20">Confirm Generation</button>
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

      {showPasswordModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100">
                  <Shield className="w-7 h-7" />
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Security Verification</h3>
                <p className="text-slate-500 leading-relaxed">Please enter the maintenance password to proceed with this action.</p>
              </div>

              <div className="space-y-2">
                <input 
                  autoFocus
                  type="password"
                  className={cn(
                    "input-field text-center text-2xl tracking-widest font-mono",
                    passwordError && "border-red-500 bg-red-50"
                  )}
                  placeholder="•••••"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                  }}
                />
                {passwordError && (
                  <p className="text-xs font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Incorrect password. Please try again.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-6 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-tillmax-blue text-white font-bold rounded-2xl shadow-lg shadow-tillmax-blue/20 hover:bg-tillmax-blue/90 transition-all"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const LookupManagement = () => {
  const [activeLookup, setActiveLookup] = useState<'equipmentTypes' | 'salesPeople' | 'engineers' | 'softwareTypes' | 'categories' | 'suppliers'>('equipmentTypes');
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState<any>({});
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    const q = query(collection(db, activeLookup), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => {
        const data = doc.data();
        if (activeLookup === 'equipmentTypes') {
          return {
            id: doc.id,
            ...data,
            currentStock: typeof data.currentStock === 'number' ? data.currentStock : 0,
            lowStockThreshold: typeof data.lowStockThreshold === 'number' ? data.lowStockThreshold : 5
          };
        }
        return { id: doc.id, ...data };
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, activeLookup);
    });
    return () => unsubscribe();
  }, [activeLookup]);

  useEffect(() => {
    const unsubCat = onSnapshot(query(collection(db, 'categories'), orderBy('name')), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    const unsubSup = onSnapshot(query(collection(db, 'suppliers'), orderBy('name')), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });
    return () => {
      unsubCat();
      unsubSup();
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeLookup === 'suppliers') {
      if (!newItem.name || !newItem.email) return;
    } else if (activeLookup === 'equipmentTypes') {
      if (!newItem.name) return;
    } else {
      if (!newItem.name?.trim()) return;
    }

    try {
      const data = { ...newItem };
      if (activeLookup === 'equipmentTypes') {
        data.currentStock = Number(data.currentStock) || 0;
        data.lowStockThreshold = Number(data.lowStockThreshold) || 5;
      }
      
      await addDoc(collection(db, activeLookup), data);
      const singularLabel = tabs.find(t => t.id === activeLookup)?.singular || activeLookup;
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `added new ${singularLabel.toLowerCase()}: ${newItem.name}`,
        timestamp: new Date().toISOString(),
      });
      setNewItem({});
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, activeLookup);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const { id, ...data } = editingItem;
      if (activeLookup === 'equipmentTypes') {
        data.currentStock = Number(data.currentStock) || 0;
        data.lowStockThreshold = Number(data.lowStockThreshold) || 5;
      }

      await updateDoc(doc(db, activeLookup, id), data);
      const singularLabel = tabs.find(t => t.id === activeLookup)?.singular || activeLookup;
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `updated ${singularLabel.toLowerCase()}: ${data.name}`,
        timestamp: new Date().toISOString(),
      });
      setEditingItem(null);
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, activeLookup);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, activeLookup, itemToDelete.id));
      const singularLabel = tabs.find(t => t.id === activeLookup)?.singular || activeLookup;
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `deleted ${singularLabel.toLowerCase()}: ${itemToDelete.name}`,
        timestamp: new Date().toISOString(),
      });
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${activeLookup}/${itemToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: 'equipmentTypes', label: 'Equipment', singular: 'Equipment', icon: Package },
    { id: 'categories', label: 'Categories', singular: 'Category', icon: Filter },
    { id: 'suppliers', label: 'Suppliers', singular: 'Supplier', icon: MapPin },
    { id: 'salesPeople', label: 'Sales People', singular: 'Sales Person', icon: UserIcon },
    { id: 'engineers', label: 'Engineers', singular: 'Engineer', icon: Wrench },
    { id: 'softwareTypes', label: 'Software', singular: 'Software', icon: Code },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
      <div className="lg:col-span-1 space-y-2">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => {
              setActiveLookup(tab.id as any);
              setItems([]); // Clear items to avoid stale data
              setEditingItem(null);
              setNewItem({});
            }}
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {tabs.find(t => t.id === activeLookup)?.label}
              </h3>
              <p className="text-sm text-slate-500 font-medium">Manage your system lookup tables</p>
            </div>
            <button 
              onClick={() => {
                setEditingItem(null);
                setNewItem({});
                setIsModalOpen(true);
              }}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl shadow-lg shadow-tillmax-blue/20 hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              Add {tabs.find(t => t.id === activeLookup)?.singular}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 group hover:border-tillmax-blue hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-tillmax-blue/10 group-hover:text-tillmax-blue transition-colors">
                    {React.createElement(tabs.find(t => t.id === activeLookup)?.icon || Package, { className: "w-5 h-5" })}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-lg">{item.name}</div>
                    {activeLookup === 'suppliers' && (
                      <div className="text-xs text-slate-500 flex items-center gap-4 mt-1 font-medium">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</span>
                        {item.contactNumber && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.contactNumber}</span>}
                      </div>
                    )}
                    {activeLookup === 'equipmentTypes' && (
                      <div className="text-xs text-slate-500 flex items-center gap-4 mt-1 font-medium">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">
                          {categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized'}
                        </span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {suppliers.find(s => s.id === item.supplierId)?.name || 'No Supplier'}</span>
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold",
                          item.currentStock <= item.lowStockThreshold ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                        )}>
                          Stock: {item.currentStock}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <button 
                    onClick={() => {
                      setEditingItem(item);
                      setIsModalOpen(true);
                    }}
                    className="p-2.5 bg-slate-50 text-slate-400 hover:bg-tillmax-blue hover:text-white rounded-xl transition-all"
                    title="Edit Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setItemToDelete({ id: item.id!, name: item.name })}
                    className="p-2.5 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                  {React.createElement(tabs.find(t => t.id === activeLookup)?.icon || Package, { className: "w-8 h-8 text-slate-300" })}
                </div>
                <h4 className="text-slate-900 font-bold">No {tabs.find(t => t.id === activeLookup)?.label} Found</h4>
                <p className="text-sm text-slate-500 mt-1">Click the add button to create your first item.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal for Add/Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-tillmax-blue/10 flex items-center justify-center text-tillmax-blue">
                    {editingItem ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {editingItem ? 'Edit' : 'Add New'} {tabs.find(t => t.id === activeLookup)?.singular}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Lookup Table Management</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={editingItem ? handleUpdate : handleAdd} className="p-8 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {tabs.find(t => t.id === activeLookup)?.singular} Name
                    </label>
                    <div className="relative group">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-tillmax-blue transition-colors" />
                      <input 
                        required
                        type="text" 
                        placeholder={`Enter ${tabs.find(t => t.id === activeLookup)?.singular.toLowerCase()} name...`}
                        className="input-field !pl-12 w-full bg-slate-50 border-transparent focus:bg-white focus:border-tillmax-blue transition-all" 
                        value={editingItem ? editingItem.name : (newItem.name || '')}
                        onChange={e => editingItem ? setEditingItem({...editingItem, name: e.target.value}) : setNewItem({...newItem, name: e.target.value})}
                        autoFocus
                      />
                    </div>
                  </div>

                  {activeLookup === 'suppliers' && (
                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Email Address</label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-tillmax-blue transition-colors" />
                          <input 
                            required
                            type="email" 
                            placeholder="supplier@example.com" 
                            className="input-field !pl-12 w-full bg-slate-50 border-transparent focus:bg-white focus:border-tillmax-blue transition-all" 
                            value={editingItem ? editingItem.email : (newItem.email || '')}
                            onChange={e => editingItem ? setEditingItem({...editingItem, email: e.target.value}) : setNewItem({...newItem, email: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Number</label>
                        <div className="relative group">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-tillmax-blue transition-colors" />
                          <input 
                            type="text" 
                            placeholder="01234 567890" 
                            className="input-field !pl-12 w-full bg-slate-50 border-transparent focus:bg-white focus:border-tillmax-blue transition-all" 
                            value={editingItem ? editingItem.contactNumber : (newItem.contactNumber || '')}
                            onChange={e => editingItem ? setEditingItem({...editingItem, contactNumber: e.target.value}) : setNewItem({...newItem, contactNumber: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Business Address</label>
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-tillmax-blue transition-colors" />
                          <input 
                            type="text" 
                            placeholder="Full business address..." 
                            className="input-field !pl-12 w-full bg-slate-50 border-transparent focus:bg-white focus:border-tillmax-blue transition-all" 
                            value={editingItem ? editingItem.address : (newItem.address || '')}
                            onChange={e => editingItem ? setEditingItem({...editingItem, address: e.target.value}) : setNewItem({...newItem, address: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeLookup === 'equipmentTypes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</label>
                        <select 
                          className="input-field w-full bg-slate-50 border-transparent focus:bg-white focus:border-tillmax-blue transition-all"
                          value={editingItem ? editingItem.categoryId : (newItem.categoryId || '')}
                          onChange={e => editingItem ? setEditingItem({...editingItem, categoryId: e.target.value}) : setNewItem({...newItem, categoryId: e.target.value})}
                        >
                          <option value="">Select Category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Supplier</label>
                        <select 
                          className="input-field w-full bg-slate-50 border-transparent focus:bg-white focus:border-tillmax-blue transition-all"
                          value={editingItem ? editingItem.supplierId : (newItem.supplierId || '')}
                          onChange={e => editingItem ? setEditingItem({...editingItem, supplierId: e.target.value}) : setNewItem({...newItem, supplierId: e.target.value})}
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Initial Stock</label>
                        <input 
                          type="number" 
                          className="input-field w-full bg-slate-50 border-transparent focus:bg-white focus:border-tillmax-blue transition-all" 
                          value={editingItem ? editingItem.currentStock : (newItem.currentStock || 0)}
                          onChange={e => editingItem ? setEditingItem({...editingItem, currentStock: e.target.value}) : setNewItem({...newItem, currentStock: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Low Stock Alert</label>
                        <input 
                          type="number" 
                          className="input-field w-full bg-slate-50 border-transparent focus:bg-white focus:border-tillmax-blue transition-all" 
                          value={editingItem ? editingItem.lowStockThreshold : (newItem.lowStockThreshold || 5)}
                          onChange={e => editingItem ? setEditingItem({...editingItem, lowStockThreshold: e.target.value}) : setNewItem({...newItem, lowStockThreshold: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] btn-primary flex items-center justify-center gap-2 px-8 py-3 rounded-2xl shadow-lg shadow-tillmax-blue/20"
                  >
                    {editingItem ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingItem ? 'Save Changes' : `Add ${tabs.find(t => t.id === activeLookup)?.singular}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <ConfirmationModal 
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleDelete}
          title={`Delete ${tabs.find(t => t.id === activeLookup)?.singular}`}
          message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
          isProcessing={isDeleting}
        />
      </div>
    </div>
  );
};
