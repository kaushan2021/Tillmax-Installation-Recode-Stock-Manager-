import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, doc, getDoc, serverTimestamp, where, limit } from 'firebase/firestore';
import { useAuth } from '../AuthProvider';
import { Business, CompanySetting, ProformaInvoice as IProformaInvoice, InvoiceItem } from '../types';
import { 
  FileText, 
  Plus, 
  Trash2, 
  X,
  Download, 
  Send, 
  Search, 
  User, 
  MapPin, 
  Mail, 
  Phone,
  Calculator,
  History,
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { clsx } from 'clsx';

export const ProformaInvoice = () => {
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<'create' | 'history'>('create');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [customerType, setCustomerType] = useState<'existing' | 'new'>('existing');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    address: '',
    postcode: '',
    email: ''
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 }
  ]);
  const [customMessage, setCustomMessage] = useState('If you have any questions about this invoice, please contact us.');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Search Effect
  useEffect(() => {
    if (!searchTerm || customerType !== 'existing') {
      setBusinesses([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const s = searchTerm.toLowerCase();
        // Search by name prefix
        const q = query(
          collection(db, 'businesses'),
          where('name_lowercase', '>=', s),
          where('name_lowercase', '<=', s + '\uf8ff'),
          orderBy('name_lowercase'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
        
        // If no results by name, try by postcode
        if (results.length === 0) {
          const pq = query(
            collection(db, 'businesses'),
            where('postcode_normalized', '>=', s.replace(/\s+/g, '')),
            where('postcode_normalized', '<=', s.replace(/\s+/g, '') + '\uf8ff'),
            orderBy('postcode_normalized'),
            limit(10)
          );
          const pSnapshot = await getDocs(pq);
          setBusinesses(pSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business)));
        } else {
          setBusinesses(results);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, customerType]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Company Settings
        const cSnap = await getDoc(doc(db, 'companySettings', 'profile'));
        if (cSnap.exists()) {
          setCompanySettings(cSnap.data() as CompanySetting);
        }

        // Generate Invoice Number
        setInvoiceNumber(`PI-${Date.now().toString().slice(-6)}`);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'companySettings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = Number(newItems[index].quantity || 0) * Number(newItems[index].unitPrice || 0);
    }
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = subtotal * 0.20;
  const total = subtotal + vatAmount;

  const generatePDF = (action: 'download' | 'email') => {
    if (!companySettings) {
      toast.error("Please configure Company Profile in Admin Panel first");
      return null;
    }

    const customer = customerType === 'existing' ? selectedBusiness : newCustomer;
    if (!customer?.name) {
      toast.error("Please select or enter customer information");
      return null;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PROFORMA INVOICE", pageWidth / 2, 20, { align: 'center' });

    // Company Logo & Details (Left)
    if (companySettings.logo) {
      try {
        // Use a larger area for the logo and try to maintain a reasonable aspect ratio
        // Most logos are wider than they are tall
        doc.addImage(companySettings.logo, 'PNG', 20, 30, 60, 25);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(companySettings.name, 20, 65);
    doc.setFont("helvetica", "normal");
    const addressLines = doc.splitTextToSize(companySettings.address, 60);
    doc.text(addressLines, 20, 70);
    doc.text(companySettings.postcode, 20, 70 + (addressLines.length * 5));

    // Invoice Info (Right)
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - 20, 40, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formatDate(new Date().toISOString())}`, pageWidth - 20, 45, { align: 'right' });
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    doc.text(`Valid Until: ${formatDate(validUntil.toISOString())}`, pageWidth - 20, 50, { align: 'right' });

    // Billing Address
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 20, 100);
    doc.setFont("helvetica", "normal");
    doc.text(customer.name, 20, 105);
    const customerAddressLines = doc.splitTextToSize(customer.address || '', 60);
    doc.text(customerAddressLines, 20, 110);
    doc.text(customer.postcode || '', 20, 110 + (customerAddressLines.length * 5));

    // Table
    const tableData = items.map(item => [
      item.description,
      item.quantity.toString(),
      `£${(Number(item.unitPrice) || 0).toFixed(2)}`,
      `£${(Number(item.amount) || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 130,
      head: [['Description', 'Quantity', 'Unit Price', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", pageWidth - 90, finalY);
    doc.text(`£${(Number(subtotal) || 0).toFixed(2)}`, pageWidth - 20, finalY, { align: 'right' });
    
    doc.text("VAT (20%):", pageWidth - 90, finalY + 8);
    doc.text(`£${(Number(vatAmount) || 0).toFixed(2)}`, pageWidth - 20, finalY + 8, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT:", pageWidth - 90, finalY + 18);
    doc.text(`£${(Number(total) || 0).toFixed(2)}`, pageWidth - 20, finalY + 18, { align: 'right' });

    // Bank Details
    doc.setFontSize(10);
    doc.text("BANK DETAILS FOR TRANSFER:", 20, finalY + 30);
    doc.setFont("helvetica", "normal");
    doc.text(`Bank: ${companySettings.bankName}`, 20, finalY + 35);
    doc.text(`Account Name: ${companySettings.accountName}`, 20, finalY + 40);
    doc.text(`Account Number: ${companySettings.accountNumber}`, 20, finalY + 45);
    doc.text(`Sort Code: ${companySettings.sortCode}`, 20, finalY + 50);

    // Payment Guide
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT GUIDE:", 20, finalY + 65);
    doc.setFont("helvetica", "normal");
    const guide = "If paying via bank transfer, please use the details above. For card payments, please contact our hotline below.";
    doc.text(doc.splitTextToSize(guide, pageWidth - 40), 20, finalY + 70);

    // Custom Message
    doc.setFont("helvetica", "italic");
    doc.text(doc.splitTextToSize(customMessage, pageWidth - 40), 20, finalY + 85);

    // Footer contact
    doc.setFont("helvetica", "bold");
    doc.text(`Hotline: ${companySettings.hotline} | Email: ${companySettings.email}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });
    doc.text("Thank you for your business!", pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });

    if (action === 'download') {
      doc.save(`${invoiceNumber}.pdf`);
      saveInvoiceRecord();
    } else {
      return doc.output('datauristring');
    }
    return null;
  };

  const saveInvoiceRecord = async () => {
    try {
      const customer = customerType === 'existing' ? selectedBusiness : newCustomer;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      await addDoc(collection(db, 'proformaInvoices'), {
        invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        validUntil: validUntil.toISOString().split('T')[0],
        businessId: selectedBusiness?.id || null,
        customerName: customer?.name,
        customerAddress: customer?.address,
        customerPostcode: customer?.postcode,
        customerEmail: customer?.email,
        items,
        subtotal,
        vatAmount,
        total,
        customMessage,
        createdBy: profile?.uid,
        createdByName: profile?.username,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        username: profile?.username,
        action: `generated proforma invoice ${invoiceNumber}`,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error("Error saving invoice record", error);
    }
  };

  const handleEmail = async () => {
    const pdfDataUri = generatePDF('email');
    if (!pdfDataUri) return;

    const customer = customerType === 'existing' ? selectedBusiness : newCustomer;
    if (!customer?.email) {
      toast.error("Customer email is required to send directly");
      return;
    }

    setIsProcessing(true);
    try {
      // Get SMTP settings
      const smtpSnap = await getDoc(doc(db, 'systemSettings', 'smtp'));
      if (!smtpSnap.exists()) {
        throw new Error("SMTP settings not configured. Please set them up in Admin Panel.");
      }
      const smtp = smtpSnap.data();

      const response = await fetch('/api/send-renewal-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.email,
          subject: `Proforma Invoice - ${invoiceNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #0066cc;">Proforma Invoice</h2>
              <p>Dear ${customer.name},</p>
              <p>Please find attached the proforma invoice <strong>${invoiceNumber}</strong> as requested.</p>
              <p style="background: #f9f9f9; padding: 15px; border-left: 4px solid #0066cc; font-style: italic;">
                "${customMessage}"
              </p>
              <br/>
              <p>Best regards,</p>
              <p><strong>${companySettings?.name}</strong></p>
            </div>
          `,
          attachments: [
            {
              filename: `${invoiceNumber}.pdf`,
              content: pdfDataUri.split(',')[1],
              encoding: 'base64'
            }
          ],
          smtpConfig: {
            user: smtp.gmailUser,
            pass: smtp.gmailAppPassword,
            senderName: smtp.senderName
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send email");
      }

      toast.success(`Invoice sent to ${customer.email}`);
      saveInvoiceRecord();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue mx-auto"></div></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-tillmax-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-tillmax-blue/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Proforma Invoice Generator</h1>
            <p className="text-slate-500 text-sm">Create and manage professional proforma invoices</p>
          </div>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveView('create')}
            className={clsx(
              "px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
              activeView === 'create' ? "bg-tillmax-blue text-white shadow-md" : "text-slate-500 hover:text-tillmax-blue"
            )}
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
          <button 
            onClick={() => setActiveView('history')}
            className={clsx(
              "px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
              activeView === 'history' ? "bg-tillmax-blue text-white shadow-md" : "text-slate-500 hover:text-tillmax-blue"
            )}
          >
            <History className="w-4 h-4" />
            Invoice History
          </button>
        </div>
      </div>

      {activeView === 'create' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            {/* Customer Selection */}
            <div className="card p-8 !overflow-visible">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-tillmax-blue" />
                Customer Information
              </h3>
              
              <div className="flex gap-4 mb-8">
                <button 
                  onClick={() => {
                    setCustomerType('existing');
                    setNewCustomer({ name: '', address: '', postcode: '', email: '' });
                  }}
                  className={clsx(
                    "flex-1 p-4 rounded-xl border-2 transition-all text-left",
                    customerType === 'existing' ? "border-tillmax-blue bg-blue-50/50" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <p className="font-bold text-slate-900">Existing Customer</p>
                  <p className="text-xs text-slate-500">Select from your database</p>
                </button>
                <button 
                  onClick={() => {
                    setCustomerType('new');
                    setSelectedBusiness(null);
                    setSearchTerm('');
                    setShowResults(false);
                  }}
                  className={clsx(
                    "flex-1 p-4 rounded-xl border-2 transition-all text-left",
                    customerType === 'new' ? "border-tillmax-blue bg-blue-50/50" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <p className="font-bold text-slate-900">New Customer</p>
                  <p className="text-xs text-slate-500">Enter details manually</p>
                </button>
              </div>

              {customerType === 'existing' ? (
                <div className="space-y-4">
                  <div className="relative" ref={searchRef}>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      <input 
                        type="text"
                        className="input-field !pl-14 pr-10"
                        placeholder="Search by shop name or postcode..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                      />
                      {searchTerm && (
                        <button 
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedBusiness(null);
                            setShowResults(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {showResults && searchTerm.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-h-[300px] overflow-y-auto">
                          {isSearching ? (
                            <div className="p-8 text-center">
                              <RefreshCw className="w-8 h-8 text-tillmax-blue animate-spin mx-auto mb-2" />
                              <p className="text-slate-500 text-sm font-medium">Searching customers...</p>
                            </div>
                          ) : (
                            <>
                              {businesses.map((b, idx) => (
                                <button
                                  key={b.id}
                                  onClick={() => {
                                    setSelectedBusiness(b);
                                    setSearchTerm(b.name);
                                    setShowResults(false);
                                  }}
                                  className={clsx(
                                    "w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group",
                                    idx !== 0 && "border-t border-slate-50"
                                  )}
                                >
                                  <div>
                                    <p className="font-bold text-slate-900 group-hover:text-tillmax-blue transition-colors">{b.name}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {b.postcode}
                                    </p>
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CheckCircle className="w-5 h-5 text-tillmax-blue" />
                                  </div>
                                </button>
                              ))}
                              {businesses.length === 0 && (
                                <div className="p-8 text-center">
                                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                  <p className="text-slate-500 text-sm font-medium mb-4">No customers found matching "{searchTerm}"</p>
                                  <button 
                                    onClick={() => {
                                      setCustomerType('new');
                                      setNewCustomer(prev => ({ ...prev, name: searchTerm }));
                                      setSearchTerm('');
                                      setShowResults(false);
                                    }}
                                    className="btn-secondary py-2 px-4 text-xs"
                                  >
                                    Create New Customer
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedBusiness && (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                          <MapPin className="w-5 h-5 text-tillmax-blue" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billing Address</p>
                          <p className="text-sm font-bold text-slate-900 leading-relaxed">{selectedBusiness.address}</p>
                          <p className="text-sm font-black text-tillmax-blue mt-1">{selectedBusiness.postcode}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                          <Mail className="w-5 h-5 text-tillmax-blue" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Email</p>
                          <p className="text-sm font-bold text-slate-900">{selectedBusiness.email}</p>
                          <p className="text-xs text-slate-500 mt-1">{selectedBusiness.contactNumber || 'No contact number provided'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Business Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Email Address</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      value={newCustomer.email}
                      onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Full Address</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newCustomer.address}
                      onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Postcode</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newCustomer.postcode}
                      onChange={e => setNewCustomer({...newCustomer, postcode: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-tillmax-blue" />
                  Invoice Items
                </h3>
                <button 
                  onClick={addItem}
                  className="text-tillmax-blue hover:text-blue-700 font-bold text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-center group">
                    <div className="col-span-6">
                      <input 
                        type="text" 
                        className="input-field text-sm" 
                        placeholder="Service or product description..."
                        value={item.description}
                        onChange={e => updateItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <input 
                        type="number" 
                        className="input-field text-sm text-center" 
                        value={item.quantity}
                        onChange={e => updateItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <input 
                        type="number" 
                        className="input-field text-sm text-right" 
                        value={item.unitPrice}
                        onChange={e => updateItem(index, 'unitPrice', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="flex-1 text-right font-bold text-slate-900">
                        £{(Number(item.amount) || 0).toFixed(2)}
                      </div>
                      <button 
                        onClick={() => removeItem(index)}
                        className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 space-y-3">
                <div className="flex justify-end gap-12 text-sm">
                  <span className="text-slate-500 font-bold">Subtotal</span>
                  <span className="font-bold text-slate-900 w-24 text-right">£{(Number(subtotal) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-12 text-sm">
                  <span className="text-slate-500 font-bold">VAT (20%)</span>
                  <span className="font-bold text-slate-900 w-24 text-right">£{(Number(vatAmount) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-12 text-lg">
                  <span className="text-slate-900 font-black">Total Amount</span>
                  <span className="font-black text-tillmax-blue w-24 text-right">£{(Number(total) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Custom Message */}
            <div className="card p-8">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Custom Message / Instructions</h3>
              <textarea 
                rows={3}
                className="input-field"
                placeholder="Add any additional notes or instructions..."
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-8 sticky top-24">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Actions</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">Invoice Number</span>
                    <span className="text-slate-900 font-black">{invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">Date</span>
                    <span className="text-slate-900 font-bold">{formatDate(new Date().toISOString())}</span>
                  </div>
                </div>

                <button 
                  onClick={() => generatePDF('download')}
                  className="w-full btn-secondary flex items-center justify-center gap-2 py-4"
                >
                  <Download className="w-5 h-5" />
                  Export PDF
                </button>

                <button 
                  disabled={isProcessing}
                  onClick={handleEmail}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-4 shadow-lg shadow-tillmax-blue/20"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {isProcessing ? "Sending..." : "Email to Customer"}
                </button>

                <p className="text-[10px] text-center text-slate-400 font-medium px-4">
                  Finalizing will automatically save a record of this invoice in the system history.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <InvoiceHistory />
      )}
    </div>
  );
};

const InvoiceHistory = () => {
  const [invoices, setInvoices] = useState<IProformaInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'proformaInvoices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IProformaInvoice)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'proformaInvoices');
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-20 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tillmax-blue mx-auto"></div></div>;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice No</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Created By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-black text-tillmax-blue">{invoice.invoiceNumber}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{invoice.customerName}</p>
                  <p className="text-xs text-slate-500">{invoice.customerPostcode}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {formatDate(invoice.date)}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-black text-slate-900">£{(Number(invoice.total) || 0).toFixed(2)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {invoice.createdByName?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-slate-600">{invoice.createdByName}</span>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-slate-200" />
                    <p className="text-slate-500 font-medium">No invoices generated yet</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
