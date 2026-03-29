import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../../types';
import { Save, X, UserPlus, Shield, ShieldAlert, Mail, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';

interface UserFormProps {
  editingUser: UserProfile | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isProcessing: boolean;
  error?: string;
}

export const UserForm: React.FC<UserFormProps> = ({ editingUser, onSave, onCancel, isProcessing, error }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    role: 'EMPLOYEE' as UserRole,
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        email: editingUser.email,
        username: editingUser.username || '',
        role: editingUser.role,
        password: '' // Don't show existing password
      });
    } else {
      setFormData({
        email: '',
        username: '',
        role: 'EMPLOYEE',
        password: ''
      });
    }
  }, [editingUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            editingUser ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
          )}>
            {editingUser ? <Shield className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {editingUser ? `Edit User: ${editingUser.username}` : 'Create New User'}
            </h3>
            <p className="text-xs text-slate-500">
              {editingUser ? 'Update account details and permissions' : 'Add a new member to the team'}
            </p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue/20 focus:border-tillmax-blue transition-all outline-none"
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-slate-400" />
              Username
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue/20 focus:border-tillmax-blue transition-all outline-none"
              placeholder="Full Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              System Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue/20 focus:border-tillmax-blue transition-all outline-none appearance-none"
            >
              <option value="EMPLOYEE">Employee (Standard Access)</option>
              <option value="ADMIN">Administrator (Full Access)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              {editingUser ? 'New Password (Optional)' : 'Account Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required={!editingUser}
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-tillmax-blue/20 focus:border-tillmax-blue transition-all outline-none"
                placeholder={editingUser ? "Leave blank to keep current" : "Min. 6 characters"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="px-8 py-2.5 bg-tillmax-blue text-white font-semibold rounded-xl shadow-lg shadow-tillmax-blue/20 hover:bg-tillmax-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {editingUser ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};
