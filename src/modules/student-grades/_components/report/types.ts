export interface ReportAcademicStanding {
   text: string;
   color: string;
   bgColor: string;
}

export interface ReportCourse {
   id: string;
   courseCode: string;
   courseTitle: string;
   creditLoad: number;
   score: number;
   grade: string;
   gradePoint: number;
   qualityPoints: number;
   semesterName: string;
   academicYear: string;
   status: string;
}

export interface ReportStudentInfo {
   fullName: string;
   regNumber: string;
   program: string;
   level: string;
   department: string;
   email: string;
   avatarUrl: string | null;
}

export interface ReportGradeDistributionItem {
   grade: string;
   label: string;
   colorClass: string;
   textClass: string;
   count: number;
   percentage: number;
}

export interface ReportSummary {
   gpa: number;
   totalCredits: number;
   totalQualityPoints: number;
   degreeClass: string;
   academicStanding: ReportAcademicStanding;
   gradeDistribution: ReportGradeDistributionItem[];
}
