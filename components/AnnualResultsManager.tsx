
import React, { useState, useMemo, useCallback } from 'react';
import { Student, AnnualRecord, SPECIFIC_CLASSES, getSubjectsForClass, Exam, CustomFieldDefinition, Subject } from '../types';
import { ChevronLeft, Search, CheckCircle2, FileText, X, Download, Eye, Edit3, Loader2, AlertTriangle, Printer, RefreshCw, CheckSquare, Square, Globe, GlobeLock, ChevronDown, Save, Upload, FileDown, Eraser, Settings, ListFilter } from 'lucide-react';
import { dbService } from '../services/db';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface AnnualResultsManagerProps {
  students: Student[];
  annualRecords: AnnualRecord[];
  setAnnualRecords: React.Dispatch<React.SetStateAction<AnnualRecord[]>>;
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  exams: Exam[];
  customFieldDefs: CustomFieldDefinition[];
}

const PDF_STYLES_STRETCH = `
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
        border: 2.5px solid #000000;
        height: 100%;
        width: 100%;
        padding: 5mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #ffffff !important;
    }
    .header { text-align: center; margin-bottom: 8px; flex-shrink: 0; }
    .logo-container { width: 85px; margin: 0 auto 5px; }
    .logo-img { width: 100%; height: auto; display: block; }
    .school-group { font-size: 11px; font-weight: bold; margin-bottom: 1px; text-transform: uppercase; color: #000000; }
    .school-name { font-size: 22px; font-weight: 900; text-transform: uppercase; color: #f97316; margin: 0; line-height: 1; }
    .school-details { font-size: 9px; margin-top: 3px; font-weight: bold; color: #000; }
    .report-badge { 
        margin-top: 5px; 
        font-size: 13px; 
        font-weight: bold; 
        text-transform: uppercase; 
        border: 2px solid #000000; 
        display: inline-block; 
        padding: 3px 40px;
        background: #f8fafc;
        color: #000000;
    }

    .student-info-box { 
        border: 1.5px solid #000000; 
        margin-top: 5px; 
        padding: 8px 12px; 
        display: grid; 
        grid-template-columns: 1.2fr 0.8fr; 
        gap: 4px 25px; 
        font-size: 12px;
        background: #ffffff !important;
        flex-shrink: 0;
    }
    .field-row { display: flex; align-items: baseline; }
    .field-label { font-weight: bold; min-width: 90px; text-transform: uppercase; font-size: 10px; color: #475569; }
    .field-value { border-bottom: 1.5px dotted #000000; flex: 1; font-weight: bold; padding-left: 5px; color: #000; }

    .main-grades-section { flex: 1 1 auto; display: flex; flex-direction: column; margin: 10px 0; min-height: 0; background: #ffffff !important; }
    .grades-table { width: 100%; border-collapse: collapse; height: 100%; }
    .grades-table th { background: #1e293b !important; font-size: 10px; font-weight: bold; text-transform: uppercase; border: 1.5px solid #000000; padding: 6px 4px; color: #ffffff; }
    .grades-table td { border: 1.5px solid #000000; padding: 4px 4px; text-align: center; font-size: 12px; font-weight: bold; color: #000; }
    .sub-name { text-align: left; padding-left: 10px; font-size: 11px; }
    .perc-row { background: #f8fafc !important; height: 35px; }
    .perc-row td { font-size: 13px; font-weight: 900; padding: 8px; border-top: 2px solid #000; }

    .remarks-section { flex: 0.6 0 auto; margin-bottom: 10px; display: flex; flex-direction: column; min-height: 0; background: #ffffff !important; }
    .remarks-grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; height: 100%; border: 1.5px solid #000000; }
    .remarks-grid-table th, .remarks-grid-table td { border: 1.5px solid #000000; padding: 6px; font-size: 11px; vertical-align: top; color: #000; }
    .remarks-grid-table th { background: #1e293b !important; color: #ffffff !important; text-transform: uppercase; font-weight: 900; font-size: 9px; }
    .criteria-label { font-weight: bold; background: #f8fafc !important; width: 150px; text-transform: uppercase; font-size: 9px; vertical-align: middle; color: #475569; }
    .remarks-val { font-style: italic; font-weight: bold; line-height: 1.3; color: #000000; }

    .grade-key-row { width: 100%; border-collapse: collapse; margin-bottom: 8px; flex-shrink: 0; }
    .grade-key-row td { border: 1px solid #000000; font-size: 9px; padding: 4px; text-align: center; font-weight: bold; background: #ffffff !important; color: #000; }

    .result-ribbon { border: 2px solid #000000; padding: 8px; text-align: center; background: #f8fafc !important; margin-bottom: 10px; flex-shrink: 0; }
    .result-main { font-size: 14px; font-weight: 900; text-transform: uppercase; margin-bottom: 1px; color: #000; }
    .result-main span { color: #f97316; }
    .reopening { font-size: 10px; font-weight: bold; margin-top: 2px; color: #000; }

    .signatures-row { display: flex; justify-content: space-between; padding: 0 40px; margin-top: 5px; flex-shrink: 0; }
    .sig-block { width: 180px; border-top: 1.5px solid #000000; text-align: center; padding-top: 5px; font-weight: 900; font-size: 12px; text-transform: uppercase; color: #000000; }
`;

