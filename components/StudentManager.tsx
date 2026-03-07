
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Student, CLASSES, SPECIFIC_CLASSES, CustomFieldDefinition, User } from '../types';
import { Search, Filter, Trash2, X, GraduationCap, MapPin, Phone, Calendar, UserPlus, ChevronDown, CheckCircle2, Download, RefreshCw, Smartphone, MapPinned, Edit3, Trash, Fingerprint, IdCard, Users2, FileOutput, CheckSquare, Square, Eye, ShieldCheck, Copy, FileDown, Upload, AlertCircle, Building2, UserRound, Plus, Minus, AlertTriangle, MoonStar, Hash } from 'lucide-react';
import * as XLSX from 'xlsx';
import { dbService, generateUUID } from '../services/db';

interface StudentManagerProps {
  students: Student[];
  setStudents: (val: React.SetStateAction<Student[]>) => void;
  customFieldDefs: CustomFieldDefinition[];
  setCustomFieldDefs: React.Dispatch<React.SetStateAction<CustomFieldDefinition[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
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

const StudentManager: React.FC<StudentManagerProps> = ({ 
  students, 
  setStudents, 
  customFieldDefs, 
  setCustomFieldDefs,
  users,
  setUsers,
  currentUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewingCredsStudent, setViewingCredsStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecificClass, setFilterSpecificClass] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);

  const availableExportFields = [
    { key: 'rollNo', label: 'Roll No' },
    { key: 'name', label: 'Full Name' },
    { key: 'mothersName', label: 'Mother Name' },
    { key: 'className', label: 'Standard' },
    { key: 'medium', label: 'Medium' },
    { key: 'religion', label: 'Religion' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'placeOfBirth', label: 'Place of Birth' },
    { key: 'phone', label: 'Phone' },
    { key: 'alternatePhone', label: 'Alt Phone' },
    { key: 'aadharNo', label: 'Aadhar Card' },
    { key: 'apaarId', label: 'APAAR ID' },
    { key: 'penNo', label: 'PEN No.' },
    { key: 'caste', label: 'Caste' },
    { key: 'address', label: 'Address' }
  ];

  const [selectedExportFields, setSelectedExportFields] = useState<Set<string>>(new Set(availableExportFields.map(f => f.key)));

  const [formData, setFormData] = useState<Partial<Student> & { customId?: string, customPass?: string }>({
    name: '',
    mothersName: '',
    rollNo: '',
    className: 'Class 1',
    medium: 'English',
    religion: '',
    dob: '',
    placeOfBirth: '',
    address: '',
    phone: '',
    alternatePhone: '',
    aadharNo: '',
    apaarId: '',
    penNo: '',
    caste: '',
    customFields: {},
    customId: '',
    customPass: ''
  });

  useEffect(() => {
    if (isModalOpen || isExportModalOpen || viewingCredsStudent) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isModalOpen, isExportModalOpen, viewingCredsStudent]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNo.includes(searchQuery);
      let matchesClass = true;
      if (filterSpecificClass) {
          const [cls, med] = filterSpecificClass.split('|');
          matchesClass = s.className === cls && (s.medium || 'English') === med;
      }
      return matchesSearch && matchesClass;
    }).sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  }, [students, searchQuery, filterSpecificClass]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleManualSync = async () => {
      setIsSyncing(true);
      setTabError(null);
      try {
          await dbService.putAll('students', students);
          await dbService.putAll('users', users);
          showToast("Cloud Synchronized Successfully", "success");
      } catch (e: any) {
          setTabError(`Cloud Sync Failed: ${e.message || 'Check connection or run Repair SQL'}`);
          showToast("Sync Failed", "error");
      } finally {
          setIsSyncing(false);
      }
  };

  const normalizeClassName = (val: string): string => {
    const v = val.trim();
    if (/^\d+$/.test(v)) return `Class ${v}`;
    const lower = v.toLowerCase();
    if (lower.includes('nur')) return 'Nursery';
    if (lower.includes('jr')) return 'Jr. KG';
    if (lower.includes('sr')) return 'Sr. KG';
    if (lower.startsWith('class ')) {
        const num = lower.replace('class ', '').trim();
        return `Class ${num.charAt(0).toUpperCase() + num.slice(1)}`;
    }
    return v;
  };

  const parseImportDate = (val: any): string => {
    if (!val) return '';
    const num = Number(val);
    if (!isNaN(num) && num > 10000 && num < 100000) {
        const date = new Date((num - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    return val.toString();
  };

  const generateCredentials = (student: Student, allUsers: User[]) => {
    const dobRaw = student.dob || '01012010';
    const dobParts = dobRaw.split('-'); 
    const dobStr = dobParts.length === 3 ? `${dobParts[2]}${dobParts[1]}${dobParts[0]}` : dobRaw.replace(/-/g, '');
    const nameParts = student.name.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
    const firstName = nameParts[0] || 'student';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    let username = `${firstName}${dobStr}`;
    const exists = allUsers.some(u => u.username === username && u.linkedStudentId !== student.id);
    if (exists && lastName) {
        username = `${firstName}${lastName}${dobStr}`;
    }

    const initials = nameParts.map(p => p[0]).join('') || 'stu';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const password = `${initials}${randomNum}`;
    
    return { username, password };
  };

  const handleCopyCredentials = (s: Student) => {
      const u = users.find(usr => usr.linkedStudentId === s.id);
      if (!u) {
          showToast("User account not found for this student", "error");
          return;
      }
      const text = `Indrayani School Login\nStudent: ${s.name}\nID: ${u.username}\nPass: ${u.password}\nPortal: ${window.location.origin}`;
      navigator.clipboard.writeText(text);
      showToast("Login Details Copied", "success");
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormError(null);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSyncing(true);

    try {
        if (!/^[a-zA-Z. ]+$/.test(formData.name || '')) {
          setFormError("Name must contain letters, dots, or spaces only.");
          setIsSyncing(false);
          return;
        }

        const cleanPhone = (formData.phone || '').replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
          setFormError("Enter a valid 10-digit primary phone number.");
          setIsSyncing(false);
          return;
        }

        const isDuplicateRoll = students.some(s => 
            s.id !== formData.id && 
            s.rollNo === formData.rollNo && 
            s.className === formData.className &&
            (s.medium || 'English') === (formData.medium || 'English')
        );
        if (isDuplicateRoll) {
            setFormError(`Roll No ${formData.rollNo} already exists in ${formData.className} (${formData.medium}).`);
            setIsSyncing(false);
            return;
        }

        const studentId = formData.id || generateUUID();
        const newStudent: Student = {
          id: studentId,
          name: (formData.name || '').trim(),
          mothersName: (formData.mothersName || '').trim(),
          rollNo: (formData.rollNo || '').trim(),
          className: formData.className || 'Class 1',
          medium: (formData.medium as any) || 'English',
          religion: (formData.religion || '').trim(),
          dob: formData.dob || '',
          placeOfBirth: formData.placeOfBirth || '',
          address: formData.address || '',
          phone: cleanPhone,
          alternatePhone: (formData.alternatePhone || '').replace(/\D/g, ''),
          aadharNo: (formData.aadharNo || '').replace(/\D/g, ''),
          apaarId: (formData.apaarId || '').trim(),
          penNo: (formData.penNo || '').trim(),
          caste: (formData.caste || '').trim(),
          customFields: formData.customFields || {}
        };

        const { username, password } = generateCredentials(newStudent, users);
        
        const existingUser = users.find(u => u.linkedStudentId === studentId);
        const userPayload: User = { 
          id: existingUser?.id || generateUUID(),
          username: (formData.customId && formData.customId.trim() !== '') ? formData.customId.trim() : (existingUser?.username || username),
          password: (formData.customPass && formData.customPass.trim() !== '') ? formData.customPass.trim() : (existingUser?.password || password),
          name: newStudent.name,
          role: 'student' as const,
          linkedStudentId: studentId
        };

        await dbService.put('students', newStudent);
        await dbService.put('users', userPayload);

        setUsers(prev => {
          if (existingUser) return prev.map(u => u.linkedStudentId === studentId ? userPayload : u);
          return [...prev, userPayload];
        });

        if (formData.id) {
          setStudents(prev => prev.map(s => s.id === formData.id ? newStudent : s));
          showToast("Profile Updated", "success");
        } else {
          setStudents(prev => [...prev, newStudent]);
          showToast("Student Added & Synced!", "success");
        }
        
        setIsModalOpen(false);
        resetForm();
    } catch (err: any) {
        console.error("Save Error:", err);
        setFormError(`Cloud Error: ${err.message || 'Check database permissions'}. Ensure SQL Repair script has been run in System tab.`);
    } finally {
        setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', mothersName: '', rollNo: '', className: 'Class 1', medium: 'English', religion: '', dob: '', placeOfBirth: '', address: '', phone: '', alternatePhone: '', aadharNo: '', apaarId: '', penNo: '', caste: '', customFields: {}, customId: '', customPass: '' });
    setFormError(null);
    setShowAdditionalFields(false);
  };

  const editStudent = (student: Student) => {
    const user = users.find(u => u.linkedStudentId === student.id);
    setFormData({ 
        ...student, 
        medium: student.medium || 'English',
        customId: user?.username || '', 
        customPass: user?.password || '' 
    });
    setFormError(null);
    setShowAdditionalFields(true);
    setIsModalOpen(true);
  };

  const handleExportData = () => {
    if (selectedExportFields.size === 0) {
        alert("Please select at least one field to export.");
        return;
    }

    const exportData = filteredStudents.map(s => {
      const row: any = {};
      availableExportFields.forEach(field => {
        if (selectedExportFields.has(field.key)) {
          // @ts-ignore
          row[field.label] = s[field.key] || '';
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `StudentData_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportModalOpen(false);
  };

  const downloadImportTemplate = () => {
    const headers = [['Roll No', 'Full Name', 'Mother Name', 'Class', 'Medium', 'Religion', 'DOB (YYYY-MM-DD)', 'Place of Birth', 'Phone', 'Alt Phone', 'Aadhar Card', 'APAAR ID', 'PEN No.', 'Caste', 'Address']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    setTabError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        
        if (jsonData.length === 0) {
          showToast("Excel file is empty", "error");
          setIsSyncing(false);
          return;
        }

        const importedStudents: Student[] = [];
        const newUsers: User[] = [];

        jsonData.forEach((row: any) => {
          const studentId = generateUUID();
          const s: Student = {
            id: studentId,
            name: (row['Full Name'] || row['Name'] || '').toString().trim(),
            mothersName: (row['Mother Name'] || '').toString().trim(),
            rollNo: (row['Roll No'] || row['Roll'] || '').toString(),
            className: normalizeClassName((row['Class'] || 'Class 1').toString()),
            medium: (row['Medium']?.toString().toLowerCase().includes('semi') ? 'Semi' : 'English'),
            religion: (row['Religion'] || '').toString().trim(),
            dob: parseImportDate(row['DOB (YYYY-MM-DD)'] || row['DOB'] || ''),
            placeOfBirth: (row['Place of Birth'] || '').toString(),
            phone: (row['Phone'] || '').toString().replace(/\D/g, ''),
            alternatePhone: (row['Alt Phone'] || '').toString().replace(/\D/g, ''),
            aadharNo: (row['Aadhar Card'] || row['Aadhar'] || '').toString().replace(/\D/g, ''),
            apaarId: (row['APAAR ID'] || row['Apaar'] || '').toString(),
            penNo: (row['PEN No.'] || row['PEN'] || '').toString().trim(),
            caste: (row['Caste'] || '').toString(),
            address: (row['Address'] || '').toString(),
            customFields: {}
          };

          if (s.name && s.rollNo) {
            importedStudents.push(s);
            const creds = generateCredentials(s, [...users, ...newUsers]);
            newUsers.push({
              id: generateUUID(),
              username: creds.username,
              password: creds.password,
              name: s.name,
              role: 'student',
              linkedStudentId: s.id
            });
          }
        });

        if (importedStudents.length > 0) {
          // 1. Update Local State
          setStudents(prev => [...prev, ...importedStudents]);
          setUsers(prev => [...prev, ...newUsers]);
          
          // 2. Sync to Cloud
          showToast(`Uploading ${importedStudents.length} profiles...`, "info");
          await dbService.putAll('students', importedStudents);
          await dbService.putAll('users', newUsers);
          
          showToast(`${importedStudents.length} Students Imported & Synced!`, "success");
        } else {
          showToast("No valid student records found in file", "error");
        }
      } catch (err: any) {
        console.error("Import error:", err);
        setTabError(`Import Failed: ${err.message || 'Check file format'}`);
        showToast("Import failed", "error");
      } finally {
        setIsSyncing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    
    reader.onerror = () => {
      showToast("File reading failed", "error");
      setIsSyncing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleRemoveStudent = async (student: Student) => {
    if (window.confirm(`Are you sure you want to remove ${student.name}? This will delete their login and all academic data. The username "${users.find(u => u.linkedStudentId === student.id)?.username || 'N/A'}" will be freed immediately.`)) {
      setIsSyncing(true);
      try {
          const studentUser = users.find(u => u.linkedStudentId === student.id);
          if (studentUser) {
              await dbService.delete('users', studentUser.id);
              setUsers(prev => prev.filter(u => u.id !== studentUser.id));
          }
          await dbService.delete('students', student.id);
          setStudents(prev => prev.filter(s => s.id !== student.id));
          showToast("Student & Credentials Removed", "info");
      } catch (err: any) {
          alert(`Error deleting student: ${err.message}.`);
      } finally {
          setIsSyncing(false);
      }
    }
  };

  const toggleExportField = (key: string) => {
    const next = new Set(selectedExportFields);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedExportFields(next);
  };

  const selectAllExportFields = () => {
    if (selectedExportFields.size === availableExportFields.length) setSelectedExportFields(new Set());
    else setSelectedExportFields(new Set(availableExportFields.map(f => f.key)));
  };

  const viewingStudentUser = useMemo(() => {
    if (!viewingCredsStudent) return null;
    return users.find(u => u.linkedStudentId === viewingCredsStudent.id);
  }, [viewingCredsStudent, users]);

  return (
    <div className="space-y-6 animate-fade-up">
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 border bg-slate-800 text-white border-slate-700">
          <CheckCircle2 size={20} className="text-emerald-400"/>
          <span className="text-sm font-bold uppercase tracking-wider">{toast.msg}</span>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-300 flex flex-col lg:flex-row gap-4 items-center justify-between no-print">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                <input type="text" placeholder="Search name or roll no..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-400 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all font-bold text-slate-900" />
            </div>
            <div className="relative">
                <select value={filterSpecificClass} onChange={(e) => setFilterSpecificClass(e.target.value)}
                    className="appearance-none pl-10 pr-10 py-2.5 bg-slate-100 border border-slate-400 rounded-xl text-sm font-black text-slate-800 outline-none cursor-pointer">
                    <option value="">All Classes</option>
                    {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
            </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1">
            <button onClick={handleManualSync} disabled={isSyncing} className={`p-2.5 rounded-xl border transition-all shadow-sm ${isSyncing ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-indigo-600 border-slate-400 hover:bg-indigo-50'}`} title="Push All to Cloud">
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button onClick={downloadImportTemplate} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors shadow-sm" title="Import Template"><FileDown size={20} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-400 text-slate-800 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"><Download size={16} /> Import</button>
            <button onClick={() => setIsExportModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"><FileOutput size={16} /> Export</button>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg whitespace-nowrap"><UserPlus size={18} /> New Student</button>
        </div>
      </div>

      {tabError && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-800 animate-in slide-in-from-top-2">
              <AlertTriangle size={20} />
              <div>
                  <p className="text-sm font-black uppercase tracking-tight">Technical Error Encountered</p>
                  <p className="text-xs font-medium opacity-80">{tabError}</p>
              </div>
          </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1200px]">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-4 w-16 text-center">Roll</th>
                        <th className="px-4 py-4">Student & Mother</th>
                        <th className="px-4 py-4">Contact</th>
                        <th className="px-4 py-4">DOB / POB</th>
                        <th className="px-4 py-4">Govt IDs</th>
                        <th className="px-4 py-4">Religion / Caste</th>
                        <th className="px-4 py-4">Address</th>
                        <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-6 py-24 text-center">
                                <GraduationCap size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-black uppercase tracking-widest italic">No Students Found</p>
                            </td>
                        </tr>
                    ) : (
                        filteredStudents.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-4 py-4 text-center">
                                    <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-700 mx-auto border border-slate-200">{student.rollNo}</span>
                                </td>
                                <td className="px-4 py-4">
                                    <button 
                                      onClick={() => setViewingCredsStudent(student)}
                                      className="font-black text-slate-900 uppercase leading-none mb-1 hover:text-indigo-600 transition-colors text-left flex items-center gap-1.5 outline-none"
                                    >
                                      {student.name}
                                      <Eye size={12} className="text-slate-300 group-hover:text-indigo-400" />
                                    </button>
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase italic flex items-center gap-1"><UserRound size={10}/> {student.mothersName || 'Mother: N/A'}</div>
                                        <div className="flex gap-1 mt-1">
                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">{student.className}</span>
                                            <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{student.medium || 'English'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 font-bold text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <Phone size={12} className="text-slate-400" />
                                        {student.phone}
                                    </div>
                                    {student.alternatePhone && (
                                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                                            <Smartphone size={10} />
                                            {student.alternatePhone}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-4 font-bold text-slate-600">
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                        <Calendar size={12} className="text-slate-400" />
                                        {formatResilientDate(student.dob)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium uppercase">
                                        <MapPin size={10} />
                                        {student.placeOfBirth || 'N/A'}
                                    </div>
                                </td>
                                <td className="px-4 py-4 font-bold text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <Fingerprint size={12} className="text-slate-400" />
                                        <span className="text-[10px]">Aadhar:</span> {student.aadharNo || '-'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium uppercase">
                                        <IdCard size={10} />
                                        <span>APAAR:</span> {student.apaarId || '-'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium uppercase">
                                        <Hash size={10} />
                                        <span>PEN:</span> {student.penNo || '-'}
                                    </div>
                                </td>
                                <td className="px-4 py-4 font-bold text-slate-600 uppercase">
                                    <div className="flex items-center gap-1.5">
                                        <MoonStar size={12} className="text-indigo-500" />
                                        {student.religion || '-'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium uppercase">
                                        <Users2 size={10} className="text-slate-400" />
                                        {student.caste || '-'}
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-start gap-1.5 max-w-[200px]">
                                        <MapPinned size={12} className="text-slate-400 shrink-0 mt-0.5" />
                                        <span className="text-slate-500 font-medium line-clamp-2 leading-relaxed">{student.address || 'Address not recorded.'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => editStudent(student)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit"><Edit3 size={16}/></button>
                                        <button onClick={() => handleRemoveStudent(student)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Remove"><Trash size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {viewingCredsStudent && createPortal(
        <div className="fixed inset-0 z-[1000] flex flex-col pointer-events-none">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto" onClick={() => setViewingCredsStudent(null)}></div>
            <div className="relative flex-1 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white w-full max-sm rounded-[2rem] shadow-2xl flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden">
                    <div className="p-8 pb-4 text-center">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-inner">
                            <ShieldCheck size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{viewingCredsStudent.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Student Login Portal Access</p>
                    </div>

                    <div className="p-8 pt-4 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access ID (Username)</label>
                            <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl group">
                                <span className="flex-1 font-mono font-black text-slate-800 tracking-tight">{viewingStudentUser?.username || 'N/A'}</span>
                                <button 
                                  onClick={() => {
                                    if (viewingStudentUser) {
                                      navigator.clipboard.writeText(viewingStudentUser.username);
                                      showToast("Username Copied", "success");
                                    }
                                  }} 
                                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Security Password</label>
                            <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl group">
                                <span className="flex-1 font-mono font-black text-indigo-700 tracking-tight">{viewingStudentUser?.password || 'N/A'}</span>
                                <button 
                                  onClick={() => {
                                    if (viewingStudentUser) {
                                      navigator.clipboard.writeText(viewingStudentUser.password);
                                      showToast("Password Copied", "success");
                                    }
                                  }} 
                                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>

                        <button 
                           onClick={() => handleCopyCredentials(viewingCredsStudent)}
                           className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            <Copy size={14} /> Copy Full Shared Login Text
                        </button>
                    </div>

                    <button 
                      onClick={() => setViewingCredsStudent(null)}
                      className="w-full py-5 bg-slate-50 border-t border-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
                    >
                        Dismiss Details
                    </button>
                </div>
            </div>
        </div>,
        document.body
      )}

      {isExportModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col pointer-events-none">
            <div className="absolute inset-0 top-[var(--header-height)] bg-slate-950/40 backdrop-blur-md pointer-events-auto" onClick={() => setIsExportModalOpen(false)}></div>
            <div className="relative top-[var(--header-height)] flex-1 overflow-hidden flex items-start justify-center p-4 pointer-events-none">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-top-4 duration-300 border border-slate-200">
                    <div className="px-8 pt-8 pb-4 shrink-0 bg-white">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[1.5rem] font-bold text-slate-900 leading-tight tracking-tight">Export Data Selection</h3>
                            <button onClick={() => setIsExportModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Whichever fields you select will appear in your Excel file.</p>
                    </div>

                    <div className="p-8 overflow-y-auto max-h-[60vh]">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                           <button onClick={selectAllExportFields} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors">
                              {selectedExportFields.size === availableExportFields.length ? 'Deselect All' : 'Select All Fields'}
                           </button>
                           <span className="text-[10px] font-black text-slate-400 uppercase">{selectedExportFields.size} Columns Selected</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {availableExportFields.map(field => (
                                <button 
                                  key={field.key} 
                                  onClick={() => toggleExportField(field.key)}
                                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${selectedExportFields.has(field.key) ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-50' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                   {selectedExportFields.has(field.key) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-300" />}
                                   <span className={`text-xs font-black uppercase tracking-tight ${selectedExportFields.has(field.key) ? 'text-indigo-900' : ''}`}>{field.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="px-8 py-6 shrink-0 flex items-center justify-end gap-6 bg-slate-50 border-t border-slate-200">
                        <button onClick={() => setIsExportModalOpen(false)} className="text-sm font-black text-slate-400 uppercase hover:text-slate-600 transition-colors">Cancel</button>
                        <button onClick={handleExportData} className="px-10 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2">
                           <Download size={18} /> Export Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col pointer-events-none">
            <div className="absolute inset-0 top-[var(--header-height)] bg-slate-950/40 backdrop-blur-md pointer-events-auto" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative top-[var(--header-height)] flex-1 overflow-hidden flex items-start justify-center p-4 pointer-events-none">
                <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-top-4 duration-300 border border-slate-200 max-h-[calc(100dvh-var(--header-height)-2rem)] overflow-hidden">
                    <div className="px-8 pt-8 pb-4 shrink-0 bg-white">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[1.5rem] font-bold text-[#1e1b4b] leading-tight tracking-tight">
                                {formData.id ? 'Edit Profile' : 'New Admission'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
                        </div>
                        {formError && (
                            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={18} />
                                <span className="text-xs font-black uppercase tracking-tight">{formError}</span>
                            </div>
                        )}
                    </div>
                    <form onSubmit={handleAddStudent} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Student's Full Name</label>
                                    <input id="student-name-input" type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] transition-all shadow-sm`} placeholder="e.g. Rahul Sharma" required />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Mother's Name</label>
                                    <input type="text" value={formData.mothersName} onChange={(e) => handleInputChange('mothersName', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="e.g. Mrs. Sunita Sharma" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Standard</label>
                                    <select value={formData.className} onChange={(e) => handleInputChange('className', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#818cf8] transition-all shadow-sm cursor-pointer" required>
                                        {CLASSES.map(cls => <option key={cls.value} value={cls.value}>{cls.label}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Medium</label>
                                    <select value={formData.medium} onChange={(e) => handleInputChange('medium', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#818cf8] transition-all shadow-sm cursor-pointer" required>
                                        <option value="English">English</option>
                                        <option value="Semi">Semi</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Roll No</label>
                                    <input type="text" value={formData.rollNo} onChange={(e) => handleInputChange('rollNo', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="101" required />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">DOB</label>
                                    <input type="date" value={formData.dob} onChange={(e) => handleInputChange('dob', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" required />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Religion</label>
                                    <input type="text" value={formData.religion} onChange={(e) => handleInputChange('religion', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="e.g. Hindu" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Primary Phone</label>
                                    <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="10 digits" maxLength={15} required />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Place of Birth</label>
                                    <input type="text" value={formData.placeOfBirth} onChange={(e) => handleInputChange('placeOfBirth', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="e.g. Mumbai" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Caste</label>
                                    <input type="text" value={formData.caste} onChange={(e) => handleInputChange('caste', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="e.g. Open / OBC" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Aadhar Card No</label>
                                    <input type="text" value={formData.aadharNo} onChange={(e) => handleInputChange('aadharNo', e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="12 digit Aadhar" maxLength={12} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">APAAR ID</label>
                                    <input type="text" value={formData.apaarId} onChange={(e) => handleInputChange('apaarId', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="Govt. Identity ID" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">PEN No.</label>
                                    <input type="text" value={formData.penNo} onChange={(e) => handleInputChange('penNo', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="Permanent Education Number" />
                                </div>
                            </div>

                            <div className="flex items-center justify-center pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                                >
                                    {showAdditionalFields ? <Minus size={14}/> : <Plus size={14}/>}
                                    {showAdditionalFields ? 'Show Less' : 'Add More Details'}
                                </button>
                            </div>

                            {showAdditionalFields && (
                                <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="border-t border-slate-100 pt-6">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Alt. Phone</label>
                                                <input type="tel" value={formData.alternatePhone} onChange={(e) => handleInputChange('alternatePhone', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="10 digits" maxLength={15} />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-0.5 tracking-wider">Access ID (Login Username)</label>
                                                <input type="text" value={formData.customId} onChange={(e) => handleInputChange('customId', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-900 outline-none focus:border-indigo-400" placeholder="Auto-generated if left blank" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Residential Address</label>
                                                <textarea value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none min-h-[80px] focus:border-[#818cf8] transition-all resize-none shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-8 py-6 shrink-0 flex items-center justify-end gap-6 bg-white border-t border-slate-50 sticky bottom-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-base font-semibold text-slate-500 hover:text-slate-900">Cancel</button>
                            <button type="submit" disabled={isSyncing} className="px-10 py-3.5 bg-indigo-600 text-white rounded-xl text-base font-bold shadow-lg shadow-indigo-100 hover:bg-[#818cf8] transition-all active:scale-95 leading-none glow-indigo disabled:opacity-50">
                                {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : 'Save & Commit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StudentManager;
