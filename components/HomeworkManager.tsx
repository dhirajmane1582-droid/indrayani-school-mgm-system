
import React, { useState, useMemo, useEffect } from 'react';
import { Homework, SPECIFIC_CLASSES, getSubjectsForClass } from '../types';
import { Plus, Trash2, Calendar, BookOpen, ChevronDown, CheckCircle2, Edit2, X, Save } from 'lucide-react';
import { dbService } from '../services/db';

interface HomeworkManagerProps {
  homework: Homework[];
  setHomework: React.Dispatch<React.SetStateAction<Homework[]>>;
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
}

const HomeworkManager: React.FC<HomeworkManagerProps> = ({ 
  homework, 
  setHomework,
  selectedClass,
  setSelectedClass 
}) => {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);

  // Parse class/medium safely
  const [className, medium] = selectedClass && selectedClass.includes('|') 
     ? selectedClass.split('|') 
     : ['', ''];

  const classSubjects = useMemo(() => {
      if (!className) return [];
      return getSubjectsForClass(className, medium as 'English' | 'Semi');
  }, [className, medium]);

  useEffect(() => {
      setEditingId(null);
      setTitle('');
      setDescription('');
      setCustomSubject('');
  }, [selectedClass]);

  useEffect(() => {
      if (!editingId && classSubjects.length > 0) {
          setSubject(classSubjects[0].name);
      }
  }, [classSubjects, editingId]);

  const filteredHomework = useMemo(() => {
      if (!className) return [];
      return homework
        .filter(h => h.className === className && h.medium === medium)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [homework, className, medium]);

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if(!className) return;

    const finalSubject = subject === 'custom' ? customSubject.trim() : subject;
    const today = getTodayString();
    
    if (!title || !description || !finalSubject) return;

    if (editingId) {
        setHomework(prev => prev.map(h => h.id === editingId ? {
            ...h,
            subject: finalSubject,
            title,
            description
        } : h));
        setEditingId(null);
    } else {
        const newHw: Homework = {
            id: crypto.randomUUID(),
            date: today,
            dueDate: today, // Setting dueDate as today but hiding it from UI
            className,
            medium: medium as 'English' | 'Semi',
            subject: finalSubject,
            title,
            description
        };
        setHomework(prev => [newHw, ...prev]);
    }

    setTitle('');
    setDescription('');
    setCustomSubject('');
    if (subject === 'custom' && classSubjects.length > 0) {
        setSubject(classSubjects[0].name);
    } else if (classSubjects.length > 0) {
        setSubject(classSubjects[0].name);
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleEdit = (hw: Homework) => {
      setEditingId(hw.id);
      setTitle(hw.title);
      setDescription(hw.description);
      
      const isStandardSubject = classSubjects.some(s => s.name === hw.subject);
      if (isStandardSubject) {
          setSubject(hw.subject);
          setCustomSubject('');
      } else {
          setSubject('custom');
          setCustomSubject(hw.subject);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
      setEditingId(null);
      setTitle('');
      setDescription('');
      setCustomSubject('');
      if (classSubjects.length > 0) setSubject(classSubjects[0].name);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this homework assignment?")) {
        await dbService.delete('homework', id);
        setHomework(prev => prev.filter(h => h.id !== id));
        if (editingId === id) {
            cancelEdit();
        }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div>
               <h2 className="text-xl font-bold text-slate-800">Homework Management</h2>
               <p className="text-sm text-slate-500">Assign daily homework to students.</p>
            </div>
            <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[200px]"
                >
                  <option value="">Select Class</option>
                  {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-1">
                <div className={`bg-white p-5 rounded-xl shadow-sm border ${editingId ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200'} sticky top-24 transition-all`}>
                   <div className="flex items-center justify-between mb-4">
                       <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          {editingId ? <Edit2 size={18} className="text-indigo-600"/> : <Plus size={18} className="text-indigo-600"/>} 
                          {editingId ? 'Edit Homework' : 'Assign Homework'}
                       </h3>
                       {editingId && (
                           <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1">
                               <X size={14}/> Cancel
                           </button>
                       )}
                   </div>
                   
                   {!selectedClass ? (
                       <div className="text-center text-slate-400 py-8 italic text-sm">
                           Select a class above to assign homework.
                       </div>
                   ) : (
                   <form onSubmit={handleAddOrUpdate} className="space-y-4">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                          <select 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                             {classSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                             <option value="custom">Other (Custom Subject)</option>
                          </select>
                          
                          {subject === 'custom' && (
                              <input 
                                type="text"
                                value={customSubject}
                                onChange={(e) => setCustomSubject(e.target.value)}
                                className="w-full mt-2 px-3 py-2 bg-slate-50 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 animate-in fade-in slide-in-from-top-1"
                                placeholder="Enter subject name (e.g. Music, P.T.)"
                                autoFocus
                                required
                              />
                          )}
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                          <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Chapter 5 Questions"
                            required
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                          <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                            placeholder="Details about the assignment..."
                            required
                          />
                       </div>
                       <button 
                         type="submit"
                         className={`w-full py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 ${editingId ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                         title={editingId ? 'Update Homework' : 'Assign Homework'}
                       >
                         {editingId ? <><Save size={16}/> Update</> : <Plus size={20} />}
                       </button>
                   </form>
                   )}
                </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
                <div className="space-y-4">
                    {!selectedClass ? (
                        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                           <BookOpen size={48} className="mx-auto mb-3 opacity-20"/>
                           <p>Please select a class.</p>
                        </div>
                    ) : filteredHomework.length === 0 ? (
                        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                           <BookOpen size={48} className="mx-auto mb-3 opacity-20"/>
                           <p>No homework assigned for {className} ({medium}).</p>
                        </div>
                    ) : (
                        filteredHomework.map(hw => (
                            <div key={hw.id} className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all relative group ${editingId === hw.id ? 'border-indigo-300 ring-2 ring-indigo-50 bg-indigo-50/10' : 'border-slate-200'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{hw.subject}</span>
                                        <span className="text-slate-400 text-xs flex items-center gap-1">
                                           <Calendar size={12}/> {hw.date}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(hw)} className="text-slate-300 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50 transition-colors"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDelete(hw.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1">{hw.title}</h3>
                                <p className="text-slate-600 text-sm whitespace-pre-wrap">{hw.description}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
        {showSuccess && <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[100]"><CheckCircle2 size={20} /><span className="font-medium">{editingId ? 'Homework Updated!' : 'Homework Assigned!'}</span></div>}
    </div>
  );
};

export default HomeworkManager;
