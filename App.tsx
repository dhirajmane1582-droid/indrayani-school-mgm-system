
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TabView, Student, AttendanceRecord, StudentResult, Exam, CustomFieldDefinition, Holiday, AnnualRecord, User, FeeRecord, Homework, Announcement } from './types';
import AttendanceTracker from './components/AttendanceTracker';
import ResultsManager from './components/ResultsManager';
import AnnualResultsManager from './components/AnnualResultsManager';
import Login from './components/Login';
import FeeManager from './components/FeeManager';
import UserManagement from './components/UserManagement';
import PromotionManager from './components/PromotionManager';
import HomeworkManager from './components/HomeworkManager';
import AnnouncementManager from './components/AnnouncementManager';
import ExamManager from './components/ExamManager';
import StudentDashboard from './components/StudentDashboard';
import StudentManager from './components/StudentManager';
import SystemManager from './components/SystemManager';
import { dbService } from './services/db';
import { CalendarCheck, GraduationCap, FileBadge, LogOut, IndianRupee, Shield, BookOpen, Bell, Layers, Home, ChevronRight, Menu, X, User as UserIcon, TrendingUp, Loader2, Database, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('et_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Session recovery failed:", e);
      return null;
    }
  });

  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [annualRecords, setAnnualRecords] = useState<AnnualRecord[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [selectedClass, setSelectedClass] = useState<string>('');

  const isInitialSyncDone = useRef(false);
  
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const handleSync = useCallback(async (forceCloud = true) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const stores = [
        'students', 'attendance', 'exams', 'results', 'annualRecords', 
        'customFields', 'holidays', 'users', 'fees', 'homework', 'announcements'
      ];

      // Step 1: Force Cloud Fetch for the "Source of Truth"
      if (forceCloud) {
        const fetchResults = await Promise.allSettled(stores.map(s => dbService.getAll(s)));
        
        const failedStores = fetchResults
          .map((res, i) => res.status === 'rejected' ? stores[i] : null)
          .filter(Boolean);
        
        if (failedStores.length > 0) {
          setSyncError(`Cloud sync failed for: ${failedStores.join(', ')}`);
        }

        const getVal = (idx: number, fallback: any[] = []) => 
          fetchResults[idx].status === 'fulfilled' ? (fetchResults[idx] as PromiseFulfilledResult<any>).value : fallback;

        if (fetchResults[0].status === 'fulfilled') setStudents(getVal(0));
        if (fetchResults[1].status === 'fulfilled') setAttendance(getVal(1));
        if (fetchResults[2].status === 'fulfilled') setExams(getVal(2));
        if (fetchResults[3].status === 'fulfilled') setResults(getVal(3));
        if (fetchResults[4].status === 'fulfilled') setAnnualRecords(getVal(4));
        if (fetchResults[5].status === 'fulfilled') setCustomFieldDefs(getVal(5));
        if (fetchResults[6].status === 'fulfilled') setHolidays(getVal(6));
        const fetchedUsers = getVal(7);
        setUsers(fetchedUsers.length > 0 ? fetchedUsers : [{ id: 'admin', username: 'admin', password: 'admin123', name: 'Administrator', role: 'headmaster' }]);
        if (fetchResults[8].status === 'fulfilled') setFees(getVal(8));
        if (fetchResults[9].status === 'fulfilled') setHomework(getVal(9));
        if (fetchResults[10].status === 'fulfilled') setAnnouncements(getVal(10));
      } else {
        // Fallback to local only if cloud is explicitly not requested
        const localData = await Promise.all(stores.map(s => dbService.getLocal(s)));
        if (localData[0].length) setStudents(localData[0]);
        if (localData[1].length) setAttendance(localData[1]);
        if (localData[2].length) setExams(localData[2]);
        if (localData[3].length) setResults(localData[3]);
        if (localData[4].length) setAnnualRecords(localData[4]);
        if (localData[5].length) setCustomFieldDefs(localData[5]);
        if (localData[6].length) setHolidays(localData[6]);
        setUsers(localData[7].length ? localData[7] : [{ id: 'admin', username: 'admin', password: 'admin123', name: 'Administrator', role: 'headmaster' }]);
        if (localData[8].length) setFees(localData[8]);
        if (localData[9].length) setHomework(localData[9]);
        if (localData[10].length) setAnnouncements(localData[10]);
      }
      
      isInitialSyncDone.current = true;
    } catch (err) {
      console.warn("Sync Process Interrupted:", err);
    } finally {
      setIsSyncing(false);
      setIsLoaded(true); 
    }
  }, [isSyncing]);

  useEffect(() => {
    handleSync();
  }, []); 

  useEffect(() => {
    if (currentUser) sessionStorage.setItem('et_session', JSON.stringify(currentUser));
    else sessionStorage.removeItem('et_session');
  }, [currentUser]);

  const handleLogout = () => {
      setCurrentUser(null);
      setActiveTab('home');
      isInitialSyncDone.current = false;
  };

  const handleExportSystem = () => {
    const data = { students, attendance, exams, results, annualRecords, customFieldDefs, holidays, users, fees, homework, announcements };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Indrayani_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImportSystem = async (data: any) => {
    setIsSyncing(true);
    try {
      const stores = [
        'students', 'attendance', 'exams', 'results', 'annualRecords', 
        'customFields', 'holidays', 'users', 'fees', 'homework', 'announcements'
      ];
      
      for (const store of stores) {
        if (data[store] && Array.isArray(data[store])) {
          await dbService.putAll(store, data[store]);
        } else if (store === 'annualRecords' && data[store]) {
          // annualRecords is an object or array depending on version
          const records = Array.isArray(data[store]) ? data[store] : Object.values(data[store]);
          await dbService.putAll(store, records);
        }
      }
      
      await handleSync(true);
    } catch (err: any) {
      console.error("Import failed:", err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    try {
      const stores = [
        'students', 'attendance', 'exams', 'results', 'annualRecords', 
        'customFields', 'holidays', 'users', 'fees', 'homework', 'announcements'
      ];
      
      for (const store of stores) {
        const localData = await dbService.getLocal(store);
        if (localData && localData.length > 0) {
          await dbService.putAll(store, localData);
        }
      }
    } catch (err: any) {
      console.error("Push failed:", err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-4">
        <div className="relative">
            <Loader2 size={64} className="text-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
                <Database size={24} className="text-indigo-200" />
            </div>
        </div>
        <div className="text-center space-y-2">
            <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Indrayani School</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Cloud Registry...</p>
        </div>
        
        {/* Safety button if sync takes too long */}
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <button 
                onClick={() => setIsLoaded(true)}
                className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100"
            >
                Skip Sync & Enter
            </button>
            <p className="text-[9px] text-slate-300 mt-2 text-center">Click if stuck for more than 10 seconds</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Login users={users} onLogin={setCurrentUser} onRefreshData={() => handleSync(true)} />;

  const theme = {
    headmaster: { text: 'text-rose-700', bg: 'bg-rose-600', lightBg: 'bg-rose-50 border-rose-200', gradient: 'from-rose-50 to-white', shadow: 'shadow-rose-100', icon: Shield },
    teacher: { text: 'text-sky-700', bg: 'bg-sky-600', lightBg: 'bg-sky-50 border-sky-200', gradient: 'from-sky-50 to-white', shadow: 'shadow-sky-100', icon: BookOpen },
    student: { text: 'text-emerald-700', bg: 'bg-emerald-600', lightBg: 'bg-emerald-50 border-emerald-200', gradient: 'from-emerald-50 to-white', shadow: 'shadow-emerald-100', icon: GraduationCap }
  }[currentUser.role];

  if (currentUser.role === 'student') {
    return <StudentDashboard currentUser={currentUser} onLogout={handleLogout} students={students} homework={homework} exams={exams} results={results} attendance={attendance} announcements={announcements} annualRecords={annualRecords} holidays={holidays} onRefresh={() => handleSync(true)} isSyncing={isSyncing} />;
  }

  const dashboardItems = [
    { id: 'students', label: 'Students', desc: 'Admissions & Profiles', icon: GraduationCap, color: 'bg-blue-600' },
    { id: 'attendance', label: 'Attendance', desc: 'Track Daily Presence', icon: CalendarCheck, color: 'bg-emerald-600' },
    { id: 'exams', label: 'Exam Planner', desc: 'Schedule & Timetables', icon: Layers, color: 'bg-purple-600' },
    { id: 'results', label: 'Results', desc: 'Marks Entry & Analysis', icon: FileBadge, color: 'bg-amber-600' },
    { id: 'annual', label: 'Reports', desc: 'Annual Report Cards', icon: FileBadge, color: 'bg-pink-600' },
    { id: 'homework', label: 'Homework', desc: 'Assignments & Tasks', icon: BookOpen, color: 'bg-indigo-600' },
    { id: 'notices', label: 'Notices', desc: 'Announcements', icon: Bell, color: 'bg-rose-600' },
  ];

  if (currentUser.role === 'headmaster' || currentUser.role === 'teacher') dashboardItems.push({ id: 'fees', label: 'Fees', desc: 'Payment Tracking', icon: IndianRupee, color: 'bg-teal-600' });
  if (currentUser.role === 'headmaster') {
    dashboardItems.push({ id: 'users', label: 'Users', desc: 'Manage Access', icon: Shield, color: 'bg-slate-600' });
    dashboardItems.push({ id: 'promotion', label: 'Promotion', desc: 'Student Progression', icon: TrendingUp, color: 'bg-violet-600' });
    dashboardItems.push({ id: 'system', label: 'System', desc: 'Database & Sync', icon: Database, color: 'bg-indigo-700' });
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 animate-fade-up">
             {dashboardItems.map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as TabView)} className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all text-left group flex flex-col justify-between min-h-[140px] sm:min-h-[160px] active:scale-95">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white mb-3 sm:mb-4 ${item.color} shadow-md group-hover:scale-110 transition-transform`}>
                     <item.icon size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-lg font-bold text-slate-800 group-hover:${theme.text} transition-colors leading-tight`}>{item.label}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className={`mt-2 sm:mt-4 flex items-center text-[10px] sm:text-xs font-bold ${theme.text} opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0`}>
                     <span>Open Module</span> <ChevronRight size={14} className="ml-1 w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </button>
             ))}
          </div>
        );
      case 'students': return <StudentManager students={students} setStudents={setStudents} customFieldDefs={customFieldDefs} setCustomFieldDefs={setCustomFieldDefs} users={users} setUsers={setUsers} currentUser={currentUser} />;
      case 'attendance': return <AttendanceTracker students={students} attendance={attendance} setAttendance={setAttendance} selectedClass={selectedClass ? selectedClass.split('|')[0] : ''} setSelectedClass={(cls) => setSelectedClass(cls)} holidays={holidays} setHolidays={setHolidays} currentUser={currentUser} />;
      case 'exams': return <ExamManager exams={exams} setExams={setExams} />;
      case 'results': return <ResultsManager students={students} results={results} setResults={setResults} attendance={attendance} selectedClass={selectedClass.split('|')[0]} setSelectedClass={(cls) => setSelectedClass(cls)} exams={exams} setExams={setExams} />;
      case 'annual': return <AnnualResultsManager students={students} annualRecords={annualRecords} setAnnualRecords={setAnnualRecords} selectedClass={selectedClass} setSelectedClass={setSelectedClass} exams={exams} customFieldDefs={customFieldDefs} />;
      case 'homework': return <HomeworkManager homework={homework} setHomework={setHomework} selectedClass={selectedClass} setSelectedClass={setSelectedClass} />;
      case 'notices': return <AnnouncementManager announcements={announcements} setAnnouncements={setAnnouncements} />;
      case 'fees': return <FeeManager students={students} fees={fees} setFees={setFees} readOnly={currentUser.role === 'teacher'} />;
      case 'users': return <UserManagement users={users} setUsers={setUsers} currentUser={currentUser} students={students} />;
      case 'promotion': return <PromotionManager students={students} setStudents={setStudents} />;
      case 'system': return <SystemManager onExport={handleExportSystem} onImport={handleImportSystem} onPushToCloud={handlePushToCloud} isSyncing={isSyncing} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className={`bg-gradient-to-b ${theme.gradient} backdrop-blur-md sticky top-0 z-[100] shadow-sm border-b ${theme.lightBg}`}>
         <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
               {activeTab !== 'home' && <button onClick={() => setActiveTab('home')} className={`p-2.5 bg-white hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200 active:scale-95 transition-all shadow-sm`}><Home size={22} /></button>}
               <div className="flex items-center gap-3">
                  <div className={`${theme.bg} p-2.5 rounded-xl shadow-lg ${theme.shadow} hidden xs:flex`}><theme.icon size={22} className="text-white" /></div>
                  <div>
                    <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 uppercase italic leading-none">Indrayani School</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                       {activeTab !== 'home' && <p className={`text-[10px] font-black ${theme.text} uppercase tracking-widest`}>{activeTab}</p>}
                       {isSyncing && <div className="flex items-center gap-1 text-[8px] font-black text-indigo-500 animate-pulse uppercase"><RefreshCw size={10} className="animate-spin"/> Synchronizing...</div>}
                    </div>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
               {syncError && (
                 <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-[10px] font-black text-rose-600 uppercase animate-pulse">
                   <WifiOff size={14} /> Cloud Offline
                 </div>
               )}
               {!syncError && !isSyncing && (
                 <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-black text-emerald-600 uppercase">
                   <Wifi size={14} /> Cloud Online
                 </div>
               )}
               <button onClick={() => handleSync(true)} disabled={isSyncing} className="p-2.5 bg-white text-slate-400 hover:text-indigo-600 border border-slate-200 rounded-xl active:scale-95 transition-all hidden sm:flex" title="Cloud Update">
                  <RefreshCw size={20} className={isSyncing ? 'animate-spin text-indigo-600' : ''} />
               </button>
               <div className="hidden xs:flex items-center gap-3 bg-white/60 py-1.5 px-3 rounded-2xl border border-white/50 shadow-sm">
                  <div className={`w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black`}>{currentUser.name.charAt(0)}</div>
                  <div className="flex flex-col"><span className="text-xs font-black text-slate-800">{currentUser.name}</span><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentUser.role}</span></div>
               </div>
               <button onClick={handleLogout} className="p-2.5 bg-white text-slate-400 hover:text-rose-600 border border-slate-200 rounded-xl active:scale-95 transition-all hover:shadow-md"><LogOut size={22} /></button>
            </div>
         </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 sm:py-8">{renderContent()}</main>
      <footer className="py-8 text-center text-[11px] text-slate-400 font-bold tracking-[0.1em] uppercase">© 2025 Indrayani Education Group</footer>
    </div>
  );
};

export default App;
