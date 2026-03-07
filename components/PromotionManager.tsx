
import React, { useState, useMemo } from 'react';
import { Student, SPECIFIC_CLASSES, User } from '../types';
import { TrendingUp, Users, ArrowRight, CheckCircle2, ChevronDown, Search, Filter, AlertTriangle, GraduationCap, RefreshCw } from 'lucide-react';
import { dbService } from '../services/db';

interface PromotionManagerProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  users?: User[]; // Optional: if we want to show credential status
}

const PromotionManager: React.FC<PromotionManagerProps> = ({ students, setStudents }) => {
  const [sourceSpecificClass, setSourceSpecificClass] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Migration Logic Helper
  const getNextClass = (currentClass: string): string => {
    if (currentClass === 'Nursery') return 'Jr. KG';
    if (currentClass === 'Jr. KG') return 'Sr. KG';
    if (currentClass === 'Sr. KG') return 'Class 1';
    
    if (currentClass.startsWith('Class ')) {
        const num = parseInt(currentClass.replace('Class ', ''));
        if (num === 10) return 'Alumni';
        if (num < 10) return `Class ${num + 1}`;
    }
    
    return currentClass; // Default (e.g., Alumni stays Alumni)
  };

  const filteredStudents = useMemo(() => {
    if (!sourceSpecificClass) return [];
    const [className, medium] = sourceSpecificClass.split('|');
    let list = students.filter(s => s.className === className && (s.medium || 'English') === medium);
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNo.includes(q));
    }
    
    return list.sort((a,b) => (parseInt(a.rollNo)||0) - (parseInt(b.rollNo)||0));
  }, [students, sourceSpecificClass, searchQuery]);

  const toggleSelection = (id: string) => {
    const n = new Set(selectedStudentIds);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelectedStudentIds(n);
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
        setSelectedStudentIds(new Set());
    } else {
        setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleManualSync = async (updatedStudents: Student[]) => {
      setIsSyncing(true);
      try {
          await dbService.putAll('students', updatedStudents);
          setToast("Cloud Synced Successfully");
          setTimeout(() => setToast(null), 3000);
      } catch (e) {
          console.error("Sync Error:", e);
          alert("Failed to sync with cloud. Please check connection.");
      } finally {
          setIsSyncing(false);
      }
  };

  const handlePromote = () => {
    if (selectedStudentIds.size === 0) return;
    
    const count = selectedStudentIds.size;
    const msg = count === filteredStudents.length 
        ? `Are you sure you want to promote the ENTIRE class? Credentials will remain the same.`
        : `Confirm promotion for ${count} selected students?`;

    if (window.confirm(msg)) {
        const updatedStudentsList = students.map(s => {
            if (selectedStudentIds.has(s.id)) {
                return { ...s, className: getNextClass(s.className) };
            }
            return s;
        });

        setStudents(updatedStudentsList);
        setSelectedStudentIds(new Set());
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Trigger manual cloud sync to ensure visibility across devices
        handleManualSync(updatedStudentsList);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 size={18} className="text-emerald-400"/>
          <span className="text-xs font-black uppercase tracking-widest">{toast}</span>
        </div>
      )}

      {/* Promotion Tool Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="bg-violet-100 p-3 rounded-2xl text-violet-600">
                <TrendingUp size={28} />
             </div>
             <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Academic Promotion</h2>
                <p className="text-sm text-slate-500 font-medium italic">Passwords and IDs are preserved during transfer.</p>
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Filter candidates..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none transition-all text-slate-900"
                />
             </div>
             <div className="relative">
                <select
                  value={sourceSpecificClass}
                  onChange={(e) => { setSourceSpecificClass(e.target.value); setSelectedStudentIds(new Set()); }}
                  className="appearance-none pl-4 pr-10 py-3 bg-violet-50 border border-violet-100 rounded-xl text-sm font-black text-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100 cursor-pointer min-w-[220px]"
                >
                  <option value="">Select Source Class</option>
                  {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" size={18} />
             </div>
          </div>
        </div>
      </div>

      {/* Main Promotion Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column: Stats & Logic Preview */}
          <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Progression Path</h3>
                  <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span>Primary</span>
                          <ArrowRight size={14} className="text-slate-300"/>
                          <span>Next Grade</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span>Class 10</span>
                          <ArrowRight size={14} className="text-slate-300"/>
                          <span className="text-violet-600">Alumni</span>
                      </div>
                  </div>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em]">Batch Action</h3>
                      {isSyncing && <RefreshCw size={14} className="animate-spin text-indigo-400" />}
                  </div>
                  <div className="text-4xl font-black mb-1">{selectedStudentIds.size}</div>
                  <div className="text-xs font-bold opacity-80 uppercase tracking-wider">Students Selected</div>
                  
                  <button 
                    onClick={handlePromote}
                    disabled={selectedStudentIds.size === 0 || isSyncing}
                    className="mt-8 w-full py-4 bg-violet-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-violet-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                      {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                      {isSyncing ? 'Synchronizing...' : 'Apply Promotion'}
                  </button>
                  <p className="mt-4 text-[9px] text-slate-500 font-bold uppercase text-center leading-relaxed">Changes will be visible across all devices immediately after sync.</p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                  <p className="text-[10px] leading-relaxed font-bold text-amber-800 uppercase italic">
                      Records remain linked to student IDs. Promoting shifts current dashboard context.
                  </p>
              </div>
          </div>

          {/* Right Column: Student Selection List */}
          <div className="lg:col-span-3">
              {!sourceSpecificClass ? (
                  <div className="bg-white h-[450px] rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                      <Users size={64} className="mb-4 opacity-10" />
                      <p className="font-black text-xs uppercase tracking-widest text-slate-300">Choose source class to begin</p>
                  </div>
              ) : filteredStudents.length === 0 ? (
                  <div className="bg-white h-[450px] rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <p className="font-bold text-sm uppercase tracking-widest">No students found in this class</p>
                  </div>
              ) : (
                  <div className="space-y-4">
                      <div className="flex items-center justify-between px-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                           <label className="flex items-center gap-3 cursor-pointer group">
                               <input 
                                  type="checkbox" 
                                  checked={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0} 
                                  onChange={toggleSelectAll}
                                  className="w-5 h-5 rounded border-2 border-slate-300 text-violet-600 focus:ring-violet-500" 
                               />
                               <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-violet-600 transition-colors">Select Entire Class</span>
                           </label>
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">
                               Batch Size: {filteredStudents.length} Students
                           </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredStudents.map(student => {
                              const isSelected = selectedStudentIds.has(student.id);
                              const nextClass = getNextClass(student.className);
                              
                              return (
                                  <div 
                                    key={student.id} 
                                    onClick={() => toggleSelection(student.id)}
                                    className={`group relative bg-white p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-violet-500 ring-4 ring-violet-50 shadow-md translate-y-[-2px]' : 'border-slate-200 hover:border-violet-200 hover:shadow-sm'}`}
                                  >
                                      <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${isSelected ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-slate-100 text-slate-400'}`}>
                                              {student.rollNo}
                                          </div>
                                          <div className="flex-1 overflow-hidden">
                                              <h4 className={`text-sm font-black truncate uppercase ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{student.name}</h4>
                                              <div className="flex items-center gap-2 mt-1">
                                                  <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{student.className} ({(student.medium || 'English')})</span>
                                                  <ArrowRight size={10} className="text-slate-300" />
                                                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isSelected ? 'bg-violet-50 text-violet-600 border border-violet-100' : 'text-slate-400/50 italic'}`}>{nextClass}</span>
                                              </div>
                                          </div>
                                          {isSelected && (
                                              <div className="bg-violet-600 text-white p-1 rounded-full animate-in zoom-in duration-200 shadow-sm">
                                                  <CheckCircle2 size={16} />
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {showSuccess && (
          <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] animate-in fade-in slide-in-from-bottom-4 border border-slate-700">
              <div className="bg-emerald-500 p-1.5 rounded-full"><CheckCircle2 size={20} /></div>
              <div>
                  <div className="text-sm font-black uppercase tracking-widest leading-none mb-1">Update Complete</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Records moved to new standards.</div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PromotionManager;
