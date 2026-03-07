
import React, { useState } from 'react';
import { Announcement, SPECIFIC_CLASSES } from '../types';
import { Megaphone, Trash2, Plus, Bell } from 'lucide-react';
import { dbService } from '../services/db';

interface AnnouncementManagerProps {
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ announcements, setAnnouncements }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetClass, setTargetClass] = useState('All');

  const sortedAnnouncements = [...announcements].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if (!title || !content) return;

      const newNotice: Announcement = {
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          title,
          content,
          targetClass
      };
      
      setAnnouncements(prev => [newNotice, ...prev]);
      setTitle('');
      setContent('');
      setTargetClass('All');
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Delete this announcement?")) {
          await dbService.delete('announcements', id);
          setAnnouncements(prev => prev.filter(a => a.id !== id));
      }
  };

  // Get unique class names from SPECIFIC_CLASSES for the dropdown, simpler list
  const classOptions = Array.from(new Set(SPECIFIC_CLASSES.map(c => c.value.split('|')[0])));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
             <h2 className="text-xl font-bold text-slate-800">Notices & Declarations</h2>
             <p className="text-sm text-slate-500">Post announcements for students.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 sticky top-24">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Plus size={18} className="text-indigo-600"/> New Announcement
                    </h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Audience</label>
                           <select 
                             value={targetClass}
                             onChange={(e) => setTargetClass(e.target.value)}
                             className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                              <option value="All">All Students</option>
                              {classOptions.map(cls => (
                                  <option key={cls} value={cls}>{cls}</option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                           <input 
                             type="text"
                             value={title}
                             onChange={(e) => setTitle(e.target.value)}
                             className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             placeholder="e.g. Holiday Notice"
                             required 
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Content</label>
                           <textarea 
                             value={content}
                             onChange={(e) => setContent(e.target.value)}
                             className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32"
                             placeholder="Write your message here..."
                             required 
                           />
                        </div>
                        <button 
                           type="submit"
                           className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center"
                           title="Post Notice"
                        >
                           <Plus size={20} />
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
                {sortedAnnouncements.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                        <Megaphone size={48} className="mx-auto mb-3 opacity-20"/>
                        <p>No announcements posted yet.</p>
                    </div>
                ) : (
                    sortedAnnouncements.map(notice => (
                        <div key={notice.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${notice.targetClass === 'All' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {notice.targetClass === 'All' ? 'Everyone' : notice.targetClass}
                                    </span>
                                    <span className="text-slate-400 text-xs">{notice.date}</span>
                                </div>
                                <button 
                                  onClick={() => handleDelete(notice.id)}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                   <Trash2 size={16}/>
                                </button>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-2 flex items-center gap-2">
                                <Bell size={18} className="text-orange-500 fill-orange-500" />
                                {notice.title}
                            </h3>
                            <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{notice.content}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

export default AnnouncementManager;
