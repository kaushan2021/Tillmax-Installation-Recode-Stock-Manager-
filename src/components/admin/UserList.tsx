import React from 'react';
import { UserProfile } from '../../types';
import { Shield, User as UserIcon, Edit2, Trash2, Mail, Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDate } from '../../lib/utils';

interface UserListProps {
  users: UserProfile[];
  loading: boolean;
  onEdit: (user: UserProfile) => void;
  onDelete: (uid: string, username: string) => void;
  currentUserId?: string;
}

export const UserList: React.FC<UserListProps> = ({ users, loading, onEdit, onDelete, currentUserId }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-tillmax-blue rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <UserIcon className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">No users found</h3>
          <p className="text-slate-500">There are no user accounts registered in the system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {users.map((user) => (
        <div 
          key={user.uid}
          className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-tillmax-blue/30 transition-all overflow-hidden flex flex-col"
        >
          <div className="p-6 flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className={clsx(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                user.role === 'ADMIN' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
              )}>
                {user.role === 'ADMIN' ? <Shield className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(user)}
                  className="p-2 text-slate-400 hover:text-tillmax-blue hover:bg-tillmax-blue/5 rounded-lg transition-all"
                  title="Edit User"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {user.uid !== currentUserId && (
                  <button
                    onClick={() => onDelete(user.uid, user.username || 'Unknown')}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete User"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 truncate">{user.username || 'Unnamed User'}</h4>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className={clsx(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                user.role === 'ADMIN' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
              )}>
                {user.role}
              </span>
              {user.uid === currentUserId && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                  You
                </span>
              )}
            </div>
          </div>

          <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Joined {formatDate(user.createdAt)}</span>
            </div>
            {user.role === 'ADMIN' && (
              <div className="flex items-center gap-1 text-amber-600 font-medium">
                <Shield className="w-3 h-3" />
                <span>Full Access</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
