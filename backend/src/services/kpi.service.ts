import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

// ─── Academic year helpers ────────────────────────────────────────
// The DB contains both "2026-27" and "2026-2027" formats; everything
// below normalizes to the short "2026-27" form and queries with both.

export function normalizeYear(y: string | null | undefined): string | null {
  if (!y) return null;
  const m = /^(\d{4})\s*-\s*(\d{2}|\d{4})$/.exec(String(y).trim());
  if (!m) return null;
  return `${m[1]}-${m[2].slice(-2)}`;
}

/** All stored spellings of an academic year: ["2026-27", "2026-2027"] */
export function yearVariants(year: string): string[] {
  const norm = normalizeYear(year);
  if (!norm) return [year];
  const start = parseInt(norm.slice(0, 4), 10);
  return [norm, `${start}-${start + 1}`];
}

// TN academic year runs June → May. "2024-25" → [2024-06-01, 2025-05-31]
export function yearToDateRange(academicYear: string): [Date, Date] | null {
  const norm = normalizeYear(academicYear);
  if (!norm) return null;
  const startYear = parseInt(norm.slice(0, 4), 10);
  return [new Date(Date.UTC(startYear, 5, 1)), new Date(Date.UTC(startYear + 1, 4, 31, 23, 59, 59))];
}

