import 'package:flutter/material.dart';
import '../models/course.dart';
import 'animated_counter.dart';

class CourseCard extends StatelessWidget {
  final Course course;
  final VoidCallback onTap;

  const CourseCard({
    super.key,
    required this.course,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final int percent = course.progressPercentage;
    final int completedLessons = course.completedLessons > 0
        ? course.completedLessons
        : (course.progress > 0 ? (course.progress * course.lessons).round() : 0);

    Color themeColor = course.themeColor;
    Color progressColor = const Color(0xFF16A34A);
    Color badgeBgColor = const Color(0xFFDCFCE7);
    Color badgeTextColor = const Color(0xFF16A34A);

    final sub = course.subject.toLowerCase();
    String assetPath = 'assets/images/class/moresubject.png';

    if (sub.contains('math')) {
      assetPath = 'assets/images/class/mathematics.png';
      themeColor = const Color(0xFFEDE9FE);
      progressColor = const Color(0xFF8B5CF6);
      badgeBgColor = const Color(0xFFF3E8FF);
      badgeTextColor = const Color(0xFF7C3AED);
    } else if (sub.contains('tamil') || sub.contains('social')) {
      assetPath = 'assets/images/class/social.png';
      themeColor = const Color(0xFFDCFCE7);
      progressColor = const Color(0xFF16A34A);
      badgeBgColor = const Color(0xFFDCFCE7);
      badgeTextColor = const Color(0xFF16A34A);
    } else if (sub.contains('science')) {
      assetPath = 'assets/images/class/seience.png';
      themeColor = const Color(0xFFFEF3C7);
      progressColor = const Color(0xFFF59E0B);
      badgeBgColor = const Color(0xFFFEF3C7);
      badgeTextColor = const Color(0xFFD97706);
    } else if (sub.contains('english')) {
      assetPath = 'assets/images/class/english.png';
      themeColor = const Color(0xFFDBEAFE);
      progressColor = const Color(0xFF2563EB);
      badgeBgColor = const Color(0xFFDBEAFE);
      badgeTextColor = const Color(0xFF2563EB);
    } else if (sub.contains('computer')) {
      assetPath = 'assets/images/class/computer.png';
      themeColor = const Color(0xFFE0E7FF);
      progressColor = const Color(0xFF4F46E5);
      badgeBgColor = const Color(0xFFE0E7FF);
      badgeTextColor = const Color(0xFF4F46E5);
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Left Subject 3D Illustration
            Container(
              width: 58,
              height: 58,
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: themeColor,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Image.asset(
                assetPath,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => Icon(
                  Icons.auto_stories_rounded,
                  color: progressColor,
                  size: 28,
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Middle Course Details & Progress Bar
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    course.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E293B),
                      fontFamily: 'Outfit',
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${course.subject} • Grade 5',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedCountText(
                        value: completedLessons,
                        duration: const Duration(milliseconds: 1200),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        ' of ${course.lessons} Lessons',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  AnimatedLinearProgress(
                    value: course.progress > 0 ? course.progress : 0.05,
                    minHeight: 4.5,
                    color: progressColor,
                    backgroundColor: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(4),
                    duration: const Duration(milliseconds: 1300),
                  ),
                ],
              ),
            ),
            // Right: Percentage Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: badgeBgColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: AnimatedCountText(
                value: percent,
                suffix: '%',
                duration: const Duration(milliseconds: 1300),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: badgeTextColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
