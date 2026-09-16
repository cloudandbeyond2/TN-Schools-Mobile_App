import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/localization/app_localization.dart';
import '../services/course_service.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/animated_counter.dart';
import '../core/constants/app_constants.dart';

class TimetableAttendanceScreen extends StatefulWidget {
  const TimetableAttendanceScreen({super.key});

  @override
  State<TimetableAttendanceScreen> createState() =>
      _TimetableAttendanceScreenState();
}

class _TimetableAttendanceScreenState
    extends State<TimetableAttendanceScreen> {
  // Base URL Options:
  // Option 1: Production (Vercel) -> https://tn-schools-mobile-app-backend.vercel.app
  // Option 2: Localhost Development -> http://localhost:5000
  static const String _baseUrl = AppConstants.baseUrl;

  int _selectedDayIndex = 0; // Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5
  final List<String> _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  bool _isLoading = false;
  bool _hasInitialFetched = false;
  List<Map<String, dynamic>> _allTimetableSlots = [];

  @override
  void initState() {
    super.initState();
    // Default to today's weekday if Monday to Saturday
    final todayWeekday = DateTime.now().weekday; // 1 = Monday ... 7 = Sunday
    if (todayWeekday >= 1 && todayWeekday <= 6) {
      _selectedDayIndex = todayWeekday - 1;
    } else {
      _selectedDayIndex = 0;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_hasInitialFetched) {
      _hasInitialFetched = true;
      _fetchTimetable();
    }
  }

  // ─── 1. DAILY TIMETABLE + UPCOMING CLASSES FETCH ──────────────────────────
  Future<void> _fetchTimetable() async {
    final courseService = Provider.of<CourseService>(context, listen: false);
    final student = courseService.student;

    final schoolId = student.schoolId ?? '';
    final cleanClass = student.classStandard.replaceAll(RegExp(r'\D'), '');
    final cleanSection = student.section;

    debugPrint('📅 Timetable: Fetching for schoolId=$schoolId, class=$cleanClass, section=$cleanSection');

    setState(() => _isLoading = true);

    try {
      final queryParams = <String>[];
      if (schoolId.isNotEmpty) queryParams.add('schoolId=$schoolId');
      if (cleanClass.isNotEmpty) queryParams.add('class=$cleanClass');
      if (cleanSection.isNotEmpty) queryParams.add('section=$cleanSection');

      final url = '$_baseUrl/api/timetable${queryParams.isNotEmpty ? '?${queryParams.join('&')}' : ''}';
      debugPrint('📅 Timetable URL: $url');

      final res = await http.get(Uri.parse(url), headers: courseService.authHeaders).timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true && json['data'] is List && (json['data'] as List).isNotEmpty) {
          final List<Map<String, dynamic>> slots = [];
          for (final item in json['data']) {
            if (item is Map) {
              slots.add(Map<String, dynamic>.from(item));
            }
          }
          if (mounted) {
            setState(() {
              _allTimetableSlots = slots;
              _isLoading = false;
            });
          }
          return;
        }
      }

      // School has not published a timetable for this class yet
      if (mounted) {
        setState(() {
          _allTimetableSlots = [];
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('❌ Timetable fetch error: $e');
      if (mounted) {
        setState(() {
          _allTimetableSlots = [];
          _isLoading = false;
        });
      }
    }
  }

  // Helper to convert time strings (e.g. "09:30", "1:30 PM") to total minutes from midnight
  int _toMinutes(dynamic timeVal) {
    if (timeVal == null) return 0;
    final str = timeVal.toString().trim();
    if (str.isEmpty) return 0;

    final isPM = str.toUpperCase().contains('PM');
    final isAM = str.toUpperCase().contains('AM');

    final clean = str.replaceAll(RegExp(r'[^\d:]'), '');
    final parts = clean.split(':');
    if (parts.isEmpty) return 0;

    int hour = int.tryParse(parts[0]) ?? 0;
    final minute = parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0;

    if (isPM && hour < 12) hour += 12;
    if (isAM && hour == 12) hour = 0;

    return hour * 60 + minute;
  }

  // Helper to format time strings cleanly into 12-hour format with AM/PM
  String _fmtTime(dynamic timeVal) {
    if (timeVal == null) return '';
    final str = timeVal.toString().trim();
    if (str.isEmpty) return '';

    if (str.toUpperCase().contains('AM') || str.toUpperCase().contains('PM')) {
      return str;
    }

    final parts = str.split(':');
    if (parts.length >= 2) {
      final hour = int.tryParse(parts[0]) ?? 0;
      final minute = int.tryParse(parts[1]) ?? 0;
      final period = hour >= 12 ? 'PM' : 'AM';
      final h12 = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      final minStr = minute.toString().padLeft(2, '0');
      return '$h12:$minStr $period';
    }
    return str;
  }

  // Dynamic subject color
  Color _getSubjectColor(String subject) {
    final s = subject.toLowerCase();
    if (s.contains('math')) return const Color(0xFF8B5CF6); // Purple
    if (s.contains('sci')) return const Color(0xFF10B981); // Emerald
    if (s.contains('tam')) return const Color(0xFFF97316); // Orange
    if (s.contains('eng')) return const Color(0xFF3B82F6); // Blue
    if (s.contains('soc') || s.contains('hist') || s.contains('geo')) return const Color(0xFFF59E0B); // Amber
    if (s.contains('comp') || s.contains('ai')) return const Color(0xFF6366F1); // Indigo
    if (s.contains('pet') || s.contains('sport') || s.contains('phys')) return const Color(0xFF06B6D4); // Cyan
    if (s.contains('art') || s.contains('craft')) return const Color(0xFFEC4899); // Pink
    return const Color(0xFF6366F1); // Default Indigo
  }

  String _getDayName(int index, bool isTamil) {
    if (isTamil) {
      const tamilDays = ['திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
      if (index >= 0 && index < tamilDays.length) return tamilDays[index];
    }
    if (index >= 0 && index < _days.length) return _days[index];
    return '';
  }

  @override
  Widget build(BuildContext context) {
    const int attendancePercent = 94;

    return ValueListenableBuilder<bool>(
      valueListenable: AppLocalization.languageNotifier,
      builder: (context, isTamil, _) {
        final selectedDayOfWeek = _selectedDayIndex + 1; // 1 = Mon ... 6 = Sat
        final now = DateTime.now();
        final todayDayOfWeek = now.weekday; // 1 = Mon ... 7 = Sun
        final dayOffset = selectedDayOfWeek - todayDayOfWeek;
        final nowMin = now.hour * 60 + now.minute;

        // Filter slots for current day
        final daySlots = _allTimetableSlots.where((slot) {
          final d = slot['dayOfWeek'];
          if (d is int) return d == selectedDayOfWeek;
          if (d is String) return int.tryParse(d) == selectedDayOfWeek;
          return false;
        }).toList();

        daySlots.sort((a, b) {
          final pa = (a['period'] is int)
              ? a['period'] as int
              : int.tryParse(a['period']?.toString() ?? '0') ?? 0;
          final pb = (b['period'] is int)
              ? b['period'] as int
              : int.tryParse(b['period']?.toString() ?? '0') ?? 0;
          return pa.compareTo(pb);
        });

        // Determine current and next periods if viewing today
        Map<String, dynamic>? currentPeriod;
        final List<Map<String, dynamic>> nextPeriods = [];

        if (dayOffset == 0) {
          for (final slot in daySlots) {
            final startMin = _toMinutes(slot['startTime']);
            final endMin = _toMinutes(slot['endTime']);
            if (startMin <= nowMin && nowMin < endMin) {
              currentPeriod = slot;
            } else if (startMin > nowMin) {
              nextPeriods.add(slot);
            }
          }
        }

        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: const SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
            statusBarBrightness: Brightness.light,
          ),
          child: Scaffold(
            backgroundColor: const Color(0xFFF8FAFC),
            body: SafeArea(
              child: RefreshIndicator(
                color: const Color(0xFF4F46E5),
                onRefresh: _fetchTimetable,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Top App Bar matching Title and Back button
                      _buildTopAppBar(context),
                      const SizedBox(height: 8),

                      // 2. Hero Card Banner below top header (timetable.png + attendance badge)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildHeroCardBanner(attendancePercent),
                      ),
                      const SizedBox(height: 14),

                      // 3. Main Timetable Content
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Section Title: "Weekly Timetable" with Calendar Icon
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEEF2FF),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.calendar_month_rounded,
                                    color: Color(0xFF4F46E5),
                                    size: 18,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  AppLocalization.get('timetable'),
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Day Selector Pills (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday)
                            _buildDaySelectorPills(isTamil),
                            const SizedBox(height: 16),

                            // Period Schedule Cards List
                            if (_isLoading)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 40),
                                child: Center(
                                  child: CircularProgressIndicator(color: Color(0xFF4F46E5)),
                                ),
                              )
                            else if (daySlots.isEmpty)
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEEF2FF),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: const Icon(
                                        Icons.event_busy_rounded,
                                        color: Color(0xFF4F46E5),
                                        size: 24,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      isTamil
                                          ? 'இந்த நாளுக்கான கால அட்டவணை இதுவரை வெளியிடப்படவில்லை'
                                          : 'School has not published a timetable for this class yet',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF64748B),
                                        fontFamily: 'Outfit',
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: daySlots.length,
                                separatorBuilder: (context, index) => const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  final slot = daySlots[index];
                                  final slotPeriod = (slot['period'] is int)
                                      ? slot['period'] as int
                                      : int.tryParse(slot['period']?.toString() ?? '0') ?? 0;

                                  final currentP = (currentPeriod != null)
                                      ? ((currentPeriod['period'] is int)
                                          ? currentPeriod['period'] as int
                                          : int.tryParse(currentPeriod['period']?.toString() ?? '0') ?? 0)
                                      : null;

                                  final nextP = nextPeriods.isNotEmpty
                                      ? ((nextPeriods[0]['period'] is int)
                                          ? nextPeriods[0]['period'] as int
                                          : int.tryParse(nextPeriods[0]['period']?.toString() ?? '0') ?? 0)
                                      : null;

                                  final isNow = currentP == slotPeriod;
                                  final isNext = nextP == slotPeriod;
                                  final done = dayOffset < 0 || (dayOffset == 0 && _toMinutes(slot['endTime']) <= nowMin);

                                  return _buildTimetableSlotCard(
                                    slot,
                                    isNow: isNow,
                                    isNext: isNext,
                                    done: done,
                                    isTamil: isTamil,
                                  );
                                },
                              ),
                            const SizedBox(height: 20),

                            // Bottom Encouragement Banner (timetable2.png)
                            _buildBottomEncouragementBanner(),
                            const SizedBox(height: 24),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            bottomNavigationBar: const TNBottomNavBar(currentIndex: -1),
          ),
        );
      },
    );
  }

  // --- 1. TOP APP BAR ---
  Widget _buildTopAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.chevron_left_rounded,
                color: Color(0xFF0F172A),
                size: 26,
              ),
            ),
          ),
          Expanded(
            child: Text(
              AppLocalization.get('timetable_attendance_title'),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
                fontFamily: 'Outfit',
              ),
            ),
          ),
          const SizedBox(width: 42),
        ],
      ),
    );
  }

  // --- 2. HERO CARD BANNER WITH ATTENDANCE ---
  Widget _buildHeroCardBanner(int attendancePercent) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = (width * 0.46).clamp(155.0, 190.0);

        return Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Image.asset(
                    'assets/images/class/timetable.png',
                    fit: BoxFit.cover,
                    alignment: Alignment.centerRight,
                  ),
                ),
                Positioned(
                  left: 12,
                  bottom: 12,
                  right: width * 0.32,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4).withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFDCFCE7), width: 1.2),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF16A34A).withValues(alpha: 0.08),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 38,
                          height: 38,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              AnimatedCircularProgress(
                                value: attendancePercent / 100.0,
                                strokeWidth: 4.0,
                                backgroundColor: const Color(0xFFDCFCE7),
                                color: const Color(0xFF16A34A),
                                duration: const Duration(milliseconds: 1400),
                              ),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                child: AnimatedCountText(
                                  value: attendancePercent,
                                  suffix: '%',
                                  duration: const Duration(milliseconds: 1400),
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF15803D),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                AppLocalization.get('overall_attendance'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                              const SizedBox(height: 2),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  AnimatedCountText(
                                    value: 47,
                                    duration: const Duration(milliseconds: 1300),
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: Color(0xFF16A34A),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Flexible(
                                    child: Text(
                                      '/50 Days • ${AppLocalization.get('present')}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF16A34A),
                                        fontWeight: FontWeight.w600,
                                      ),
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
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // --- 3. DAY SELECTOR PILLS ---
  Widget _buildDaySelectorPills(bool isTamil) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      clipBehavior: Clip.none,
      child: Row(
        children: List.generate(_days.length, (index) {
          final isSelected = _selectedDayIndex == index;
          final dayName = _getDayName(index, isTamil);

          return GestureDetector(
            onTap: () => setState(() => _selectedDayIndex = index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF4F46E5) : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? const Color(0xFF4F46E5) : const Color(0xFFE2E8F0),
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF4F46E5).withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ]
                    : [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.02),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
              ),
              child: Text(
                dayName,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? Colors.white : const Color(0xFF334155),
                  fontFamily: 'Outfit',
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  // --- 4. TIMETABLE SLOT CARD (Matching React web portal design) ---
  Widget _buildTimetableSlotCard(
    Map<String, dynamic> slot, {
    required bool isNow,
    required bool isNext,
    required bool done,
    required bool isTamil,
  }) {
    final subject = slot['subject']?.toString() ?? 'Subject';
    final period = slot['period']?.toString() ?? '1';
    final startTime = slot['startTime']?.toString() ?? '';
    final endTime = slot['endTime']?.toString() ?? '';
    final col = _getSubjectColor(subject);

    Color borderColor = const Color(0xFFE2E8F0);
    Color bgColor = Colors.white;

    if (isNow) {
      borderColor = const Color(0xFF10B981).withValues(alpha: 0.5); // border-emerald-500/50
      bgColor = const Color(0xFF10B981).withValues(alpha: 0.10); // bg-emerald-500/10
    } else if (isNext) {
      borderColor = const Color(0xFF6366F1).withValues(alpha: 0.4); // border-indigo-500/40
      bgColor = const Color(0xFF6366F1).withValues(alpha: 0.05); // bg-indigo-500/5
    }

    return Opacity(
      opacity: done ? 0.55 : 1.0,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10), // px-3 py-2
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(14), // rounded-xl
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
            // Period badge: w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: col.withValues(alpha: 0.10), // ${subjectColor}1a
                borderRadius: BorderRadius.circular(8), // rounded-lg
              ),
              child: Center(
                child: Text(
                  'P$period',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: col,
                    fontFamily: 'Outfit',
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12), // gap-3

            // Subject & Time info: flex-1 min-w-0
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Subject: text-xs font-bold text-[var(--text-heading)] truncate
                  Text(
                    subject,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                      fontFamily: 'Outfit',
                    ),
                  ),
                  const SizedBox(height: 3),
                  // Time: text-[10px] text-[var(--text-muted)] font-semibold
                  Text(
                    '${_fmtTime(startTime)} – ${_fmtTime(endTime)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                      fontFamily: 'Outfit',
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(width: 8),

            // Status badges: isNow, isNext, done
            if (isNow)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15), // bg-emerald-500/15
                  borderRadius: BorderRadius.circular(20), // rounded-full
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const _PulsingDot(),
                    const SizedBox(width: 5),
                    Text(
                      isTamil ? 'இப்போது' : 'Now',
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: Color(0xFF059669), // text-emerald-600
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
              )
            else if (isNext)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.15), // bg-indigo-500/15
                  borderRadius: BorderRadius.circular(20), // rounded-full
                ),
                child: Text(
                  isTamil ? 'அடுத்து' : 'Up next',
                  style: const TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    color: Color(0xFF4F46E5), // text-indigo-600
                    fontFamily: 'Outfit',
                  ),
                ),
              ),

            if (done) ...[
              const SizedBox(width: 6),
              const Icon(
                Icons.check_rounded,
                size: 15,
                color: Color(0xFF64748B), // text-xs text-[var(--text-muted)]
              ),
            ],
          ],
        ),
      ),
    );
  }

  // --- 5. BOTTOM ENCOURAGEMENT BANNER ---
  Widget _buildBottomEncouragementBanner() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = (width * 0.32).clamp(100.0, 125.0);

        return Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.asset(
              'assets/images/class/timetable2.png',
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
        );
      },
    );
  }
}

// ─── PULSING GREEN DOT WIDGET ───────────────────────────────────────────────
class _PulsingDot extends StatefulWidget {
  const _PulsingDot();

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Opacity(
          opacity: _animation.value,
          child: Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
              color: Color(0xFF10B981),
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }
}
