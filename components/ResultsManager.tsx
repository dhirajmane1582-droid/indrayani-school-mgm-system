
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, StudentResult, AttendanceRecord, CLASSES, SPECIFIC_CLASSES, getSubjectsForClass, Exam, Subject } from '../types';
import { ChevronDown, Save, BookPlus, Globe, RefreshCcw, Edit3, X, Trash2, CheckSquare, Square, PlusCircle, Info, Calculator, Award, FileDown, Eye, Download, Printer, ChevronRight, User, AlertTriangle, GlobeLock, UserMinus, Eraser, Upload, SortAsc, Hash } from 'lucide-react';
import { generateStudentRemark } from '../services/geminiService';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { dbService } from '../services/db';

interface ResultsManagerProps {
  students: Student[];
  results: StudentResult[];
  setResults: React.Dispatch<React.SetStateAction<StudentResult[]>>;
  attendance: AttendanceRecord[];
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
}

const PDF_RESULT_STYLES = `
    .result-sheet { 
        font-family: 'Inter', sans-serif; 
        padding: 20mm; 
        width: 297mm; 
        box-sizing: border-box; 
        color: #1e293b;
        background: #fff;
        margin: auto;
    }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e1b4b; padding-bottom: 15px; }
    .trust-name { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #4338ca; margin-bottom: 5px; letter-spacing: 1px; }
    .school-name { font-size: 28px; font-weight: 900; text-transform: uppercase; color: #1e1b4b; margin-bottom: 6px; }
    .school-addr { font-size: 12px; color: #475569; font-weight: 500; }
    .exam-info { font-size: 18px; font-weight: 800; color: #4338ca; margin-top: 15px; border: 2px solid #4338ca; display: inline-block; padding: 5px 25px; border-radius: 4px; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; table-layout: auto; margin-top: 20px; }
    th { background: #f8fafc; color: #1e1b4b; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px 5px; border: 1px solid #cbd5e1; }
    td { padding: 8px 5px; border: 1px solid #cbd5e1; text-align: center; font-size: 12px; font-weight: 500; }
    .student-name-cell { text-align: left; padding-left: 10px; font-weight: 700; white-space: nowrap; }
    .total-cell { font-weight: 800; background: #f1f5f9; }
    .perc-cell { font-weight: 800; color: #4338ca; }

    .footer-signs { margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px; }
    .sign-box { text-align: center; width: 200px; border-top: 1.5px solid #1e1b4b; padding-top: 8px; font-size: 13px; font-weight: 700; color: #1e1b4b; }
`;

