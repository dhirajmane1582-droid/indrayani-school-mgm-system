
export interface CustomFieldDefinition {
  id: string;
  label: string;
}

export interface Holiday {
  id: string;
  date: string;
  endDate?: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  className: string;
  medium?: 'English' | 'Semi';
  dob: string;
  placeOfBirth?: string;
  address: string;
  phone: string;
  alternatePhone?: string;
  aadharNo?: string;
  apaarId?: string;
  penNo?: string;
  caste?: string;
  religion?: string;
  mothersName?: string;
  customFields?: Record<string, string>;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  studentId: string;
  present: boolean;
}

export interface Subject {
  id: string;
  name: string;
  maxMarks: number;
  isCustom?: boolean;
  evaluationType?: 'marks' | 'grade';
}

export interface TimetableEntry {
  id: string;
  date: string;
  subject: string;
}

export interface Exam {
  id: string;
  title: string;
  type: '1st Unit Test' | '1st Semester' | '2nd Unit Test' | '2nd Semester' | 'Annual' | 'Class Test' | 'Other';
  date: string;
  className: string;
  published?: boolean; 
  customMaxMarks?: { [subjectId: string]: number };
  customEvaluationTypes?: { [subjectId: string]: 'marks' | 'grade' };
  activeSubjectIds?: string[];
  customSubjects?: Subject[];
  timetable?: TimetableEntry[];
}

export interface StudentResult {
  id: string;
  studentId: string;
  examId: string;
  marks: { [subjectId: string]: number | string };
  aiRemark?: string;
  published?: boolean;
}

export interface AnnualRecord {
  studentId: string;
  academicYear: string;
  grades: { [subjectName: string]: string };
  sem1Grades?: { [subjectName: string]: string };
  sem2Grades?: { [subjectName: string]: string };
  remarks: string;
  hobbies: string;
  hobbiesSem1?: string;
  hobbiesSem2?: string;
  improvements: string;
  improvementsSem1?: string;
  improvementsSem2?: string;
  specialImprovementsSem1?: string;
  specialImprovementsSem2?: string;
  necessaryImprovementSem1?: string;
  necessaryImprovementSem2?: string;
  resultStatus?: 'PASS' | 'FAIL' | '';
  overallPercentage?: string;
  customSubjects: string[];
  subjectOrder?: string[];
  medium?: 'English' | 'Semi';
  published?: boolean;
}

export interface Homework {
  id: string;
  date: string;
  dueDate: string;
  className: string;
  medium: 'English' | 'Semi';
  subject: string;
  title: string;
  description: string;
}

export interface Announcement {
  id: string;
  date: string;
  title: string;
  content: string;
  targetClass?: string;
}

export type TabView = 'home' | 'students' | 'attendance' | 'exams' | 'results' | 'annual' | 'fees' | 'users' | 'promotion' | 'homework' | 'notices' | 'system';

export type UserRole = 'teacher' | 'headmaster' | 'student';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  linkedStudentId?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  remarks?: string;
}

export interface ClassOption {
  value: string;
  label: string;
}

export const CLASSES: ClassOption[] = [
  { value: 'Nursery', label: 'Nursery' },
  { value: 'Jr. KG', label: 'Jr. KG' },
  { value: 'Sr. KG', label: 'Sr. KG' },
  { value: 'Class 1', label: 'Class 1' },
  { value: 'Class 2', label: 'Class 2' },
  { value: 'Class 3', label: 'Class 3' },
  { value: 'Class 4', label: 'Class 4' },
  { value: 'Class 5', label: 'Class 5' },
  { value: 'Class 6', label: 'Class 6' },
  { value: 'Class 7', label: 'Class 7' },
  { value: 'Class 8', label: 'Class 8' },
  { value: 'Class 9', label: 'Class 9' },
  { value: 'Class 10', label: 'Class 10' },
  { value: 'Alumni', label: 'Alumni' },
];

