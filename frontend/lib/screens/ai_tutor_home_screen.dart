import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../services/course_service.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import '../core/localization/app_localization.dart';
import '../widgets/profile_avatar.dart';
import '../widgets/quick_action_card.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/animated_counter.dart';
import '../core/constants/app_constants.dart';

class AITutorHomeScreen extends StatefulWidget {
  final bool hideBottomNav;
  const AITutorHomeScreen({super.key, this.hideBottomNav = false});

  @override
  State<AITutorHomeScreen> createState() => _AITutorHomeScreenState();
}

class _AITutorHomeScreenState extends State<AITutorHomeScreen> {
  // Base URL Options:
  // Option 1: Production (Vercel) -> https://tn-schools-mobile-app-backend.vercel.app
  // Option 2: Localhost Development -> http://localhost:5000
  static String get _baseUrl => AppConstants.baseUrl;

  int? _nextExamDays;
  String? _nextExamDisplay;
  bool _hasFetchedExam = false;
  String _lastFetchedClass = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final courseService = Provider.of<CourseService>(context);
    final student = courseService.student;
    final rawClass = student.grade.isNotEmpty
        ? student.grade
        : student.classStandard.replaceAll(RegExp(r'\D'), '');
    final studentClass = rawClass.isNotEmpty ? rawClass : '6';

