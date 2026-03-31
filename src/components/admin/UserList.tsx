import React from 'react';
import { UserProfile } from '../../types';
import { Edit2, Trash2, Shield, User, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UserListProps {
  users: UserProfile[];
  loading?: boolean;
  onEdit: (user: UserProfile) => void;
  onDelete: (uid: string, username: string) => void;
  currentUserId?: string;
}

export function UserList({ users, loading, onEdit, onDelete, currentUserId }: UserListProps) {
  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'ADMIN': return <Shield className="w-4 h-4 text-tillmax-blue" />;
      default: return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-tillmax-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {users.map((user) => (
            <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-tillmax-blue font-bold">
                    {user.username?.[0] || user.email?.[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{user.username}</p>
                      {user.uid === currentUserId && (
                        <span className="text-[10px] bg-blue-100 text-tillmax-blue px-1.5 py-0.5 rounded-full font-bold uppercase">You</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                  user.role === 'ADMIN' ? "bg-blue-50 text-tillmax-blue" : "bg-slate-50 text-slate-600"
                )}>
                  {getRoleIcon(user.role)}
                  <span className="capitalize">{user.role?.toLowerCase() || 'user'}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(user)}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-tillmax-blue transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(user.uid, user.username || user.email || 'User')}
                    disabled={user.uid === currentUserId}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-rose-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
