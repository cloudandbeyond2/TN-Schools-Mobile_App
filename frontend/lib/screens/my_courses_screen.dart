import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/course_service.dart';
import '../models/course.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/course_card.dart';

class MyCoursesScreen extends StatefulWidget {
  const MyCoursesScreen({super.key});

  @override
  State<MyCoursesScreen> createState() => _MyCoursesScreenState();
}

class _MyCoursesScreenState extends State<MyCoursesScreen> {
  int _selectedFilterIndex = 0; // 0: All, 1: In Progress, 2: Completed, 3: Text Notes, 4: Visual/3D

  @override
  Widget build(BuildContext context) {
    final courseService = Provider.of<CourseService>(context);
    final allCourses = courseService.courses;

    // Filter courses for My Courses list based on selected chip
    final filteredCourses = allCourses.where((c) {
      if (_selectedFilterIndex == 1) {
        return c.progress > 0 && c.progress < 1.0;
      } else if (_selectedFilterIndex == 2) {
        return c.progress >= 1.0 || c.isCompleted;
      } else if (_selectedFilterIndex == 3) {
        return c.isTextBased;
      } else if (_selectedFilterIndex == 4) {
        return c.isImageBased;
      }
      return true;
    }).toList();

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
      ),
      child: Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: EdgeInsets.symmetric(
            horizontal: Responsive.horizontalPadding(context),
            vertical: 12,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Top Header: Avatar + Title + Search & Notification
              _buildTopHeader(context),
              const SizedBox(height: 18),

              // 2. Three KPI Metric Cards (Courses Enrolled, In Progress, Completed)
              _buildMetricCardsRow(context, allCourses),
              const SizedBox(height: 22),

              // 3. "Continue Learning" Section Header + 3D Hero Banner
              _buildSectionHeader(
                title: 'Continue Learning',
                onViewAll: () => Navigator.pushNamed(context, '/all-classes'),
              ),
              const SizedBox(height: 12),
              _buildContinueLearningHeroCard(context, allCourses),
              const SizedBox(height: 24),

              // 4. "My Courses" Section Header + Filter Chips + Course List
              _buildSectionHeader(
                title: 'My Courses',
                onViewAll: () => Navigator.pushNamed(context, '/all-classes'),
              ),
              const SizedBox(height: 12),
              _buildFilterChipsRow(allCourses.length),
              const SizedBox(height: 14),
              _buildMyCoursesList(context, filteredCourses),
              const SizedBox(height: 24),

              // 5. "Recommended for You" Section Header + 2 Cards
              _buildSectionHeader(
                title: 'Recommended for You',
                onViewAll: () => Navigator.pushNamed(context, '/all-classes'),
              ),
              const SizedBox(height: 12),
              _buildRecommendedGrid(context),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const CustomBottomNavBar(currentIndex: -1),
    ),
  );
  }

  // --- Top Header ---
  Widget _buildTopHeader(BuildContext context) {
    return Row(
      children: [
        // Student Profile Avatar
        GestureDetector(
          onTap: () => Navigator.pushNamed(context, '/profile'),
          child: Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFDBEAFE),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: ClipOval(
              child: Image.network(
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => const Icon(
                  Icons.person_rounded,
                  color: AppTheme.primaryEmerald,
                  size: 26,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),

        // Title & Subtitle
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'My Learning',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                  fontFamily: 'Outfit',
                ),
              ),
              SizedBox(height: 2),
              Text(
                'Keep learning, keep growing! 🌱',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),

        // Notification Bell Button with Red Badge '3'
        GestureDetector(
          onTap: () => Navigator.pushNamed(context, '/notifications'),
          child: Stack(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.notifications_none_rounded,
                  color: Color(0xFF1E293B),
                  size: 20,
                ),
              ),
              Positioned(
                right: 2,
                top: 2,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    shape: BoxShape.circle,
                  ),
                  child: const Text(
                    '3',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 8.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- 3 Summary KPI Metric Cards ---
  Widget _buildMetricCardsRow(BuildContext context, List<Course> allCourses) {
    final int enrolled = allCourses.length;
    final int inProgress = allCourses.where((c) => c.progress > 0 && c.progress < 1.0).length;
    final int completed = allCourses.where((c) => c.progress >= 1.0 || c.isCompleted).length;

    return Row(
      children: [
        // 1. Courses Enrolled
        Expanded(
          child: _buildMetricCard(
            bgColor: const Color(0xFFF0FDF4),
            borderColor: const Color(0xFFDCFCE7),
            iconBgColor: const Color(0xFF16A34A),
            icon: Icons.menu_book_rounded,
            count: '$enrolled',
            countColor: const Color(0xFF16A34A),
            label: 'Courses\nEnrolled',
          ),
        ),
        const SizedBox(width: 8),

        // 2. In Progress
        Expanded(
          child: _buildMetricCard(
            bgColor: const Color(0xFFEFF6FF),
            borderColor: const Color(0xFFDBEAFE),
            iconBgColor: const Color(0xFF2563EB),
            icon: Icons.track_changes_rounded,
            count: '$inProgress',
            countColor: const Color(0xFF2563EB),
            label: 'In Progress',
          ),
        ),
        const SizedBox(width: 8),

        // 3. Completed
        Expanded(
          child: _buildMetricCard(
            bgColor: const Color(0xFFFAF5FF),
            borderColor: const Color(0xFFF3E8FF),
            iconBgColor: const Color(0xFF9333EA),
            icon: Icons.emoji_events_rounded,
            count: '$completed',
            countColor: const Color(0xFF9333EA),
            label: 'Completed',
          ),
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required Color bgColor,
    required Color borderColor,
    required Color iconBgColor,
    required IconData icon,
    required String count,
    required Color countColor,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: iconBgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: 15),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  count,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: countColor,
                    fontFamily: 'Outfit',
                  ),
                ),
                Text(
                  label,
                  maxLines: label.contains('\n') ? 2 : 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 9.5,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- Section Header Helper ---
  Widget _buildSectionHeader({
    required String title,
    required VoidCallback onViewAll,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1E293B),
            fontFamily: 'Outfit',
          ),
        ),
        GestureDetector(
          onTap: onViewAll,
          child: Row(
            children: const [
              Text(
                'View All',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF16A34A),
                ),
              ),
              SizedBox(width: 3),
              Icon(
                Icons.chevron_right_rounded,
                size: 16,
                color: Color(0xFF16A34A),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- "Continue Learning" 3D Hero Card ---
  Widget _buildContinueLearningHeroCard(BuildContext context, List<Course> allCourses) {
    final Course activeCourse = allCourses.firstWhere(
      (c) => c.progress > 0 && c.progress < 1.0,
      orElse: () => allCourses.isNotEmpty ? allCourses.first : const Course(
        id: 'c3',
        title: 'Mathematics Basics',
        instructor: 'Teacher',
        imagePath: 'math_power',
        themeColor: Colors.blue,
        lessons: 12,
        coins: 100,
        rating: 4.8,
        subject: 'Mathematics',
        description: 'Basics',
      ),
    );

    final int percent = activeCourse.progressPercentage;
    final int completedLessons = (activeCourse.progress * activeCourse.lessons).round();

    return Container(
      width: double.infinity,
      height: 185,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0284C7).withValues(alpha: 0.15),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: LayoutBuilder(
          builder: (context, constraints) {
            // Keep text content strictly constrained within 48% to 52% of the card width
            final double safeContentWidth = (constraints.maxWidth * 0.50).clamp(130.0, 195.0);

            return Stack(
              fit: StackFit.expand,
              children: [
                // 1. Natural 3D Render Image Background
                Image.asset(
                  'assets/images/class/course.png',
                  fit: BoxFit.cover,
                  alignment: Alignment.centerRight,
                ),

                // 2. Subtle Left Vignette for High Readability
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                        colors: [
                          Colors.black.withValues(alpha: 0.32),
                          Colors.black.withValues(alpha: 0.12),
                          Colors.transparent,
                        ],
                        stops: const [0.0, 0.45, 0.70],
                      ),
                    ),
                  ),
                ),

                // 3. Left Hero Info & Progress Content (Width Constrained & Responsive)
                Padding(
                  padding: const EdgeInsets.only(left: 14, top: 8, bottom: 8, right: 6),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: SizedBox(
                      width: safeContentWidth,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // 'In Progress' / 'Start Learning' Pill
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.94),
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.04),
                                  blurRadius: 3,
                                ),
                              ],
                            ),
                            child: Text(
                              activeCourse.progress > 0 ? 'In Progress' : 'Start Learning',
                              style: const TextStyle(
                                fontSize: 8.5,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1D4ED8),
                              ),
                            ),
                          ),
                          const SizedBox(height: 3),

                          // Small, Responsive Title (Bounded to Left Column)
                          Text(
                            activeCourse.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12.0,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              height: 1.18,
                              fontFamily: 'Outfit',
                              shadows: [
                                Shadow(
                                  color: Color(0x44000000),
                                  blurRadius: 4,
                                  offset: Offset(0, 1),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 2),

                          // Grade / Subject
                          Text(
                            '${activeCourse.subject} • Grade 5',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 9.5,
                              color: Color(0xFFF1F5F9),
                              fontWeight: FontWeight.w600,
                              shadows: [
                                Shadow(
                                  color: Color(0x33000000),
                                  blurRadius: 3,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 5),

                          // Lesson Progress Text Row
                          SizedBox(
                            width: safeContentWidth,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Lesson $completedLessons of ${activeCourse.lessons}',
                                  style: const TextStyle(
                                    fontSize: 8.5,
                                    color: Color(0xFFF1F5F9),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  '$percent%',
                                  style: const TextStyle(
                                    fontSize: 9.0,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 2.5),

                          // Progress Bar
                          SizedBox(
                            width: safeContentWidth,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: activeCourse.progress > 0 ? activeCourse.progress : 0.05,
                                minHeight: 4.0,
                                backgroundColor: Colors.white.withValues(alpha: 0.35),
                                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),

                          // '▶ Continue Lesson' Button
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pushNamed(
                                context,
                                '/course-lessons',
                                arguments: activeCourse,
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFF1D4ED8),
                              elevation: 2,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.play_arrow_rounded, size: 13, color: Color(0xFF1D4ED8)),
                                const SizedBox(width: 3),
                                Text(
                                  activeCourse.progress > 0 ? 'Continue Lesson' : 'Start Lesson',
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF1D4ED8),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  // --- Filter Chips Row ---
  Widget _buildFilterChipsRow(int totalCoursesCount) {
    final filters = [
      {'label': 'All ($totalCoursesCount)', 'icon': null},
      {'label': 'In Progress', 'icon': Icons.play_arrow_rounded, 'color': const Color(0xFF2563EB)},
      {'label': 'Completed', 'icon': Icons.check_circle_rounded, 'color': const Color(0xFF16A34A)},
      {'label': 'Text Notes', 'icon': Icons.menu_book_rounded, 'color': const Color(0xFF9333EA)},
      {'label': 'Visual/3D', 'icon': Icons.layers_rounded, 'color': const Color(0xFFEA580C)},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: List.generate(filters.length, (index) {
          final isSelected = _selectedFilterIndex == index;
          final item = filters[index];
          final icon = item['icon'] as IconData?;
          final iconColor = item['color'] as Color?;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _selectedFilterIndex = index),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF16A34A) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF16A34A) : const Color(0xFFE2E8F0),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[
                      Icon(
                        icon,
                        size: 13,
                        color: isSelected ? Colors.white : (iconColor ?? const Color(0xFF64748B)),
                      ),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      item['label'] as String,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                        color: isSelected ? Colors.white : const Color(0xFF475569),
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  // --- "My Courses" List Items ---
  Widget _buildMyCoursesList(BuildContext context, List<Course> courses) {
    if (courses.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: const [
            Icon(Icons.menu_book_rounded, size: 36, color: Color(0xFF94A3B8)),
            SizedBox(height: 8),
            Text(
              'No courses found in this filter',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: Color(0xFF475569),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: courses.map((course) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: CourseCard(
            course: course,
            onTap: () {
              Navigator.pushNamed(context, '/course-lessons', arguments: course);
            },
          ),
        );
      }).toList(),
    );
  }

  // --- "Recommended for You" Grid ---
  Widget _buildRecommendedGrid(BuildContext context) {
    return Row(
      children: [
        // Card 1: The Solar System
        Expanded(
          child: _buildRecommendedCard(
            context: context,
            title: 'The Solar System',
            subject: 'Science • Grade 5',
            lessons: '8 Lessons',
            rating: '4.8',
            imagePath: 'assets/images/class/general.png',
            themeColor: const Color(0xFFFEF3C7),
          ),
        ),
        const SizedBox(width: 12),

        // Card 2: English Grammar
        Expanded(
          child: _buildRecommendedCard(
            context: context,
            title: 'English Grammar',
            subject: 'English • Grade 5',
            lessons: '10 Lessons',
            rating: '4.7',
            imagePath: 'assets/images/class/english.png',
            themeColor: const Color(0xFFDBEAFE),
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendedCard({
    required BuildContext context,
    required String title,
    required String subject,
    required String lessons,
    required String rating,
    required String imagePath,
    required Color themeColor,
  }) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/all-classes');
      },
      child: Container(
        padding: const EdgeInsets.all(10),
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
            Container(
              width: 44,
              height: 44,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: themeColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Image.asset(
                imagePath,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const Icon(
                  Icons.auto_stories_rounded,
                  color: Color(0xFF2563EB),
                  size: 22,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E293B),
                      fontFamily: 'Outfit',
                    ),
                  ),
                  Text(
                    subject,
                    style: const TextStyle(
                      fontSize: 9.5,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        lessons,
                        style: const TextStyle(
                          fontSize: 9,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.star_rounded,
                              size: 10,
                              color: Color(0xFF16A34A),
                            ),
                            const SizedBox(width: 2),
                            Text(
                              rating,
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF16A34A),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
