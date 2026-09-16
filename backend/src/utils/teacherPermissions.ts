export function isScienceSubject(subjectName?: string): boolean {
  if (!subjectName) return false;
  const normalized = String(subjectName).trim().toLowerCase();

  // Exclude Social Science / Social Studies (Humanities)
  if (normalized.includes("social science") || normalized.includes("social studies") || normalized.includes("social")) {
    return false;
  }

  const keywords = ["science", "physics", "chemistry", "biology", "zoology", "botany", "natural science", "physical science"];
  return keywords.some((keyword) => normalized.includes(keyword));
}

export function isMathsSubject(subjectName?: string): boolean {
  if (!subjectName) return false;
  const normalized = String(subjectName).trim().toLowerCase();
  const keywords = ["math", "maths", "mathematics", "algebra", "geometry", "trigonometry", "calculus", "statistics"];
  return keywords.some((keyword) => normalized.includes(keyword));
}

export function canAccessTeacherFeature(
  userOrStaff: { subject?: string; isClassTeacher?: boolean; role?: string; assignedClass?: string },
  feature: "SCIENCE_LABS" | "SPECIALIZED_SCIENCE_LABS" | "MATHS_FORMULAS" | "STUDENT_PROFILES" | "SCHOLARSHIPS" | "SPORTS" | "ATTENDANCE"
): boolean {
  const role = String(userOrStaff.role || "").toUpperCase();
  const subject = String(userOrStaff.subject || "");
  const isClassTeacher = !!userOrStaff.isClassTeacher;

  if (feature === "SCIENCE_LABS") {
    return isScienceSubject(subject);
  }
  if (feature === "SPECIALIZED_SCIENCE_LABS") {
    const isScience = isScienceSubject(subject);
    const cls = String(userOrStaff.assignedClass || "");
    const isHigherSecondary = cls.includes("11") || cls.includes("12");
    return isScience && isHigherSecondary;
  }
  if (feature === "MATHS_FORMULAS") {
    return isMathsSubject(subject);
  }
  if (feature === "STUDENT_PROFILES" || feature === "SCHOLARSHIPS" || feature === "ATTENDANCE") {
    return isClassTeacher;
  }
  if (feature === "SPORTS") {
    return isClassTeacher || role === "PET" || subject.toLowerCase() === "pet";
  }
  return true;
}