export function currentAcademicYear(now = new Date()): string {
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export interface KpiResult {
  academicYear: string;
  source: 'live' | 'snapshot';
  enrollment: {
    total: number;
    byClass: Record<string, number>;
    byGender: Record<string, number>;
  };
  attendancePct: number | null;
  marks: { averagePct: number | null; passPct: number | null };
  promotions: { promoted: number; detained: number; graduated: number; transferred: number; pendingBatches: number };
  dropouts: { transferred: number };
  teachers: { total: number };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// ─── Core KPI computation ─────────────────────────────────────────
// Live mode reads Student/Attendance/Mark; snapshot mode reads
// StudentAcademicHistory (written by promotion approval).
export async function computeKpis(
  schoolIds: string[],
  academicYear: string,
  filter?: { class?: string; section?: string }
): Promise<KpiResult> {
  const empty: KpiResult = {
    academicYear,
    source: 'live',
    enrollment: { total: 0, byClass: {}, byGender: {} },
    attendancePct: null,
    marks: { averagePct: null, passPct: null },
    promotions: { promoted: 0, detained: 0, graduated: 0, transferred: 0, pendingBatches: 0 },
    dropouts: { transferred: 0 },
    teachers: { total: 0 },
  };
  if (schoolIds.length === 0) return empty;

  const classFilter = filter?.class
    ? Prisma.sql` AND s.class = ${filter.class}`
    : Prisma.empty;
  const sectionFilter = filter?.section
    ? Prisma.sql` AND s.section = ${filter.section}`
    : Prisma.empty;

  const variants = yearVariants(academicYear);

  // Is the requested year the latest one present on live rows?
  const latestRow = await prisma.$queryRaw<{ latest: string | null }[]>`
    SELECT MAX(s."academicYear") AS latest FROM "Student" s
    WHERE s."schoolId" = ANY(${schoolIds})
      AND (s."studentStatus" = 'Active' OR s."studentStatus" IS NULL)`;
  const latestLiveYear = normalizeYear(latestRow[0]?.latest);
  const normYear = normalizeYear(academicYear) || academicYear;
  // Live mode only for the newest year present on live rows; older years
  // are served from the promotion archive when snapshots exist.
  let isLiveYear: boolean;
  if (latestLiveYear) {
    isLiveYear = normYear >= latestLiveYear;
  } else {
    const histCount = await prisma.studentAcademicHistory.count({
      where: { schoolId: { in: schoolIds }, academicYear: { in: variants } },
    });
    isLiveYear = histCount === 0;
  }

  const result: KpiResult = { ...empty, source: isLiveYear ? 'live' : 'snapshot' };

  if (isLiveYear) {
    // Treat NULL academicYear as belonging to the live year (legacy rows)
    const enrollment = await prisma.$queryRaw<{ class: string; gender: string | null; count: bigint }[]>`
      SELECT s.class, s.gender, COUNT(*)::bigint AS count FROM "Student" s
      WHERE s."schoolId" = ANY(${schoolIds})
        AND (s."studentStatus" = 'Active' OR s."studentStatus" IS NULL)
        AND (s."academicYear" = ANY(${variants}) OR s."academicYear" IS NULL)
        ${classFilter}${sectionFilter}
      GROUP BY s.class, s.gender`;
    for (const row of enrollment) {
      const n = Number(row.count);
      result.enrollment.total += n;
      result.enrollment.byClass[row.class] = (result.enrollment.byClass[row.class] || 0) + n;
      const g = row.gender || 'Unknown';
      result.enrollment.byGender[g] = (result.enrollment.byGender[g] || 0) + n;
    }

    const range = yearToDateRange(academicYear);
    if (range) {
      const att = await prisma.$queryRaw<{ present: bigint; total: bigint }[]>`
        SELECT
          COUNT(*) FILTER (WHERE a.status IN ('PRESENT','LATE'))::bigint AS present,
          COUNT(*)::bigint AS total
        FROM "Attendance" a
        JOIN "Student" s ON s.id = a."studentId"
        WHERE s."schoolId" = ANY(${schoolIds})
          AND a.date >= ${range[0]} AND a.date <= ${range[1]}
          ${classFilter}${sectionFilter}`;
      const total = Number(att[0]?.total || 0);
      if (total > 0) result.attendancePct = round1((Number(att[0].present) / total) * 100);
    }

    const marks = await prisma.$queryRaw<{ avg_pct: number | null; pass: bigint; total: bigint }[]>`
      SELECT
        AVG(m.scored::float / NULLIF(m."maxMarks", 0)) * 100 AS avg_pct,
        COUNT(*) FILTER (WHERE m.scored::float / NULLIF(m."maxMarks", 0) >= 0.35)::bigint AS pass,
        COUNT(*)::bigint AS total
      FROM "Mark" m
      JOIN "Student" s ON s.id = m."studentId"
      WHERE s."schoolId" = ANY(${schoolIds})
        AND m."academicYear" = ANY(${variants})
        ${classFilter}${sectionFilter}`;
    const mTotal = Number(marks[0]?.total || 0);
    if (mTotal > 0) {
      result.marks.averagePct = marks[0].avg_pct !== null ? round1(Number(marks[0].avg_pct)) : null;
      result.marks.passPct = round1((Number(marks[0].pass) / mTotal) * 100);
    }
  } else {
    const snap = await prisma.$queryRaw<{
      class: string; gender: string | null; count: bigint;
      avg_att: number | null; avg_marks: number | null; passed: bigint; with_marks: bigint;
    }[]>`
      SELECT
        h.class, s.gender, COUNT(*)::bigint AS count,
        AVG(h."attendancePct") AS avg_att,
        AVG(h."averageMarksPct") AS avg_marks,
        COUNT(*) FILTER (WHERE h."averageMarksPct" >= 35)::bigint AS passed,
        COUNT(*) FILTER (WHERE h."averageMarksPct" IS NOT NULL)::bigint AS with_marks
      FROM "StudentAcademicHistory" h
      JOIN "Student" s ON s.id = h."studentId"
      WHERE h."schoolId" = ANY(${schoolIds})
        AND h."academicYear" = ANY(${variants})
        ${filter?.class ? Prisma.sql` AND h.class = ${filter.class}` : Prisma.empty}
        ${filter?.section ? Prisma.sql` AND h.section = ${filter.section}` : Prisma.empty}
      GROUP BY h.class, s.gender`;

    let attSum = 0, attN = 0, marksSum = 0, marksN = 0, passed = 0, withMarks = 0;
    for (const row of snap) {
      const n = Number(row.count);
      result.enrollment.total += n;
      result.enrollment.byClass[row.class] = (result.enrollment.byClass[row.class] || 0) + n;
      const g = row.gender || 'Unknown';
      result.enrollment.byGender[g] = (result.enrollment.byGender[g] || 0) + n;
      if (row.avg_att !== null) { attSum += Number(row.avg_att) * n; attN += n; }
      if (row.avg_marks !== null) { marksSum += Number(row.avg_marks) * n; marksN += n; }
      passed += Number(row.passed);
      withMarks += Number(row.with_marks);
    }

    // Schools that haven't run their promotion yet still have live rows on
    // this (older) year — merge them so mixed-period views stay complete.
    // No double counting: a promoted student's live row carries the new year.
    const liveOld = await prisma.$queryRaw<{ class: string; gender: string | null; count: bigint }[]>`
      SELECT s.class, s.gender, COUNT(*)::bigint AS count FROM "Student" s
      WHERE s."schoolId" = ANY(${schoolIds})
        AND (s."studentStatus" = 'Active' OR s."studentStatus" IS NULL)
        AND s."academicYear" = ANY(${variants})
        ${classFilter}${sectionFilter}
      GROUP BY s.class, s.gender`;
    let liveCount = 0;
    for (const row of liveOld) {
      const n = Number(row.count);
      liveCount += n;
      result.enrollment.total += n;
      result.enrollment.byClass[row.class] = (result.enrollment.byClass[row.class] || 0) + n;
      const g = row.gender || 'Unknown';
      result.enrollment.byGender[g] = (result.enrollment.byGender[g] || 0) + n;
    }
    if (liveCount > 0) {
      const range = yearToDateRange(academicYear);
      if (range) {
        const att = await prisma.$queryRaw<{ present: bigint; total: bigint }[]>`
          SELECT
            COUNT(*) FILTER (WHERE a.status IN ('PRESENT','LATE'))::bigint AS present,
            COUNT(*)::bigint AS total
          FROM "Attendance" a
          JOIN "Student" s ON s.id = a."studentId"
          WHERE s."schoolId" = ANY(${schoolIds})
            AND s."academicYear" = ANY(${variants})
            AND a.date >= ${range[0]} AND a.date <= ${range[1]}
            ${classFilter}${sectionFilter}`;
        const total = Number(att[0]?.total || 0);
        if (total > 0) {
          attSum += (Number(att[0].present) / total) * 100 * liveCount;
          attN += liveCount;
        }
      }
      const marks = await prisma.$queryRaw<{ avg_pct: number | null; pass: bigint; total: bigint }[]>`
        SELECT
          AVG(m.scored::float / NULLIF(m."maxMarks", 0)) * 100 AS avg_pct,
          COUNT(*) FILTER (WHERE m.scored::float / NULLIF(m."maxMarks", 0) >= 0.35)::bigint AS pass,
          COUNT(*)::bigint AS total
        FROM "Mark" m
        JOIN "Student" s ON s.id = m."studentId"
        WHERE s."schoolId" = ANY(${schoolIds})
          AND s."academicYear" = ANY(${variants})
          AND m."academicYear" = ANY(${variants})
          ${classFilter}${sectionFilter}`;
      const mTotal = Number(marks[0]?.total || 0);
      if (mTotal > 0 && marks[0].avg_pct !== null) {
        marksSum += Number(marks[0].avg_pct) * liveCount;
        marksN += liveCount;
        passed += (Number(marks[0].pass) / mTotal) * liveCount;
        withMarks += liveCount;
      }
    }

    if (attN > 0) result.attendancePct = round1(attSum / attN);
    if (marksN > 0) result.marks.averagePct = round1(marksSum / marksN);
    if (withMarks > 0) result.marks.passPct = round1((passed / withMarks) * 100);
  }

  // Promotion outcomes for this year (from approved batches)
  const promo = await prisma.$queryRaw<{ result: string; count: bigint }[]>`
    SELECT r.result::text AS result, COUNT(*)::bigint AS count
    FROM "PromotionRecord" r
    JOIN "PromotionBatch" b ON b.id = r."batchId"
    WHERE b."schoolId" = ANY(${schoolIds})
      AND b."fromAcademicYear" = ANY(${variants})
      AND b.status = 'APPROVED'
      ${filter?.class ? Prisma.sql` AND b."fromClass" = ${filter.class}` : Prisma.empty}
    GROUP BY r.result`;
  for (const row of promo) {
    const n = Number(row.count);
    if (row.result === 'PROMOTED') result.promotions.promoted = n;
    if (row.result === 'DETAINED') result.promotions.detained = n;
    if (row.result === 'GRADUATED') result.promotions.graduated = n;
    if (row.result === 'TRANSFERRED') { result.promotions.transferred = n; result.dropouts.transferred = n; }
  }
  result.promotions.pendingBatches = await prisma.promotionBatch.count({
    where: { schoolId: { in: schoolIds }, fromAcademicYear: { in: variants }, status: 'PENDING_BEO_APPROVAL' },
  });

  result.teachers.total = await prisma.teacher.count({ where: { schoolId: { in: schoolIds } } });

  return result;
}

// ─── Per-school breakdown (for BEO/DEO/state tables) ─────────────
export interface SchoolKpiRow {
  schoolId: string;
  name: string;
  dise: string;
  block: string;
  district: string;
  students: number;
  teachers: number;
  attendancePct: number | null;
}

export async function perSchoolBreakdown(schoolIds: string[], academicYear: string): Promise<SchoolKpiRow[]> {
  if (schoolIds.length === 0) return [];
  const schools = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { id: true, name: true, dise: true, block: true, district: true, _count: { select: { teachers: true } } },
    orderBy: { name: 'asc' },
  });

  const studentCounts = await prisma.$queryRaw<{ schoolId: string; count: bigint }[]>`
    SELECT s."schoolId", COUNT(*)::bigint AS count FROM "Student" s
    WHERE s."schoolId" = ANY(${schoolIds})
      AND (s."studentStatus" = 'Active' OR s."studentStatus" IS NULL)
    GROUP BY s."schoolId"`;
  const countMap = new Map(studentCounts.map((r) => [r.schoolId, Number(r.count)]));

  const attMap = new Map<string, number>();
  const range = yearToDateRange(academicYear);
  if (range) {
    const att = await prisma.$queryRaw<{ schoolId: string; present: bigint; total: bigint }[]>`
      SELECT a."schoolId",
        COUNT(*) FILTER (WHERE a.status IN ('PRESENT','LATE'))::bigint AS present,
        COUNT(*)::bigint AS total
      FROM "Attendance" a
      WHERE a."schoolId" = ANY(${schoolIds})
        AND a.date >= ${range[0]} AND a.date <= ${range[1]}
      GROUP BY a."schoolId"`;
    for (const r of att) {
      if (Number(r.total) > 0) attMap.set(r.schoolId, round1((Number(r.present) / Number(r.total)) * 100));
    }
  }

  return schools.map((s) => ({
    schoolId: s.id,
    name: s.name,
    dise: s.dise,
    block: s.block,
    district: s.district,
    students: countMap.get(s.id) || 0,
    teachers: s._count.teachers,
    attendancePct: attMap.get(s.id) ?? null,
  }));
}

// ─── Distinct academic years for selectors ────────────────────────
export async function listAcademicYears(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ year: string }[]>`
    SELECT DISTINCT year FROM (
      SELECT "academicYear" AS year FROM "Student" WHERE "academicYear" IS NOT NULL
      UNION
      SELECT "academicYear" AS year FROM "StudentAcademicHistory"
      UNION
      SELECT "academicYear" AS year FROM "Mark" WHERE "academicYear" IS NOT NULL
    ) years`;
  // Normalize "2026-2027" / "2026-27" spellings into one canonical set
  const set = new Set<string>();
  for (const r of rows) {
    const norm = normalizeYear(r.year);
    if (norm) set.add(norm);
  }
  set.add(currentAcademicYear());
  return Array.from(set).sort().reverse();
}