    if (!_hasFetchedExam || _lastFetchedClass != studentClass) {
      _hasFetchedExam = true;
      _lastFetchedClass = studentClass;
      _fetchNextExam(
        student.schoolId ?? 'd9962dbb-f572-47a4-8240-6eef99b5c5bb',
        studentClass,
      );
    }
  }

  Future<void> _fetchNextExam(String schoolId, String studentClass) async {
    try {
      final params = <String>[];
      if (schoolId.isNotEmpty) params.add('schoolId=$schoolId');
      if (studentClass.isNotEmpty) params.add('class=$studentClass');

      final url = '$_baseUrl/api/exam-schedule${params.isNotEmpty ? '?${params.join('&')}' : ''}';
      final courseService = Provider.of<CourseService>(context, listen: false);
      final res = await http.get(Uri.parse(url), headers: courseService.authHeaders).timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true && json['data'] is List) {
          final list = json['data'] as List;
          final now = DateTime.now();

          final upcomingExams = list.where((e) {
            final st = (e['status'] ?? '').toString().toLowerCase();
            return st != 'cancelled' && st != 'completed';
          }).map((e) {
            final dateStr = (e['examDate'] ?? '').toString();
            final startTime = (e['startTime'] ?? '09:00 AM').toString();
            final target = _parseExamDateTime(dateStr, startTime);
            return {...(e as Map<String, dynamic>), 'targetDateTime': target};
          }).where((e) {
            final dt = e['targetDateTime'] as DateTime;
            return dt.isAfter(now);
          }).toList();

          upcomingExams.sort((a, b) {
            final dtA = a['targetDateTime'] as DateTime;
            final dtB = b['targetDateTime'] as DateTime;
            return dtA.compareTo(dtB);
          });

          if (upcomingExams.isNotEmpty) {
            final next = upcomingExams.first;
            final target = next['targetDateTime'] as DateTime;
            final diff = target.difference(now);
            final days = diff.inDays;

            if (mounted) {
              setState(() {
                if (days >= 1) {
                  _nextExamDays = days;
                  _nextExamDisplay = null;
                } else if (diff.inHours >= 1) {
                  _nextExamDays = null;
                  _nextExamDisplay = '${diff.inHours}h';
                } else {
                  _nextExamDays = null;
                  _nextExamDisplay = 'Today';
                }
              });
            }
          } else {
            if (mounted) {
              setState(() {
                _nextExamDays = null;
                _nextExamDisplay = '—';
              });
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching next exam on home screen: $e');
    }
  }

  DateTime _parseExamDateTime(String dateStr, String timeStr) {
    try {
      final cleanDate = dateStr.contains('T') ? dateStr.split('T')[0] : dateStr;
      final timePart = timeStr.split(' - ')[0].trim();
      final isPM = timePart.toUpperCase().contains('PM');
      final isAM = timePart.toUpperCase().contains('AM');

      final numOnly = timePart.replaceAll(RegExp(r'[^\d:]'), '');
      final parts = numOnly.split(':');
      int hours = int.tryParse(parts[0]) ?? 9;
      final minutes = parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0;

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours == 12) hours = 0;

      final dateParts = cleanDate.split('-');
      if (dateParts.length == 3) {
        final y = int.parse(dateParts[0]);
        final m = int.parse(dateParts[1]);
        final d = int.parse(dateParts[2]);
        return DateTime(y, m, d, hours, minutes);
      }
      return DateTime.parse(dateStr);
    } catch (_) {
      return DateTime.tryParse(dateStr) ?? DateTime.now();
    }
  }

  @override
  Widget build(BuildContext context) {
    final courseService = Provider.of<CourseService>(context);
    final student = courseService.student;

    return ValueListenableBuilder<bool>(
      valueListenable: AppLocalization.languageNotifier,
      builder: (context, isTamil, _) {
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: const SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
            statusBarBrightness: Brightness.light,
          ),
          child: Scaffold(
          backgroundColor: Colors.white,
          body: SafeArea(
            child: RefreshIndicator(
              color: AppTheme.primaryEmerald,
              onRefresh: () async {
                final rawClass = student.grade.isNotEmpty
                    ? student.grade
                    : student.classStandard.replaceAll(RegExp(r'\D'), '');
                final studentClass = rawClass.isNotEmpty ? rawClass : '6';
                await _fetchNextExam(
                  student.schoolId ?? 'd9962dbb-f572-47a4-8240-6eef99b5c5bb',
                  studentClass,
                );
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
              padding: EdgeInsets.symmetric(
                horizontal: Responsive.horizontalPadding(context),
                vertical: 12,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Bar Header with Menu, Avatar, Status Dot, Greeting, Notification Bell & Scanner
                  Row(
                    children: [
                      // Hamburger Menu Button
                      GestureDetector(
                        onTap: () => _showNavigationMenu(context),
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: const Color(0xFFE2E8F0),
                              width: 1.0,
                            ),
                          ),
                          child: const Icon(
                            Icons.menu_rounded,
                            color: AppTheme.textDark,
                            size: 22,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Avatar + User Info
                      Expanded(
                        child: Row(
                          children: [
                            Stack(
                              children: [
                                GestureDetector(
                                  onTap: () =>
                                      Navigator.pushNamed(context, '/profile'),
                                  child: ProfileAvatar(
                                    imageUrl: student.avatarUrl,
                                    radius: 22,
                                  ),
                                ),
                                // Green Online Status Dot
                                Positioned(
                                  right: 0,
                                  bottom: 0,
                                  child: Container(
                                    width: 12,
                                    height: 12,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                          color: Colors.white, width: 2),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${AppLocalization.get('good_morning')},',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                  Text(
                                    '${student.name} 👋',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.textDark,
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                  Text(
                                    student.displayClassAndSection,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Color(0xFF64748B),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Right Action 1: Notification Bell Icon with Red Badge "3"
                      GestureDetector(
                        onTap: () =>
                            Navigator.pushNamed(context, '/notifications'),
                        child: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(13),
                            border: Border.all(
                              color: const Color(0xFFE2E8F0),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              const Icon(
                                Icons.notifications_none_rounded,
                                color: AppTheme.textDark,
                                size: 21,
                              ),
                              Positioned(
                                right: 6,
                                top: 6,
                                child: Container(
                                  padding: const EdgeInsets.all(3.5),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 16,
                                    minHeight: 16,
                                  ),
                                  child: const Center(
                                    child: Text(
                                      '3',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        height: 1.0,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Right Action 2: Digital ID / QR Scanner Button
                      GestureDetector(
                        onTap: () => _showStudentIdCard(context),
                        child: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(13),
                            border: Border.all(
                              color: const Color(0xFFE2E8F0),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.qr_code_scanner_rounded,
                            color: AppTheme.textDark,
                            size: 21,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Main Hero Banner Card - AI Learning Assistant with original blue homebanner.png
                  ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Stack(
                      children: [
                        // Full-width banner background image
                        Image.asset(
                          'assets/images/home/homebanner.png',
                          width: double.infinity,
                          height: 215,
                          fit: BoxFit.cover,
                        ),

                        // Soft transparent gradient on the left for maximum readability
                        Container(
                          width: double.infinity,
                          height: 215,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                              colors: [
                                const Color(0xFF0066FF).withValues(alpha: 0.70),
                                const Color(0xFF0066FF).withValues(alpha: 0.25),
                                Colors.transparent,
                              ],
                              stops: const [0.0, 0.52, 0.82],
                            ),
                          ),
                        ),

                        // Text + CTA Button overlay on the left
                        Positioned.fill(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                // Top Tag: AI Learning Assistant
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.22),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: Colors.white.withValues(alpha: 0.35),
                                      width: 1,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.auto_awesome_rounded,
                                        color: Colors.white,
                                        size: 11,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        AppLocalization.get('ai_learning_assistant'),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w600,
                                          letterSpacing: 0.2,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                // Headline Title: Learn Smarter, Grow Faster
                                ConstrainedBox(
                                  constraints: BoxConstraints(
                                    maxWidth: MediaQuery.of(context).size.width * 0.58,
                                  ),
                                  child: Text(
                                    AppLocalization.get('ai_tutor_title'),
                                    maxLines: 2,
                                    style: const TextStyle(
                                      fontSize: 19,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                      fontFamily: 'Outfit',
                                      height: 1.15,
                                      letterSpacing: -0.2,
                                    ),
                                  ),
                                ),

                                // Subtitle
                                ConstrainedBox(
                                  constraints: BoxConstraints(
                                    maxWidth: MediaQuery.of(context).size.width * 0.54,
                                  ),
                                  child: Text(
                                    AppLocalization.get('ai_tutor_subtitle'),
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      color: Colors.white.withValues(alpha: 0.90),
                                      height: 1.25,
                                      fontWeight: FontWeight.w400,
                                    ),
                                  ),
                                ),

                                // Single Pill Button: Start Learning ->
                                ElevatedButton(
                                  onPressed: () => Navigator.pushNamed(
                                      context, '/all-classes'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: const Color(0xFF0F172A),
                                    elevation: 2,
                                    shadowColor:
                                        Colors.black.withValues(alpha: 0.15),
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 8),
                                    minimumSize: Size.zero,
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                    shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(20),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        AppLocalization.get('start_learning'),
                                        style: const TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      const SizedBox(width: 5),
                                      const Icon(
                                        Icons.arrow_forward_rounded,
                                        size: 13,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Stat KPI Cards Row matching reference design
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: [
                        _buildStatCard(
                          type: 'attendance',
                          numericValue: student.attendancePercentage > 0 ? student.attendancePercentage : 92,
                          suffix: '%',
                          progressValue: (student.attendancePercentage > 0 ? student.attendancePercentage : 92) / 100.0,
                          displayPercent: student.attendancePercentage > 0 ? student.attendancePercentage : 92,
                          label: AppLocalization.get('attendance'),
                          color: const Color(0xFF10B981),
                          footerBg: const Color(0xFFF0FDF4),
                          onTap: () =>
                              Navigator.pushNamed(context, '/timetable'),
                        ),
                        _buildStatCard(
                          type: 'academic',
                          numericValue: student.academicScore > 0 ? student.academicScore : 84,
                          suffix: '%',
                          label: AppLocalization.get('academic_score'),
                          color: const Color(0xFF7C3AED),
                          footerBg: const Color(0xFFFAF5FF),
                          onTap: () =>
                              Navigator.pushNamed(context, '/mock-test'),
                        ),
                        _buildStatCard(
                          type: 'next_exam',
                          numericValue: _nextExamDays,
                          stringValue: _nextExamDisplay ?? (_nextExamDays == null ? '—' : null),
                          suffix: _nextExamDays != null
                              ? (isTamil
                                  ? ' நாட்கள்'
                                  : (_nextExamDays == 1 ? ' Day' : ' Days'))
                              : '',
                          label: isTamil ? 'அடுத்த தேர்வு' : 'Next Exam',
                          color: const Color(0xFFEA580C),
                          footerBg: const Color(0xFFFFF7ED),
                          onTap: () =>
                              Navigator.pushNamed(context, '/career'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),

                  // "All Classes" Section Header with "View All >"
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalization.get('all_classes'),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textDark,
                          fontFamily: 'Outfit',
                        ),
                      ),
                      GestureDetector(
                        onTap: () =>
                            Navigator.pushNamed(context, '/all-classes'),
                        child: Row(
                          children: [
                            Text(
                              isTamil ? 'அனைத்தும்' : 'View All',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryEmerald,
                              ),
                            ),
                            const SizedBox(width: 2),
                            const Icon(
                              Icons.chevron_right_rounded,
                              size: 18,
                              color: AppTheme.primaryEmerald,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // 9 Quick Action Cards 3-Column Grid
                  GridView.count(
                    crossAxisCount: 3,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 0.86,
                    children: [
                      QuickActionCard(
                        title: AppLocalization.get('all_classes'),
                        subtitle: isTamil ? 'அனைத்து பாடங்கள்' : 'Explore all your subjects',
                        type: 'all_classes',
                        onTap: () => courseService.setBottomNavIndex(1),
                      ),
                      QuickActionCard(
                        title: AppLocalization.get('my_progress'),
                        subtitle: isTamil ? 'என் முன்னேற்றம்' : 'Track your performance',
                        type: 'my_progress',
                        onTap: () =>
                            Navigator.pushNamed(context, '/progress'),
                      ),
                      QuickActionCard(
                        title: AppLocalization.get('homework'),
                        subtitle: isTamil ? 'வீட்டுப்பாடங்கள்' : 'View and submit homework',
                        type: 'homework',
                        onTap: () =>
                            Navigator.pushNamed(context, '/homework'),
                      ),
                      QuickActionCard(
                        title: AppLocalization.get('timetable'),
                        subtitle: isTamil ? 'வகுப்பு அட்டவணை' : 'Your class schedule',
                        type: 'timetable',
                        onTap: () =>
                            Navigator.pushNamed(context, '/timetable'),
                      ),
                      QuickActionCard(
                        title: AppLocalization.get('digital_library'),
                        subtitle: isTamil ? 'நூலகக் குறிப்புகள்' : 'Books, notes & resources',
                        type: 'library',
                        onTap: () => courseService.setBottomNavIndex(2),
                      ),
                      QuickActionCard(
                        title: AppLocalization.get('career_guidance'),
                        subtitle: isTamil ? 'தேர்வு அட்டவணை & மதிப்பெண்கள்' : 'Timetables, halls & marks',
                        type: 'career',
                        onTap: () => Navigator.pushNamed(context, '/career'),
                      ),
                      QuickActionCard(
                        title: AppLocalization.get('announcements'),
                        subtitle: isTamil ? 'பள்ளி அறிவிப்புகள்' : 'School updates & notices',
                        type: 'announcements',
                        onTap: () =>
                            Navigator.pushNamed(context, '/announcements'),
                      ),
                      QuickActionCard(
                        title: AppLocalization.get('ai_tutor'),
                        subtitle: isTamil ? 'தனிப்பயன் வழிகாட்டி' : 'Ask doubts & learn 24/7',
                        type: 'ai_tutor',
                        onTap: () =>
                            Navigator.pushNamed(context, '/ai-tutor'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ),
          bottomNavigationBar: widget.hideBottomNav
              ? null
              : const CustomBottomNavBar(
                  currentIndex: 0,
                ),
        ),
      );
    },
    );
  }

  Widget _buildStatCard({
    required String type,
    num? numericValue,
    String? suffix,
    String? prefix,
    String? stringValue,
    required String label,
    required Color color,
    required Color footerBg,
    required VoidCallback onTap,
    double? progressValue,
    int? displayPercent,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 152,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: color.withValues(alpha: 0.15),
            width: 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Section with Icon + Value + Label
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  _buildStatIcon(
                    type,
                    color,
                    progressValue: progressValue,
                    displayPercent: displayPercent,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (numericValue != null)
                          AnimatedCountText(
                            value: numericValue,
                            prefix: prefix ?? '',
                            suffix: suffix ?? '',
                            duration: const Duration(milliseconds: 1400),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textDark,
                              fontFamily: 'Outfit',
                            ),
                          )
                        else
                          Text(
                            stringValue ?? '',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textDark,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        const SizedBox(height: 2),
                        Text(
                          label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppTheme.textMedium,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Bottom Action Footer: View Details ->
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 10),
              decoration: BoxDecoration(
                color: footerBg,
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(17),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    AppLocalization.isTamil ? 'விவரங்கள்' : 'View Details',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.arrow_forward_rounded,
                    size: 13,
                    color: color,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatIcon(
    String type,
    Color color, {
    double? progressValue,
    int? displayPercent,
  }) {
    switch (type) {
      case 'attendance':
        final double progress = (progressValue ?? 0.92).clamp(0.0, 1.0);
        final int percent = displayPercent ?? (progress * 100).round();
        return SizedBox(
          width: 38,
          height: 38,
          child: Stack(
            alignment: Alignment.center,
            children: [
              AnimatedCircularProgress(
                value: progress,
                strokeWidth: 3.5,
                backgroundColor: const Color(0xFFD1FAE5),
                color: const Color(0xFF10B981),
                duration: const Duration(milliseconds: 1400),
              ),
              AnimatedCountText(
                value: percent,
                suffix: '%',
                duration: const Duration(milliseconds: 1400),
                style: const TextStyle(
                  fontSize: 8.5,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textDark,
                ),
              ),
            ],
          ),
        );
      case 'academic':
        return Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFF7C3AED),
            borderRadius: BorderRadius.circular(10),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF7C3AED).withValues(alpha: 0.3),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: const Icon(
            Icons.shield_rounded,
            color: Colors.white,
            size: 20,
          ),
        );
      case 'next_exam':
        return Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF7ED),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFFFEDD5)),
          ),
          child: const Icon(
            Icons.calendar_month_rounded,
            color: Color(0xFFEA580C),
            size: 22,
          ),
        );
      case 'reward_coins':
      default:
        return Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFFBBF24), Color(0xFFD97706)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFD97706).withValues(alpha: 0.3),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: const Icon(
            Icons.workspace_premium_rounded,
            color: Colors.white,
            size: 22,
          ),
        );
    }
  }

  void _showNavigationMenu(BuildContext context) {
    final courseService = Provider.of<CourseService>(context, listen: false);
    final student = courseService.student;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return ValueListenableBuilder<bool>(
          valueListenable: AppLocalization.languageNotifier,
          builder: (context, isTamil, _) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Handle bar
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Student Profile Quick Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          ProfileAvatar(imageUrl: student.avatarUrl, radius: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  student.name,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textDark,
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                                Text(
                                  '${student.displayClassAndSection} • ${student.medium}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () {
                              Navigator.pop(ctx);
                              Navigator.pushNamed(context, '/profile');
                            },
                            icon: const Icon(
                              Icons.arrow_forward_ios_rounded,
                              size: 16,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Quick Navigation Items Grid (9 items matching Home screen)
                    GridView.count(
                      crossAxisCount: 3,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 8,
                      childAspectRatio: 1.02,
                      children: [
                        _buildMenuTile(
                          icon: Icons.school_rounded,
                          label: AppLocalization.get('all_classes'),
                          color: const Color(0xFF0066FF),
                          bg: const Color(0xFFEFF6FF),
                          onTap: () {
                            Navigator.pop(ctx);
                            courseService.setBottomNavIndex(1);
                          },
                        ),
                        _buildMenuTile(
                          icon: Icons.insights_rounded,
                          label: AppLocalization.get('my_progress'),
                          color: const Color(0xFF8B5CF6),
                          bg: const Color(0xFFF5F3FF),
                          onTap: () {
                            Navigator.pop(ctx);
                            Navigator.pushNamed(context, '/progress');
                          },
                        ),
                        _buildMenuTile(
                          icon: Icons.assignment_rounded,
                          label: AppLocalization.get('homework'),
                          color: const Color(0xFFF59E0B),
                          bg: const Color(0xFFFFFBEB),
                          onTap: () {
                            Navigator.pop(ctx);
                            Navigator.pushNamed(context, '/homework');
                          },
                        ),
                        _buildMenuTile(
                          icon: Icons.calendar_today_rounded,
                          label: AppLocalization.get('timetable'),
                          color: const Color(0xFFEC4899),
                          bg: const Color(0xFFFDF2F8),
                          onTap: () {
                            Navigator.pop(ctx);
                            Navigator.pushNamed(context, '/timetable');
                          },
                        ),
                        _buildMenuTile(
                          icon: Icons.local_library_rounded,
                          label: AppLocalization.get('digital_library'),
                          color: const Color(0xFF06B6D4),
                          bg: const Color(0xFFECFEFF),
                          onTap: () {
                            Navigator.pop(ctx);
                            courseService.setBottomNavIndex(2);
                          },
                        ),
                        _buildMenuTile(
                          icon: Icons.explore_rounded,
                          label: AppLocalization.get('career_guidance'),
                          color: const Color(0xFF3B82F6),
                          bg: const Color(0xFFEFF6FF),
                          onTap: () {
                            Navigator.pop(ctx);
                            Navigator.pushNamed(context, '/career');
                          },
                        ),
                        _buildMenuTile(
                          icon: Icons.campaign_rounded,
                          label: AppLocalization.get('announcements'),
                          color: const Color(0xFFE11D48),
                          bg: const Color(0xFFFFF0F3),
                          onTap: () {
                            Navigator.pop(ctx);
                            Navigator.pushNamed(context, '/announcements');
                          },
                        ),
                        _buildMenuTile(
                          icon: Icons.smart_toy_rounded,
                          label: AppLocalization.get('ai_tutor'),
                          color: const Color(0xFF6366F1),
                          bg: const Color(0xFFEEF2FF),
                          onTap: () {
                            Navigator.pop(ctx);
                            Navigator.pushNamed(context, '/ai-tutor');
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Interactive Dual-Segment Language Switcher Card
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: isTamil
                                  ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                  : const Color(0xFF0066FF).withValues(alpha: 0.12),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.language_rounded,
                              size: 18,
                              color: isTamil
                                  ? const Color(0xFF059669)
                                  : const Color(0xFF0066FF),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isTamil ? 'தமிழ் வழி (Tamil Mode)' : 'English Mode (Default)',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textDark,
                                  ),
                                ),
                                Text(
                                  isTamil
                                      ? 'தமிழில் காட்டப்படுகிறது • Switch to EN'
                                      : 'Viewing in English • தமிழுக்கு மாறுக',
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Switch.adaptive(
                            value: isTamil,
                            activeTrackColor: const Color(0xFF0066FF),
                            onChanged: (val) {
                              AppLocalization.isTamil = val;
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildMenuTile({
    required IconData icon,
    required String label,
    required Color color,
    required Color bg,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: color.withValues(alpha: 0.2)),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 5),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: AppTheme.textDark,
              height: 1.15,
            ),
          ),
        ],
      ),
    );
  }

  void _showStudentIdCard(BuildContext context) {
    final courseService = Provider.of<CourseService>(context, listen: false);
    final student = courseService.student;

    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.55),
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final cardWidth = math.min(constraints.maxWidth * 0.92, 335.0);
            final scale = (cardWidth / 335.0).clamp(0.78, 1.0);

            return ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: cardWidth,
                maxHeight: constraints.maxHeight,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Floating Close Button above Card (leaves ID Card 100% clean)
                  Align(
                    alignment: Alignment.topRight,
                    child: GestureDetector(
                      onTap: () => Navigator.pop(ctx),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        width: 28 * scale,
                        height: 28 * scale,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.18),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.close_rounded,
                          size: 16 * scale,
                          color: const Color(0xFF334155),
                        ),
                      ),
                    ),
                  ),

                  // Official Student ID Card (Matching Image Design)
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(26),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF047857).withValues(alpha: 0.18),
                          blurRadius: 26,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(
                      children: [
                        // Top-left organic layered green wave accent
                        Positioned(
                          top: 0,
                          left: 0,
                          child: CustomPaint(
                            size: Size(56 * scale, 108 * scale),
                            painter: _TopCornerWavePainter(),
                          ),
                        ),

                        // Scrollable ID Card Body
                        SingleChildScrollView(
                          physics: const BouncingScrollPhysics(),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(height: 14 * scale),

                              // Top Header Row: Emblem + School Name (Centered)
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 16 * scale),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    // Official Government School Emblem
                                    GovernmentSchoolEmblem(
                                      size: 40 * scale,
                                      color: const Color(0xFF0C6E4E),
                                    ),
                                    SizedBox(width: 8 * scale),

                                    // School Header Text (Center aligned)
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          'Government School',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 16 * scale,
                                            fontWeight: FontWeight.w900,
                                            color: const Color(0xFF0C4D37),
                                            fontFamily: 'Outfit',
                                            letterSpacing: -0.2,
                                          ),
                                        ),
                                        const SizedBox(height: 1.5),
                                        Text(
                                          'LEARN  •  GROW  •  SUCCEED',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 7.5 * scale,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 1.3,
                                            color: const Color(0xFF0C4D37),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(height: 12 * scale),

                              // Avatar Section with Decorative Mint Capsules & Halo
                              SizedBox(
                                height: 112 * scale,
                                child: Stack(
                                  alignment: Alignment.center,
                                  clipBehavior: Clip.none,
                                  children: [
                                    // Diagonal Pill 1 (Upper Left background bar)
                                    Positioned(
                                      left: (cardWidth / 2) - (84 * scale),
                                      top: 24 * scale,
                                      child: Transform.rotate(
                                        angle: -0.62,
                                        child: Container(
                                          width: 76 * scale,
                                          height: 15 * scale,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF86EFAC)
                                                .withValues(alpha: 0.70),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                        ),
                                      ),
                                    ),

                                    // Diagonal Pill 2 (Lower Left background bar)
                                    Positioned(
                                      left: (cardWidth / 2) - (74 * scale),
                                      top: 64 * scale,
                                      child: Transform.rotate(
                                        angle: -0.62,
                                        child: Container(
                                          width: 50 * scale,
                                          height: 13 * scale,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF86EFAC)
                                                .withValues(alpha: 0.65),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                        ),
                                      ),
                                    ),

                                    // Diagonal Pill 3 (Upper Right background bar)
                                    Positioned(
                                      right: (cardWidth / 2) - (80 * scale),
                                      top: 18 * scale,
                                      child: Transform.rotate(
                                        angle: -0.62,
                                        child: Container(
                                          width: 56 * scale,
                                          height: 14 * scale,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF86EFAC)
                                                .withValues(alpha: 0.70),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                        ),
                                      ),
                                    ),

                                    // Solid Green Dot (Middle Right)
                                    Positioned(
                                      right: (cardWidth / 2) - (74 * scale),
                                      top: 48 * scale,
                                      child: Container(
                                        width: 12 * scale,
                                        height: 12 * scale,
                                        decoration: const BoxDecoration(
                                          color: Color(0xFF22C55E),
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ),

                                    // Circular Avatar with Emerald Halo Ring
                                    Container(
                                      width: 94 * scale,
                                      height: 94 * scale,
                                      padding: const EdgeInsets.all(3.0),
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: const Color(0xFF10B981),
                                          width: 3.5,
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: const Color(0xFF10B981)
                                                .withValues(alpha: 0.25),
                                            blurRadius: 14,
                                            offset: const Offset(0, 3),
                                          ),
                                        ],
                                      ),
                                      child: ProfileAvatar(
                                        imageUrl: student.avatarUrl,
                                        radius: 42 * scale,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(height: 8 * scale),

                              // Student Name
                              Text(
                                student.name.isNotEmpty ? student.name : 'Praveen',
                                style: TextStyle(
                                  fontSize: 22 * scale,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF0F172A),
                                  fontFamily: 'Outfit',
                                  letterSpacing: -0.2,
                                ),
                              ),
                              SizedBox(height: 4 * scale),

                              // Roll Number Pill Badge
                              Container(
                                padding: EdgeInsets.symmetric(
                                  horizontal: 18 * scale,
                                  vertical: 5 * scale,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE8F8F0),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Text(
                                  student.rollNumber.isNotEmpty
                                      ? 'Roll No: ${student.rollNumber}'
                                      : 'Roll No: ER00001',
                                  style: TextStyle(
                                    fontSize: 12 * scale,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF065F46),
                                  ),
                                ),
                              ),
                              SizedBox(height: 14 * scale),

                              // Information Card (Class, School, Medium)
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 16 * scale),
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: const Color(0xFFF1F5F9),
                                      width: 1.2,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.04),
                                        blurRadius: 10,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    children: [
                                      _buildIdCardRow(
                                        scale: scale,
                                        icon: Icons.school_rounded,
                                        label: 'Class',
                                        value: student.displayClassAndSection.isNotEmpty
                                            ? student.displayClassAndSection
                                            : '6th Standard - A Section',
                                      ),
                                      const Divider(
                                        height: 1,
                                        thickness: 1,
                                        color: Color(0xFFF1F5F9),
                                      ),
                                      _buildIdCardRow(
                                        scale: scale,
                                        icon: Icons.apartment_rounded,
                                        label: 'School',
                                        value: student.schoolName.isNotEmpty
                                            ? student.schoolName
                                            : 'E.R higher Secondary School',
                                      ),
                                      const Divider(
                                        height: 1,
                                        thickness: 1,
                                        color: Color(0xFFF1F5F9),
                                      ),
                                      _buildIdCardRow(
                                        scale: scale,
                                        icon: Icons.translate_rounded,
                                        label: 'Medium',
                                        value: student.medium.isNotEmpty
                                            ? (student.medium.toLowerCase().contains('medium')
                                                ? student.medium
                                                : '${student.medium} Medium')
                                            : 'English Medium',
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              SizedBox(height: 14 * scale),

                              // Bottom Verification Section: QR Code & School Watermark with Slogan
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 18 * scale),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    // QR Code Column
                                    Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        CustomPaint(
                                          painter: _QrBracketsPainter(
                                            color: const Color(0xFF10B981),
                                            bracketLength: 10 * scale,
                                            strokeWidth: 2.4,
                                          ),
                                          child: Container(
                                            padding: EdgeInsets.all(5 * scale),
                                            child: Icon(
                                              Icons.qr_code_2_rounded,
                                              size: 58 * scale,
                                              color: const Color(0xFF0F172A),
                                            ),
                                          ),
                                        ),
                                        SizedBox(height: 4 * scale),
                                        Text(
                                          'SCAN FOR DIGITAL VERIFICATION',
                                          style: TextStyle(
                                            fontSize: 7.2 * scale,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.5,
                                            color: const Color(0xFF64748B),
                                          ),
                                        ),
                                      ],
                                    ),
                                    SizedBox(width: 12 * scale),

                                    // School Building Watermark with Slogan
                                    Expanded(
                                      child: Stack(
                                        alignment: Alignment.center,
                                        children: [
                                          // School Watermark Illustration
                                          CustomPaint(
                                            size: Size(115 * scale, 50 * scale),
                                            painter: _SchoolWatermarkPainter(
                                              color: const Color(0xFFCCEADE),
                                            ),
                                          ),
                                          // Slanted Slogan Script
                                          Transform.rotate(
                                            angle: -0.06,
                                            child: Column(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Text(
                                                  'Better Students',
                                                  style: TextStyle(
                                                    fontStyle: FontStyle.italic,
                                                    fontWeight: FontWeight.w900,
                                                    fontSize: 12.5 * scale,
                                                    color: const Color(0xFF0C6E4E),
                                                    letterSpacing: -0.2,
                                                  ),
                                                ),
                                                Text(
                                                  'Brighter Future',
                                                  style: TextStyle(
                                                    fontStyle: FontStyle.italic,
                                                    fontWeight: FontWeight.w900,
                                                    fontSize: 12.5 * scale,
                                                    color: const Color(0xFF0C6E4E),
                                                    letterSpacing: -0.2,
                                                  ),
                                                ),
                                                const SizedBox(height: 2.0),
                                                SizedBox(
                                                  width: 82 * scale,
                                                  height: 5.5 * scale,
                                                  child: CustomPaint(
                                                    painter: _SwooshPainter(
                                                      color: const Color(0xFF0C6E4E),
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
                              ),
                              SizedBox(height: 12 * scale),

                              // Bottom Deep Emerald Wave Banner
                              SizedBox(
                                width: double.infinity,
                                height: 42 * scale,
                                child: Stack(
                                  children: [
                                    Positioned.fill(
                                      child: CustomPaint(
                                        painter: _BottomWavePainter(),
                                      ),
                                    ),
                                    Align(
                                      alignment: const Alignment(0.60, 0.40),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            Icons.verified_user_outlined,
                                            color: Colors.white,
                                            size: 13 * scale,
                                          ),
                                          SizedBox(width: 5 * scale),
                                          Text(
                                            'EDUCATION BUILDS TOMORROW',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 8.2 * scale,
                                              fontWeight: FontWeight.w800,
                                              letterSpacing: 1.2,
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
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildIdCardRow({
    required double scale,
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 14 * scale, vertical: 8 * scale),
      child: Row(
        children: [
          // Round Green Icon Badge
          Container(
            width: 36 * scale,
            height: 36 * scale,
            decoration: const BoxDecoration(
              color: Color(0xFF0D9488),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: Colors.white,
              size: 19 * scale,
            ),
          ),
          SizedBox(width: 12 * scale),

          // Label & Value
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 10.5 * scale,
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 1.5),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5 * scale,
                    color: const Color(0xFF0F172A),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Official Government School Emblem Widget
class GovernmentSchoolEmblem extends StatelessWidget {
  final double size;
  final Color color;

  const GovernmentSchoolEmblem({
    super.key,
    this.size = 44,
    this.color = const Color(0xFF0C6E4E),
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _EmblemPainter(color: color),
      ),
    );
  }
}

class _EmblemPainter extends CustomPainter {
  final Color color;
  _EmblemPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final w = size.width;
    final h = size.height;
    final center = Offset(w / 2, h / 2 + 1);

    // Outer Laurel Wreath Arcs
    final leftRect = Rect.fromCircle(center: center, radius: w * 0.40);
    canvas.drawArc(leftRect, 1.8, 2.7, false, strokePaint);

    final rightRect = Rect.fromCircle(center: center, radius: w * 0.40);
    canvas.drawArc(rightRect, 4.9, 2.7, false, strokePaint);

    // Laurel leaves along the wreath arcs
    for (int i = 0; i < 4; i++) {
      final aL = 2.1 + i * 0.58;
      final xL = center.dx + (w * 0.40) * math.cos(aL);
      final yL = center.dy + (w * 0.40) * math.sin(aL);
      canvas.drawCircle(Offset(xL, yL), 1.9, fillPaint);

      final aR = 5.3 + i * 0.58;
      final xR = center.dx + (w * 0.40) * math.cos(aR);
      final yR = center.dy + (w * 0.40) * math.sin(aR);
      canvas.drawCircle(Offset(xR, yR), 1.9, fillPaint);
    }

    // Top 5-pointed star
    _drawStar(canvas, Offset(w / 2, h * 0.18), w * 0.08, fillPaint);

    // Open Book in Center
    _drawOpenBook(canvas, Offset(w / 2, center.dy + h * 0.05), w * 0.46, h * 0.28, strokePaint);
  }

  void _drawStar(Canvas canvas, Offset c, double r, Paint p) {
    final path = Path();
    for (int i = 0; i < 5; i++) {
      final a1 = -math.pi / 2 + i * 2 * math.pi / 5;
      final a2 = a1 + math.pi / 5;
      final p1 = Offset(c.dx + r * math.cos(a1), c.dy + r * math.sin(a1));
      final p2 = Offset(c.dx + (r * 0.46) * math.cos(a2), c.dy + (r * 0.46) * math.sin(a2));
      if (i == 0) {
        path.moveTo(p1.dx, p1.dy);
      } else {
        path.lineTo(p1.dx, p1.dy);
      }
      path.lineTo(p2.dx, p2.dy);
    }
    path.close();
    canvas.drawPath(path, p);
  }

  void _drawOpenBook(Canvas canvas, Offset c, double bw, double bh, Paint stroke) {
    final path = Path();
    final left = c.dx - bw / 2;
    final right = c.dx + bw / 2;
    final top = c.dy - bh / 2;
    final bottom = c.dy + bh / 2;

    // Left page
    path.moveTo(c.dx, bottom);
    path.quadraticBezierTo(c.dx - bw * 0.26, bottom + 2.5, left, bottom);
    path.lineTo(left, top);
    path.quadraticBezierTo(c.dx - bw * 0.26, top + 3.2, c.dx, top + 1);

    // Right page
    path.quadraticBezierTo(c.dx + bw * 0.26, top + 3.2, right, top);
    path.lineTo(right, bottom);
    path.quadraticBezierTo(c.dx + bw * 0.26, bottom + 2.5, c.dx, bottom);
    path.close();

    canvas.drawPath(path, stroke);

    // Book spine line
    canvas.drawLine(Offset(c.dx, top + 1), Offset(c.dx, bottom), stroke);

    // Subtle page inner line
    final linePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawLine(
      Offset(c.dx - bw * 0.1, top + bh * 0.38),
      Offset(c.dx - bw * 0.35, top + bh * 0.38),
      linePaint,
    );
    canvas.drawLine(
      Offset(c.dx + bw * 0.1, top + bh * 0.38),
      Offset(c.dx + bw * 0.35, top + bh * 0.38),
      linePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Top Left Corner Wave accent (organic two-tone sweep)
class _TopCornerWavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Layer 1: Vibrant emerald outer wave
    final outerPaint = Paint()
      ..color = const Color(0xFF10B981)
      ..style = PaintingStyle.fill;

    final outerPath = Path()
      ..moveTo(0, 0)
      ..lineTo(w, 0)
      ..quadraticBezierTo(w * 0.40, h * 0.42, 0, h)
      ..close();
    canvas.drawPath(outerPath, outerPaint);

    // Layer 2: Deep forest green inner wave
    final innerPaint = Paint()
      ..color = const Color(0xFF065F46)
      ..style = PaintingStyle.fill;

    final innerPath = Path()
      ..moveTo(0, 0)
      ..lineTo(w * 0.70, 0)
      ..quadraticBezierTo(w * 0.22, h * 0.38, 0, h * 0.82)
      ..close();
    canvas.drawPath(innerPath, innerPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Corner Brackets around QR Code
class _QrBracketsPainter extends CustomPainter {
  final Color color;
  final double bracketLength;
  final double strokeWidth;

  _QrBracketsPainter({
    required this.color,
    required this.bracketLength,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final w = size.width;
    final h = size.height;
    final l = bracketLength;

    // Top-Left
    canvas.drawLine(Offset(0, l), const Offset(0, 0), paint);
    canvas.drawLine(const Offset(0, 0), Offset(l, 0), paint);

    // Top-Right
    canvas.drawLine(Offset(w - l, 0), Offset(w, 0), paint);
    canvas.drawLine(Offset(w, 0), Offset(w, l), paint);

    // Bottom-Left
    canvas.drawLine(Offset(0, h - l), Offset(0, h), paint);
    canvas.drawLine(Offset(0, h), Offset(l, h), paint);

    // Bottom-Right
    canvas.drawLine(Offset(w - l, h), Offset(w, h), paint);
    canvas.drawLine(Offset(w, h), Offset(w, h - l), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// School Building Watermark Illustration
class _SchoolWatermarkPainter extends CustomPainter {
  final Color color;
  _SchoolWatermarkPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final strokePaint = Paint()
      ..color = const Color(0xFFA8DFC6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final fillPaint = Paint()
      ..color = const Color(0xFFE5F5ED)
      ..style = PaintingStyle.fill;

    final windowPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.85)
      ..style = PaintingStyle.fill;

    final w = size.width;
    final h = size.height;

    // Dimensions
    final centerW = w * 0.40;
    final centerH = h * 0.62;
    final centerX = (w - centerW) / 2;
    final centerY = h - centerH;

    final wingW = w * 0.28;
    final wingH = h * 0.42;
    final wingY = h - wingH;

    // Left Wing
    final leftWingRect = Rect.fromLTWH(0, wingY, wingW, wingH);
    canvas.drawRect(leftWingRect, fillPaint);
    canvas.drawRect(leftWingRect, strokePaint);

    // Right Wing
    final rightWingRect = Rect.fromLTWH(w - wingW, wingY, wingW, wingH);
    canvas.drawRect(rightWingRect, fillPaint);
    canvas.drawRect(rightWingRect, strokePaint);

    // Center Tower
    final centerRect = Rect.fromLTWH(centerX, centerY, centerW, centerH);
    canvas.drawRect(centerRect, fillPaint);
    canvas.drawRect(centerRect, strokePaint);

    // Pediment Triangle
    final pediment = Path()
      ..moveTo(centerX - 2, centerY)
      ..lineTo(w / 2, centerY - h * 0.25)
      ..lineTo(centerX + centerW + 2, centerY)
      ..close();
    canvas.drawPath(pediment, fillPaint);
    canvas.drawPath(pediment, strokePaint);

    // Clock
    final clockCenter = Offset(w / 2, centerY - h * 0.10);
    canvas.drawCircle(clockCenter, 5.5, windowPaint);
    canvas.drawCircle(clockCenter, 5.5, strokePaint);
    canvas.drawLine(clockCenter, Offset(clockCenter.dx, clockCenter.dy - 3), strokePaint);
    canvas.drawLine(clockCenter, Offset(clockCenter.dx + 2.5, clockCenter.dy), strokePaint);

    // Roof top flag / finial
    canvas.drawLine(Offset(w / 2, centerY - h * 0.25), Offset(w / 2, centerY - h * 0.35), strokePaint);

    // Windows in wings
    for (int col = 0; col < 2; col++) {
      for (int row = 0; row < 2; row++) {
        final rLeft = Rect.fromLTWH(4.0 + col * 12.0, wingY + 4.0 + row * 10.0, 8, 7);
        canvas.drawRRect(RRect.fromRectAndRadius(rLeft, const Radius.circular(1.5)), windowPaint);
        canvas.drawRRect(RRect.fromRectAndRadius(rLeft, const Radius.circular(1.5)), strokePaint);

        final rRight = Rect.fromLTWH(w - wingW + 4.0 + col * 12.0, wingY + 4.0 + row * 10.0, 8, 7);
        canvas.drawRRect(RRect.fromRectAndRadius(rRight, const Radius.circular(1.5)), windowPaint);
        canvas.drawRRect(RRect.fromRectAndRadius(rRight, const Radius.circular(1.5)), strokePaint);
      }
    }

    // Windows in Center Tower
    for (int col = 0; col < 2; col++) {
      final rCenter = Rect.fromLTWH(centerX + 6.0 + col * 18.0, centerY + 6.0, 10, 9);
      canvas.drawRRect(RRect.fromRectAndRadius(rCenter, const Radius.circular(1.5)), windowPaint);
      canvas.drawRRect(RRect.fromRectAndRadius(rCenter, const Radius.circular(1.5)), strokePaint);
    }

    // Main Center Entrance Door
    final doorRect = Rect.fromLTWH(w / 2 - 8, h - 14, 16, 14);
    canvas.drawRRect(RRect.fromRectAndRadius(doorRect, const Radius.circular(2.5)), windowPaint);
    canvas.drawRRect(RRect.fromRectAndRadius(doorRect, const Radius.circular(2.5)), strokePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Bottom Wave Painter with layered crest and deep emerald gradient
class _BottomWavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Lighter emerald top crest accent wave
    final crestPaint = Paint()
      ..color = const Color(0xFF10B981)
      ..style = PaintingStyle.fill;

    final crestPath = Path()
      ..moveTo(0, h * 0.35)
      ..quadraticBezierTo(w * 0.45, 0, w, h * 0.15)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(crestPath, crestPaint);

    // Deep forest green main wave with gradient
    final gradient = const LinearGradient(
      colors: [Color(0xFF047857), Color(0xFF065F46)],
      begin: Alignment.centerLeft,
      end: Alignment.centerRight,
    );

    final wavePaint = Paint()
      ..shader = gradient.createShader(Rect.fromLTWH(0, 0, w, h))
      ..style = PaintingStyle.fill;

    final wavePath = Path()
      ..moveTo(0, h * 0.45)
      ..quadraticBezierTo(w * 0.45, h * 0.10, w, h * 0.25)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(wavePath, wavePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Slogan curved swoosh flourish underline
class _SwooshPainter extends CustomPainter {
  final Color color;
  _SwooshPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;

    final path = Path();
    path.moveTo(2, size.height * 0.25);
    path.quadraticBezierTo(
      size.width * 0.52,
      size.height * 0.95,
      size.width - 2,
      size.height * 0.15,
    );
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