export const SIMPLIFIED_CLASSES: ClassOption[] = [
  { value: 'Nursery', label: 'Nursery' },
  { value: 'Jr. KG', label: 'Jr. KG' },
  { value: 'Sr. KG', label: 'Sr. KG' },
  ...Array.from({ length: 10 }, (_, i) => i + 1).map(i => ({
    value: `Class ${i}`, label: `Class ${i}`
  })),
  { value: 'Alumni', label: 'Alumni' },
];

export const SPECIFIC_CLASSES: ClassOption[] = [
  { value: 'Nursery|English', label: 'Nursery (English)' },
  { value: 'Nursery|Semi', label: 'Nursery (Semi)' },
  { value: 'Jr. KG|English', label: 'Jr. KG (English)' },
  { value: 'Jr. KG|Semi', label: 'Jr. KG (Semi)' },
  { value: 'Sr. KG|English', label: 'Sr. KG (English)' },
  { value: 'Sr. KG|Semi', label: 'Sr. KG (Semi)' },
  ...Array.from({ length: 10 }, (_, i) => i + 1).flatMap(i => [
    { value: `Class ${i}|English`, label: `Class ${i} (English)` },
    { value: `Class ${i}|Semi`, label: `Class ${i} (Semi)` },
  ]),
  { value: 'Alumni|English', label: 'Alumni' }
];