const PDF_CONSOLIDATED_STYLES = `
    .consolidated-sheet { font-family: 'Inter', sans-serif; padding: 15mm; width: 297mm; color: #1e293b; background: #fff; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e1b4b; padding-bottom: 10px; }
    .school-name { font-size: 24px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; }
    .exam-title { font-size: 16px; font-weight: 800; color: #4338ca; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
    th { background: #f8fafc; padding: 8px 4px; border: 1px solid #cbd5e1; font-weight: 800; text-transform: uppercase; }
    td { padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; }
    .name-cell { text-align: left; font-weight: 700; white-space: nowrap; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 40px; }
`;

const AnnualResultsManager: React.FC<AnnualResultsManagerProps> = ({
  students,
  annualRecords,
  setAnnualRecords,
  selectedClass,
  setSelectedClass,
  exams,
  customFieldDefs
}) => {
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewData, setPreviewData] = useState<{student: Student, record: AnnualRecord} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const [isConsolidatedPreviewOpen, setIsConsolidatedPreviewOpen] = useState(false);
  
  // Toggled Subjects state for Annual Report
  const [activeSubjectNames, setActiveSubjectNames] = useState<string[] | null>(null);

  const [className, classMedium] = selectedClass.includes('|') ? selectedClass.split('|') : ['', ''];

  const standardSubjects = useMemo(() => {
    if (!className) return [];
    return getSubjectsForClass(className, (classMedium as 'English' | 'Semi') || 'English');
  }, [className, classMedium]);

  const activeSubjects = useMemo(() => {
    if (activeSubjectNames) {
      return standardSubjects.filter(s => activeSubjectNames.includes(s.name));
    }
    return standardSubjects;
  }, [standardSubjects, activeSubjectNames]);

  const editingStudent = useMemo(() => 
    editingStudentId ? students.find(s => s.id === editingStudentId) : null,
    [editingStudentId, students]
  );

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    let list = students.filter(s => s.className === className && (s.medium || 'English') === classMedium);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  }, [students, selectedClass, searchQuery, className, classMedium]);

  const getRecord = (studentId: string) => {
      return annualRecords.find(r => r.studentId === studentId) || {
        studentId, academicYear: '2024-25', grades: {}, sem1Grades: {}, sem2Grades: {}, remarks: '',
        hobbies: '', hobbiesSem1: '', hobbiesSem2: '', improvements: '', improvementsSem1: '', improvementsSem2: '',
        specialImprovementsSem1: '', specialImprovementsSem2: '', necessaryImprovementSem1: '', necessaryImprovementSem2: '',
        resultStatus: 'PASS', overallPercentage: '', customSubjects: [], published: false
      };
  };

  const handleRecordChange = (studentId: string, field: keyof AnnualRecord, value: any, nestedKey?: string) => {
      setAnnualRecords(prev => {
          const idx = prev.findIndex(r => r.studentId === studentId);
          let rec = idx >= 0 ? { ...prev[idx] } : { ...getRecord(studentId) };
          if (nestedKey) {
             // @ts-ignore
             rec[field] = { ...rec[field], [nestedKey]: value };
          } else {
             // @ts-ignore
             rec[field] = value;
          }
          const newArr = [...prev];
          if (idx >= 0) newArr[idx] = rec;
          else newArr.push(rec);
          return newArr;
      });
  };

  const handleFinishEditing = async (studentId: string) => {
      setIsSyncing(true);
      try {
          const record = getRecord(studentId);
          await dbService.put('annualRecords', record);
          setEditingStudentId(null);
      } catch (err) {
          console.error("Manual Sync Error:", err);
          alert("Network Error: Could not publish results to cloud.");
      } finally {
          setIsSyncing(false);
      }
  };

  const handleBulkPublish = async (pub: boolean) => {
      if (selectedStudentIds.size === 0) return;
      setIsSyncing(true);
      try {
          const toSync: AnnualRecord[] = [];
          const updatedRecords = [...annualRecords];
          selectedStudentIds.forEach(sid => {
              const idx = updatedRecords.findIndex(r => r.studentId === sid);
              let rec = idx >= 0 ? { ...updatedRecords[idx], published: pub } : { ...getRecord(sid), published: pub };
              if (idx >= 0) updatedRecords[idx] = rec;
              else updatedRecords.push(rec);
              toSync.push(rec);
          });
          setAnnualRecords(updatedRecords);
          await dbService.putAll('annualRecords', toSync);
          setSelectedStudentIds(new Set()); 
      } finally { setIsSyncing(false); }
  };

  const handleBulkRemove = async () => {
    if (selectedStudentIds.size === 0) return;
    if (window.confirm(`Delete annual reports for ${selectedStudentIds.size} selected students? This action is permanent.`)) {
        setIsSyncing(true);
        try {
            for (const id of selectedStudentIds) {
                await dbService.delete('annualRecords', id);
            }
            setAnnualRecords(prev => prev.filter(r => !selectedStudentIds.has(r.studentId)));
            setSelectedStudentIds(new Set());
        } finally { setIsSyncing(false); }
    }
  };

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) return;
    const exportData = filteredStudents.map(s => {
        const rec = getRecord(s.id);
        const row: any = { 'Roll No': s.rollNo, 'Student Name': s.name };
        activeSubjects.forEach(sub => {
            row[`${sub.name} (S1)`] = rec.sem1Grades?.[sub.name] || '-';
            row[`${sub.name} (S2)`] = rec.sem2Grades?.[sub.name] || '-';
        });
        row['Percentage (%)'] = rec.overallPercentage || '-';
        row['Status'] = rec.resultStatus || 'PASS';
        return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AnnualReports");
    XLSX.writeFile(wb, `Annual_Consolidated_${selectedClass}.xlsx`);
  };

  const generateConsolidatedHTML = () => {
      const schoolName = classMedium === 'English' ? 'INDRAYANI ENGLISH MEDIUM SCHOOL' : 'INDRAYANI INTERNATIONAL SCHOOL';
      const rows = filteredStudents.map(s => {
          const rec = getRecord(s.id);
          const grades = activeSubjects.map(sub => `<td>${rec.sem1Grades?.[sub.name] || '-'}/${rec.sem2Grades?.[sub.name] || '-'}</td>`).join('');
          return `<tr><td>${s.rollNo}</td><td class="name-cell">${s.name}</td>${grades}<td>${rec.overallPercentage || '-'}%</td><td>${rec.resultStatus || 'PASS'}</td></tr>`;
      }).join('');
      const headers = activeSubjects.map(sub => `<th>${sub.name}<br/><span style="font-size:7px;">S1/S2</span></th>`).join('');
      return `
        <div class="consolidated-sheet">
            <div class="header">
                <div class="school-name">${schoolName}</div>
                <div class="exam-title">Annual Result Sheet - Session 2024-25</div>
                <div style="font-size:10px; font-weight:bold; margin-top:5px;">CLASS: ${className} | MEDIUM: ${classMedium}</div>
            </div>
            <table>
                <thead><tr><th>Roll</th><th class="name-cell">Name</th>${headers}<th>%</th><th>Result</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="footer"><div style="border-top:1px solid #000; width:150px; text-align:center;">Class Teacher</div><div style="border-top:1px solid #000; width:150px; text-align:center;">Principal</div></div>
        </div>
      `;
  };

  const handleDownloadConsolidatedPDF = async () => {
      setIsGenerating(true);
      const exporter = (html2pdf as any).default || (window as any).html2pdf || html2pdf;
      const element = document.createElement('div');
      element.innerHTML = `<style>${PDF_CONSOLIDATED_STYLES}</style>${generateConsolidatedHTML()}`;
      const opt = { margin: 0, filename: `Consolidated_Report_${selectedClass}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
      try { await exporter().set(opt).from(element).save(); } finally { setIsGenerating(false); }
  };

  const toggleStudentSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelection = new Set(selectedStudentIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedStudentIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) setSelectedStudentIds(new Set());
    else setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
  };

  const generatePDFContent = (student: Student, record: AnnualRecord) => {
      const className = student.className;
      const medium = student.medium || 'English';
      const subjects = activeSubjects.map(s => s.name);
      const schoolName = medium === 'English' ? 'INDRAYANI ENGLISH MEDIUM SCHOOL' : 'INDRAYANI INTERNATIONAL SCHOOL';
      const address = "SECTOR 18, KOPARKHAIRANE, NAVI MUMBAI | UDISE: 27211003415";
      const nextClass = className.startsWith('Class ') ? `Class ${parseInt(className.replace('Class ', '')) + 1}` : className === 'Sr. KG' ? 'Class 1' : 'Next Grade';
      const rows = subjects.map((sub, i) => `<tr><td style="width:40px;">${i+1}</td><td class="sub-name">${sub}</td><td>${record.sem1Grades?.[sub] || '-'}</td><td>${record.sem2Grades?.[sub] || '-'}</td></tr>`).join('');
      return `
        <div class="pdf-container">
            <div class="page-border">
                <div class="header">
                    <div class="logo-container"><img src="https://i.ibb.co/R4t9Jhc1/LOGO-IN.png" crossorigin="anonymous" class="logo-img" /></div>
                    <p class="school-group">Shree Ganesh Education Academy's</p>
                    <h1 class="school-name">${schoolName}</h1>
                    <p class="school-details">${address}</p>
                    <div class="report-badge">Annual Progress Card 2024-25</div>
                </div>
                <div class="student-info-box">
                    <div class="field-row"><span class="field-label">Student Name:</span><span class="field-value">${student.name.toUpperCase()}</span></div>
                    <div class="field-row"><span class="field-label">Roll No:</span><span class="field-value">${student.rollNo}</span></div>
                    <div class="field-row"><span class="field-label">Standard:</span><span class="field-value">${student.className}</span></div>
                    <div class="field-row"><span class="field-label">D.O.B:</span><span class="field-value">${student.dob}</span></div>
                </div>
                <div class="main-grades-section">
                    <table class="grades-table">
                        <thead><tr><th style="width:40px;">SR.</th><th class="sub-name">SUBJECTS</th><th>FIRST SEMESTER</th><th>SECOND SEMESTER</th></tr></thead>
                        <tbody>${rows}<tr class="perc-row"><td colspan="2" style="text-align: right; padding-right: 20px;">OVERALL PERCENTAGE (%)</td><td colspan="2">${record.overallPercentage || '-'} %</td></tr></tbody>
                    </table>
                </div>
                <div class="remarks-section">
                    <table class="remarks-grid-table">
                        <thead><tr><th>Evaluation Criteria</th><th>First Semester</th><th>Second Semester</th></tr></thead>
                        <tbody>
                            <tr><td class="criteria-label">Special Improvements</td><td class="remarks-val">${record.specialImprovementsSem1 || '-'}</td><td class="remarks-val">${record.specialImprovementsSem2 || '-'}</td></tr>
                            <tr><td class="criteria-label">Hobbies & Interests</td><td class="remarks-val">${record.hobbiesSem1 || '-'}</td><td class="remarks-val">${record.hobbiesSem2 || '-'}</td></tr>
                            <tr><td class="criteria-label">Necessary Improvements</td><td class="remarks-val">${record.necessaryImprovementSem1 || '-'}</td><td class="remarks-val">${record.necessaryImprovementSem2 || '-'}</td></tr>
                        </tbody>
                    </table>
                </div>
                <table class="grade-key-row"><tr><td>91%+(A1)</td><td>81-90%(A2)</td><td>71-80%(B1)</td><td>61-70%(B2)</td><td>51-60%(C1)</td><td>41-50%(C2)</td><td>33-40%(D)</td><td>&lt;33%(E)</td></tr></table>
                <div class="result-ribbon">
                    <div class="result-main">RESULT: <span>${record.resultStatus || 'PASS'}</span> | PROMOTED TO: <span>${nextClass}</span></div>
                    <div class="reopening">SCHOOL REOPENS: 11TH JUNE 2025</div>
                </div>
                <div class="signatures-row"><div class="sig-block">CLASS TEACHER'S SIGN</div><div class="sig-block">PRINCIPAL'S SIGN</div></div>
            </div>
        </div>
      `;
  };

  const downloadPDF = async (student: Student, record: AnnualRecord) => {
      setIsGenerating(true);
      const element = document.createElement('div');
      element.innerHTML = `<style>${PDF_STYLES_STRETCH}</style>${generatePDFContent(student, record)}`;
      const opt = { margin: 0, filename: `${student.name.replace(/\s+/g, '_')}_ProgressCard.pdf`, image: { type: 'png' }, html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      try { await html2pdf().set(opt).from(element).save(); } finally { setIsGenerating(false); }
  };

  if (editingStudent) {
    const record = getRecord(editingStudent.id);
    const subjects = activeSubjects.map(s => s.name);
    return (
        <div className="bg-white min-h-screen flex flex-col animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setEditingStudentId(null)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={24} /></button>
                    <div><h3 className="font-bold text-slate-900">{editingStudent.name}</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Standard: {editingStudent.className} • Roll: {editingStudent.rollNo}</p></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setPreviewData({ student: editingStudent, record })} className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all" title="Preview Card"><Eye size={20} /></button>
                    <button onClick={() => downloadPDF(editingStudent, record)} disabled={isGenerating} className="p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-50" title="Download PDF">{isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-5xl mx-auto w-full">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                        <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Academic Grades</h4>
                        <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Overall Percentage (%)</label>
                            <input type="text" value={record.overallPercentage || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'overallPercentage', e.target.value)} className="w-20 bg-white border border-indigo-300 rounded-lg py-1 px-2 text-center font-black text-indigo-700 focus:border-indigo-600 outline-none transition-all shadow-sm" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjects.map(sub => (
                            <div key={sub} className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-indigo-200 transition-all">
                                <div className="font-black text-slate-700 text-xs uppercase mb-3 truncate">{sub}</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Sem 1</label><input type="text" value={record.sem1Grades?.[sub] || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'sem1Grades', e.target.value, sub)} className="w-full bg-white border border-slate-300 rounded-xl py-2 text-center font-black text-indigo-700 focus:border-indigo-600 outline-none transition-all shadow-sm" placeholder="-" /></div>
                                    <div><label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Sem 2</label><input type="text" value={record.sem2Grades?.[sub] || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'sem2Grades', e.target.value, sub)} className="w-full bg-white border border-slate-300 rounded-xl py-2 text-center font-black text-indigo-700 focus:border-indigo-600 outline-none transition-all shadow-sm" placeholder="-" /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Remarks (Sem 1)</h4>
                        <div className="space-y-4">
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Special Improvements</label><textarea value={record.specialImprovementsSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'specialImprovementsSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Hobbies</label><textarea value={record.hobbiesSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Necessary Improvement</label><textarea value={record.necessaryImprovementSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'necessaryImprovementSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Remarks (Sem 2)</h4>
                        <div className="space-y-4">
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Special Improvements</label><textarea value={record.specialImprovementsSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'specialImprovementsSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Hobbies</label><textarea value={record.hobbiesSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Necessary Improvement</label><textarea value={record.necessaryImprovementSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'necessaryImprovementSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                        </div>
                    </div>
                </section>
                <section className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col sm:flex-row justify-between items-center gap-6 shadow-xl border border-slate-800">
                    <div>
                        <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-2">Final Academic Standing</label>
                        <select value={record.resultStatus} onChange={(e) => handleRecordChange(editingStudent.id, 'resultStatus', e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"><option value="PASS">PASS</option><option value="FAIL">FAIL</option></select>
                    </div>
                    <button onClick={() => handleRecordChange(editingStudent.id, 'published', !record.published)} className={`px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 ${record.published ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                        {record.published ? 'Status: Published' : 'Status: Draft'}
                    </button>
                </section>
            </div>
            <div className="p-4 border-t sticky bottom-0 bg-white/80 backdrop-blur-md z-40">
               <button onClick={() => handleFinishEditing(editingStudent.id)} disabled={isSyncing} className="w-full max-w-lg mx-auto flex py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all items-center justify-center gap-2 disabled:opacity-50">
                  {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />} 
                  {isSyncing ? 'Syncing Result Live...' : 'Save & Back to Registry'}
               </button>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
          <div><h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Annual Progress Registry</h2><p className="text-sm text-slate-500 font-medium">Full year academic compilation.</p></div>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-end">
              <div className="relative flex-1 sm:flex-none sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" placeholder="Search students..." /></div>
              <div className="relative"><select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none cursor-pointer transition-all min-w-[200px]"><option value="">Select Class</option>{SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {selectedClass && (
                    <>
                    <button onClick={() => setIsManageSubjectsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-all text-xs font-bold shadow-sm whitespace-nowrap"><Edit3 size={14} /> Manage Subjects</button>
                    <button onClick={() => setIsConsolidatedPreviewOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all text-xs font-bold shadow-sm whitespace-nowrap"><Eye size={14} /> Consolidated Sheet</button>
                    <button onClick={handleDownloadConsolidatedPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all text-xs font-bold shadow-sm whitespace-nowrap"><FileDown size={14} /> Download PDF</button>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-100 transition-all text-xs font-bold shadow-sm whitespace-nowrap"><Upload size={14} /> Export Excel</button>
                    </>
                )}
            </div>
            {selectedClass && (
                <div className="flex items-center gap-2">
                    <button onClick={handleBulkRemove} disabled={selectedStudentIds.size === 0} className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-lg border border-rose-100 hover:bg-rose-100 transition-all text-xs font-bold disabled:opacity-50"><Eraser size={14}/> Remove Selected</button>
                    <button onClick={() => handleBulkPublish(false)} disabled={selectedStudentIds.size === 0} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-100 hover:bg-amber-100 transition-all text-xs font-bold disabled:opacity-50"><GlobeLock size={14}/> Unpublish Selected</button>
                    <button onClick={() => handleBulkPublish(true)} disabled={selectedStudentIds.size === 0} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all text-xs font-bold disabled:opacity-50"><Globe size={14}/> Publish Selected</button>
                </div>
            )}
        </div>
      </div>

      {!selectedClass ? (<div className="py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center gap-4"><FileText size={48} className="text-slate-200" /><p className="font-black text-slate-400 uppercase tracking-widest text-sm">Select a class to manage records.</p></div>) : (
        <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-2"><button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">{selectedStudentIds.size === filteredStudents.length ? <CheckSquare size={20}/> : <Square size={20}/>}</button><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select All Candidates</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredStudents.map(s => {
                    const rec = getRecord(s.id); const isSelected = selectedStudentIds.has(s.id);
                    return (
                        <div key={s.id} className="relative group">
                            <div onClick={() => toggleStudentSelection(s.id)} className="absolute top-4 left-4 z-10 p-1 rounded-md cursor-pointer text-slate-300 hover:text-indigo-600">{isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}</div>
                            <button onClick={() => setEditingStudentId(s.id)} className={`w-full bg-white p-5 pl-12 rounded-2xl border transition-all text-left flex flex-col h-full hover:shadow-lg ${rec.published ? 'border-emerald-100 ring-2 ring-emerald-50' : 'border-slate-200 hover:border-indigo-400'}`}>
                                <div className="flex justify-between items-start mb-3"><span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg border border-slate-200 uppercase tracking-widest">ROLL: {s.rollNo}</span>{rec.published && <CheckCircle2 size={14} className="text-emerald-500"/>}</div>
                                <h3 className="font-black text-slate-800 flex-1 leading-tight group-hover:text-indigo-600 transition-colors uppercase truncate w-full">{s.name}</h3><div className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={12}/> Edit Data</div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* MANAGE SUBJECTS MODAL */}
      {isManageSubjectsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-0 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                    <div><h3 className="text-xl font-black text-slate-800 tracking-tight">Manage Report Subjects</h3><p className="text-sm text-slate-500">{className} • {classMedium}</p></div>
                    <button onClick={() => setIsManageSubjectsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select standard subjects to include on the annual report card</p>
                    <div className="grid grid-cols-1 gap-2">
                        {standardSubjects.map(sub => {
                            const isActive = !activeSubjectNames || activeSubjectNames.includes(sub.name);
                            return (
                                <button 
                                  key={sub.id} 
                                  onClick={() => {
                                      const currentActive = activeSubjectNames || standardSubjects.map(s => s.name);
                                      const nextActive = currentActive.includes(sub.name) ? currentActive.filter(n => n !== sub.name) : [...currentActive, sub.name];
                                      setActiveSubjectNames(nextActive);
                                  }}
                                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                                >
                                   {isActive ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} className="text-slate-300" />}
                                   <span className="text-sm font-bold text-slate-800 uppercase">{sub.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button onClick={() => setIsManageSubjectsOpen(false)} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-xl transition-all">Save Visibility Settings</button>
                </div>
            </div>
        </div>
      )}

      {/* CONSOLIDATED PREVIEW MODAL */}
      {isConsolidatedPreviewOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-[95%] w-full h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Eye size={20}/></div>
                          <div><h3 className="text-xl font-bold text-slate-800">Consolidated Result Preview</h3><p className="text-xs text-slate-500 uppercase font-black">{className} Landscape PDF</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                          <button onClick={handleDownloadConsolidatedPDF} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all"><Printer size={18}/> Download PDF</button>
                          <button onClick={() => setIsConsolidatedPreviewOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X size={24}/></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-slate-200 p-8 flex justify-center shadow-inner">
                      <div className="bg-white shadow-lg" dangerouslySetInnerHTML={{ __html: `<style>${PDF_CONSOLIDATED_STYLES}</style>${generateConsolidatedHTML()}` }} />
                  </div>
              </div>
          </div>
      )}

      {previewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] p-4 flex items-center justify-center">
            <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div><h3 className="text-xl font-black text-slate-800 tracking-tight">Print Preview</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Institutional High-Occupancy Layout</p></div>
                    <div className="flex gap-2">
                        <button onClick={() => downloadPDF(previewData.student, previewData.record)} disabled={isGenerating} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">{isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14}/>} Download PDF</button>
                        <button onClick={() => setPreviewData(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-slate-200 p-4 sm:p-8 flex justify-center items-start shadow-inner">
                    <div className="bg-white shadow-2xl scale-75 sm:scale-90 origin-top" dangerouslySetInnerHTML={{ __html: `<style>${PDF_STYLES_STRETCH}</style>${generatePDFContent(previewData.student, previewData.record)}` }} />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnnualResultsManager;
