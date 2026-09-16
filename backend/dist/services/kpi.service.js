"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeYear = normalizeYear;
exports.yearVariants = yearVariants;
exports.yearToDateRange = yearToDateRange;
exports.currentAcademicYear = currentAcademicYear;
exports.computeKpis = computeKpis;
exports.perSchoolBreakdown = perSchoolBreakdown;
exports.listAcademicYears = listAcademicYears;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
// ─── Academic year helpers ────────────────────────────────────────
// The DB contains both "2026-27" and "2026-2027" formats; everything
// below normalizes to the short "2026-27" form and queries with both.
function normalizeYear(y) {
    if (!y)
        return null;
    const m = /^(\d{4})\s*-\s*(\d{2}|\d{4})$/.exec(String(y).trim());
    if (!m)
        return null;
    return `${m[1]}-${m[2].slice(-2)}`;
}
/** All stored spellings of an academic year: ["2026-27", "2026-2027"] */
function yearVariants(year) {
    const norm = normalizeYear(year);
    if (!norm)
        return [year];
    const start = parseInt(norm.slice(0, 4), 10);
    return [norm, `${start}-${start + 1}`];
}
// TN academic year runs June → May. "2024-25" → [2024-06-01, 2025-05-31]
function yearToDateRange(academicYear) {
    const norm = normalizeYear(academicYear);
    if (!norm)
        return null;
    const startYear = parseInt(norm.slice(0, 4), 10);
    return [new Date(Date.UTC(startYear, 5, 1)), new Date(Date.UTC(startYear + 1, 4, 31, 23, 59, 59))];
}
function currentAcademicYear(now = new Date()) {
    const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}
