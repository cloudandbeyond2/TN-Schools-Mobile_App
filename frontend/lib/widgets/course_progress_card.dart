import 'package:flutter/material.dart';
import '../models/course.dart';
import '../theme/app_theme.dart';
import 'animated_counter.dart';

class CourseProgressCard extends StatelessWidget {
  final Course course;
  final VoidCallback onTap;

  const CourseProgressCard({
    super.key,
    required this.course,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    int percentage = (course.progress * 100).toInt();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 220,
        margin: const EdgeInsets.only(right: 14),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Thumbnail Header
            Container(
              height: 85,
              width: double.infinity,
              decoration: BoxDecoration(
                color: course.themeColor,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -10,
                    bottom: -10,
                    child: Icon(
                      course.isTextBased
                          ? Icons.menu_book_rounded
                          : Icons.image_rounded,
                      size: 70,
                      color: Colors.white.withValues(alpha: 0.3),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: course.isTextBased
                            ? const Color(0xFF0F766E)
                            : const Color(0xFF7C3AED),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            course.isTextBased
                                ? Icons.menu_book_rounded
                                : Icons.image_rounded,
                            color: Colors.white,
                            size: 10,
                          ),
                          const SizedBox(width: 3),
                          Text(
                            course.isTextBased ? 'Text Notes' : 'Visual/3D',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: AnimatedCountText(
                        value: percentage,
                        suffix: '% Done',
                        duration: const Duration(milliseconds: 1300),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Text(
                        course.title,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.textDark,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Text(
              course.instructor,
              style: const TextStyle(
                fontSize: 9.5,
                color: AppTheme.textLight,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              course.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.textDark,
                fontFamily: 'Outfit',
              ),
            ),
            const SizedBox(height: 6),
            // Progress Bar Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AnimatedCountText(
                      value: percentage,
                      suffix: '% Completed',
                      duration: const Duration(milliseconds: 1300),
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryEmerald,
                      ),
                    ),
                  ],
                ),
                Text(
                  '${course.completedLessons}/${course.lessons} Lessons',
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppTheme.textMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            AnimatedLinearProgress(
              value: course.progress,
              minHeight: 6,
              color: AppTheme.primaryEmerald,
              backgroundColor: AppTheme.borderLight,
              duration: const Duration(milliseconds: 1300),
            ),
          ],
        ),
      ),
    );
  }
}
