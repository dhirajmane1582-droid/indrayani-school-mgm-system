
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Lock, User as UserIcon, LogIn, GraduationCap, BookOpen, Shield, Info, Database, Loader2, Cloud, RefreshCw } from 'lucide-react';
import { dbService } from '../services/db';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onRefreshData?: () => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ users, onLogin, onRefreshData }) => {
  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUpdating(true);

    try {
        // 1. Check Local Cache First (for speed/offline)
        let user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        
        // 2. If not found locally, check Cloud directly (Source of Truth)
        if (!user) {
            const cloudUser = await dbService.verifyCloudUser(username, password);
            if (cloudUser) user = cloudUser;
        }

        if (user) {
          if (user.role === activeRole) {
            onLogin(user);
          } else {
            const roleNames = { student: 'Student', teacher: 'Teacher', headmaster: 'Headmaster' };
            setError(`Access Denied: You cannot log in here. Please use the ${roleNames[user.role]} portal.`);
          }
        } else {
          setError('Invalid credentials. If this is a new account, ensure you have an active internet connection.');
        }
    } catch (err) {
        setError('Connection error. Please try again.');
    } finally {
        setIsUpdating(false);
    }
  };

  const handleRoleSwitch = (role: UserRole) => {
      setActiveRole(role);
      setError('');
      setUsername('');
      setPassword('');
  };

  const handleManualRefresh = async () => {
    if (!onRefreshData) return;
    setIsUpdating(true);
    try {
        await onRefreshData();
        setError('');
    } finally {
        setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Role Selection Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-2">
            <div className="grid grid-cols-3 gap-2">
                <button 
                    onClick={() => handleRoleSwitch('student')}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all ${activeRole === 'student' ? 'bg-white shadow-md text-emerald-600 ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                    <GraduationCap size={20} className="mb-1" />
                    <span className="text-xs font-bold">Student</span>
                </button>
                <button 
                    onClick={() => handleRoleSwitch('teacher')}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all ${activeRole === 'teacher' ? 'bg-white shadow-md text-indigo-600 ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                    <BookOpen size={20} className="mb-1" />
                    <span className="text-xs font-bold">Teacher</span>
                </button>
                <button 
                    onClick={() => handleRoleSwitch('headmaster')}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all ${activeRole === 'headmaster' ? 'bg-white shadow-md text-purple-600 ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                    <Shield size={20} className="mb-1" />
                    <span className="text-xs font-bold">Admin</span>
                </button>
            </div>
        </div>

        <div className="p-8">
            <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-1">
                Indrayani School
            </h1>
            <div className="flex items-center justify-center gap-2">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
                    {activeRole === 'student' && 'Student Portal'}
                    {activeRole === 'teacher' && 'Staff Login'}
                    {activeRole === 'headmaster' && 'Headmaster Login'}
                </p>
            </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2 ml-1">Username</label>
                <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium text-slate-800 outline-none"
                    placeholder="Enter your ID"
                    required
                />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2 ml-1">Password</label>
                <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium text-slate-800 outline-none"
                    placeholder="Enter password"
                    required
                />
                </div>
            </div>

            {error && (
                <div className="text-rose-600 text-sm font-medium text-center bg-rose-50 py-3 rounded-lg border border-rose-100 px-4 leading-tight animate-in fade-in slide-in-from-top-1">
                {error}
                </div>
            )}

            <button
                type="submit"
                disabled={isUpdating}
                className={`w-full text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50
                    ${activeRole === 'student' ? 'bg-emerald-600 shadow-emerald-200' : ''}
                    ${activeRole === 'teacher' ? 'bg-indigo-600 shadow-indigo-200' : ''}
                    ${activeRole === 'headmaster' ? 'bg-purple-600 shadow-purple-200' : ''}
                `}
            >
                {isUpdating ? <Loader2 size={20} className="animate-spin"/> : <LogIn size={20} />}
                {isUpdating ? 'Verifying...' : 'Secure Login'}
            </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
                <button 
                  onClick={handleManualRefresh}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-[10px] uppercase tracking-widest transition-all"
                >
                    <RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />
                    {isUpdating ? 'Refreshing Data...' : 'Update Device Data'}
                </button>
            </div>

            <div className="mt-8 text-center text-[10px] text-slate-300 font-black tracking-widest uppercase">
            © 2025 Indrayani School • Private System
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
