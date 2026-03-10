
import React, { useState, useMemo } from 'react';
import { User, UserRole, Student } from '../types';
import { Trash2, UserPlus, Shield, GraduationCap, X, Check, User as UserIcon, Search, Plus, Filter, Key, RefreshCw, Copy, CheckCircle2, BookOpen } from 'lucide-react';
import { dbService } from '../services/db';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  students: Student[];
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, currentUser, students }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('teacher');
  const [linkedStudentId, setLinkedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await dbService.putAll('users', users);
      showToast("Cloud Database Updated");
    } catch (e) {
      alert("Cloud Sync Failed. Please check your internet connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           u.username.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, roleFilter, searchQuery]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students.slice(0, 5);
    const q = studentSearch.toLowerCase();
    return students.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.rollNo.includes(q)
    ).slice(0, 10);
  }, [students, studentSearch]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim().toLowerCase();
    
    if (!cleanUsername || !newPassword || !newName) return;
    if (newRole === 'student' && !linkedStudentId) {
        alert("Please select a student profile to link.");
        return;
    }

    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      alert('Username already exists');
      return;
    }

    setIsSyncing(true);
    try {
        const newUser: User = {
          id: crypto.randomUUID(),
          username: cleanUsername,
          password: newPassword,
          name: newName,
          role: newRole,
          linkedStudentId: newRole === 'student' ? linkedStudentId : undefined
        };

        // Persist to local and cloud immediately
        await dbService.put('users', newUser);
        
        setUsers(prev => [...prev, newUser]);
        setIsModalOpen(false);
        resetForm();
        showToast("User Created & Synced Across Devices");
    } catch (err) {
        console.error("User Creation Error:", err);
        alert("Account created locally but cloud sync failed. Ensure your internet is stable.");
    } finally {
        setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewRole('teacher');
    setLinkedStudentId('');
    setStudentSearch('');
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this user? This will remove their access across all devices.')) {
      await dbService.delete('users', id);
      setUsers(users.filter(u => u.id !== id));
      showToast("User Removed");
    }
  };

  const getStudentName = (user: User) => {
      if (user.role !== 'student' || !user.linkedStudentId) return '';
      const s = students.find(stud => stud.id === user.linkedStudentId);
      if (s) return `${s.name} (${s.className})`;
      
      // Fallback: If student record is missing, use the name from the user record
      return `${user.name} (Profile Missing)`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} Copied`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 border border-slate-700">
          <CheckCircle2 size={18} className="text-emerald-400"/>
          <span className="text-xs font-black uppercase tracking-widest">{toast}</span>
        </div>
      )}

      {/* Header & Filter Picker */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
          <div className="flex items-center gap-4">
             <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg">
                <Shield size={28} />
             </div>
             <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">User Access Management</h2>
                <p className="text-sm text-slate-500 font-medium italic">Create and manage cross-device credentials.</p>
             </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search accounts..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                />
             </div>
             <button onClick={handleManualSync} disabled={isSyncing} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all shadow-sm ${isSyncing ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-indigo-600 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300'}`} title="Push All Credentials to Cloud">
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">Sync All Credentials</span>
             </button>
             <button
               onClick={() => setIsModalOpen(true)}
               className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
             >
               <UserPlus size={18} /> <span className="hidden sm:inline">Add User</span>
             </button>
          </div>
        </div>

        {/* ROLE PICKER TABS */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setRoleFilter('all')}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${roleFilter === 'all' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Filter size={14}/> All Users
            </button>
            <button 
                onClick={() => setRoleFilter('student')}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${roleFilter === 'student' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <GraduationCap size={14}/> Students
            </button>
            <button 
                onClick={() => setRoleFilter('teacher')}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${roleFilter === 'teacher' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <BookOpen size={14}/> Teachers
            </button>
            <button 
                onClick={() => setRoleFilter('headmaster')}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${roleFilter === 'headmaster' ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Shield size={14}/> Admins
            </button>
        </div>
      </div>

      {/* User List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 uppercase tracking-widest text-[10px]">
                <tr>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">ID (Username)</th>
                <th className="px-6 py-4">Access Password</th>
                <th className="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-bold">No users found for this role.</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900 text-sm uppercase">{user.name}</div>
                        {user.role === 'student' && (
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{getStudentName(user)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                      {user.role === 'headmaster' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 uppercase border border-purple-200">
                          <Shield size={12} /> Administrator
                          </span>
                      )}
                      {user.role === 'teacher' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase border border-indigo-200">
                          <BookOpen size={12} /> Teacher
                          </span>
                      )}
                      {user.role === 'student' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase border border-emerald-200">
                          <UserIcon size={12} /> Student
                          </span>
                      )}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => copyToClipboard(user.username, 'ID')} className="flex items-center gap-2 group">
                          <span className="text-slate-600 font-mono font-black bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs group-hover:border-indigo-300 group-hover:text-indigo-600 transition-all">{user.username}</span>
                          <Copy size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {user.id === currentUser.id ? (
                           <span className="text-[10px] font-black text-slate-400 uppercase italic">Logged In (Hidden)</span>
                        ) : (
                          <button onClick={() => copyToClipboard(user.password, 'Password')} className="flex items-center gap-2 group">
                             <span className="text-indigo-900 font-mono font-black bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs group-hover:border-indigo-400 transition-all">{user.password}</span>
                             <Copy size={12} className="text-indigo-300 opacity-0 group-hover:opacity-100 transition-all" />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                      {user.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-slate-300 hover:text-rose-600 p-2.5 rounded-xl hover:bg-rose-50 transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                      )}
                      </td>
                  </tr>
                  ))
                )}
            </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-0 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] border border-white/20">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Create User Account</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Cross-Device Access Provisioning</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-8 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 text-slate-900 font-bold outline-none transition-all"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">ID (Username)</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 text-slate-900 font-bold outline-none transition-all"
                    placeholder="john.doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Password</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 text-indigo-950 font-black outline-none transition-all"
                    placeholder="Set password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-wider">Account Role</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`cursor-pointer border rounded-2xl p-3 flex flex-col items-center gap-1 transition-all ${newRole === 'teacher' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                    <input type="radio" name="role" checked={newRole === 'teacher'} onChange={() => setNewRole('teacher')} className="hidden" />
                    <BookOpen size={18} />
                    <span className="font-black text-[9px] uppercase tracking-tighter">Teacher</span>
                  </label>
                  
                  <label className={`cursor-pointer border rounded-2xl p-3 flex flex-col items-center gap-1 transition-all ${newRole === 'headmaster' ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                    <input type="radio" name="role" checked={newRole === 'headmaster'} onChange={() => setNewRole('headmaster')} className="hidden" />
                    <Shield size={18} />
                    <span className="font-black text-[9px] uppercase tracking-tighter">Admin</span>
                  </label>

                  <label className={`cursor-pointer border rounded-2xl p-3 flex flex-col items-center gap-1 transition-all ${newRole === 'student' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                    <input type="radio" name="role" checked={newRole === 'student'} onChange={() => setNewRole('student')} className="hidden" />
                    <UserIcon size={18} />
                    <span className="font-black text-[9px] uppercase tracking-tighter">Student</span>
                  </label>
                </div>
              </div>
              
              {newRole === 'student' && (
                  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 animate-in zoom-in duration-300">
                      <label className="block text-[9px] font-black text-slate-500 uppercase mb-3 tracking-[0.2em]">Link To Student Profile</label>
                      <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <input 
                             type="text" 
                             className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                             placeholder="Search student list..."
                             value={studentSearch}
                             onChange={(e) => setStudentSearch(e.target.value)}
                          />
                      </div>
                      <div className="max-h-[120px] overflow-y-auto space-y-1 bg-black/20 rounded-xl p-1 no-scrollbar">
                          {filteredStudents.length === 0 ? (
                              <div className="p-4 text-[10px] text-slate-600 text-center font-bold uppercase italic">No profiles found</div>
                          ) : (
                              filteredStudents.map(s => (
                                  <div 
                                    key={s.id}
                                    onClick={() => setLinkedStudentId(s.id)}
                                    className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex justify-between items-center transition-all ${linkedStudentId === s.id ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:bg-slate-800'}`}
                                  >
                                      <div>
                                          <div>{s.name}</div>
                                          <div className={`text-[9px] font-bold ${linkedStudentId === s.id ? 'text-indigo-200' : 'text-slate-600'}`}>{s.className} ({(s.medium || 'English')})</div>
                                      </div>
                                      {linkedStudentId === s.id && <CheckCircle2 size={14}/>}
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              )}

              <div className="pt-4 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? <RefreshCw size={18} className="animate-spin"/> : null}
                  {isSyncing ? 'Synchronizing Cloud...' : 'Confirm & Provision Account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest"
                >
                  Discard Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