const round1 = (n) => Math.round(n * 10) / 10;
// ─── Core KPI computation ─────────────────────────────────────────
// Live mode reads Student/Attendance/Mark; snapshot mode reads
// StudentAcademicHistory (written by promotion approval).
function computeKpis(schoolIds, academicYear, filter) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const empty = {
            academicYear,
            source: 'live',
            enrollment: { total: 0, byClass: {}, byGender: {} },
            attendancePct: null,
            marks: { averagePct: null, passPct: null },
            promotions: { promoted: 0, detained: 0, graduated: 0, transferred: 0, pendingBatches: 0 },
            dropouts: { transferred: 0 },
            teachers: { total: 0 },
        };
        if (schoolIds.length === 0)
            return empty;
        const classFilter = (filter === null || filter === void 0 ? void 0 : filter.class)
            ? client_1.Prisma.sql ` AND s.class = ${filter.class}`
            : client_1.Prisma.empty;
        const sectionFilter = (filter === null || filter === void 0 ? void 0 : filter.section)
            ? client_1.Prisma.sql ` AND s.section = ${filter.section}`
            : client_1.Prisma.empty;
        const variants = yearVariants(academicYear);
        // Is the requested year the latest one present on live rows?
        const latestRow = yield prisma_1.prisma.$queryRaw `
    SELECT MAX(s."academicYear") AS latest FROM "Student" s
    WHERE s."schoolId" = ANY(${schoolIds})
      AND (s."studentStatus" = 'Active' OR s."studentStatus" IS NULL)`;
        const latestLiveYear = normalizeYear((_a = latestRow[0]) === null || _a === void 0 ? void 0 : _a.latest);
        const normYear = normalizeYear(academicYear) || academicYear;
        // Live mode only for the newest year present on live rows; older years
        // are served from the promotion archive when snapshots exist.
        let isLiveYear;
        if (latestLiveYear) {
            isLiveYear = normYear >= latestLiveYear;
        }
        else {
            const histCount = yield prisma_1.prisma.studentAcademicHistory.count({
                where: { schoolId: { in: schoolIds }, academicYear: { in: variants } },
            });
            isLiveYear = histCount === 0;
        }
        const result = Object.assign(Object.assign({}, empty), { source: isLiveYear ? 'live' : 'snapshot' });
        if (isLiveYear) {
            // Treat NULL academicYear as belonging to the live year (legacy rows)
            const enrollment = yield prisma_1.prisma.$queryRaw `
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
                const att = yield prisma_1.prisma.$queryRaw `
        SELECT
          COUNT(*) FILTER (WHERE a.status IN ('PRESENT','LATE'))::bigint AS present,
          COUNT(*)::bigint AS total
        FROM "Attendance" a
        JOIN "Student" s ON s.id = a."studentId"
        WHERE s."schoolId" = ANY(${schoolIds})
          AND a.date >= ${range[0]} AND a.date <= ${range[1]}
          ${classFilter}${sectionFilter}`;
                const total = Number(((_b = att[0]) === null || _b === void 0 ? void 0 : _b.total) || 0);
                if (total > 0)
                    result.attendancePct = round1((Number(att[0].present) / total) * 100);
            }
            const marks = yield prisma_1.prisma.$queryRaw `
      SELECT
        AVG(m.scored::float / NULLIF(m."maxMarks", 0)) * 100 AS avg_pct,
        COUNT(*) FILTER (WHERE m.scored::float / NULLIF(m."maxMarks", 0) >= 0.35)::bigint AS pass,
        COUNT(*)::bigint AS total
      FROM "Mark" m
      JOIN "Student" s ON s.id = m."studentId"
      WHERE s."schoolId" = ANY(${schoolIds})
        AND m."academicYear" = ANY(${variants})
        ${classFilter}${sectionFilter}`;
            const mTotal = Number(((_c = marks[0]) === null || _c === void 0 ? void 0 : _c.total) || 0);
            if (mTotal > 0) {
                result.marks.averagePct = marks[0].avg_pct !== null ? round1(Number(marks[0].avg_pct)) : null;
                result.marks.passPct = round1((Number(marks[0].pass) / mTotal) * 100);
            }
        }
        else {
            const snap = yield prisma_1.prisma.$queryRaw `
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
        ${(filter === null || filter === void 0 ? void 0 : filter.class) ? client_1.Prisma.sql ` AND h.class = ${filter.class}` : client_1.Prisma.empty}
        ${(filter === null || filter === void 0 ? void 0 : filter.section) ? client_1.Prisma.sql ` AND h.section = ${filter.section}` : client_1.Prisma.empty}
      GROUP BY h.class, s.gender`;
            let attSum = 0, attN = 0, marksSum = 0, marksN = 0, passed = 0, withMarks = 0;
            for (const row of snap) {
                const n = Number(row.count);
                result.enrollment.total += n;
                result.enrollment.byClass[row.class] = (result.enrollment.byClass[row.class] || 0) + n;
                const g = row.gender || 'Unknown';
                result.enrollment.byGender[g] = (result.enrollment.byGender[g] || 0) + n;
                if (row.avg_att !== null) {
                    attSum += Number(row.avg_att) * n;
                    attN += n;
                }
                if (row.avg_marks !== null) {
                    marksSum += Number(row.avg_marks) * n;
                    marksN += n;
                }
                passed += Number(row.passed);
                withMarks += Number(row.with_marks);
            }
            // Schools that haven't run their promotion yet still have live rows on
            // this (older) year — merge them so mixed-period views stay complete.
            // No double counting: a promoted student's live row carries the new year.
            const liveOld = yield prisma_1.prisma.$queryRaw `
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
                    const att = yield prisma_1.prisma.$queryRaw `
          SELECT
            COUNT(*) FILTER (WHERE a.status IN ('PRESENT','LATE'))::bigint AS present,
            COUNT(*)::bigint AS total
          FROM "Attendance" a
          JOIN "Student" s ON s.id = a."studentId"
          WHERE s."schoolId" = ANY(${schoolIds})
            AND s."academicYear" = ANY(${variants})
            AND a.date >= ${range[0]} AND a.date <= ${range[1]}
            ${classFilter}${sectionFilter}`;
                    const total = Number(((_d = att[0]) === null || _d === void 0 ? void 0 : _d.total) || 0);
                    if (total > 0) {
                        attSum += (Number(att[0].present) / total) * 100 * liveCount;
                        attN += liveCount;
                    }
                }
                const marks = yield prisma_1.prisma.$queryRaw `
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
                const mTotal = Number(((_e = marks[0]) === null || _e === void 0 ? void 0 : _e.total) || 0);
                if (mTotal > 0 && marks[0].avg_pct !== null) {
                    marksSum += Number(marks[0].avg_pct) * liveCount;
                    marksN += liveCount;
                    passed += (Number(marks[0].pass) / mTotal) * liveCount;
                    withMarks += liveCount;
                }
            }
            if (attN > 0)
                result.attendancePct = round1(attSum / attN);
            if (marksN > 0)
                result.marks.averagePct = round1(marksSum / marksN);
            if (withMarks > 0)
                result.marks.passPct = round1((passed / withMarks) * 100);
        }
        // Promotion outcomes for this year (from approved batches)
        const promo = yield prisma_1.prisma.$queryRaw `
    SELECT r.result::text AS result, COUNT(*)::bigint AS count
    FROM "PromotionRecord" r
    JOIN "PromotionBatch" b ON b.id = r."batchId"
    WHERE b."schoolId" = ANY(${schoolIds})
      AND b."fromAcademicYear" = ANY(${variants})
      AND b.status = 'APPROVED'
      ${(filter === null || filter === void 0 ? void 0 : filter.class) ? client_1.Prisma.sql ` AND b."fromClass" = ${filter.class}` : client_1.Prisma.empty}
    GROUP BY r.result`;
        for (const row of promo) {
            const n = Number(row.count);
            if (row.result === 'PROMOTED')
                result.promotions.promoted = n;
            if (row.result === 'DETAINED')
                result.promotions.detained = n;
            if (row.result === 'GRADUATED')
                result.promotions.graduated = n;
            if (row.result === 'TRANSFERRED') {
                result.promotions.transferred = n;
                result.dropouts.transferred = n;
            }
        }
        result.promotions.pendingBatches = yield prisma_1.prisma.promotionBatch.count({
            where: { schoolId: { in: schoolIds }, fromAcademicYear: { in: variants }, status: 'PENDING_BEO_APPROVAL' },
        });
        result.teachers.total = yield prisma_1.prisma.teacher.count({ where: { schoolId: { in: schoolIds } } });
        return result;
    });
}
function perSchoolBreakdown(schoolIds, academicYear) {
    return __awaiter(this, void 0, void 0, function* () {
        if (schoolIds.length === 0)
            return [];
        const schools = yield prisma_1.prisma.school.findMany({
            where: { id: { in: schoolIds } },
            select: { id: true, name: true, dise: true, block: true, district: true, _count: { select: { teachers: true } } },
            orderBy: { name: 'asc' },
        });
        const studentCounts = yield prisma_1.prisma.$queryRaw `
    SELECT s."schoolId", COUNT(*)::bigint AS count FROM "Student" s
    WHERE s."schoolId" = ANY(${schoolIds})
      AND (s."studentStatus" = 'Active' OR s."studentStatus" IS NULL)
    GROUP BY s."schoolId"`;
        const countMap = new Map(studentCounts.map((r) => [r.schoolId, Number(r.count)]));
        const attMap = new Map();
        const range = yearToDateRange(academicYear);
        if (range) {
            const att = yield prisma_1.prisma.$queryRaw `
      SELECT a."schoolId",
        COUNT(*) FILTER (WHERE a.status IN ('PRESENT','LATE'))::bigint AS present,
        COUNT(*)::bigint AS total
      FROM "Attendance" a
      WHERE a."schoolId" = ANY(${schoolIds})
        AND a.date >= ${range[0]} AND a.date <= ${range[1]}
      GROUP BY a."schoolId"`;
            for (const r of att) {
                if (Number(r.total) > 0)
                    attMap.set(r.schoolId, round1((Number(r.present) / Number(r.total)) * 100));
            }
        }
        return schools.map((s) => {
            var _a;
            return ({
                schoolId: s.id,
                name: s.name,
                dise: s.dise,
                block: s.block,
                district: s.district,
                students: countMap.get(s.id) || 0,
                teachers: s._count.teachers,
                attendancePct: (_a = attMap.get(s.id)) !== null && _a !== void 0 ? _a : null,
            });
        });
    });
}
// ─── Distinct academic years for selectors ────────────────────────
function listAcademicYears() {
    return __awaiter(this, void 0, void 0, function* () {
        const rows = yield prisma_1.prisma.$queryRaw `
    SELECT DISTINCT year FROM (
      SELECT "academicYear" AS year FROM "Student" WHERE "academicYear" IS NOT NULL
      UNION
      SELECT "academicYear" AS year FROM "StudentAcademicHistory"
      UNION
      SELECT "academicYear" AS year FROM "Mark" WHERE "academicYear" IS NOT NULL
    ) years`;
        // Normalize "2026-2027" / "2026-27" spellings into one canonical set
        const set = new Set();
        for (const r of rows) {
            const norm = normalizeYear(r.year);
            if (norm)
                set.add(norm);
        }
        set.add(currentAcademicYear());
        return Array.from(set).sort().reverse();
    });
}
