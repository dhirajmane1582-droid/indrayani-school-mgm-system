
import React, { useState } from 'react';
import { User, Student, FeeRecord } from '../types';
import UserManagement from './UserManagement';
import FeeManager from './FeeManager';
import { Users, IndianRupee, LogOut, LayoutDashboard, UserCircle } from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  students: Student[]; // Read-only access to students
  fees: FeeRecord[];
  setFees: React.Dispatch<React.SetStateAction<FeeRecord[]>>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentUser, 
  onLogout, 
  users, 
  setUsers,
  students,
  fees,
  setFees
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'fees'>('users');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Headmaster Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg text-white">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Indrayani School</h1>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Management Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300 bg-slate-800 py-1.5 px-3 rounded-full">
               <UserCircle size={16} />
               <span>{currentUser.name}</span>
            </div>
            <button 
              onClick={onLogout}
              className="text-slate-300 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-white p-1.5 rounded-xl mb-8 shadow-sm border border-slate-200 max-w-md">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'users' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Users size={18} />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'fees' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <IndianRupee size={18} />
            Fees Management
          </button>
        </div>

        {/* Content Render */}
        <div className="min-h-[500px]">
          {activeTab === 'users' && (
            <UserManagement 
              users={users} 
              setUsers={setUsers} 
              currentUser={currentUser}
              students={students}
            />
          )}
          {activeTab === 'fees' && (
            <FeeManager 
              students={students}
              fees={fees}
              setFees={setFees}
            />
          )}
        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;