const ResultsManager: React.FC<ResultsManagerProps> = ({
  students,
  results,
  setResults,
  attendance,
  selectedClass,
  setSelectedClass,
  exams,
  setExams
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedMedium, setSelectedMedium] = useState<'English' | 'Semi'>('English');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rollNo' | 'name'>('rollNo');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const classExams = useMemo(() => exams.filter(e => e.className === selectedClass), [exams, selectedClass]);

  useEffect(() => {
    if (classExams.length > 0) {
      if (!classExams.find(e => e.id === selectedExamId)) {
        setSelectedExamId(classExams[0].id);
      }
    } else {
      setSelectedExamId('');
    }
    setSelectedStudentIds(new Set());
    setExpandedStudentId(null);
  }, [selectedClass, classExams, selectedExamId]);

  const currentExam = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]);

  const standardSubjects = useMemo(() => {
    if (!selectedClass) return [];
    return getSubjectsForClass(selectedClass, selectedMedium);
  }, [selectedClass, selectedMedium]);

  const activeSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const defaults = standardSubjects;
    if (!currentExam) return defaults;
    
    let relevantSubjects = currentExam.activeSubjectIds 
        ? defaults.filter(s => currentExam.activeSubjectIds!.includes(s.id)) 
        : defaults;
    
    if (currentExam.customSubjects) { 
        relevantSubjects = [...relevantSubjects, ...currentExam.customSubjects]; 
    }
    
    const maxOverrides = currentExam.customMaxMarks || {};
    const evalOverrides = currentExam.customEvaluationTypes || {};

    return relevantSubjects.map(sub => ({ 
        ...sub, 
        maxMarks: maxOverrides[sub.id] !== undefined ? maxOverrides[sub.id] : sub.maxMarks,
        evaluationType: evalOverrides[sub.id] !== undefined ? evalOverrides[sub.id] : sub.evaluationType 
    }));
  }, [selectedClass, currentExam, standardSubjects]);

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    let list = students.filter(s => s.className === selectedClass && (s.medium || 'English') === selectedMedium);
    
    if (sortBy === 'rollNo') {
        return list.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
    } else {
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [students, selectedClass, selectedMedium, sortBy]);

  const getStudentResult = (id: string) => {
    return results.find(r => r.studentId === id && r.examId === selectedExamId) || { studentId: id, examId: selectedExamId, marks: {}, published: false };
  };

  const handleMarkChange = (sid: string, subId: string, val: string) => {
    setResults(prev => {
        const existingIndex = prev.findIndex(r => r.studentId === sid && r.examId === selectedExamId);
        if (existingIndex >= 0) {
            const newResults = [...prev];
            newResults[existingIndex] = { 
                ...newResults[existingIndex], 
                marks: { ...newResults[existingIndex].marks, [subId]: val } 
            };
            return newResults;
        } else {
            return [...prev, {
                id: crypto.randomUUID(),
                studentId: sid,
                examId: selectedExamId,
                marks: { [subId]: val },
                published: false
            }];
        }
    });
  };

  const calculateTotalObtained = (sid: string) => {
      const result = getStudentResult(sid);
      return activeSubjects.reduce((sum, sub) => {
          if (sub.evaluationType === 'grade') return sum;
          const val = parseFloat(String(result.marks[sub.id] || 0));
          return sum + (isNaN(val) ? 0 : val);
      }, 0);
  };

  const calculateTotalMax = () => {
      return activeSubjects.reduce((sum, sub) => {
          if (sum === undefined) return 0;
          if (sub.evaluationType === 'grade') return sum;
          return sum + sub.maxMarks;
      }, 0);
  };

  const handleExportMarks = () => {
    if (!currentExam || filteredStudents.length === 0) return;
    
    const maxTotal = calculateTotalMax();
    const exportData = filteredStudents.map(student => {
      const result = getStudentResult(student.id);
      const obtained = calculateTotalObtained(student.id);
      const percentage = maxTotal > 0 ? ((obtained / maxTotal) * 100).toFixed(2) : '0';
      
      const row: any = {
        'Roll No': student.rollNo,
        'Student Name': student.name
      };

      activeSubjects.forEach(sub => {
        row[sub.name] = result.marks[sub.id] || '';
      });

      row['Total Obtained'] = obtained;
      row['Max Marks'] = maxTotal;
      row['Percentage (%)'] = percentage;
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    XLSX.writeFile(wb, `Marksheet_${selectedClass}_${currentExam.title.replace(/\s+/g, '_')}.xlsx`);
  };

  const toggleStandardSubject = (subId: string) => {
    if (!currentExam) return;
    const currentActive = currentExam.activeSubjectIds || standardSubjects.map(s => s.id);
    const newActive = currentActive.includes(subId)
      ? currentActive.filter(id => id !== subId)
      : [...currentActive, subId];
    setExams(prev => prev.map(e => e.id === selectedExamId ? { ...e, activeSubjectIds: newActive } : e));
  };

  const handleUpdateMaxMarks = (subId: string, val: number) => {
    if (!currentExam) return;
    const newOverrides = { ...(currentExam.customMaxMarks || {}) };
    newOverrides[subId] = val;
    setExams(prev => prev.map(e => e.id === selectedExamId ? { ...e, customMaxMarks: newOverrides } : e));
  };

  const handleUpdateEvalType = (subId: string, type: 'marks' | 'grade') => {
    if (!currentExam) return;
    const newOverrides = { ...(currentExam.customEvaluationTypes || {}) };
    newOverrides[subId] = type;
    setExams(prev => prev.map(e => e.id === selectedExamId ? { ...e, customEvaluationTypes: newOverrides } : e));
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
        setSelectedStudentIds(new Set());
    } else {
        setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const n = new Set(selectedStudentIds);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelectedStudentIds(n);
  };

  const handlePublishResults = async (pub: boolean) => {
    if (selectedStudentIds.size === 0) { alert("Select students first."); return; }
    setIsSyncing(true);
    const updatedResults = results.map(r => (r.examId === selectedExamId && selectedStudentIds.has(r.studentId)) ? { ...r, published: pub } : r);
    setResults(updatedResults);
    
    try {
        // Force immediate cloud push for published status
        await dbService.putAll('results', updatedResults);
        setToastMsg(pub ? "Results Published to Cloud" : "Results Hidden from Cloud");
    } catch (e) {
        console.error("Cloud Sync Error:", e);
    } finally {
        setIsSyncing(false);
        setTimeout(() => setToastMsg(''), 2500);
    }
  };

  const handleManualSaveAll = async () => {
      setIsSyncing(true);
      try {
          await dbService.putAll('results', results);
          setToastMsg("All Marks Saved to Cloud");
      } catch (e) {
          console.error("Manual Save Error:", e);
          setToastMsg("Sync Failed");
      } finally {
          setIsSyncing(false);
          setTimeout(() => setToastMsg(''), 2000);
      }
  };

  const handleSaveAndFinish = async (studentId: string) => {
      setIsSyncing(true);
      try {
          const record = getStudentResult(studentId);
          // Force immediate individual record sync to ensure student sees it right away
          await dbService.put('results', record);
          setExpandedStudentId(null);
          setToastMsg("Student Result Live");
      } catch (e) {
          console.error("Sync Error:", e);
      } finally {
          setIsSyncing(false);
          setTimeout(() => setToastMsg(''), 2000);
      }
  };

  const handleRemoveResults = useCallback(async (studentIdsToRemove: Set<string>) => {
    if (studentIdsToRemove.size === 0 || !selectedExamId) return;
    
    const count = studentIdsToRemove.size;
    const confirmMsg = count === 1 
      ? "Remove this result entirely? All marks will be deleted and the student will no longer see it."
      : `Remove results for ${count} students? This will delete all marks for this exam. This cannot be undone.`;

    if (window.confirm(confirmMsg)) {
        const resultsToDelete = results.filter(r => 
          r.examId === selectedExamId && studentIdsToRemove.has(r.studentId)
        );

        for (const res of resultsToDelete) {
          await dbService.delete('results', res.id);
        }

        setResults(prev => prev.filter(r => 
          !(r.examId === selectedExamId && studentIdsToRemove.has(r.studentId))
        ));
        
        setSelectedStudentIds(new Set());
        if (expandedStudentId && studentIdsToRemove.has(expandedStudentId)) {
            setExpandedStudentId(null);
        }
        
        setToastMsg(`${count} Result${count > 1 ? 's' : ''} Removed`);
        setTimeout(() => setToastMsg(''), 2500);
    }
  }, [selectedExamId, expandedStudentId, results, setResults]);

  const generateClassPDFContent = () => {
      const schoolName = selectedMedium === 'English' ? 'INDRAYANI ENGLISH MEDIUM SCHOOL' : 'INDRAYANI INTERNATIONAL SCHOOL';
      const address = "Sector 18, Plot No. 23, 24, 25, 26, Koparkhairane, Navi Mumbai 400709.";
      const phone = "Ph No. 8425919111/8422019111";
      const maxTotal = calculateTotalMax();

      const subjectHeaders = activeSubjects.map(sub => `<th>${sub.name}<br/><span style="font-size:8px; opacity:0.7;">${sub.evaluationType === 'grade' ? 'GR' : 'Max:'+sub.maxMarks}</span></th>`).join('');

      const rows = filteredStudents.map(student => {
          const result = getStudentResult(student.id);
          const obtained = calculateTotalObtained(student.id);
          const percentage = maxTotal > 0 ? ((obtained / maxTotal) * 100).toFixed(1) : '0.0';
          
          const subjectMarks = activeSubjects.map(sub => `<td>${result.marks[sub.id] || '-'}</td>`).join('');
          
          return `
              <tr>
                  <td>${student.rollNo}</td>
                  <td class="student-name-cell">${student.name}</td>
                  ${subjectMarks}
                  <td class="total-cell">${obtained} / ${maxTotal}</td>
                  <td class="perc-cell">${percentage}%</td>
              </tr>
          `;
      }).join('');

      return `
          <div class="result-sheet">
              <div class="header">
                  <div class="trust-name">Shree Ganesh Education Academy's</div>
                  <div class="school-name">${schoolName}</div>
                  <div class="school-addr">${address}</div>
                  <div class="school-addr">${phone}</div>
                  <div class="exam-info">${currentExam?.title || 'Exam Result Sheet'}</div>
              </div>

              <table>
                  <thead>
                      <tr>
                          <th style="width: 40px;">Roll</th>
                          <th style="width: 250px;">Student Name</th>
                          ${subjectHeaders}
                          <th style="width: 100px;">Total</th>
                          <th style="width: 80px;">%</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${rows}
                  </tbody>
              </table>

              <div class="footer-signs">
                  <div class="sign-box">Class Teacher</div>
                  <div class="sign-box">Principal</div>
              </div>
          </div>
      `;
  };

  const handleDownloadClassPDF = async () => {
      if (filteredStudents.length === 0) return alert("No students to generate PDF for.");
      const exporter = (html2pdf as any).default || (window as any).html2pdf || html2pdf;
      if (typeof exporter !== 'function') { alert("PDF library failed to load."); return; }
      const element = document.createElement('div');
      element.innerHTML = `<style>${PDF_RESULT_STYLES}</style>${generateClassPDFContent()}`;
      const opt = {
          margin: 0,
          filename: `ResultSheet_${selectedClass}_${currentExam?.title}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2 }, 
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
      };
      try {
          setToastMsg("Generating PDF...");
          const worker = exporter();
          await worker.set(opt).from(element).save();
          setToastMsg("PDF Ready");
          setTimeout(() => setToastMsg(''), 2000);
      } catch (err) { alert("PDF Error: " + err); }
  };

  const toggleStudentExpansion = (id: string) => { setExpandedStudentId(expandedStudentId === id ? null : id); };

  return (
    <div className="space-y-6 max-w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 no-print">
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
               <h2 className="text-xl font-bold text-slate-800">Results Entry</h2>
               <p className="text-sm text-slate-500 mt-1">Cloud synchronized marks entry.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                    <button onClick={() => setSortBy('rollNo')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${sortBy === 'rollNo' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}><Hash size={14}/> Roll No</button>
                    <button onClick={() => setSortBy('name')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${sortBy === 'name' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}><SortAsc size={14}/> By Name</button>
                </div>
                <div className="relative">
                   <select value={selectedClass ? `${selectedClass}|${selectedMedium}` : ''} onChange={(e) => { const val = e.target.value; if(!val) { setSelectedClass(''); return; } const [cls, med] = val.split('|'); setSelectedClass(cls); setSelectedMedium(med as 'English' | 'Semi'); }} className="w-full sm:w-48 appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                     <option value="">Select Class</option>
                     {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                   </select>
                   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
                {classExams.length > 0 && (
                  <div className="relative">
                     <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="w-full sm:w-56 appearance-none pl-4 pr-10 py-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                       {classExams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                     </select>
                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={16} />
                  </div>
                )}
            </div>
         </div>

         <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
               {currentExam && (
                   <>
                   <button onClick={() => setIsManageSubjectsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-all text-xs font-bold shadow-sm whitespace-nowrap"><Edit3 size={14} /> Manage Subjects</button>
                   <button onClick={() => setIsPreviewOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all text-xs font-bold shadow-sm whitespace-nowrap"><Eye size={14} /> Preview Sheet</button>
                   <button onClick={handleDownloadClassPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all text-xs font-bold shadow-sm whitespace-nowrap"><FileDown size={14} /> Download PDF</button>
                   <button onClick={handleExportMarks} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-100 transition-all text-xs font-bold shadow-sm whitespace-nowrap"><Upload size={14} /> Export Marks</button>
                   </>
               )}
            </div>
            {currentExam && (
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                   <button onClick={() => handleRemoveResults(selectedStudentIds)} disabled={selectedStudentIds.size === 0} className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-lg border border-rose-100 hover:bg-rose-100 transition-all text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"><Eraser size={14}/> Remove Selected</button>
                   <button onClick={() => handlePublishResults(false)} disabled={isSyncing} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-100 hover:bg-amber-100 transition-all text-xs font-bold disabled:opacity-50"><GlobeLock size={14}/> Unpublish Selected</button>
                   <button onClick={() => handlePublishResults(true)} disabled={isSyncing} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all text-xs font-bold disabled:opacity-50"><Globe size={14}/> Publish Selected</button>
                   <button onClick={handleManualSaveAll} disabled={isSyncing} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all text-xs font-bold glow-indigo disabled:opacity-50">
                       {isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />} <span>{isSyncing ? 'Syncing...' : 'Save All'}</span>
                  </button>
              </div>
            )}
         </div>
      </div>

      <div className="space-y-3 no-print">
         {!selectedClass ? (
            <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-dashed border-slate-200"><p>Please select a class to enter results.</p></div>
         ) : filteredStudents.length === 0 ? (
           <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-dashed border-slate-200"><p>No students found for <strong>{selectedClass} ({selectedMedium})</strong>.</p></div>
         ) : !currentExam ? (
           <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-dashed border-slate-200">Select an exam to enter results.</div>
         ) : (
           <>
            <div className="bg-slate-50 px-4 py-2 rounded-lg flex items-center gap-4 text-xs font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                <input type="checkbox" onChange={toggleSelectAll} checked={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0} className="w-4 h-4 rounded text-indigo-600" />
                <div className="w-10 text-center">Roll</div>
                <div className="flex-1">Student Name</div>
                <div className="w-24 text-right">Total Marks</div>
            </div>
            {filteredStudents.map((student) => {
                const result = getStudentResult(student.id);
                const totalObtained = calculateTotalObtained(student.id);
                const totalMax = calculateTotalMax();
                const isExpanded = expandedStudentId === student.id;
                const storedRecord = results.find(r => r.studentId === student.id && r.examId === selectedExamId);
                const hasStoredResult = !!storedRecord;
                const isPublished = storedRecord?.published;
                return (
                    <div key={student.id} className={`bg-white rounded-xl border transition-all ${isExpanded ? 'border-indigo-500 ring-4 ring-indigo-100 shadow-lg' : 'border-slate-200 hover:border-indigo-200'}`}>
                        <div onClick={() => toggleStudentExpansion(student.id)} className="p-4 flex items-center gap-4 cursor-pointer">
                            <input type="checkbox" checked={selectedStudentIds.has(student.id)} onClick={(e) => toggleSelection(student.id, e)} className="w-5 h-5 rounded-md text-indigo-600 shrink-0" />
                            <div className="w-10 text-center font-mono text-slate-400 font-bold">{student.rollNo}</div>
                            <div className="flex-1 overflow-hidden">
                                <div className="font-bold text-slate-800 text-sm leading-tight truncate uppercase">{student.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    {isPublished ? 
                                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><Globe size={10}/> Published</span> : 
                                        hasStoredResult ? <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase">Draft</span> : null
                                    }
                                </div>
                            </div>
                            <div className="text-right"><div className="text-sm font-black text-indigo-700 whitespace-nowrap">{totalObtained} / {totalMax}</div></div>
                            <ChevronDown size={18} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`} />
                        </div>
                        {isExpanded && (
                            <div className="px-4 pb-6 pt-2 bg-indigo-50/20 border-t border-indigo-100 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Edit3 size={12}/> {isPublished ? 'Edit Live Result' : 'Academic Scoresheet'}</h4>
                                    <div className="flex items-center gap-3">
                                      {isPublished && (<div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Live View Active</div>)}
                                      {hasStoredResult && (<button onClick={(e) => { e.stopPropagation(); handleRemoveResults(new Set([student.id])); }} className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1 hover:text-rose-800 transition-colors px-2 py-1 bg-rose-50 rounded"><UserMinus size={12}/> Remove Result</button>)}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {activeSubjects.map(sub => (
                                        <div key={sub.id} className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <div className="flex-1">
                                                <div className="text-xs font-bold text-slate-700 uppercase">{sub.name}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">{sub.evaluationType === 'grade' ? 'Graded Subject' : `Max Marks: ${sub.maxMarks}`}</div>
                                            </div>
                                            <div className="w-24">
                                                <input type={sub.evaluationType === 'grade' ? 'text' : 'number'} value={result.marks[sub.id] || ''} onChange={(e) => handleMarkChange(student.id, sub.id, e.target.value)} className={`w-full text-center py-2 border rounded-lg focus:bg-white outline-none text-sm font-black shadow-inner ${isPublished ? 'bg-emerald-50 border-emerald-200 text-emerald-900 focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-indigo-900 focus:border-indigo-500'}`} placeholder={sub.evaluationType === 'grade' ? 'Gr' : '-'} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => handleSaveAndFinish(student.id)} disabled={isSyncing} className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all glow-indigo disabled:opacity-50">
                                   {isSyncing ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16}/>} <span>{isSyncing ? 'Syncing to Cloud...' : 'Save & Finish'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
           </>
         )}
      </div>

      {isManageSubjectsOpen && currentExam && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-0 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Manage Exam Subjects</h3>
                        <p className="text-sm text-slate-500">{currentExam.title} • {selectedClass}</p>
                    </div>
                    <button onClick={() => setIsManageSubjectsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-8">
                    <section>
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckSquare size={14}/> Standard Subjects</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {standardSubjects.map(sub => {
                                const isActive = !currentExam.activeSubjectIds || currentExam.activeSubjectIds.includes(sub.id);
                                const currentMax = currentExam.customMaxMarks?.[sub.id] ?? sub.maxMarks;
                                const currentEval = currentExam.customEvaluationTypes?.[sub.id] ?? sub.evaluationType ?? 'marks';
                                return (
                                    <div key={sub.id} className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border transition-all ${isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                        <div className="flex items-center gap-3 flex-1">
                                            <button onClick={() => toggleStandardSubject(sub.id)} className="text-indigo-600 hover:scale-110 transition-transform flex-shrink-0">{isActive ? <CheckSquare size={22} /> : <Square size={22} className="text-slate-300" />}</button>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{sub.name}</div>
                                                <div className="text-[10px] text-slate-400 font-medium">Internal ID: {sub.id}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                                <button disabled={!isActive} onClick={() => handleUpdateEvalType(sub.id, 'marks')} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${currentEval === 'marks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>MARKS</button>
                                                <button disabled={!isActive} onClick={() => handleUpdateEvalType(sub.id, 'grade')} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${currentEval === 'grade' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>GRADE</button>
                                            </div>
                                            {currentEval === 'marks' && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Max:</label>
                                                    <input type="number" value={currentMax} onChange={(e) => handleUpdateMaxMarks(sub.id, parseInt(e.target.value) || 0)} disabled={!isActive} className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-center text-xs font-black text-slate-800 focus:border-indigo-500 outline-none"/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button onClick={() => { setIsManageSubjectsOpen(false); setToastMsg("Subjects Updated"); setTimeout(() => setToastMsg(''), 2000); }} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-xl transition-all">Apply & Close</button>
                </div>
            </div>
        </div>
      )}

      {isPreviewOpen && currentExam && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-[95%] w-full h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
                      <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Eye size={20}/></div>
                          <div><h3 className="text-xl font-bold text-slate-800">Result Sheet Preview</h3><p className="text-xs text-slate-500 uppercase font-black">Landscape PDF • {selectedClass}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                          <button onClick={handleDownloadClassPDF} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"><Upload size={18}/> Download PDF</button>
                          <button onClick={() => setIsPreviewOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X size={24}/></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-slate-200 p-8 flex justify-center shadow-inner">
                      <div className="bg-white shadow-lg" dangerouslySetInnerHTML={{ __html: `<style>${PDF_RESULT_STYLES}</style>${generateClassPDFContent()}` }} />
                  </div>
              </div>
          </div>
      )}

      {(toastMsg || isSyncing) && (
          <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 z-[100] border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
              <RefreshCcw size={18} className={`text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="font-bold text-sm uppercase tracking-wider">{isSyncing ? 'Syncing Cloud...' : toastMsg}</span>
          </div>
      )}
    </div>
  );
};

export default ResultsManager;
