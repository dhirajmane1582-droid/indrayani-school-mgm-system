
import React, { useRef, useState } from 'react';
import { Database, DownloadCloud, UploadCloud, AlertTriangle, CheckCircle2, ShieldAlert, FileJson, Terminal, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

interface SystemManagerProps {
  onExport: () => void;
  onImport: (data: any) => Promise<void>;
  onPushToCloud: () => Promise<void>;
  isSyncing: boolean;
}

const SystemManager: React.FC<SystemManagerProps> = ({ onExport, onImport, onPushToCloud, isSyncing }) => {
  const [status, setStatus] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const testConnection = async () => {
    setIsTesting(true);
    setStatus(null);
    try {
      // Use a simple query to test connection with retry
      const testQuery = async () => {
          const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
          if (error) throw error;
          return true;
      };

      // Simple retry logic for the test button
      let success = false;
      let lastErr = null;
      for(let i=0; i<3; i++) {
          try {
              await Promise.race([
                  testQuery(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
              ]);
              success = true;
              break;
          } catch (e) {
              lastErr = e;
              await new Promise(r => setTimeout(r, 1000));
          }
      }

      if (!success) throw lastErr;
      setStatus({ msg: "Cloud Connection Successful! Database is reachable.", type: 'success' });
    } catch (err: any) {
      console.error("Connection test failed:", err);
      setStatus({ msg: `Connection Failed: ${err.message || 'Network Error'}. Ensure SQL script is run and your internet is stable.`, type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  const sqlSchema = `-- INDRAYANI SCHOOL - MASTER DATABASE REPAIR (SAFE)
-- Run this in Supabase SQL Editor to fix all synchronization issues.

-- 1. Ensure all tables exist with correct structure
CREATE TABLE IF NOT EXISTS students (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, "rollNo" TEXT, "className" TEXT, medium TEXT, dob DATE, "placeOfBirth" TEXT, address TEXT, phone TEXT, "alternatePhone" TEXT, "aadharNo" TEXT, "apaarId" TEXT, "penNo" TEXT, caste TEXT, religion TEXT, "mothersName" TEXT, "customFields" JSONB DEFAULT '{}'::jsonb);

-- Ensure all columns exist (in case table was created with older version)
ALTER TABLE students ADD COLUMN IF NOT EXISTS "rollNo" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS medium TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "placeOfBirth" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "alternatePhone" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "aadharNo" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "apaarId" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "penNo" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS caste TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "mothersName" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE NOT NULL, "studentId" UUID REFERENCES students(id) ON DELETE CASCADE, present BOOLEAN DEFAULT true);
CREATE TABLE IF NOT EXISTS exams (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT, type TEXT, date DATE, "className" TEXT, published BOOLEAN DEFAULT false, "customMaxMarks" JSONB DEFAULT '{}'::jsonb, "customEvaluationTypes" JSONB DEFAULT '{}'::jsonb, "activeSubjectIds" TEXT[] DEFAULT '{}', "customSubjects" JSONB DEFAULT '[]'::jsonb, timetable JSONB DEFAULT '[]'::jsonb);
CREATE TABLE IF NOT EXISTS results (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "studentId" UUID REFERENCES students(id) ON DELETE CASCADE, "examId" UUID REFERENCES exams(id) ON DELETE CASCADE, marks JSONB DEFAULT '{}'::jsonb, "aiRemark" TEXT, published BOOLEAN DEFAULT false);
CREATE TABLE IF NOT EXISTS annual_records ("studentId" UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE, "academicYear" TEXT, grades JSONB DEFAULT '{}'::jsonb, "sem1Grades" JSONB DEFAULT '{}'::jsonb, "sem2Grades" JSONB DEFAULT '{}'::jsonb, remarks TEXT, hobbies TEXT, "hobbiesSem1" TEXT, "hobbiesSem2" TEXT, improvements TEXT, "improvementsSem1" TEXT, "improvementsSem2" TEXT, "specialImprovementsSem1" TEXT, "specialImprovementsSem2" TEXT, "necessaryImprovementSem1" TEXT, "necessaryImprovementSem2" TEXT, "resultStatus" TEXT, "overallPercentage" TEXT, "customSubjects" TEXT[] DEFAULT '{}', "subjectOrder" TEXT[] DEFAULT '{}', medium TEXT, published BOOLEAN DEFAULT false);
CREATE TABLE IF NOT EXISTS homework (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE NOT NULL, "dueDate" DATE, "className" TEXT NOT NULL, medium TEXT NOT NULL, subject TEXT NOT NULL, title TEXT NOT NULL, description TEXT);
CREATE TABLE IF NOT EXISTS announcements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, "targetClass" TEXT);
CREATE TABLE IF NOT EXISTS fees (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "studentId" UUID REFERENCES students(id) ON DELETE CASCADE, amount NUMERIC(10, 2) NOT NULL, date DATE NOT NULL, remarks TEXT);
CREATE TABLE IF NOT EXISTS holidays (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE NOT NULL, "endDate" DATE, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS custom_field_defs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), label TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, "linkedStudentId" UUID REFERENCES students(id) ON DELETE SET NULL);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username_lookup ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_students_class ON students("className");
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- 3. CRITICAL: Disable RLS to allow cross-device sync without complex Auth
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE annual_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_defs DISABLE ROW LEVEL SECURITY;

-- 4. Ensure default admin exists
INSERT INTO users (username, password, name, role)
VALUES ('admin', 'admin123', 'Administrator', 'headmaster')
ON CONFLICT (username) DO NOTHING;

-- Refresh Supabase
NOTIFY pgrst, 'reload schema';
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setStatus({ msg: "Safe Repair SQL Copied!", type: 'success' });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm("CRITICAL WARNING: This will overwrite ALL data on this device and CLOUD with the backup file. Proceed?")) {
            await onImport(json);
            setStatus({ msg: "Database Restored & Synced Successfully!", type: 'success' });
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch (err: any) {
        setStatus({ msg: `Import failed: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handlePush = async () => {
    if (window.confirm("This will upload all data from THIS device to the Cloud. Existing cloud data may be overwritten. Continue?")) {
      try {
        await onPushToCloud();
        setStatus({ msg: "Local data pushed to Cloud successfully!", type: 'success' });
      } catch (err: any) {
        setStatus({ msg: `Push failed: ${err.message}`, type: 'error' });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-800">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-500 p-2 rounded-xl">
                    <Terminal size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">Full Cloud Database Repair</h3>
                    <p className="text-xs text-indigo-200 font-medium">Enable Global Login & All Modules Sync</p>
                </div>
            </div>
            <button 
                onClick={() => setShowSql(!showSql)}
                className="px-4 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-xs font-bold uppercase transition-all border border-indigo-400/30"
            >
                {showSql ? 'Hide Script' : 'Show Repair SQL'}
            </button>
        </div>

        {showSql && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200 mt-4">
                <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-3">
                    <p className="text-sm font-bold text-indigo-100 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-400" /> 
                        Global Login Setup
                    </p>
                    <p className="text-xs text-indigo-100 leading-relaxed">
                        To allow users to log in from <strong>any device</strong>, Supabase needs the full table structure and indices. This script ensures every staff member and student can access the system globally.
                    </p>
                </div>
                <div className="relative">
                    <pre className="bg-black/40 p-4 rounded-xl text-[10px] font-mono overflow-x-auto max-h-[300px] text-emerald-400 border border-white/5">
                        {sqlSchema}
                    </pre>
                    <button onClick={copySql} className="absolute top-2 right-2 p-2 bg-indigo-600 hover:bg-indigo-50 rounded-lg shadow-lg transition-all active:scale-90" title="Copy SQL"><Copy size={16} /></button>
                </div>
                <div className="flex gap-4">
                    <button onClick={testConnection} disabled={isTesting} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2">
                        {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Test Cloud Connection
                    </button>
                    <a href="https://supabase.com/dashboard/project/tubdjcdghosxozzehuep/sql/new" target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-indigo-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl">Open Supabase SQL Editor <ExternalLink size={14} /></a>
                </div>
            </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-100 p-3 rounded-2xl text-slate-600"><Database size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Backup</h2>
            <p className="text-sm text-slate-500 font-medium">Download local snapshots.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between group hover:border-indigo-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform"><DownloadCloud size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Local Backup</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">Download a JSON file containing all data currently on this device.</p>
            </div>
            <button onClick={onExport} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2"><FileJson size={18} /> Download Backup</button>
          </div>
          
          <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100 flex flex-col justify-between group hover:border-indigo-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform"><UploadCloud size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Push to Cloud</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">Upload all data from this device to the cloud database.</p>
            </div>
            <button 
              onClick={handlePush} 
              disabled={isSyncing}
              className="w-full py-4 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <UploadCloud size={18} />}
              Push to Cloud
            </button>
          </div>

          <div className="bg-rose-50/30 p-6 rounded-2xl border border-rose-100 flex flex-col justify-between group hover:border-rose-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white border border-rose-100 flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform"><ShieldAlert size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Restore All</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">Upload a backup file to overwrite all local and cloud data.</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isSyncing}
              className="w-full py-4 bg-white text-rose-600 border border-rose-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldAlert size={18} /> Import Backup
            </button>
          </div>
        </div>

        {status && (
          <div className={`mt-8 p-4 rounded-xl flex items-center gap-3 border animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <span className="text-sm font-bold">{status.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemManager;
