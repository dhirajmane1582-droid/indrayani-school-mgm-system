
import React, { useState, useMemo } from 'react';
import { Student, FeeRecord, SPECIFIC_CLASSES } from '../types';
import { IndianRupee, History, Plus, Search, Calendar, Lock, X, ChevronRight } from 'lucide-react';

interface FeeManagerProps {
  students: Student[];
  fees: FeeRecord[];
  setFees: React.Dispatch<React.SetStateAction<FeeRecord[]>>;
  readOnly?: boolean;
}

const FeeManager: React.FC<FeeManagerProps> = ({ students, fees, setFees, readOnly = false }) => {
  const [selectedFeeClass, setSelectedFeeClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [remarks, setRemarks] = useState('');

  const filteredStudents = useMemo(() => {
    if (!selectedFeeClass) return [];
    const [className, classMedium] = selectedFeeClass.split('|');
    
    const list = students.filter(s => {
      const matchesClass = s.className === className;
      const studentMedium = s.medium || 'English';
      const matchesMedium = studentMedium === classMedium;
      const q = searchQuery.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q);
      return matchesClass && matchesMedium && matchesSearch;
    });

    // Sorting logic: Unpaid (0 total paid) students at the top.
    return list.sort((a, b) => {
        const aPaid = fees.filter(f => f.studentId === a.id).reduce((sum, f) => sum + f.amount, 0);
        const bPaid = fees.filter(f => f.studentId === b.id).reduce((sum, f) => sum + f.amount, 0);
        
        if (aPaid === 0 && bPaid !== 0) return -1;
        if (aPaid !== 0 && bPaid === 0) return 1;
        
        // If both are paid or both are unpaid, sort by amount ascending
        if (aPaid !== bPaid) return aPaid - bPaid;
        
        // Secondary sort by roll number
        return (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0);
    });
  }, [students, selectedFeeClass, searchQuery, fees]);

  const getStudentStats = (studentId: string) => {
      const studentFees = fees.filter(f => f.studentId === studentId);
      const totalPaid = studentFees.reduce((sum, f) => sum + f.amount, 0);
      const sorted = [...studentFees].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastDate = sorted.length > 0 ? sorted[0].date : '-';
      return { totalPaid, lastDate };
  };

  const selectedStudentHistory = useMemo(() => {
    if (!selectedStudent) return [];
    return fees.filter(f => f.studentId === selectedStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fees, selectedStudent]);

  const handleAddFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !amount || !date) return;
    if (date > todayStr) { alert("Future dates are not allowed."); return; }

    const newFee: FeeRecord = {
      id: crypto.randomUUID(),
      studentId: selectedStudent.id,
      amount: parseFloat(amount),
      date,
      remarks
    };

    setFees(prev => [newFee, ...prev]);
    setAmount('');
    setRemarks('');
  };

  const openStudentModal = (student: Student) => {
      setSelectedStudent(student);
      setAmount('');
      setRemarks('');
      setDate(todayStr);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <div>
           <h2 className="text-xl font-bold text-slate-800">Fees Management</h2>
           <p className="text-sm text-slate-500">Track student fee payments</p>
         </div>
         
         <div className="flex flex-wrap gap-2 w-full sm:w-auto">
           <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search student..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <select
              value={selectedFeeClass}
              onChange={(e) => setSelectedFeeClass(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Class</option>
              {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
         </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {!selectedFeeClass ? (
             <div className="p-12 text-center text-slate-500">Please select a class to manage fees.</div>
        ) : filteredStudents.length === 0 ? (
             <div className="p-12 text-center text-slate-500">No students found in {SPECIFIC_CLASSES.find(c => c.value === selectedFeeClass)?.label}.</div>
        ) : (
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-4">Name</th>
                   <th className="px-6 py-4">Total Amount</th>
                   <th className="px-6 py-4">Last Payment</th>
                   <th className="px-6 py-4 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredStudents.map(student => {
                    const stats = getStudentStats(student.id);
                    return (
                      <tr 
                        key={student.id} 
                        onClick={() => openStudentModal(student)}
                        className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                           <div className="font-bold text-slate-800">{student.name}</div>
                           <div className="text-xs text-slate-500">Roll No: {student.rollNo} • {student.medium || 'English'}</div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                           ₹{stats.totalPaid.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                           {stats.lastDate !== '-' ? (
                             <span className="flex items-center gap-1.5">
                               <Calendar size={14} className="text-slate-400"/>
                               {stats.lastDate}
                             </span>
                           ) : (
                             <span className="text-slate-400 italic text-xs">No payments yet</span>
                           )}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all">
                              <ChevronRight size={16} />
                           </button>
                        </td>
                      </tr>
                    );
                 })}
               </tbody>
             </table>
        )}
      </div>

      {/* Fee Entry & History Modal */}
      {selectedStudent && (
         <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
               {/* Modal Header */}
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                  <div>
                     <h3 className="text-lg font-bold text-slate-800">{selectedStudent.name}</h3>
                     <p className="text-sm text-slate-500">Roll: {selectedStudent.rollNo} • {selectedStudent.className} ({selectedStudent.medium || 'English'})</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="text-right hidden sm:block">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Paid</div>
                        <div className="text-lg font-mono font-black text-emerald-600">
                           ₹{getStudentStats(selectedStudent.id).totalPaid.toLocaleString()}
                        </div>
                     </div>
                     <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left: Add Fee Form */}
                  {!readOnly ? (
                    <div className="space-y-4">
                       <div className="flex items-center gap-2 mb-2">
                          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Plus size={20} /></div>
                          <h4 className="font-bold text-slate-800">New Payment Entry</h4>
                       </div>
                       
                       <form onSubmit={handleAddFee} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date</label>
                              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayStr} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Amount (₹)</label>
                              <div className="relative">
                                 <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                 <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" min="0" step="0.01" required />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Remarks</label>
                              <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Details..." />
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-emerald-700 transition-all flex justify-center items-center gap-2"><Plus size={16} /> Record Payment</button>
                       </form>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 h-full">
                       <Lock size={32} className="text-slate-300 mb-2" />
                       <p className="text-slate-500 font-medium">Read Only Mode</p>
                    </div>
                  )}

                  {/* Right: History Table */}
                  <div className="flex flex-col h-full min-h-[300px]">
                     <div className="flex items-center gap-2 mb-4">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><History size={20} /></div>
                        <h4 className="font-bold text-slate-800">Payment History</h4>
                     </div>

                     <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                        {selectedStudentHistory.length === 0 ? (
                           <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-8">No payments recorded.</div>
                        ) : (
                           <div className="overflow-y-auto flex-1 max-h-[400px]">
                              <table className="w-full text-left text-sm">
                                 <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                                    <tr>
                                       <th className="px-4 py-3">Date</th>
                                       <th className="px-4 py-3">Remarks</th>
                                       <th className="px-4 py-3 text-right">Amount</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {selectedStudentHistory.map(rec => (
                                       <tr key={rec.id} className="hover:bg-slate-50">
                                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">{rec.date}</td>
                                          <td className="px-4 py-3 text-slate-500 text-xs">{rec.remarks || '-'}</td>
                                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">₹{rec.amount.toLocaleString()}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default FeeManager;
