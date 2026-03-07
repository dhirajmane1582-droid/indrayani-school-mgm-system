
import React, { useState, useMemo } from 'react';
import { Exam, SIMPLIFIED_CLASSES, TimetableEntry, getSubjectsForClass } from '../types';
import { Plus, Trash2, CalendarCheck, Check, Layers, AlertCircle, Clock, Calendar, RefreshCcw, Download, ArrowUp, ArrowDown, Edit2, Eraser } from 'lucide-react';
import { dbService } from '../services/db';

interface ExamManagerProps {
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
}

const ExamManager: React.FC<ExamManagerProps> = ({ exams, setExams }) => {
  const [activeView, setActiveView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingExamIds, setEditingExamIds] = useState<string[] | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Exam['type']>('1st Unit Test');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  
  // Timetable Input State
  const [ttDate, setTtDate] = useState('');
  const [ttSubject, setTtSubject] = useState('');

  // Fixed Titles helper
  React.useEffect(() => {
    if (activeView === 'create') {
      const fixedTypes = ['1st Unit Test', '1st Semester', '2nd Unit Test', '2nd Semester', 'Annual'];
      if (fixedTypes.includes(type)) {
        setTitle(type);
      } 
    }
  }, [type, activeView]);

  const handleAddTimetableRow = () => {
      if (!ttDate || !ttSubject) return;
      
      const newEntry: TimetableEntry = {
          id: crypto.randomUUID(),
          date: ttDate,
          subject: ttSubject
      };
      
      setTimetable(prev => [...prev, newEntry]);
      setTtSubject('');
  };

  const handleLoadStandardSubjects = () => {
      if (selectedClasses.length === 0) {
          alert("Please select at least one class first.");
          return;
      }
      
      const className = selectedClasses[0];
      const subjects = getSubjectsForClass(className, 'English');

      const newEntries: TimetableEntry[] = subjects.map(s => ({
          id: crypto.randomUUID(),
          date: ttDate || '',
          subject: s.name
      }));

      const existingSubjects = new Set(timetable.map(t => t.subject));
      const filteredNewEntries = newEntries.filter(e => !existingSubjects.has(e.subject));

      if (filteredNewEntries.length === 0) {
          alert("Standard subjects are already in the list.");
          return;
      }

      setTimetable(prev => [...prev, ...filteredNewEntries]);
  };

  const handleUpdateEntry = (id: string, field: keyof TimetableEntry, value: string) => {
      setTimetable(prev => prev.map(item => 
          item.id === id ? { ...item, [field]: value } : item
      ));
  };

  const moveTimetableRow = (index: number, direction: 'up' | 'down') => {
      const newTimetable = [...timetable];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < newTimetable.length) {
          [newTimetable[index], newTimetable[targetIndex]] = [newTimetable[targetIndex], newTimetable[index]];
          setTimetable(newTimetable);
      }
  };

  const removeTimetableRow = (id: string) => {
      setTimetable(prev => prev.filter(t => t.id !== id));
  };

  const toggleClassSelection = (clsValue: string) => {
      setSelectedClasses(prev => 
          prev.includes(clsValue) 
            ? prev.filter(c => c !== clsValue)
            : [...prev, clsValue]
      );
  };

  const resetForm = () => {
      setTitle('');
      setSelectedClasses([]);
      setTimetable([]);
      setEditingExamIds(null);
      setTtDate('');
      setTtSubject('');
  };

  const handleSave = () => {
      if (!title || selectedClasses.length === 0) {
          alert("Please fill in the title and select at least one class.");
          return;
      }

      const sortedTimetable = [...timetable].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (activeView === 'edit' && editingExamIds) {
          setExams(prev => prev.map(e => 
              editingExamIds.includes(e.id) 
              ? { ...e, title, type, timetable: sortedTimetable } 
              : e
          ));
          setSuccessMsg(`Successfully updated "${title}".`);
      } else {
          const newExams: Exam[] = selectedClasses.map(cls => ({
              id: crypto.randomUUID(),
              title,
              type,
              date: sortedTimetable[0]?.date || new Date().toISOString().split('T')[0],
              className: cls,
              published: true,
              timetable: sortedTimetable,
              customSubjects: [],
              activeSubjectIds: undefined,
              customMaxMarks: {}
          }));
          setExams(prev => [...prev, ...newExams]);
          setSuccessMsg(`Successfully published "${title}" to ${selectedClasses.length} classes.`);
      }

      setTimeout(() => setSuccessMsg(''), 3000);
      resetForm();
      setActiveView('list');
  };

  const handleEditGroup = (group: { exam: Exam, classNames: string[], allIds: string[] }) => {
      setEditingExamIds(group.allIds);
      setTitle(group.exam.title);
      setType(group.exam.type);
      setSelectedClasses(group.classNames);
      setTimetable(group.exam.timetable || []);
      setActiveView('edit');
  };

  const handleDeleteGroup = async (examIds: string[]) => {
      if(window.confirm("Delete this exam entirely? This will remove it from all devices and student portals.")) {
          for (const id of examIds) {
              await dbService.delete('exams', id);
          }
          setExams(prev => prev.filter(e => !examIds.includes(e.id)));
      }
  };

  const handleClearTimetable = () => {
      if (window.confirm("Clear all subjects from this timetable? This cannot be undone.")) {
          setTimetable([]);
      }
  };

  const groupedExams = useMemo(() => {
    const groups: Record<string, { exam: Exam, classNames: string[], allIds: string[] }> = {};
    
    exams.forEach(exam => {
        const tt = Array.isArray(exam.timetable) ? exam.timetable : [];
        const timetableSig = tt.length > 0 
            ? JSON.stringify(tt.map(t => ({ d: t.date, s: t.subject }))) 
            : 'no-tt';
            
        const key = `${exam.title}|${exam.type}|${timetableSig}`;
        
        if (!groups[key]) {
            groups[key] = {
                exam,
                classNames: [],
                allIds: []
            };
        }
        groups[key].classNames.push(exam.className);
        groups[key].allIds.push(exam.id);
    });

    return Object.values(groups).sort((a, b) => new Date(b.exam.date).getTime() - new Date(a.exam.date).getTime());
  }, [exams]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
               <h2 className="text-xl font-bold text-slate-800">Exam Planner</h2>
               <p className="text-sm text-slate-500">Manage schedules & sync across all devices.</p>
            </div>
            {activeView === 'list' ? (
                <button 
                  onClick={() => { resetForm(); setActiveView('create'); }}
                  className="bg-indigo-600 text-white w-10 h-10 rounded-xl hover:bg-indigo-700 shadow-sm flex items-center justify-center active:scale-95 transition-all"
                >
                    <Plus size={24} />
                </button>
            ) : (
                <button 
                  onClick={() => { resetForm(); setActiveView('list'); }}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-sm font-medium"
                >
                    Back to List
                </button>
            )}
        </div>

        {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 flex items-center gap-2">
                <Check size={20} /> {successMsg}
            </div>
        )}

        {/* CREATE / EDIT VIEW */}
        {(activeView === 'create' || activeView === 'edit') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">Exam Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                <select 
                                  value={type}
                                  onChange={(e) => setType(e.target.value as any)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-slate-900"
                                >
                                    <option value="1st Unit Test">1st Unit Test</option>
                                    <option value="1st Semester">1st Semester</option>
                                    <option value="2nd Unit Test">2nd Unit Test</option>
                                    <option value="2nd Semester">2nd Semester</option>
                                    <option value="Annual">Annual Exam</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                                <input 
                                  type="text"
                                  value={title}
                                  onChange={(e) => setTitle(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder-slate-400"
                                  placeholder="Exam Name"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex justify-between items-center text-sm uppercase tracking-wider">
                            Select Classes
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">{selectedClasses.length} Selected</span>
                        </h3>
                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                            {SIMPLIFIED_CLASSES.map(cls => (
                                <label key={cls.value} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedClasses.includes(cls.value) ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                                    <input 
                                      type="checkbox"
                                      checked={selectedClasses.includes(cls.value)}
                                      onChange={() => toggleClassSelection(cls.value)}
                                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                      disabled={activeView === 'edit'}
                                    />
                                    <span className="text-sm text-slate-700 font-medium">{cls.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Timetable Builder</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleLoadStandardSubjects}
                                    className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 flex items-center gap-2"
                                >
                                    <Download size={14} /> Subjects
                                </button>
                                <button
                                    onClick={handleClearTimetable}
                                    className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-100 hover:bg-rose-100 flex items-center gap-2"
                                >
                                    <Eraser size={14} /> Clear
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-2 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200 items-end">
                            <div className="col-span-4">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Date</label>
                                <input 
                                  type="date"
                                  value={ttDate}
                                  onChange={(e) => setTtDate(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="col-span-6">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Subject Name</label>
                                <input 
                                  type="text"
                                  value={ttSubject}
                                  onChange={(e) => setTtSubject(e.target.value)}
                                  placeholder="e.g. Science"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddTimetableRow()}
                                />
                            </div>
                            <div className="col-span-2">
                                <button onClick={handleAddTimetableRow} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 flex items-center justify-center transition-all shadow-sm">
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {timetable.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                                    <CalendarCheck size={48} className="mb-2 opacity-20" />
                                    <p className="text-sm font-medium">Timetable is empty.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 uppercase text-[10px] tracking-wider">Date</th>
                                            <th className="px-4 py-3 uppercase text-[10px] tracking-wider">Subject</th>
                                            <th className="px-4 py-3 w-28 text-right uppercase text-[10px] tracking-wider">Move</th>
                                            <th className="px-4 py-3 w-16 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {timetable.map((row, index) => (
                                            <tr key={row.id} className="hover:bg-slate-50/50">
                                                <td className="px-2 py-2">
                                                    <input type="date" value={row.date} onChange={(e) => handleUpdateEntry(row.id, 'date', e.target.value)} className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 rounded text-xs font-bold" />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input type="text" value={row.subject} onChange={(e) => handleUpdateEntry(row.id, 'subject', e.target.value)} className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 rounded text-xs font-bold" />
                                                </td>
                                                <td className="px-2 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => moveTimetableRow(index, 'up')} disabled={index === 0} className="p-1 text-slate-300 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={14}/></button>
                                                        <button onClick={() => moveTimetableRow(index, 'down')} disabled={index === timetable.length - 1} className="p-1 text-slate-300 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={14}/></button>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-right">
                                                    <button onClick={() => removeTimetableRow(row.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                            <button onClick={handleSave} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                                <Check size={18} /> {activeView === 'edit' ? 'Save Changes' : 'Publish Exam'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* LIST VIEW */}
        {activeView === 'list' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {groupedExams.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <Layers size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No exams created yet. Click "+" to start.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 w-[200px] uppercase text-[10px] tracking-wider">Title & Info</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Full Timetable</th>
                                    <th className="px-6 py-4 text-center w-[120px] uppercase text-[10px] tracking-wider">Start Date</th>
                                    <th className="px-6 py-4 text-right w-[180px] uppercase text-[10px] tracking-wider">Published For</th>
                                    <th className="px-6 py-4 w-[100px] uppercase text-[10px] tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {groupedExams.map((group, index) => {
                                    const { exam, classNames, allIds } = group;
                                    const tt = Array.isArray(exam.timetable) ? exam.timetable : [];
                                    
                                    return (
                                        <tr key={index} className="hover:bg-slate-50/50 align-top transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-base">{exam.title}</div>
                                                <div className="text-indigo-600 text-[10px] font-black uppercase mt-1 bg-indigo-50 inline-block px-2 py-0.5 rounded-md border border-indigo-100">{exam.type}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {tt.length > 0 ? (
                                                    <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] bg-white shadow-sm">
                                                        {tt.slice(0, 3).map(t => (
                                                            <div key={t.id} className="grid grid-cols-2 p-1.5 border-b border-slate-100 last:border-0">
                                                                <div className="font-mono text-slate-400">{t.date}</div>
                                                                <div className="font-bold text-slate-700">{t.subject}</div>
                                                            </div>
                                                        ))}
                                                        {tt.length > 3 && <div className="p-1 text-center bg-slate-50 text-[9px] font-bold text-slate-400">+{tt.length - 3} MORE SUBJECTS</div>}
                                                    </div>
                                                ) : (
                                                    <span className="text-rose-500 font-bold text-[10px] uppercase bg-rose-50 px-2 py-1 rounded">No Timetable Uploaded</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono text-slate-600 font-bold">
                                                {exam.date}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-wrap justify-end gap-1">
                                                    {classNames.sort().map((cls, i) => (
                                                        <span key={i} className="text-[10px] font-black uppercase bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                                            {cls}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button 
                                                      onClick={() => handleEditGroup(group)}
                                                      className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                      title="Edit Details"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                      onClick={() => handleDeleteGroup(allIds)}
                                                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                      title="Delete Exam"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default ExamManager;
