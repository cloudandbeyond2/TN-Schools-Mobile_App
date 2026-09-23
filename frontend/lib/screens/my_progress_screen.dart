import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../models/student.dart';
import '../services/course_service.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/animated_counter.dart';
import '../widgets/progress_indicator.dart';
import '../core/constants/app_constants.dart';

class MyProgressScreen extends StatefulWidget {
  const MyProgressScreen({super.key});

  @override
  State<MyProgressScreen> createState() => _MyProgressScreenState();
}

class _MyProgressScreenState extends State<MyProgressScreen> {
  // Base URL Options:
  // Option 1: Production (Vercel) -> https://tn-schools-mobile-app-backend.vercel.app
  // Option 2: Localhost Development -> http://localhost:5000
  static String get _baseUrl => AppConstants.baseUrl;
  String _selectedSectionFilter = 'All Sections';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoadingStudents = false;
  List<StudentSectionProgressItem> _fetchedStudents = [];
  bool _hasInitialFetched = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadStudents();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadStudents() async {
    if (!mounted) return;
    final courseService = Provider.of<CourseService>(context, listen: false);
    final student = courseService.student;
    final studentClass = student.grade.isNotEmpty ? student.grade : '6';
    final studentSection = student.section.isNotEmpty ? student.section.toUpperCase() : 'A';

    // Also refresh homework & library progress in parallel
    courseService.fetchHomework();
    courseService.fetchDigitalLibraryResources();
    courseService.loadLibraryProgress();

    setState(() {
      _isLoadingStudents = true;
    });

    try {
      final schoolParam = (student.schoolId != null && student.schoolId!.isNotEmpty)
          ? '&schoolId=${student.schoolId}'
          : '';
      final url = Uri.parse('$_baseUrl/api/students?class=$studentClass$schoolParam');
      final response = await http.get(url).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true && body['data'] is List) {
          final List<dynamic> rawList = body['data'];
          final List<StudentSectionProgressItem> items = [];

          for (int i = 0; i < rawList.length; i++) {
            final raw = rawList[i];
            final rawUserId = raw['userId']?.toString() ?? '';
            final rawStudentId = raw['id']?.toString() ?? '';
            final rawName = raw['user']?['name']?.toString().trim() ?? 'Student';
            final isCurrent = rawUserId == student.id ||
                rawStudentId == student.studentId ||
                rawStudentId == student.id ||
                (rawName.isNotEmpty && rawName.toLowerCase() == student.name.toLowerCase());

            final secRaw = raw['section']?.toString().trim() ?? studentSection;
            final formattedSec = secRaw.toLowerCase().startsWith('section')
                ? secRaw
                : 'Section $secRaw';

            final roll = (raw['rollNumber'] != null && raw['rollNumber'].toString().trim().isNotEmpty)
                ? raw['rollNumber'].toString().trim()
                : '$studentClass$secRaw-${(i + 1).toString().padLeft(2, '0')}';

            final double marksPct = (raw['marksPercentage'] is num)
                ? (raw['marksPercentage'] as num).toDouble()
                : 75.0;

            final double progress = isCurrent
                ? courseService.overallProgress
                : (marksPct > 0 ? (marksPct / 100.0).clamp(0.40, 0.98) : (0.70 + ((i % 5) * 0.05)));

            final int att = isCurrent
                ? (student.attendancePercentage > 0 ? student.attendancePercentage : 95)
                : ((raw['attendancePercentage'] is num)
                    ? (raw['attendancePercentage'] as num).toInt()
                    : (90 + (i % 8)));

            final int completed = isCurrent
                ? courseService.overallCompletedLessons
                : (progress * 40).round();

            final int xpVal = isCurrent
                ? (student.xp > 0 ? student.xp : 2450)
                : (2000 + (progress * 1800).round() + (i * 35));

            final int streak = isCurrent
                ? (student.streakDays > 0 ? student.streakDays : 12)
                : (5 + ((i * 3) % 15));

            const palette = [
              Color(0xFF0284C7),
              Color(0xFFF59E0B),
              Color(0xFF8B5CF6),
              Color(0xFF10B981),
              Color(0xFFEC4899),
              Color(0xFF6366F1),
              Color(0xFF14B8A6),
              Color(0xFFEA580C),
            ];
            final color = palette[i % palette.length];

            items.add(StudentSectionProgressItem(
              id: rawStudentId,
              name: rawName,
              rollNumber: roll,
              section: formattedSec,
              grade: '${raw['class'] ?? studentClass}th Standard',
              rank: 1,
              overallProgress: progress,
              completedLessons: completed,
              totalLessons: 40,
              streakDays: streak,
              xp: xpVal,
              attendance: att,
              avatarColor: color,
              isCurrentUser: isCurrent,
              highlightBadge: '',
              badges: [
                if (isCurrent) 'Rising Star',
                if (att >= 95) 'Perfect Attendance',
                if (progress >= 0.8) 'Quick Learner',
                'Consistent',
              ],
              subjectProgress: {
                'Mathematics': (progress * 1.02).clamp(0.4, 0.99),
                'Science': (progress * 0.98).clamp(0.4, 0.99),
                'English': (progress * 0.95).clamp(0.4, 0.99),
                'Social Studies': (progress * 0.94).clamp(0.4, 0.99),
                'Tamil': (progress * 0.96).clamp(0.4, 0.99),
              },
            ));
          }

          // Ensure current student is present in the list
          if (!items.any((s) => s.isCurrentUser)) {
            items.add(StudentSectionProgressItem(
              id: student.id,
              name: student.name.isNotEmpty ? student.name : 'Praveen',
              rollNumber: student.rollNumber.isNotEmpty ? student.rollNumber : '$studentClass$studentSection-01',
              section: 'Section $studentSection',
              grade: '${studentClass}th Standard',
              rank: 1,
              overallProgress: courseService.overallProgress,
              completedLessons: courseService.overallCompletedLessons,
              totalLessons: 40,
              streakDays: student.streakDays,
              xp: student.xp,
              attendance: student.attendancePercentage,
              avatarColor: const Color(0xFF0284C7),
              isCurrentUser: true,
              highlightBadge: 'Rising Star 🌟',
              badges: ['Active Learner', 'Rising Star', 'Math Star'],
              subjectProgress: {
                'Mathematics': 0.90,
                'Science': 0.85,
                'English': 0.82,
                'Social Studies': 0.80,
                'Tamil': 0.88,
              },
            ));
          }

          // Sort by overall progress descending
          items.sort((a, b) => b.overallProgress.compareTo(a.overallProgress));

          // Assign ranks & badges
          final updated = <StudentSectionProgressItem>[];
          for (int r = 0; r < items.length; r++) {
            final it = items[r];
            final rank = r + 1;
            String badge;
            if (rank == 1) {
              badge = 'Class Topper 👑';
            } else if (rank == 2) {
              badge = 'Science Ace 🔬';
            } else if (rank == 3) {
              badge = 'Math Star 🌟';
            } else if (it.isCurrentUser) {
              badge = 'Rising Star 🌟';
            } else {
              badge = 'Top in ${it.section} 🎯';
            }

            updated.add(StudentSectionProgressItem(
              id: it.id,
              name: it.name,
              rollNumber: it.rollNumber,
              section: it.section,
              grade: it.grade,
              rank: rank,
              overallProgress: it.overallProgress,
              completedLessons: it.completedLessons,
              totalLessons: it.totalLessons,
              streakDays: it.streakDays,
              xp: it.xp,
              attendance: it.attendance,
              avatarColor: it.avatarColor,
              isCurrentUser: it.isCurrentUser,
              highlightBadge: badge,
              badges: [
                if (rank <= 3) 'Top Ranker',
                ...it.badges,
              ],
              subjectProgress: it.subjectProgress,
            ));
          }

          final mySection = 'Section $studentSection';
          final hasMySection = updated.any((s) => s.section.toLowerCase() == mySection.toLowerCase());

          if (mounted) {
            setState(() {
              _fetchedStudents = updated;
              _hasInitialFetched = true;
              _isLoadingStudents = false;
              if ((_selectedSectionFilter == 'All Sections' || !_hasInitialFetched) && hasMySection) {
                _selectedSectionFilter = mySection;
              }
            });
          }
          return;
        }
      }
    } catch (err) {
      debugPrint('Error fetching class students: $err');
    }

    if (mounted) {
      final mySec = 'Section $studentSection';
      setState(() {
        _fetchedStudents = [
          StudentSectionProgressItem(
            id: student.id,
            name: student.name.isNotEmpty ? student.name : 'Praveen',
            rollNumber: student.rollNumber.isNotEmpty ? student.rollNumber : '$studentClass$studentSection-01',
            section: mySec,
            grade: '${studentClass}th Standard',
            rank: 1,
            overallProgress: courseService.overallProgress,
            completedLessons: courseService.overallCompletedLessons,
            totalLessons: 40,
            streakDays: student.streakDays,
            xp: student.xp,
            attendance: student.attendancePercentage,
            avatarColor: const Color(0xFF0284C7),
            isCurrentUser: true,
            highlightBadge: 'Top in $mySec 🎯',
            badges: ['Active Learner', 'Rising Star'],
            subjectProgress: {
              'Mathematics': 0.88,
              'Science': 0.82,
              'English': 0.80,
              'Social Studies': 0.78,
              'Tamil': 0.85,
            },
          ),
        ];
        _hasInitialFetched = true;
        _isLoadingStudents = false;
        _selectedSectionFilter = mySec;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final courseService = Provider.of<CourseService>(context);
    final student = courseService.student;
    final String displayName = student.name.isNotEmpty ? student.name : 'Student';
    final allStudents = _fetchedStudents.isNotEmpty
        ? _fetchedStudents
        : [
            StudentSectionProgressItem(
              id: student.id,
              name: displayName,
              rollNumber: student.rollNumber.isNotEmpty ? student.rollNumber : '${student.grade}${student.section}-01',
              section: 'Section ${student.section.isNotEmpty ? student.section : "A"}',
              grade: '${student.grade}th Standard',
              rank: 1,
              overallProgress: courseService.overallProgress,
              completedLessons: courseService.overallCompletedLessons,
              totalLessons: 40,
              streakDays: student.streakDays,
              xp: student.xp,
              attendance: student.attendancePercentage,
              avatarColor: const Color(0xFF0284C7),
              isCurrentUser: true,
              highlightBadge: 'Rising Star 🌟',
              badges: ['Active Learner', 'Rising Star'],
              subjectProgress: {
                'Mathematics': 0.90,
                'Science': 0.85,
                'English': 0.82,
                'Social Studies': 0.80,
                'Tamil': 0.88,
              },
            ),
          ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: AppBar(
          backgroundColor: const Color(0xFFF8FAFC),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A), size: 24),
            onPressed: () => Navigator.pop(context),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Text(
                'My Progress',
                style: TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Outfit',
                ),
              ),
              SizedBox(height: 2),
              Text(
                'Keep learning, keep growing! 🌱',
                style: TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  fontFamily: 'Outfit',
                ),
              ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: Center(
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: _isLoadingStudents
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Color(0xFF0284C7),
                            ),
                          )
                        : const Icon(Icons.refresh_rounded, color: Color(0xFF0284C7), size: 20),
                    onPressed: _isLoadingStudents ? null : _loadStudents,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Center(
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: const Icon(Icons.calendar_month_rounded, color: Color(0xFF0284C7), size: 20),
                    onPressed: () => Navigator.pushNamed(context, '/timetable'),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const TNBottomNavBar(currentIndex: -1),
      body: RefreshIndicator(
        onRefresh: _loadStudents,
        color: const Color(0xFF0284C7),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Top Hero Card (Full Background: assets/images/class/progress.png)
              _buildHeroGreetingCard(student),
              const SizedBox(height: 20),

              // 2. Overall Progress Card (Full Background: assets/images/class/progress2.png)
              _buildSectionTitle('Overall Progress'),
              const SizedBox(height: 10),
              _buildOverallProgressCard(courseService),
              const SizedBox(height: 20),

              // 3. Subject Wise Progress (Live Real Fetch Based)
              _buildSubjectWiseProgressGrid(),
              const SizedBox(height: 20),

              // 4. Recent Achievements Card (Full Background: assets/images/class/progress3.png)
              _buildSectionTitle('Recent Achievements'),
              const SizedBox(height: 10),
              _buildRecentAchievementsCard(),
              const SizedBox(height: 20),

              // 5. Weekly Learning Activity
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildSectionTitle('Weekly Learning Activity'),
                  GestureDetector(
                    onTap: () => Navigator.pushNamed(context, '/timetable'),
                    child: const Text(
                      'View Calendar >',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0284C7),
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildWeeklyLearningActivity(),
              const SizedBox(height: 24),

              // 6. All Students Progress by Sections
              _buildAllStudentsSection(allStudents, student),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16.5,
        fontWeight: FontWeight.w900,
        color: Color(0xFF0F172A),
        fontFamily: 'Outfit',
      ),
    );
  }

  // --- 1. HERO GREETING CARD (Full progress.png Image) ---
  Widget _buildHeroGreetingCard(Student student) {
    final name = student.name.isNotEmpty ? student.name : 'Student';
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = constraints.maxWidth;
        final cardHeight = (cardWidth * 0.48).clamp(160.0, 190.0);

        return ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: SizedBox(
            width: cardWidth,
            height: cardHeight,
            child: Stack(
              children: [
                // Background Graphic with Sky Blue + Boy + Trophy
                Positioned.fill(
                  child: Image.asset(
                    'assets/images/class/progress.png',
                    fit: BoxFit.cover,
                    alignment: Alignment.centerRight,
                  ),
                ),

                // Left Content Area
                Positioned(
                  left: 14,
                  top: 14,
                  bottom: 14,
                  right: cardWidth * 0.36,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Great job, $name! 👋',
                            style: const TextStyle(
                              fontSize: 16.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0284C7).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  student.displayClassAndSection,
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0284C7),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      // 3 KPI Pills Row
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: _buildMiniKPIItem(
                                icon: Icons.menu_book_rounded,
                                iconColor: Colors.white,
                                iconBg: const Color(0xFF2563EB),
                                count: 12,
                                label: 'Courses\nEnrolled',
                              ),
                            ),
                            _buildMiniDivider(),
                            Expanded(
                              child: _buildMiniKPIItem(
                                icon: Icons.track_changes_rounded,
                                iconColor: Colors.white,
                                iconBg: const Color(0xFF16A34A),
                                count: 8,
                                label: 'In Progress',
                              ),
                            ),
                            _buildMiniDivider(),
                            Expanded(
                              child: _buildMiniKPIItem(
                                icon: Icons.emoji_events_rounded,
                                iconColor: Colors.white,
                                iconBg: const Color(0xFF9333EA),
                                count: 5,
                                label: 'Completed',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMiniKPIItem({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required int count,
    required String label,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: iconBg,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: 11.5),
        ),
        const SizedBox(width: 3.5),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedCountText(
                value: count,
                duration: const Duration(milliseconds: 1400),
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                  fontFamily: 'Outfit',
                ),
              ),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 7.5,
                  color: Color(0xFF64748B),
                  height: 1.1,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMiniDivider() {
    return Container(
      width: 1,
      height: 18,
      margin: const EdgeInsets.symmetric(horizontal: 2),
      color: const Color(0xFFE2E8F0),
    );
  }

  // --- 2. OVERALL PROGRESS CARD (Calculated from Subject-Wise Progress) ---
  Widget _buildOverallProgressCard(CourseService courseService) {
    final double overallProgress = courseService.overallProgress;
    final int overallPercent = courseService.overallPercentage;
    final int completedLessons = courseService.overallCompletedLessons;
    final int totalLessons = courseService.overallTotalLessons;

    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = constraints.maxWidth;
        final cardHeight = (cardWidth * 0.36).clamp(115.0, 135.0);

        return ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Container(
            width: cardWidth,
            height: cardHeight,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Stack(
              children: [
                // Books Stack Graphic on the right
                Positioned.fill(
                  child: Image.asset(
                    'assets/images/class/progress2.png',
                    fit: BoxFit.contain,
                    alignment: Alignment.centerRight,
                  ),
                ),

                // Left Content: Circular Ring & Linear Progress
                Positioned(
                  left: 10,
                  top: 10,
                  bottom: 10,
                  right: (cardWidth * 0.35).clamp(115.0, 160.0),
                  child: Row(
                    children: [
                      // Animated Circular Progress Radial Ring
                      SizedBox(
                        width: 68,
                        height: 68,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 68,
                              height: 68,
                              child: AnimatedCircularProgress(
                                value: overallProgress,
                                strokeWidth: 6,
                                color: const Color(0xFF0284C7),
                                backgroundColor: const Color(0xFFE0F2FE),
                                duration: const Duration(milliseconds: 1500),
                              ),
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AnimatedCountText(
                                  value: overallPercent,
                                  suffix: '%',
                                  duration: const Duration(milliseconds: 1500),
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                                const Text(
                                  'Overall',
                                  style: TextStyle(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Text & Linear Indicator
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'You have completed',
                              style: TextStyle(
                                fontSize: 10,
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: [
                                AnimatedCountText(
                                  value: overallPercent,
                                  suffix: '%',
                                  duration: const Duration(milliseconds: 1500),
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0284C7),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                                const SizedBox(width: 3),
                                const Flexible(
                                  child: Text(
                                    'of your learning journey!',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: Color(0xFF334155),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Padding(
                              padding: const EdgeInsets.only(right: 14.0),
                              child: AnimatedLinearProgress(
                                value: overallProgress,
                                minHeight: 4.5,
                                color: const Color(0xFF0284C7),
                                backgroundColor: const Color(0xFFE0F2FE),
                                duration: const Duration(milliseconds: 1500),
                              ),
                            ),
                            const SizedBox(height: 3),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AnimatedCountText(
                                  value: completedLessons,
                                  duration: const Duration(milliseconds: 1400),
                                  style: const TextStyle(
                                    fontSize: 9,
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  ' of $totalLessons Lessons Completed',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 9,
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w500,
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
              ],
            ),
          ),
        );
      },
    );
  }

  // --- 3. SUBJECT WISE PROGRESS (Horizontal Row of Cards — Live Fetch) ---
  Widget _buildSubjectWiseProgressGrid() {
    return const SubjectWiseProgressSection(showHeader: true);
  }

  // --- 4. RECENT ACHIEVEMENTS CARD (Full progress3.png Image) ---
  Widget _buildRecentAchievementsCard() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = constraints.maxWidth;
        // progress3.png aspect ratio is approx 3.27:1
        final cardHeight = (cardWidth * 0.31).clamp(95.0, 115.0);

        return SizedBox(
          width: cardWidth,
          height: cardHeight,
          child: Stack(
            children: [
              // Full Background Image with Card and Boy
              Positioned.fill(
                child: Image.asset(
                  'assets/images/class/progress3.png',
                  fit: BoxFit.fill,
                ),
              ),

              // Content Overlay positioned on the left
              Positioned(
                left: 12,
                top: 0,
                bottom: 0,
                right: cardWidth * 0.34,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Golden Medal Artwork
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFACC15),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFD97706).withValues(alpha: 0.25),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Text('🎖️', style: TextStyle(fontSize: 20)),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Middle: Text & Badge
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            'Amazing effort!',
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 1.5),
                          const Text(
                            'You earned a new badge',
                            style: TextStyle(
                              fontSize: 10,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 3,
                                ),
                              ],
                            ),
                            child: const Text(
                              'Math Star',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFD97706),
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- 5. WEEKLY LEARNING ACTIVITY ---
  Widget _buildWeeklyLearningActivity() {
    final days = [
      {'day': 'Mon', 'status': 'done'},
      {'day': 'Tue', 'status': 'done'},
      {'day': 'Wed', 'status': 'done'},
      {'day': 'Thu', 'status': 'done'},
      {'day': 'Fri', 'status': 'done'},
      {'day': 'Sat', 'status': 'today'},
      {'day': 'Sun', 'status': 'pending'},
    ];

    return Row(
      children: [
        // Left: 7 Days Status Card
        Expanded(
          flex: 6,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: days.map((d) {
                final status = d['status'] as String;
                Widget iconWidget;

                if (status == 'done') {
                  iconWidget = Container(
                    width: 20,
                    height: 20,
                    decoration: const BoxDecoration(
                      color: Color(0xFF16A34A),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check, size: 12, color: Colors.white),
                  );
                } else if (status == 'today') {
                  iconWidget = const Icon(
                    Icons.star_rounded,
                    size: 22,
                    color: Color(0xFF2563EB),
                  );
                } else {
                  iconWidget = Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                    ),
                  );
                }

                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      d['day'] as String,
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    iconWidget,
                  ],
                );
              }).toList(),
            ),
          ),
        ),
        const SizedBox(width: 10),

        // Right: 5 Days Learning Streak Pill
        Expanded(
          flex: 4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F9FF),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFBAE6FD)),
            ),
            child: Row(
              children: [
                const Text('🔥', style: TextStyle(fontSize: 22)),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Text(
                        '5 Days',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                          fontFamily: 'Outfit',
                        ),
                      ),
                      Text(
                        'Learning Streak',
                        style: TextStyle(
                          fontSize: 9.5,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // --- 6. ALL STUDENTS PROGRESS BY SECTIONS ---
  Widget _buildAllStudentsSection(List<StudentSectionProgressItem> allStudents, Student currentStudent) {
    // Apply Section Filter
    List<StudentSectionProgressItem> filtered = allStudents;
    if (_selectedSectionFilter == 'Top Rankers') {
      filtered = allStudents.where((s) => s.rank <= 3).toList();
    } else if (_selectedSectionFilter != 'All Sections') {
      filtered = allStudents
          .where((s) => s.section.toLowerCase() == _selectedSectionFilter.toLowerCase())
          .toList();
    }

    // Apply Search Query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      filtered = filtered
          .where((s) =>
              s.name.toLowerCase().contains(q) ||
              s.rollNumber.toLowerCase().contains(q) ||
              s.section.toLowerCase().contains(q))
          .toList();
    }

    final availableSections = allStudents.map((s) => s.section).toSet().toList()..sort();
    final studentSecLabel = 'Section ${currentStudent.section.toUpperCase()}';

    final sectionFilters = [
      {'label': 'All Sections', 'count': allStudents.length, 'icon': Icons.groups_rounded},
      ...availableSections.map((sec) {
        final isMySec = sec.toLowerCase() == studentSecLabel.toLowerCase();
        return {
          'label': sec,
          'count': allStudents.where((s) => s.section == sec).length,
          'icon': isMySec ? Icons.verified_user_rounded : Icons.class_outlined,
        };
      }),
      if (allStudents.length >= 3)
        {'label': 'Top Rankers', 'count': allStudents.where((s) => s.rank <= 3).length, 'icon': Icons.emoji_events_rounded},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header with Badge
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _buildSectionTitle('Class ${currentStudent.grade} Students Progress'),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE0F2FE),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFBAE6FD)),
                      ),
                      child: Text(
                        '${allStudents.length} Students',
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0284C7),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'Classmates in ${currentStudent.displayClassAndSection} & Section Performance',
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                    fontFamily: 'Outfit',
                  ),
                ),
              ],
            ),
            if (_isLoadingStudents)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFF0284C7),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),

        // Search Bar
        Container(
          height: 42,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: TextField(
            controller: _searchController,
            onChanged: (val) {
              setState(() {
                _searchQuery = val;
              });
            },
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF0F172A),
              fontFamily: 'Outfit',
            ),
            decoration: InputDecoration(
              hintText: 'Search student by name or roll no...',
              hintStyle: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF94A3B8),
                fontFamily: 'Outfit',
              ),
              prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 18),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {
                          _searchQuery = '';
                        });
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),
        const SizedBox(height: 10),

        // Section Filter Chips Horizontal Scroll
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          clipBehavior: Clip.none,
          child: Row(
            children: sectionFilters.map((filter) {
              final label = filter['label'] as String;
              final count = filter['count'] as int;
              final icon = filter['icon'] as IconData;
              final isSelected = _selectedSectionFilter == label;

              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: InkWell(
                  onTap: () {
                    setState(() {
                      _selectedSectionFilter = label;
                    });
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF0284C7) : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF0284C7) : const Color(0xFFE2E8F0),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isSelected
                              ? const Color(0xFF0284C7).withValues(alpha: 0.25)
                              : Colors.black.withValues(alpha: 0.02),
                          blurRadius: isSelected ? 6 : 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          icon,
                          size: 14,
                          color: isSelected ? Colors.white : const Color(0xFF64748B),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            color: isSelected ? Colors.white : const Color(0xFF334155),
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Colors.white.withValues(alpha: 0.25)
                                : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '$count',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? Colors.white : const Color(0xFF64748B),
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 14),

        // Section Analytics Summary Card
        if (filtered.isNotEmpty) ...[
          _buildSectionAnalyticsSummary(filtered),
          const SizedBox(height: 14),
        ],

        // Student Cards List
        if (filtered.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: const [
                Icon(Icons.person_search_rounded, size: 40, color: Color(0xFF94A3B8)),
                SizedBox(height: 8),
                Text(
                  'No students found',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E293B),
                    fontFamily: 'Outfit',
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Try searching for another name or change the section filter.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filtered.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              return _buildStudentProgressCard(filtered[index]);
            },
          ),
      ],
    );
  }

  // --- SECTION ANALYTICS SUMMARY CARD ---
  Widget _buildSectionAnalyticsSummary(List<StudentSectionProgressItem> students) {
    final double avgProgress =
        students.fold<double>(0.0, (sum, s) => sum + s.overallProgress) / students.length;
    final StudentSectionProgressItem topStudent =
        students.reduce((a, b) => a.overallProgress >= b.overallProgress ? a : b);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Circular Average Ring
          SizedBox(
            width: 48,
            height: 48,
            child: Stack(
              alignment: Alignment.center,
              children: [
                AnimatedCircularProgress(
                  value: avgProgress,
                  strokeWidth: 4.5,
                  color: const Color(0xFF38BDF8),
                  backgroundColor: Colors.white.withValues(alpha: 0.15),
                  duration: const Duration(milliseconds: 1400),
                ),
                Text(
                  '${(avgProgress * 100).round()}%',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    fontFamily: 'Outfit',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Stats Text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    const Text(
                      'Section Average Progress',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        fontFamily: 'Outfit',
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7).withValues(alpha: 0.35),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        _selectedSectionFilter,
                        style: const TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF38BDF8),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    const Icon(Icons.star_rounded, color: Color(0xFFFACC15), size: 13),
                    const SizedBox(width: 3),
                    Text(
                      'Top: ${topStudent.name} (${(topStudent.overallProgress * 100).round()}%)',
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Text(' • ', style: TextStyle(color: Color(0xFF64748B))),
                    Text(
                      '${students.length} Active',
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF38BDF8),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- INDIVIDUAL STUDENT PROGRESS CARD ---
  Widget _buildStudentProgressCard(StudentSectionProgressItem student) {
    Widget rankWidget;

    if (student.rank == 1) {
      rankWidget = Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFFCD34D)),
        ),
        child: const Text('👑 #1', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFD97706))),
      );
    } else if (student.rank == 2) {
      rankWidget = Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFCBD5E1)),
        ),
        child: const Text('🥈 #2', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF475569))),
      );
    } else if (student.rank == 3) {
      rankWidget = Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFFFEDD5),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFFDBA74)),
        ),
        child: const Text('🥉 #3', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFC2410C))),
      );
    } else {
      rankWidget = Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Text('#${student.rank}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF64748B))),
      );
    }

    final int percentVal = (student.overallProgress * 100).round();

    return InkWell(
      onTap: () => _showStudentDetailModal(context, student),
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: student.isCurrentUser ? const Color(0xFFF0F9FF) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: student.isCurrentUser ? const Color(0xFF38BDF8) : const Color(0xFFE2E8F0),
            width: student.isCurrentUser ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: student.isCurrentUser
                  ? const Color(0xFF0284C7).withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Row 1: Rank, Avatar, Name, Section, and "YOU" badge
            Row(
              children: [
                rankWidget,
                const SizedBox(width: 8),

                // Avatar Circle
                Stack(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: student.avatarColor.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                        border: Border.all(color: student.avatarColor.withValues(alpha: 0.4), width: 1.5),
                      ),
                      child: Center(
                        child: Text(
                          student.name.isNotEmpty ? student.name[0] : 'S',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: student.avatarColor,
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: const Color(0xFF16A34A),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 10),

                // Name & Section Tag
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              student.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.bold,
                                color: student.isCurrentUser
                                    ? const Color(0xFF0284C7)
                                    : const Color(0xFF0F172A),
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ),
                          if (student.isCurrentUser) ...[
                            const SizedBox(width: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0284C7),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'YOU',
                                style: TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(
                            student.rollNumber,
                            style: const TextStyle(
                              fontSize: 10.5,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const Text(' • ', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Text(
                              student.section,
                              style: const TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF475569),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Percentage Badge & Arrow
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedCountText(
                          value: percentVal,
                          suffix: '%',
                          duration: const Duration(milliseconds: 1400),
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: percentVal >= 80
                                ? const Color(0xFF16A34A)
                                : percentVal >= 60
                                    ? const Color(0xFF0284C7)
                                    : const Color(0xFFEA580C),
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const SizedBox(width: 3),
                        const Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF94A3B8)),
                      ],
                    ),
                    Text(
                      '${student.completedLessons}/${student.totalLessons} Lessons',
                      style: const TextStyle(
                        fontSize: 9.5,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Progress Bar
            AnimatedLinearProgress(
              value: student.overallProgress,
              minHeight: 5.5,
              color: student.isCurrentUser
                  ? const Color(0xFF0284C7)
                  : percentVal >= 80
                      ? const Color(0xFF16A34A)
                      : percentVal >= 60
                          ? const Color(0xFF2563EB)
                          : const Color(0xFFEA580C),
              backgroundColor: const Color(0xFFE2E8F0),
              duration: const Duration(milliseconds: 1400),
            ),
            const SizedBox(height: 8),

            // Bottom Metrics: Streak, XP, Top Badge
            Row(
              children: [
                // Streak Tag
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFFEDD5)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('🔥', style: TextStyle(fontSize: 10)),
                      const SizedBox(width: 3),
                      Text(
                        '${student.streakDays}d Streak',
                        style: const TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFC2410C),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),

                // XP Tag
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAF5FF),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFF3E8FF)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.star_rounded, color: Color(0xFF9333EA), size: 11),
                      const SizedBox(width: 2),
                      Text(
                        '${student.xp} XP',
                        style: const TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF7E22CE),
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),

                // Highlight Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    student.highlightBadge,
                    style: const TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF475569),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- DETAILED STUDENT PROGRESS MODAL SHEET ---
  void _showStudentDetailModal(BuildContext context, StudentSectionProgressItem student) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final percent = (student.overallProgress * 100).round();

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(ctx).padding.bottom + 20,
          ),
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Grabber Handle
                Center(
                  child: Container(
                    width: 44,
                    height: 4.5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Student Profile Header
                Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: student.avatarColor.withValues(alpha: 0.18),
                        shape: BoxShape.circle,
                        border: Border.all(color: student.avatarColor, width: 2),
                      ),
                      child: Center(
                        child: Text(
                          student.name.isNotEmpty ? student.name[0] : 'S',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: student.avatarColor,
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  student.name,
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ),
                              if (student.isCurrentUser) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0284C7),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'YOU',
                                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${student.grade} • ${student.section} • Roll #${student.rollNumber}',
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFCD34D)),
                      ),
                      child: Text(
                        'Rank #${student.rank}',
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFFD97706),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Overall Completion Banner Card
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F9FF),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFBAE6FD)),
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 56,
                        height: 56,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            AnimatedCircularProgress(
                              value: student.overallProgress,
                              strokeWidth: 5,
                              color: const Color(0xFF0284C7),
                              backgroundColor: const Color(0xFFE0F2FE),
                            ),
                            Text(
                              '$percent%',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0284C7),
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              percent >= 85 ? 'Outstanding Performance! 🌟' : 'Great Steady Progress! 🚀',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                                fontFamily: 'Outfit',
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${student.completedLessons} of ${student.totalLessons} Lessons Completed',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // 4-Box Key Metrics Grid
                Row(
                  children: [
                    _buildModalMetricBox('Streak', '${student.streakDays} Days', '🔥', const Color(0xFFEA580C), const Color(0xFFFFF7ED)),
                    const SizedBox(width: 8),
                    _buildModalMetricBox('Total XP', '${student.xp}', '⭐', const Color(0xFF9333EA), const Color(0xFFFAF5FF)),
                    const SizedBox(width: 8),
                    _buildModalMetricBox('Attendance', '${student.attendance}%', '📅', const Color(0xFF16A34A), const Color(0xFFF0FDF4)),
                    const SizedBox(width: 8),
                    _buildModalMetricBox('Lessons', '${student.completedLessons}', '📚', const Color(0xFF0284C7), const Color(0xFFF0F9FF)),
                  ],
                ),
                const SizedBox(height: 20),

                // Subject-by-Subject Progress Breakdown
                const Text(
                  'Subject-Wise Performance',
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 12),
                ...student.subjectProgress.entries.map((entry) {
                  final String subName = entry.key;
                  final double prog = entry.value;
                  final int subPercent = (prog * 100).round();

                  Color subColor = const Color(0xFF0284C7);
                  IconData subIcon = Icons.school_rounded;

                  if (subName.contains('Math')) {
                    subColor = const Color(0xFF2563EB);
                    subIcon = Icons.calculate_rounded;
                  } else if (subName.contains('Science')) {
                    subColor = const Color(0xFF16A34A);
                    subIcon = Icons.science_rounded;
                  } else if (subName.contains('English')) {
                    subColor = const Color(0xFF7C3AED);
                    subIcon = Icons.record_voice_over_rounded;
                  } else if (subName.contains('Social')) {
                    subColor = const Color(0xFFEA580C);
                    subIcon = Icons.public_rounded;
                  } else if (subName.contains('Tamil')) {
                    subColor = const Color(0xFF059669);
                    subIcon = Icons.menu_book_rounded;
                  }

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10.0),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Icon(subIcon, size: 15, color: subColor),
                            const SizedBox(width: 6),
                            Text(
                              subName,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF334155),
                                fontFamily: 'Outfit',
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '$subPercent%',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: subColor,
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        AnimatedLinearProgress(
                          value: prog,
                          minHeight: 5,
                          color: subColor,
                          backgroundColor: subColor.withValues(alpha: 0.15),
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 14),

                // Achievements & Badges List
                const Text(
                  'Badges & Achievements',
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: student.badges.map((badge) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('🎖️', style: TextStyle(fontSize: 12)),
                          const SizedBox(width: 4),
                          Text(
                            badge,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF92400E),
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),

                // Action Buttons: Cheer / Close
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text(
                          'Close',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF475569),
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('🎉 You sent a cheer to ${student.name}!'),
                              backgroundColor: const Color(0xFF0284C7),
                              behavior: SnackBarBehavior.floating,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          );
                        },
                        icon: const Icon(Icons.celebration_rounded, color: Colors.white, size: 16),
                        label: const Text(
                          'Cheer Student 🎉',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            fontFamily: 'Outfit',
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildModalMetricBox(String label, String value, String icon, Color textColor, Color bgColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: textColor.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Text(icon, style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 3),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: textColor,
                fontFamily: 'Outfit',
              ),
            ),
            const SizedBox(height: 1),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 8.5,
                fontWeight: FontWeight.w600,
                color: textColor.withValues(alpha: 0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- DATA MODEL FOR SECTION-WISE STUDENT PROGRESS ---
class StudentSectionProgressItem {
  final String id;
  final String name;
  final String rollNumber;
  final String section;
  final String grade;
  final int rank;
  final double overallProgress;
  final int completedLessons;
  final int totalLessons;
  final int streakDays;
  final int xp;
  final int attendance;
  final Color avatarColor;
  final bool isCurrentUser;
  final String highlightBadge;
  final List<String> badges;
  final Map<String, double> subjectProgress;

  const StudentSectionProgressItem({
    required this.id,
    required this.name,
    required this.rollNumber,
    required this.section,
    this.grade = '10th Standard',
    required this.rank,
    required this.overallProgress,
    required this.completedLessons,
    this.totalLessons = 40,
    required this.streakDays,
    required this.xp,
    required this.attendance,
    required this.avatarColor,
    this.isCurrentUser = false,
    required this.highlightBadge,
    required this.badges,
    required this.subjectProgress,
  });
}

