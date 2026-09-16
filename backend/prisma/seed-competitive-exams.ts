// Seeds the state-wide competitive exam catalog with HSC-group
// eligibility metadata. Idempotent — upserts by examName where
// schoolId is null (global catalog entries).
// Run: npx ts-node prisma/seed-competitive-exams.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PCM = ['Physics', 'Chemistry', 'Mathematics'];
const PCB = ['Physics', 'Chemistry', 'Biology'];
const PCB_GROUPS = ['2503', '2601', '2602', '2603', '2604', '2605', '2606', '2607', '2608', '2931'];

interface ExamSeed {
  examName: string;
  category: string;
  conductedBy: string;
  registrationDeadline: string;
  examDate: string;
  eligibility: string;
  website: string;
  examLevel: string;
  requiredSubjects: string[];
  applicableGroups: string[];
}

const EXAMS: ExamSeed[] = [
  {
    examName: 'JEE Main',
    category: 'Engineering',
    conductedBy: 'National Testing Agency (NTA)',
    registrationDeadline: 'November (Session 1) / February (Session 2)',
    examDate: 'January & April sessions',
    eligibility: '10+2 with Physics, Chemistry and Mathematics. Gateway to NITs, IIITs and JEE Advanced.',
    website: 'https://jeemain.nta.nic.in',
    examLevel: 'NATIONAL',
    requiredSubjects: PCM,
    applicableGroups: [],
  },
  {
    examName: 'JEE Advanced',
    category: 'Engineering',
    conductedBy: 'IITs (rotating)',
    registrationDeadline: 'April–May (after JEE Main result)',
    examDate: 'May–June',
    eligibility: 'Top ~2.5 lakh JEE Main qualifiers. 10+2 with Physics, Chemistry and Mathematics. Admission to IITs.',
    website: 'https://jeeadv.ac.in',
    examLevel: 'NATIONAL',
    requiredSubjects: PCM,
    applicableGroups: [],
  },
  {
    examName: 'BITSAT',
    category: 'Engineering',
    conductedBy: 'BITS Pilani',
    registrationDeadline: 'April',
    examDate: 'May–June sessions',
    eligibility: '10+2 with Physics, Chemistry and Mathematics (min. 75% aggregate in PCM). Admission to BITS Pilani/Goa/Hyderabad.',
    website: 'https://bitsadmission.com',
    examLevel: 'NATIONAL',
    requiredSubjects: PCM,
    applicableGroups: [],
  },
  {
    examName: 'NEET-UG',
    category: 'Medical',
    conductedBy: 'National Testing Agency (NTA)',
    registrationDeadline: 'February–March',
    examDate: 'May',
    eligibility: '10+2 with Physics, Chemistry and Biology/Botany+Zoology. Admission to MBBS/BDS/AYUSH and allied courses.',
    website: 'https://neet.nta.nic.in',
    examLevel: 'NATIONAL',
    requiredSubjects: PCB,
    applicableGroups: PCB_GROUPS,
  },
  {
    examName: 'TN Nursing & Paramedical CETs',
    category: 'Medical',
    conductedBy: 'DME Tamil Nadu / State selection committees',
    registrationDeadline: 'May–June',
    examDate: 'June–July (varies by course)',
    eligibility: '10+2 with Biology (or Botany+Zoology / Vocational Nursing). Admission to B.Sc. Nursing, Pharmacy and paramedical courses in Tamil Nadu.',
    website: 'https://tnmedicalselection.net',
    examLevel: 'STATE',
    requiredSubjects: ['Biology'],
    applicableGroups: PCB_GROUPS,
  },
  {
    examName: 'NDA',
    category: 'Defence',
    conductedBy: 'UPSC',
    registrationDeadline: 'January (NDA I) / June (NDA II)',
    examDate: 'April & September',
    eligibility: '10+2 any stream for Army wing; Physics and Mathematics required for Air Force and Navy wings. Age 16.5–19.5 years, unmarried.',
    website: 'https://upsc.gov.in',
    examLevel: 'NATIONAL',
    requiredSubjects: [],
    applicableGroups: [],
  },
  {
    examName: 'SSC CHSL',
    category: 'Government Jobs',
    conductedBy: 'Staff Selection Commission',
    registrationDeadline: 'Notification-based (usually April–May)',
    examDate: 'June–August',
    eligibility: '10+2 pass in any stream. Recruitment for LDC, JSA, DEO and postal assistant posts.',
    website: 'https://ssc.gov.in',
    examLevel: 'NATIONAL',
    requiredSubjects: [],
    applicableGroups: [],
  },
  {
    examName: 'NIFT Entrance',
    category: 'Design',
    conductedBy: 'National Institute of Fashion Technology',
    registrationDeadline: 'December–January',
    examDate: 'February',
    eligibility: '10+2 any stream. Admission to B.Des and B.FTech programmes at NIFT campuses.',
    website: 'https://nift.ac.in',
    examLevel: 'NATIONAL',
    requiredSubjects: [],
    applicableGroups: [],
  },
  {
    examName: 'IPMAT',
    category: 'Management',
    conductedBy: 'IIM Indore / IIM Rohtak',
    registrationDeadline: 'March–April',
    examDate: 'May–June',
    eligibility: '10+2 any stream. Five-year Integrated Programme in Management at IIMs. Commerce/Maths background is an advantage.',
    website: 'https://iimidr.ac.in',
    examLevel: 'NATIONAL',
    requiredSubjects: [],
    applicableGroups: [],
  },
  {
    examName: 'CLAT',
    category: 'Law',
    conductedBy: 'Consortium of National Law Universities',
    registrationDeadline: 'October–November',
    examDate: 'December',
    eligibility: '10+2 any stream (min. 45%). Admission to 5-year integrated law programmes at NLUs. Strong fit for Arts and Commerce students.',
    website: 'https://consortiumofnlus.ac.in',
    examLevel: 'NATIONAL',
    requiredSubjects: [],
    applicableGroups: [],
  },
  {
    examName: 'AILET',
    category: 'Law',
    conductedBy: 'National Law University, Delhi',
    registrationDeadline: 'November',
    examDate: 'December',
    eligibility: '10+2 any stream (min. 45%). Admission to NLU Delhi 5-year B.A. LL.B. Strong fit for Arts and Commerce students.',
    website: 'https://nationallawuniversitydelhi.in',
    examLevel: 'NATIONAL',
    requiredSubjects: [],
    applicableGroups: [],
  },
];

async function main() {
  for (const exam of EXAMS) {
    const existing = await prisma.competitiveExam.findFirst({
      where: { examName: exam.examName, schoolId: null },
    });
    if (existing) {
      await prisma.competitiveExam.update({
        where: { id: existing.id },
        data: {
          category: exam.category,
          conductedBy: exam.conductedBy,
          registrationDeadline: exam.registrationDeadline,
          examDate: exam.examDate,
          eligibility: exam.eligibility,
          website: exam.website,
          examLevel: exam.examLevel,
          requiredSubjects: exam.requiredSubjects,
          applicableGroups: exam.applicableGroups,
        },
      });
      console.log(`updated  ${exam.examName}`);
    } else {
      await prisma.competitiveExam.create({ data: { ...exam, status: 'Upcoming' } });
      console.log(`created  ${exam.examName}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
