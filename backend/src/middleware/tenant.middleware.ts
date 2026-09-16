import { Request, Response, NextFunction } from 'express';

/**
 * Tenant Isolation Middleware
 * Ensures non-SuperAdmin/State-level users have a valid schoolId on their JWT payload.
 * Injects req.user.schoolId into req.query or req.tenantSchoolId for consistent scoping.
 */
export function enforceTenantSchool(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing user context.',
    });
  }

  // SuperAdmin and State-level officers (Minister, Commissioner, DEO, BEO) can query across schools
  const isStateLevel = [
    'SUPERADMIN',
    'MINISTER',
    'COMMISSIONER',
    'DEO',
    'BEO',
  ].includes(user.role);

  if (isStateLevel) {
    return next();
  }

  // School-level users MUST have a schoolId assigned
  if (!user.schoolId) {
    return res.status(403).json({
      success: false,
      error: `Access denied. User role '${user.role}' is not associated with any school.`,
    });
  }

  // Override/force schoolId filter to match authenticated user's school
  req.query.schoolId = user.schoolId;

  return next();
}
