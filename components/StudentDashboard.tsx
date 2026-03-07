
import React, { useMemo, useState, useEffect } from 'react';
import { User, Student, Homework, Exam, StudentResult, AttendanceRecord, Announcement, AnnualRecord, Holiday, getSubjectsForClass } from '../types';
import { BookOpen, GraduationCap, Bell, UserCheck, CalendarCheck, FileBadge, LogOut, Download, X, RefreshCw, Loader2, Eye, ChevronDown, UserRound, MapPin, Phone, Fingerprint, IdCard, Hash, MapPinned, MoonStar, Users2 } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface StudentDashboardProps {
  currentUser: User;
  onLogout: () => void;
  students: Student[];
  homework: Homework[];
  exams: Exam[];
  results: StudentResult[];
  attendance: AttendanceRecord[];
  announcements: Announcement[];
  annualRecords?: AnnualRecord[];
  holidays?: Holiday[];
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const formatResilientDate = (val: any): string => {
    if (!val) return '-';
    const num = Number(val);
    if (!isNaN(num) && num > 10000 && num < 100000) {
        try {
            const date = new Date((num - 25569) * 86400 * 1000);
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return val.toString();
        }
    }
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
    } catch (e) {}
    return val.toString();
};

const PDF_STYLES_STRETCH_COLOR = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
    .pdf-container {
        width: 210mm;
        height: 297mm;
        padding: 5mm;
        background: #ffffff !important;
        margin: 0 auto;
        font-family: 'Times New Roman', Times, serif;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    .page-border {
        border: 4px double #000000;
        height: 100%;
        width: 100%;
        padding: 5mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #ffffff !important;
    }
    .header { text-align: center; margin-bottom: 10px; flex-shrink: 0; }
    .logo-container { width: 85px; margin: 0 auto 5px; }
    .logo-img { width: 100%; height: auto; display: block; }
    .school-group { font-size: 11px; font-weight: bold; margin-bottom: 1px; text-transform: uppercase; color: #000000; }
    .school-name { font-size: 24px; font-weight: 900; text-transform: uppercase; color: #c2410c; margin: 0; line-height: 1; }
    .school-details { font-size: 9px; margin-top: 3px; font-weight: 800; color: #374151; }
    .report-badge { 
        margin-top: 5px; 
        font-size: 13px; 
        font-weight: 900; 
        text-transform: uppercase; 
        border: 2px solid #000000; 
        display: inline-block; 
        padding: 3px 45px;
        background: #f8fafc;
        color: #000000;
        border-radius: 6px;
    }

    .student-info-box { 
        border: 2px solid #000000; 
        margin-top: 5px; 
        padding: 10px 15px; 
        display: grid; 
        grid-template-columns: 1.2fr 0.8fr; 
        gap: 4px 35px; 
        font-size: 13px;
        background: #ffffff;
        border-radius: 12px;
        flex-shrink: 0;
    }
    .field-row { display: flex; align-items: baseline; }
    .field-label { font-weight: 900; min-width: 100px; text-transform: uppercase; font-size: 10px; color: #475569; }
    .field-value { border-bottom: 2px solid #000000; flex: 1; font-weight: bold; color: #000000; padding-left: 5px; }

    .main-grades-section { 
        flex: 1 1 auto; 
        display: flex; 
        flex-direction: column; 
        margin: 10px 0; 
        min-height: 0; 
        background: #ffffff !important; 
    }
    .grades-table { width: 100%; border-collapse: collapse; height: 100%; }
    .grades-table th { background: #1e293b; color: #ffffff !important; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 2px solid #000000; padding: 6px 5px; }
    .grades-table td { border: 2px solid #000000; padding: 4px 5px; text-align: center; font-size: 12px; font-weight: bold; color: #000; }
    .sub-name { text-align: left; padding-left: 15px; font-size: 12px; color: #000000; }
    .grade-val { color: #000000; font-weight: 900; }
    .perc-row { background: #f8fafc !important; height: 35px; }
    .perc-row td { font-size: 13px; font-weight: 900; padding: 10px; border-top: 3px solid #000; }

    .remarks-section { 
        flex: 0.6 0 auto; 
        margin-bottom: 10px; 
        display: flex; 
        flex-direction: column; 
        min-height: 0; 
        background: #ffffff !important; 
    }
    .remarks-grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 2.5px solid #000000; border-radius: 10px; overflow: hidden; height: 100%; }
    .remarks-grid-table th, .remarks-grid-table td { border: 1.5px solid #000000; padding: 8px; font-size: 12px; vertical-align: top; color: #000; }
    .remarks-grid-table th { background: #1e293b; color: #ffffff !important; text-transform: uppercase; font-weight: 900; font-size: 10px; }
    .criteria-label { font-weight: 900; background: #f8fafc !important; width: 150px; text-transform: uppercase; font-size: 9px; color: #475569; vertical-align: middle; }
    .remarks-text-cell { line-height: 1.3; color: #000000; font-style: italic; font-weight: 600; }

    .grade-key-row { width: 100%; border-collapse: collapse; margin-bottom: 10px; flex-shrink: 0; }
    .grade-key-row td { border: 1.5px solid #000000; font-size: 9px; padding: 4px; text-align: center; font-weight: bold; color: #000000; background: #ffffff !important; }

    .result-ribbon { 
        border: 3px solid #000000; 
        padding: 10px; 
        text-align: center; 
        background: #f8fafc !important;
        margin-bottom: 10px;
        border-radius: 15px;
        flex-shrink: 0;
    }
    .result-main { font-size: 15px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; color: #000000; }
    .result-main span { color: #c2410c; }
    .reopening { font-size: 10px; font-weight: bold; color: #374151; margin-top: 3px; }

    .signatures-row { display: flex; justify-content: space-between; padding: 0 20px; margin-top: 10px; flex-shrink: 0; }
    .sig-block { width: 180px; border-top: 3px solid #000000; text-align: center; padding-top: 5px; font-weight: 900; font-size: 12px; text-transform: uppercase; color: #000000; }
`;

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser, onLogout, students, homework, exams, results, attendance, announcements, annualRecords = [], holidays = [], onRefresh, isSyncing = false
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'homework' | 'exams' | 'results' | 'attendance' | 'notices' | 'profile'>('home');
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  const student = useMemo(() => students.find(s => s.id === currentUser.linkedStudentId), [students, currentUser]);
  
  const studentAnnualRecord = useMemo(() => {
    if (!student) return null;
    return annualRecords.find(r => 
        r.studentId === student.id && 
        (r.published === true || r.published === 'true' || r.published === 1)
    ) || null;
  }, [annualRecords, student]);

  const checkHoliday = (dateStr: string) => holidays.find(h => h.endDate ? (dateStr >= h.date && dateStr <= h.endDate) : h.date === dateStr);

  useEffect(() => {
    if (onRefresh && (activeTab === 'results' || activeTab === 'homework' || activeTab === 'home')) {
        onRefresh();
    }
  }, [activeTab]);

  const [seenHomeworkIds, setSeenHomeworkIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`seen_hw_${currentUser.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const [seenResultIds, setSeenResultIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`seen_res_${currentUser.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [seenNoticeIds, setSeenNoticeIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`seen_notice_${currentUser.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem(`seen_hw_${currentUser.id}`, JSON.stringify(Array.from(seenHomeworkIds)));
  }, [seenHomeworkIds, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`seen_res_${currentUser.id}`, JSON.stringify(Array.from(seenResultIds)));
  }, [seenResultIds, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`seen_notice_${currentUser.id}`, JSON.stringify(Array.from(seenNoticeIds)));
  }, [seenNoticeIds, currentUser.id]);

  const homeworkForClass = useMemo(() => {
    if (!student) return [];
    return homework.filter(h => h.className === student.className);
  }, [homework, student]);

  const resultsForStudent = useMemo(() => {
    if (!student) return [];
    return results.filter(r => r.studentId === student.id && (r.published === true || r.published === 'true' || r.published === 1));
  }, [results, student]);

  const noticesForStudent = useMemo(() => {
    if (!student) return [];
    return announcements.filter(a => a.targetClass === 'All' || a.targetClass === student.className);
  }, [announcements, student]);

  const hasNewHomework = useMemo(() => homeworkForClass.some(h => !seenHomeworkIds.has(h.id)), [homeworkForClass, seenHomeworkIds]);
  const hasNewResults = useMemo(() => resultsForStudent.some(r => !seenResultIds.has(r.id)), [resultsForStudent, seenResultIds]);
  const hasNewNotices = useMemo(() => noticesForStudent.some(a => !seenNoticeIds.has(a.id)), [noticesForStudent, seenNoticeIds]);

  const handleOpenHomework = () => {
    setActiveTab('homework');
    const newSeen = new Set(seenHomeworkIds);
    homeworkForClass.forEach(h => newSeen.add(h.id));
    setSeenHomeworkIds(newSeen);
  };

  const handleOpenResults = () => {
    setActiveTab('results');
    const newSeen = new Set(seenResultIds);
    resultsForStudent.forEach(r => newSeen.add(r.id));
    setSeenResultIds(newSeen);
  };

  const handleOpenNotices = () => {
    setActiveTab('notices');
    const newSeen = new Set(seenNoticeIds);
    noticesForStudent.forEach(a => newSeen.add(a.id));
    setSeenNoticeIds(newSeen);
  };

  const filteredAttendance = useMemo(() => {
    if (!student) return [];
    return attendance.filter(r => r.studentId === student.id && !checkHoliday(r.date));
  }, [attendance, student, holidays]);

  const attendancePercentage = useMemo(() => {
    if (filteredAttendance.length === 0) return '100.0';
    const presentCount = filteredAttendance.filter(r => r.present).length;
    return ((presentCount / filteredAttendance.length) * 100).toFixed(1);
  }, [filteredAttendance]);

  const generatePDFContent = () => {
    if (!student || !studentAnnualRecord) return '';
    const record = studentAnnualRecord;
    const className = student.className;
    const medium = student.medium || 'English';
    const subjects = Array.from(new Set([...getSubjectsForClass(className, medium as 'English' | 'Semi').map(s => s.name), ...(record.customSubjects || [])]));
    const schoolName = medium === 'English' ? 'INDRAYANI ENGLISH MEDIUM SCHOOL' : 'INDRAYANI INTERNATIONAL SCHOOL';
    const nextClass = className.startsWith('Class ') ? `Class ${parseInt(className.replace('Class ', '')) + 1}` : className === 'Sr. KG' ? 'Class 1' : 'Next Grade';

    const rows = subjects.map((sub, i) => `
        <tr>
            <td style="width:40px;">${i+1}</td>
            <td class="sub-name">${sub}</td>
            <td class="grade-val">${record.sem1Grades?.[sub] || '-'}</td>
            <td class="grade-val">${record.sem2Grades?.[sub] || '-'}</td>
        </tr>
    `).join('');

    return `
      <div class="pdf-container">
          <div class="page-border">
              <div class="header">
                  <div class="logo-container">
                      <img src="https://i.ibb.co/R4t9Jhc1/LOGO-IN.png" crossorigin="anonymous" class="logo-img" />
                  </div>
                  <p class="school-group">Shree Ganesh Education Academy's</p>
                  <h1 class="school-name">${schoolName}</h1>
                  <p class="school-details">Academic Session: 2024-25 | Sector 18, Koparkhairane</p>
                  <div class="report-badge">Annual Progress Card</div>
              </div>

              <div class="student-info-box">
                  <div class="field-row"><span class="field-label">Student:</span><span class="field-value">${student.name.toUpperCase()}</span></div>
                  <div class="field-row"><span class="field-label">Roll No:</span><span class="field-value">${student.rollNo}</span></div>
                  <div class="field-row"><span class="field-label">Standard:</span><span class="field-value">${student.className}</span></div>
                  <div class="field-row"><span class="field-label">Date of Birth:</span><span class="field-value">${formatResilientDate(student.dob)}</span></div>
              </div>

              <div class="main-grades-section">
                  <table class="grades-table">
                      <thead>
                          <tr>
                              <th style="width:40px;">SR.</th>
                              <th class="sub-name">SUBJECTS</th>
                              <th>SEM 1 GRADE</th>
                              <th>SEM 2 GRADE</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${rows}
                          <tr class="perc-row">
                                <td colspan="2" style="text-align: right; padding-right: 20px;">OVERALL PERCENTAGE (%)</td>
                                <td colspan="2">${record.overallPercentage || '-'} %</td>
                          </tr>
                      </tbody>
                  </table>
              </div>

              <div class="remarks-section">
                  <table class="remarks-grid-table">
                      <thead>
                          <tr>
                              <th>Evaluation Criteria</th>
                              <th>First Semester</th>
                              <th>Second Semester</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td class="criteria-label">Special Improvements</td>
                              <td class="remarks-text-cell">${record.specialImprovementsSem1 || '-'}</td>
                              <td class="remarks-text-cell">${record.specialImprovementsSem2 || '-'}</td>
                          </tr>
                          <tr>
                              <td class="criteria-label">Hobbies & Interests</td>
                              <td class="remarks-text-cell">${record.hobbiesSem1 || '-'}</td>
                              <td class="remarks-text-cell">${record.hobbiesSem2 || '-'}</td>
                          </tr>
                          <tr>
                              <td class="criteria-label">Necessary Improvements</td>
                              <td class="remarks-text-cell">${record.necessaryImprovementSem1 || '-'}</td>
                              <td class="remarks-text-cell">${record.necessaryImprovementSem2 || '-'}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>

              <table class="grade-key-row">
                  <tr>
                      <td>A1: 91%+</td><td>A2: 81-90%</td><td>B1: 71-80%</td><td>B2: 61-70%</td>
                      <td>C1: 51-60%</td><td>C2: 41-50%</td><td>D: 33-40%</td><td>E: <33%</td>
                  </tr>
              </table>

              <div class="result-ribbon">
                  <div class="result-main">FINAL STATUS: <span>${record.resultStatus || 'PASS'}</span> | PROMOTED TO: <span>${nextClass}</span></div>
                  <div class="reopening">SCHOOL REOPENING DATE: 11TH JUNE 2025</div>
              </div>

              <div class="signatures-row">
                  <div class="sig-block">CLASS TEACHER</div>
                  <div class="sig-block">PRINCIPAL</div>
              </div>
          </div>
      </div>
    `;
  };

  const downloadPDF = async () => {
    setIsDownloading(true);
    const h2p = (window as any).html2pdf || html2pdf;
    if (!h2p) { setIsDownloading(false); return; }
    const lib = h2p.default || h2p;
    const element = document.createElement('div');
    element.innerHTML = `<style>${PDF_STYLES_STRETCH_COLOR}</style>${generatePDFContent()}`;
    const opt = { 
        margin: 0, 
        filename: `AnnualReport_${student?.name.replace(/\s+/g, '_')}.pdf`, 
        image: { type: 'png' }, 
        html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff' }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    try { await lib().set(opt).from(element).save(); } catch (err) { console.error("PDF download failed", err); } finally { setIsDownloading(false); }
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-4">
        <div className="relative">
            <Loader2 size={64} className="text-emerald-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
                <GraduationCap size={24} className="text-emerald-200" />
            </div>
        </div>
        <div className="text-center space-y-2">
            <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Indrayani School</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                {isSyncing ? 'Retrieving Student Profile...' : 'Student Profile Not Found'}
            </p>
            {!isSyncing && (
                <button 
                  onClick={onRefresh}
                  className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                    Retry Sync
                </button>
            )}
        </div>
        <button onClick={onLogout} className="mt-8 text-slate-400 hover:text-rose-600 font-black text-[10px] uppercase tracking-widest transition-all">
            Logout & Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
       <header className="bg-emerald-50/50 px-6 py-4 sticky top-0 z-50 flex justify-between items-center border-b border-emerald-100/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                <GraduationCap size={24}/>
             </div>
             <h1 className="font-black italic uppercase tracking-tighter text-slate-800 text-lg">Indrayani School</h1>
          </div>
          <div className="flex gap-2">
              <button onClick={onRefresh} className={`p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 shadow-sm transition-all active:scale-95 ${isSyncing ? 'animate-spin' : ''}`}><RefreshCw size={22}/></button>
              <button onClick={onLogout} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 shadow-sm transition-all active:scale-95"><LogOut size={22}/></button>
          </div>
       </header>

       <main className="max-w-7xl mx-auto w-full p-4 sm:p-6">
          <div className="mb-8 p-6 bg-slate-50 border border-slate-200/60 rounded-[2rem] animate-in fade-in slide-in-from-left duration-500">
             <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3">{student.name}</h2>
             <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-1.5"><span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Standard:</span><span className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.className}</span></div>
                <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-emerald-200"></div>
                <div className="flex items-center gap-1.5"><span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Roll No:</span><span className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.rollNo}</span></div>
                <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-emerald-200"></div>
                <div className="flex items-center gap-1.5"><span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Medium:</span><span className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.medium || 'English'}</span></div>
             </div>
          </div>

          {activeTab === 'home' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in duration-500">
                  <button onClick={handleOpenHomework} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative">
                      <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shrink-0"><BookOpen size={24}/></div>
                      <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-slate-800">My Homework</h3>
                              {hasNewHomework && <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-tight animate-pulse">(NEW)</span>}
                          </div>
                          <p className={`text-xs font-bold ${hasNewHomework ? 'text-rose-500' : 'text-slate-400'}`}>{hasNewHomework ? 'New homework posted!' : 'No new updates'}</p>
                      </div>
                  </button>

                  <button onClick={() => setActiveTab('exams')} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative">
                      <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shrink-0"><CalendarCheck size={24}/></div>
                      <div className="flex-1 pt-0.5"><h3 className="text-lg font-bold text-slate-800 mb-1">Exam Schedule</h3><p className="text-slate-500 font-medium text-xs">Upcoming tests</p></div>
                  </button>

                  <button onClick={handleOpenResults} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative">
                      <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shrink-0"><FileBadge size={24}/></div>
                      <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-800">Report Cards</h3>
                            {hasNewResults && <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-tight animate-pulse">(NEW)</span>}
                          </div>
                          <p className="text-slate-500 font-medium text-xs">Marks & Results</p>
                      </div>
                  </button>

                  <button onClick={() => setActiveTab('attendance')} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative">
                      <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shrink-0"><UserCheck size={24}/></div>
                      <div className="flex-1 pt-0.5"><h3 className="text-lg font-bold text-slate-800 mb-1">Attendance</h3><p className="text-slate-500 font-medium text-xs">{attendancePercentage}% presence</p></div>
                  </button>

                  <button onClick={handleOpenNotices} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0"><Bell size={24}/></div>
                      <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-slate-800">Notice Board</h3>
                              {hasNewNotices && <span className="bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-tight animate-pulse">(NEW)</span>}
                          </div>
                          <p className={`text-xs font-bold ${hasNewNotices ? 'text-blue-500' : 'text-slate-400'}`}>{hasNewNotices ? 'New updates posted!' : 'School updates'}</p>
                      </div>
                  </button>

                  <button onClick={() => setActiveTab('profile')} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative">
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0"><UserRound size={24}/></div>
                      <div className="flex-1 pt-0.5"><h3 className="text-lg font-bold text-slate-800 mb-1">Institutional Profile</h3><p className="text-slate-500 font-medium text-xs">Your Personal Records</p></div>
                  </button>
              </div>
          )}

          {activeTab === 'results' && (
              <div className="space-y-8 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center">
                      <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest"><X size={20}/> Back</button>
                      {studentAnnualRecord && (<button onClick={downloadPDF} disabled={isDownloading} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all">{isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16}/>} Download PDF</button>)}
                  </div>

                  <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Annual Progress Card</h3>
                      {studentAnnualRecord ? (
                          <div className="bg-slate-200 p-4 sm:p-12 rounded-3xl border shadow-inner flex justify-center items-start overflow-x-auto">
                              <div className="bg-white shadow-2xl scale-75 sm:scale-90 origin-top min-w-[210mm]" dangerouslySetInnerHTML={{ __html: `<style>${PDF_STYLES_STRETCH_COLOR}</style>${generatePDFContent()}` }} />
                          </div>
                      ) : (
                          <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Annual Report Not Generated or Published Yet</div>
                      )}
                  </div>

                  <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Individual Exam Results</h3>
                      {resultsForStudent.length === 0 ? (
                          <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-widest">No Exam Results Published Yet</div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {resultsForStudent.map(res => {
                                  const exam = exams.find(e => e.id === res.examId);
                                  const isExpanded = expandedExamId === res.id;
                                  const subjects = getSubjectsForClass(student.className, student.medium as 'English' | 'Semi' || 'English');
                                  
                                  return (
                                      <div key={res.id} className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100 shadow-sm hover:border-slate-300'}`}>
                                          <div onClick={() => setExpandedExamId(isExpanded ? null : res.id)} className="p-5 flex justify-between items-center cursor-pointer">
                                              <div>
                                                  <div className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">{exam?.type || 'Examination'}</div>
                                                  <div className="text-lg font-black text-slate-800 uppercase tracking-tight">{exam?.title || 'Unknown Exam'}</div>
                                              </div>
                                              <ChevronDown size={20} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`} />
                                          </div>
                                          {isExpanded && (
                                              <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2">
                                                  <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                                                      <table className="w-full text-left text-sm">
                                                          <thead className="bg-slate-100/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                                              <tr><th className="px-4 py-2">Subject</th><th className="px-4 py-2 text-right">Marks</th></tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-slate-100">
                                                              {Object.entries(res.marks).map(([subId, mark]) => {
                                                                  const subName = subjects.find(s => s.id === subId)?.name || subId;
                                                                  return (
                                                                      <tr key={subId}>
                                                                          <td className="px-4 py-2 font-bold text-slate-600 uppercase text-xs">{subName}</td>
                                                                          <td className="px-4 py-2 text-right font-black text-slate-800">{mark}</td>
                                                                      </tr>
                                                                  );
                                                              })}
                                                          </tbody>
                                                      </table>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'homework' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-2"><X size={20}/> Close</button>
                  <h2 className="text-2xl font-black text-slate-800">Daily Homework</h2>
                  {homeworkForClass.length === 0 ? (<div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 italic">No homework assigned.</div>) : (homeworkForClass.map(h => (<div key={h.id} className="bg-white p-6 rounded-3xl border shadow-sm border-slate-100"><div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 px-2 py-1 rounded-lg">{h.subject}</span><span className="text-[10px] text-slate-400 font-bold">{h.date}</span></div><h3 className="font-bold text-lg mb-2">{h.title}</h3><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{h.description}</p></div>)))}
              </div>
          )}

          {activeTab === 'notices' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-2"><X size={20}/> Close</button>
                  <h2 className="text-2xl font-black text-slate-800">School Notices</h2>
                  {noticesForStudent.length === 0 ? (<div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 italic">No notices yet.</div>) : (noticesForStudent.map(a => (<div key={a.id} className="bg-white p-6 rounded-3xl border shadow-sm border-slate-100"><div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">Official</span><span className="text-[10px] text-slate-400 font-bold">{a.date}</span></div><h3 className="font-bold text-lg mb-2">{a.title}</h3><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.content}</p></div>)))}
              </div>
          )}

          {activeTab === 'attendance' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-2"><X size={20}/> Close</button>
                  <div className="bg-emerald-600 p-8 rounded-[2rem] text-white shadow-xl flex items-center justify-between">
                      <div><p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Academic Year 2024-25</p><h2 className="text-4xl font-black mb-1">{attendancePercentage}%</h2><p className="text-sm font-bold uppercase opacity-90 tracking-tighter">Current Attendance</p></div>
                      <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30"><UserCheck size={48}/></div>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-50 bg-slate-50/30 text-[10px] font-black uppercase text-slate-400 tracking-widest">Recent Records</div>
                      <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto no-scrollbar">
                          {filteredAttendance.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10).map(r => (
                              <div key={r.id} className="p-4 flex justify-between items-center">
                                  <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${r.present ? 'bg-emerald-500' : 'bg-rose-500'}`}></div><span className="font-bold text-slate-700 text-sm">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${r.present ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>{r.present ? 'Present' : 'Absent'}</span>
                              </div>
                          ))}
                          {filteredAttendance.length === 0 && <div className="p-12 text-center text-slate-300 italic text-sm">No valid records logged yet.</div>}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'profile' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest"><X size={20}/> Close</button>
                  
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                      <div className="bg-slate-900 p-8 text-white relative">
                          <div className="flex items-center gap-6 relative z-10">
                              <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                  <UserRound size={48} className="text-indigo-400" />
                              </div>
                              <div>
                                  <h2 className="text-3xl font-black uppercase tracking-tight mb-1">{student.name}</h2>
                                  <p className="text-indigo-400 font-bold uppercase text-xs tracking-widest">{student.className} • ROLL NO: {student.rollNo}</p>
                              </div>
                          </div>
                          <div className="absolute top-0 right-0 p-8 opacity-10">
                              <GraduationCap size={160} />
                          </div>
                      </div>

                      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                          <section className="space-y-6">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Academic Information</h3>
                              <div className="space-y-4">
                                  <div className="flex justify-between items-center py-1">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Mother's Name</span>
                                      <span className="text-sm font-black text-slate-800 uppercase">{student.mothersName || '-'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Medium</span>
                                      <span className="text-sm font-black text-slate-800 uppercase">{student.medium || 'English'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Date of Birth</span>
                                      <span className="text-sm font-black text-slate-800 uppercase">{formatResilientDate(student.dob)}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Place of Birth</span>
                                      <span className="text-sm font-black text-slate-800 uppercase">{student.placeOfBirth || '-'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Religion / Caste</span>
                                      <div className="flex items-center gap-2">
                                          <span className="text-sm font-black text-slate-800 uppercase">{student.religion || '-'}</span>
                                          <span className="text-xs font-medium text-slate-400">/</span>
                                          <span className="text-sm font-black text-slate-800 uppercase">{student.caste || '-'}</span>
                                      </div>
                                  </div>
                              </div>
                          </section>

                          <section className="space-y-6">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Contact & Address</h3>
                              <div className="space-y-4">
                                  <div className="flex justify-between items-center py-1">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Primary Phone</span>
                                      <span className="text-sm font-black text-slate-800">{student.phone}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Alt. Phone</span>
                                      <span className="text-sm font-black text-slate-800">{student.alternatePhone || '-'}</span>
                                  </div>
                                  <div className="py-1">
                                      <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Residential Address</span>
                                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                          <p className="text-sm font-medium text-slate-600 leading-relaxed">{student.address || 'Address record unavailable.'}</p>
                                      </div>
                                  </div>
                              </div>
                          </section>

                          <section className="md:col-span-2 pt-4">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-6">Government Identifiers</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                  <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-200 transition-all">
                                      <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm mb-3 group-hover:scale-110 transition-transform"><Fingerprint size={20}/></div>
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aadhar Card</div>
                                      <div className="text-base font-black text-slate-800 tracking-tight">{student.aadharNo || 'Not Provided'}</div>
                                  </div>
                                  <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-200 transition-all">
                                      <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm mb-3 group-hover:scale-110 transition-transform"><IdCard size={20}/></div>
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">APAAR ID</div>
                                      <div className="text-base font-black text-slate-800 tracking-tight uppercase">{student.apaarId || 'Not Provided'}</div>
                                  </div>
                                  <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-200 transition-all">
                                      <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm mb-3 group-hover:scale-110 transition-transform"><Hash size={20}/></div>
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PEN No.</div>
                                      <div className="text-base font-black text-slate-800 tracking-tight uppercase">{student.penNo || 'Not Provided'}</div>
                                  </div>
                              </div>
                          </section>
                      </div>

                      <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0"><RefreshCw size={14} className="animate-spin-slow" /></div>
                          <p className="text-xs font-bold text-slate-500 italic">This information is retrieved directly from institutional records. Contact the school office for updates.</p>
                      </div>
                  </div>
              </div>
          )}
       </main>
    </div>
  );
};

export default StudentDashboard;