export const getSubjectsForClass = (className: string, medium: 'English' | 'Semi' = 'English'): Subject[] => {
  if (className === 'Alumni') return [];

  if (className === 'Nursery') {
    if (medium === 'English') {
      return [
        { id: 'eng', name: 'English', maxMarks: 50, evaluationType: 'marks' },
        { id: 'math', name: 'Maths', maxMarks: 50, evaluationType: 'marks' },
        { id: 'drw', name: 'Drawing', maxMarks: 50, evaluationType: 'grade' },
      ];
    } else {
      return [
        { id: 'mar', name: 'Marathi', maxMarks: 50, evaluationType: 'marks' },
        { id: 'eng', name: 'English', maxMarks: 50, evaluationType: 'marks' },
        { id: 'math', name: 'Maths', maxMarks: 50, evaluationType: 'marks' },
        { id: 'drw', name: 'Drawing', maxMarks: 50, evaluationType: 'grade' },
      ];
    }
  }

  if (className === 'Jr. KG') {
    if (medium === 'English') {
      return [
        { id: 'eng', name: 'English', maxMarks: 50, evaluationType: 'marks' },
        { id: 'math', name: 'Maths', maxMarks: 50, evaluationType: 'marks' },
        { id: 'evsgk', name: 'E.V.S / G.K.', maxMarks: 50, evaluationType: 'marks' },
        { id: 'drw', name: 'Drawing', maxMarks: 50, evaluationType: 'grade' },
      ];
    } else {
      return [
        { id: 'mar', name: 'Marathi', maxMarks: 50, evaluationType: 'marks' },
        { id: 'eng', name: 'English', maxMarks: 50, evaluationType: 'marks' },
        { id: 'math', name: 'Maths', maxMarks: 50, evaluationType: 'marks' },
        { id: 'drw', name: 'Drawing', maxMarks: 50, evaluationType: 'grade' },
      ];
    }
  }

  if (className === 'Sr. KG') {
    if (medium === 'English') {
      return [
        { id: 'eng', name: 'English', maxMarks: 50, evaluationType: 'marks' },
        { id: 'math', name: 'Maths', maxMarks: 50, evaluationType: 'marks' },
        { id: 'gkevs', name: 'G.K. / E.V.S.', maxMarks: 50, evaluationType: 'marks' },
        { id: 'drw', name: 'Drawing', maxMarks: 50, evaluationType: 'grade' },
      ];
    } else {
      return [
        { id: 'eng', name: 'English', maxMarks: 50, evaluationType: 'marks' },
        { id: 'math', name: 'Maths', maxMarks: 50, evaluationType: 'marks' },
        { id: 'mar', name: 'Marathi', maxMarks: 50, evaluationType: 'marks' },
        { id: 'drw', name: 'Drawing', maxMarks: 50, evaluationType: 'grade' },
      ];
    }
  }
  
  if (className.startsWith('Class ')) {
    const num = parseInt(className.replace('Class ', ''));
    
    if (num === 1 || num === 2) {
      const subjects: Subject[] = [
        { id: 'eng', name: 'English', maxMarks: 50, evaluationType: 'marks' },
        { id: 'mar', name: 'Marathi', maxMarks: 50, evaluationType: 'marks' },
        { id: 'math', name: 'Maths', maxMarks: 50, evaluationType: 'marks' },
        { id: 'evs', name: 'E.V.S', maxMarks: 50, evaluationType: 'marks' },
      ];
      if (medium === 'English') {
        subjects.push({ id: 'hin', name: 'Hindi', maxMarks: 50, evaluationType: 'marks' });
      }
      return subjects;
    }

    if (num === 3 || num === 4) {
      const subjects: Subject[] = [
        { id: 'mar', name: 'Marathi', maxMarks: 50, evaluationType: 'marks' },
        { id: 'eng', name: 'English', maxMarks: 50, evaluationType: 'marks' },
      ];
      if (medium === 'English') {
        subjects.push({ id: 'hin', name: 'Hindi', maxMarks: 50, evaluationType: 'marks' });
      }
      subjects.push({ id: 'math', name: 'Maths', maxMarks: 50, evaluationType: 'marks' });
      subjects.push({ id: 'evs1', name: 'E.V.S-1', maxMarks: 50, evaluationType: 'marks' });
      subjects.push({ id: 'evs2', name: 'E.V.S-2', maxMarks: 50, evaluationType: 'marks' });
      return subjects;
    }
    
    if (num >= 5 && num <= 8) {
      return [
        { id: 'eng', name: 'English', maxMarks: 100, evaluationType: 'marks' },
        { id: 'mar', name: 'Marathi', maxMarks: 100, evaluationType: 'marks' },
        { id: 'hin', name: 'Hindi', maxMarks: 100, evaluationType: 'marks' },
        { id: 'math', name: 'Maths', maxMarks: 100, evaluationType: 'marks' },
        { id: 'sci', name: 'Science', maxMarks: 100, evaluationType: 'marks' },
        { id: 'hist', name: 'History', maxMarks: 50, evaluationType: 'marks' },
        { id: 'geo', name: 'Geography', maxMarks: 50, evaluationType: 'marks' },
      ];
    }

    if (num === 9) {
      return [
        { id: 'eng', name: 'English', maxMarks: 100, evaluationType: 'marks' },
        { id: 'mar', name: 'Marathi', maxMarks: 100, evaluationType: 'marks' },
        { id: 'hin', name: 'Hindi', maxMarks: 100, evaluationType: 'marks' },
        { id: 'math', name: 'Mathematics', maxMarks: 100, evaluationType: 'marks' },
        { id: 'sci', name: 'Science', maxMarks: 100, evaluationType: 'marks' },
        { id: 'sst', name: 'Social Sciences', maxMarks: 100, evaluationType: 'marks' },
      ];
    }

    if (num === 10) {
      return [
        { id: 'eng', name: 'English', maxMarks: 100, evaluationType: 'marks' },
        { id: 'mar', name: 'Marathi', maxMarks: 100, evaluationType: 'marks' },
        { id: 'hin', name: 'Hindi', maxMarks: 100, evaluationType: 'marks' },
        { id: 'math1', name: 'Maths I', maxMarks: 40, evaluationType: 'marks' },
        { id: 'math2', name: 'Maths II', maxMarks: 40, evaluationType: 'marks' },
        { id: 'sci1', name: 'Science I', maxMarks: 40, evaluationType: 'marks' },
        { id: 'sci2', name: 'Science II', maxMarks: 40, evaluationType: 'marks' },
        { id: 'hist', name: 'History', maxMarks: 40, evaluationType: 'marks' },
        { id: 'geo', name: 'Geography', maxMarks: 40, evaluationType: 'marks' },
      ];
    }
  }
  
  return [
    { id: 'eng', name: 'English', maxMarks: 100, evaluationType: 'marks' },
    { id: 'math', name: 'Maths', maxMarks: 100, evaluationType: 'marks' },
  ];
};
