import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/localization/app_localization.dart';
import '../services/course_service.dart';
import '../widgets/bottom_nav_bar.dart';

class CareerGuidanceScreen extends StatefulWidget {
  const CareerGuidanceScreen({super.key});

  @override
  State<CareerGuidanceScreen> createState() => _CareerGuidanceScreenState();
}

class _CareerGuidanceScreenState extends State<CareerGuidanceScreen> {
  static const String _baseUrl = 'http://localhost:5000';

  String _activeTab = 'calendar'; // 'calendar' | 'marks'
  bool _isLoadingExams = false;
  bool _isLoadingResults = false;
  bool _hasInitialFetched = false;

  List<Map<String, dynamic>> _exams = [];
  List<Map<String, dynamic>> _studentResults = [];

  DateTime _currentTime = DateTime.now();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() => _currentTime = DateTime.now());
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_hasInitialFetched) {
      _hasInitialFetched = true;
      _loadData();
    }
  }

  Future<void> _loadData() async {
    final courseService = Provider.of<CourseService>(context, listen: false);
    final student = courseService.student;

    String schoolId = student.schoolId ?? '';
    String studentId = student.studentId ?? student.id;
    String cls = student.classStandard.replaceAll(RegExp(r'\D'), '');
    if (cls.isEmpty) cls = '6';

    // 1. Resolve student profile from DB if schoolId or class is missing
    if (student.id.isNotEmpty) {
      try {
        final profileRes = await http
            .get(Uri.parse('$_baseUrl/api/students?userId=${student.id}'))
            .timeout(const Duration(seconds: 5));
        if (profileRes.statusCode == 200) {
          final pJson = jsonDecode(profileRes.body);
          if (pJson['success'] == true && pJson['data'] != null) {
            final sData = pJson['data'] is List
                ? (pJson['data'] as List).firstOrNull
                : pJson['data'];
            if (sData != null) {
              schoolId = sData['schoolId']?.toString() ?? schoolId;
              studentId = sData['id']?.toString() ?? studentId;
              final dbCls = (sData['class']?.toString() ?? '').replaceAll(RegExp(r'\D'), '');
              if (dbCls.isNotEmpty) cls = dbCls;
            }
          }
        }
      } catch (err) {
        debugPrint('⚠️ Student profile resolve error: $err');
      }
    }

    if (mounted) setState(() {});

    // 2. Fetch Exams and Results in parallel
    await Future.wait([
      _fetchExamsFromDB(schoolId, cls),
      _fetchStudentResults(studentId),
    ]);
  }

  // ─── 1. FETCH EXAMS FROM DB ───────────────────────────────────────────────
  Future<void> _fetchExamsFromDB(String schoolId, String studentClass) async {
    setState(() => _isLoadingExams = true);

    try {
      final params = <String>[];
      if (schoolId.isNotEmpty) params.add('schoolId=$schoolId');
      if (studentClass.isNotEmpty) params.add('class=$studentClass');

      final url = '$_baseUrl/api/exam-schedule${params.isNotEmpty ? '?${params.join('&')}' : ''}';
      debugPrint('📝 Fetching exams: $url');

      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true && json['data'] is List) {
          final mapped = (json['data'] as List).map<Map<String, dynamic>>((item) {
            final startTimeStr = item['startTime']?.toString() ?? '';
            final endTimeStr = item['endTime']?.toString() ?? '';
            final timeSlot = (startTimeStr.isNotEmpty && endTimeStr.isNotEmpty)
                ? '$startTimeStr - $endTimeStr'
                : (item['timeSlot']?.toString() ?? '');

            final rawDate = item['examDate']?.toString() ?? '';
            final dateStr = rawDate.contains('T') ? rawDate.split('T')[0] : rawDate;

            return {
              'id': item['id']?.toString() ?? '',
              'name': item['title']?.toString() ?? 'Exam',
              'classSection': 'Class ${item['class'] ?? ''} (${item['section'] ?? ''})',
              'subject': item['subject']?.toString() ?? 'Subject',
              'date': dateStr,
              'timeSlot': timeSlot,
              'duration': item['duration']?.toString() ?? _calcDurationFromSlot(timeSlot),
              'hall': item['venue']?.toString() ?? 'Main Hall',
              'invigilator': item['invigilator']?.toString() ?? '',
              'status': item['status']?.toString() ?? 'Scheduled',
              'type': item['examType']?.toString() ?? 'Quarterly',
              'examMode': item['examMode']?.toString() ?? 'Theory',
              'theoryMaxMarks': item['theoryMaxMarks'] ?? item['maxMarks'] ?? 100,
              'practicalMaxMarks': item['practicalMaxMarks'] ?? 0,
              'published': item['published'] ?? true,
            };
          }).toList();

          if (mounted) {
            setState(() {
              _exams = mapped;
              _isLoadingExams = false;
            });
          }
          return;
        }
      }

      if (mounted) setState(() => _isLoadingExams = false);
    } catch (err) {
      debugPrint('❌ Failed to fetch exams: $err');
      if (mounted) setState(() => _isLoadingExams = false);
    }
  }

  // ─── 2. FETCH STUDENT MODEL EXAM RESULTS ──────────────────────────────────
  Future<void> _fetchStudentResults(String studentId) async {
    if (studentId.isEmpty) return;

    setState(() => _isLoadingResults = true);

    try {
      final url = '$_baseUrl/api/headmaster/model-exams/student/$studentId';
      final courseService = Provider.of<CourseService>(context, listen: false);
      final token = courseService.student.token;
      final headers = <String, String>{
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      };

      final res = await http.get(Uri.parse(url), headers: headers.isNotEmpty ? headers : null).timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true && json['data'] is List) {
          final uniqueMap = <String, Map<String, dynamic>>{};
          for (final item in json['data']) {
            if (item is Map) {
              final ex = item['exam'] as Map? ?? {};
              final key = '${ex['examName'] ?? ''}_${ex['academicYear'] ?? ''}_${ex['class'] ?? ''}_${ex['section'] ?? ''}_${ex['examType'] ?? ''}';
              if (!uniqueMap.containsKey(key)) {
                uniqueMap[key] = Map<String, dynamic>.from(item);
              }
            }
          }
          if (mounted) {
            setState(() {
              _studentResults = uniqueMap.values.toList();
              _isLoadingResults = false;
            });
          }
          return;
        }
      }

      if (mounted) setState(() => _isLoadingResults = false);
    } catch (err) {
      debugPrint('❌ Failed to fetch student results: $err');
      if (mounted) setState(() => _isLoadingResults = false);
    }
  }

  String _calcDurationFromSlot(String slot) {
    try {
      final parts = slot.split(' - ');
      if (parts.length < 2) return '—';
      final startRaw = parts[0].trim();
      final endRaw = parts[1].trim();

      int toMinutes(String t) {
        final tParts = t.split(' ');
        final timeStr = tParts[0];
        final meridiem = tParts.length > 1 ? tParts[1].toUpperCase() : '';
        final hm = timeStr.split(':');
        int h = int.parse(hm[0]);
        final m = hm.length > 1 ? int.parse(hm[1]) : 0;
        if (meridiem == 'PM' && h != 12) h += 12;
        if (meridiem == 'AM' && h == 12) h = 0;
        return h * 60 + m;
      }

      final diff = toMinutes(endRaw) - toMinutes(startRaw);
      if (diff <= 0) return '—';
      final hrs = diff ~/ 60;
      final mins = diff % 60;
      if (mins == 0) return hrs == 1 ? '1 Hour' : '$hrs Hours';
      return '${hrs}h ${mins}m';
    } catch (_) {
      return '—';
    }
  }

  DateTime _getExamDateTime(String dateStr, String slotStr) {
    try {
      final cleanDate = dateStr.contains('T') ? dateStr.split('T')[0] : dateStr;
      final timePart = slotStr.split(' - ')[0].trim();
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

  String _formatStudentFriendlyDate(String dateStr) {
    try {
      final dt = DateTime.parse(dateStr.contains('T') ? dateStr : '${dateStr}T00:00:00Z');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      final weekdayStr = weekdays[dt.weekday - 1];
      final monthStr = months[dt.month - 1];
      return '${dt.day} $monthStr ${dt.year} ($weekdayStr)';
    } catch (_) {
      return dateStr;
    }
  }

  Map<String, dynamic> _getCountdownData(DateTime targetDate) {
    final diff = targetDate.difference(_currentTime);
    if (diff.isNegative || diff.inSeconds <= 0) {
      return {'days': 0, 'hours': 0, 'minutes': 0, 'seconds': 0, 'finished': true};
    }
    final days = diff.inDays;
    final hours = diff.inHours % 24;
    final minutes = diff.inMinutes % 60;
    final seconds = diff.inSeconds % 60;
    return {'days': days, 'hours': hours, 'minutes': minutes, 'seconds': seconds, 'finished': false};
  }

  String _getSubjectTranslation(String label, bool isTamil) {
    if (!isTamil) return label;
    final low = label.toLowerCase();
    const t = {
      'tamil': 'தமிழ்',
      'english': 'ஆங்கிலம்',
      'mathematics': 'கணிதம்',
      'maths': 'கணிதம்',
      'science': 'அறிவியல்',
      'social science': 'சமூக அறிவியல்',
      'physics': 'இயற்பியல்',
      'chemistry': 'வேதியியல்',
      'biology': 'உயிரியல்',
      'comp sci': 'கணினி அறிவியல்',
      'computer science': 'கணினி அறிவியல்',
      'botany': 'தாவரவியல்',
      'zoology': 'விலங்கியல்',
      'commerce': 'வணிகவியல்',
      'accountancy': 'கணக்குப்பதிவியல்',
      'economics': 'பொருளாதாரம்',
      'comp app': 'கணினி பயன்பாடுகள்',
      'business math': 'வணிக கணிதம்',
    };
    return t[low] ?? label;
  }

  String _getTotalMarksStr(Map<String, dynamic> ex, bool isTamil) {
    final classStr = ex['classSection']?.toString() ?? '';
    final isClass6to10 = !classStr.contains('Class 11') && !classStr.contains('Class 12');
    final marksWord = isTamil ? 'மதிப்பெண்கள்' : 'Marks';

    if (isClass6to10) {
      return '100 $marksWord';
    }

    final mode = ex['examMode']?.toString() ?? 'Theory';
    if (mode == 'Theory') return '70 $marksWord';
    if (mode == 'Practical') return '30 $marksWord';
    return '70 (T) + 30 (P) = 100 $marksWord';
  }

  List<Map<String, dynamic>> _getGroupSubjects(String? groupName) {
    final normalized = (groupName ?? '').trim().toLowerCase();

    if (normalized == '2503' || normalized.contains('biology') || normalized == '2601' || normalized == 'science') {
      return [
        {'key': 'tamil', 'label': 'Tamil', 'color': const Color(0xFF8B5CF6)},
        {'key': 'english', 'label': 'English', 'color': const Color(0xFF3B82F6)},
        {'key': 'mathematics', 'label': 'Maths', 'color': const Color(0xFF10B981)},
        {'key': 'science', 'label': 'Physics', 'color': const Color(0xFFF97316)},
        {'key': 'socialScience', 'label': 'Chemistry', 'color': const Color(0xFFEC4899)},
        {'key': 'extraSubject', 'label': 'Biology', 'color': const Color(0xFF059669)},
      ];
    }

    if (normalized == '2502' || normalized.contains('computer science') || normalized == '2501') {
      return [
        {'key': 'tamil', 'label': 'Tamil', 'color': const Color(0xFF8B5CF6)},
        {'key': 'english', 'label': 'English', 'color': const Color(0xFF3B82F6)},
        {'key': 'mathematics', 'label': 'Maths', 'color': const Color(0xFF10B981)},
        {'key': 'science', 'label': 'Physics', 'color': const Color(0xFFF97316)},
        {'key': 'socialScience', 'label': 'Chemistry', 'color': const Color(0xFFEC4899)},
        {'key': 'extraSubject', 'label': 'Comp Sci', 'color': const Color(0xFF06B6D4)},
      ];
    }

    if (normalized == '2704' || normalized == '2702' || normalized == '2701' || normalized.contains('commerce')) {
      final isCompApp = normalized == '2702' || normalized.contains('computer applications');
      return [
        {'key': 'tamil', 'label': 'Tamil', 'color': const Color(0xFF8B5CF6)},
        {'key': 'english', 'label': 'English', 'color': const Color(0xFF3B82F6)},
        {'key': 'mathematics', 'label': 'Commerce', 'color': const Color(0xFFF59E0B)},
        {'key': 'science', 'label': 'Accountancy', 'color': const Color(0xFF6366F1)},
        {'key': 'socialScience', 'label': 'Economics', 'color': const Color(0xFFFB7185)},
        {'key': 'extraSubject', 'label': isCompApp ? 'Comp App' : 'Business Math', 'color': const Color(0xFF14B8A6)},
      ];
    }

    return [
      {'key': 'tamil', 'label': 'Tamil', 'color': const Color(0xFF8B5CF6)},
      {'key': 'english', 'label': 'English', 'color': const Color(0xFF3B82F6)},
      {'key': 'mathematics', 'label': 'Maths', 'color': const Color(0xFF10B981)},
      {'key': 'science', 'label': 'Science', 'color': const Color(0xFFF59E0B)},
      {'key': 'socialScience', 'label': 'Social Science', 'color': const Color(0xFFFB7185)},
    ];
  }

  Map<String, dynamic> _calcLocal(Map<String, dynamic> row, bool isHsc) {
    final vals = <num>[];
    for (final k in ['tamil', 'english', 'mathematics', 'science', 'socialScience']) {
      final v = row[k];
      if (v != null && v is num) {
        vals.add(v);
      } else if (v != null) {
        final parsed = num.tryParse(v.toString());
        if (parsed != null) vals.add(parsed);
      }
    }
    if (row['extraSubject'] != null) {
      final v = row['extraSubject'];
      if (v is num) {
        vals.add(v);
      } else {
        final parsed = num.tryParse(v.toString());
        if (parsed != null) vals.add(parsed);
      }
    }

    final total = vals.isNotEmpty ? vals.fold<num>(0, (a, b) => a + b) : 0;
    final maxTotal = isHsc ? 600 : 500;
    final pct = vals.isNotEmpty ? ((total / maxTotal) * 100).toStringAsFixed(1) : '0';
    final isPassed = vals.isNotEmpty && vals.every((v) => v >= 35);

    return {'total': total, 'pct': pct, 'isPassed': isPassed, 'maxTotal': maxTotal};
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppLocalization.languageNotifier,
      builder: (context, isTamil, _) {
        // Filter out Cancelled exams
        final studentExams = _exams.where((ex) {
          final st = (ex['status'] ?? '').toString().toLowerCase();
          return st != 'cancelled';
        }).toList();

        // Calculate upcoming scheduled exams for the countdown widget
        final upcomingExams = studentExams.where((e) {
          final st = (e['status'] ?? '').toString().toLowerCase();
          return st == 'scheduled';
        }).map((e) {
          final target = _getExamDateTime(e['date'] as String, e['timeSlot'] as String);
          return {...e, 'targetDateTime': target};
        }).where((e) {
          final dt = e['targetDateTime'] as DateTime;
          return dt.isAfter(_currentTime);
        }).toList();

        upcomingExams.sort((a, b) {
          final dtA = a['targetDateTime'] as DateTime;
          final dtB = b['targetDateTime'] as DateTime;
          return dtA.compareTo(dtB);
        });

        final nextExam = upcomingExams.isNotEmpty ? upcomingExams.first : null;

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
                onRefresh: _loadData,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Top App Bar
                      _buildTopAppBar(context, isTamil),
                      const SizedBox(height: 8),

                      // 2. Hero Card Banner (career.png)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildHeroCardBanner(),
                      ),
                      const SizedBox(height: 14),

                      // 3. Navigation Tabs (Exam Timetables vs My Model Exam Marks)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildNavTabs(isTamil),
                      ),
                      const SizedBox(height: 14),

                      // 5. Tab 1: Calendar / Schedule OR Tab 2: Marks
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _activeTab == 'calendar'
                            ? _buildCalendarTabContent(studentExams, nextExam, isTamil)
                            : _buildMarksTabContent(isTamil),
                      ),
                      const SizedBox(height: 20),

                      // 6. Bottom Encouragement Banner (career2.png)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildBottomBanner(isTamil),
                      ),
                      const SizedBox(height: 24),
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

  // --- 2. HERO CARD BANNER (career.png) ---
  Widget _buildHeroCardBanner() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = (width * 0.42).clamp(140.0, 185.0);

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
            child: Image.asset(
              'assets/images/career/career.png',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Image.asset(
                'assets/images/class/career.png',
                fit: BoxFit.cover,
              ),
            ),
          ),
        );
      },
    );
  }

  // --- 1. TOP APP BAR ---
  Widget _buildTopAppBar(BuildContext context, bool isTamil) {
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
              isTamil ? 'பள்ளித் தேர்வுகள் & கால அட்டவணை' : 'School Exams & Timetable',
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 17,
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



  // --- 3. NAVIGATION TABS (Exam Timetables vs My Model Exam Marks) ---
  Widget _buildNavTabs(bool isTamil) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F46E5).withValues(alpha: 0.05),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _activeTab = 'calendar'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  gradient: _activeTab == 'calendar'
                      ? const LinearGradient(
                          colors: [Color(0xFF4F46E5), Color(0xFF6366F1)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: _activeTab == 'calendar' ? null : Colors.transparent,
                  borderRadius: BorderRadius.circular(13),
                  boxShadow: _activeTab == 'calendar'
                      ? [
                          BoxShadow(
                            color: const Color(0xFF4F46E5).withValues(alpha: 0.30),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.calendar_month_rounded,
                        size: 16,
                        color: _activeTab == 'calendar' ? Colors.white : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 7),
                      Text(
                        isTamil ? 'தேர்வு அட்டவணைகள்' : 'Exam Timetables',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: _activeTab == 'calendar' ? Colors.white : const Color(0xFF64748B),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _activeTab = 'marks'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  gradient: _activeTab == 'marks'
                      ? const LinearGradient(
                          colors: [Color(0xFF4F46E5), Color(0xFF6366F1)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: _activeTab == 'marks' ? null : Colors.transparent,
                  borderRadius: BorderRadius.circular(13),
                  boxShadow: _activeTab == 'marks'
                      ? [
                          BoxShadow(
                            color: const Color(0xFF4F46E5).withValues(alpha: 0.30),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.emoji_events_rounded,
                        size: 16,
                        color: _activeTab == 'marks' ? Colors.white : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 7),
                      Text(
                        isTamil ? 'மாதிரி தேர்வு மதிப்பெண்கள்' : 'My Model Exam Marks',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: _activeTab == 'marks' ? Colors.white : const Color(0xFF64748B),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- 4. TAB 1: CALENDAR & TIMETABLES CONTENT ---
  Widget _buildCalendarTabContent(
    List<Map<String, dynamic>> studentExams,
    Map<String, dynamic>? nextExam,
    bool isTamil,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Live Countdown Panel for Next Upcoming Exam
        if (nextExam != null) ...[
          _buildLiveCountdownCard(nextExam, isTamil),
          const SizedBox(height: 16),
        ],

        // Date Sheet Header
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.calendar_today_rounded, color: Color(0xFF4F46E5), size: 16),
            ),
            const SizedBox(width: 8),
            Text(
              isTamil ? 'வகுப்பு மதிப்பீட்டு தேதித்தாள்' : 'Class Assessment Date Sheet',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                fontFamily: 'Outfit',
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${studentExams.length}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF4F46E5),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // List of Exams
        if (_isLoadingExams)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5))),
          )
        else if (studentExams.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.event_busy_rounded, color: Color(0xFF4F46E5), size: 26),
                ),
                const SizedBox(height: 12),
                Text(
                  isTamil
                      ? 'எந்த தேர்வு அட்டவணையும் வெளியிடப்படவில்லை'
                      : 'No exam timetables published',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isTamil
                      ? 'பள்ளி உங்கள் வகுப்புக்கு எந்த தேர்வு அட்டவணையையும் இன்னும் வெளியிடவில்லை.'
                      : 'The school has not published any exam schedules for your grade yet.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: studentExams.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final ex = studentExams[index];
              return _buildExamCard(ex, isTamil);
            },
          ),

        const SizedBox(height: 18),

        // Instructions & Tips section
        _buildInstructionsAndTips(isTamil),
      ],
    );
  }

  // --- Live Countdown Card for Next Exam (Premium White Card Theme) ---
  Widget _buildLiveCountdownCard(Map<String, dynamic> nextExam, bool isTamil) {
    final targetDate = nextExam['targetDateTime'] as DateTime;
    final countdown = _getCountdownData(targetDate);
    final subject = nextExam['subject']?.toString() ?? 'Subject';
    final name = nextExam['name']?.toString() ?? 'Exam';
    final dateStr = nextExam['date']?.toString() ?? '';
    final timeSlot = nextExam['timeSlot']?.toString() ?? '';
    final hall = nextExam['hall']?.toString() ?? 'Hall 1';
    final invigilator = nextExam['invigilator']?.toString() ?? '';
    final mode = nextExam['examMode']?.toString() ?? 'Theory';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE0E7FF), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F46E5).withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Timer Badge + Venue Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFC7D2FE), width: 1.2),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.timer_outlined, color: Color(0xFF4F46E5), size: 13),
                      const SizedBox(width: 5),
                      Flexible(
                        child: Text(
                          isTamil ? 'அடுத்த வரவிருக்கும் தேர்வு' : 'NEXT UPCOMING EXAM',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.4,
                            color: Color(0xFF4338CA),
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.location_on_rounded, size: 12, color: Color(0xFF64748B)),
                    const SizedBox(width: 4),
                    Text(
                      hall.split(' (')[0],
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF334155),
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Exam Title
          Text(
            '$name (${_getSubjectTranslation(subject, isTamil)})',
            style: const TextStyle(
              fontSize: 18.5,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
              letterSpacing: -0.2,
              fontFamily: 'Outfit',
            ),
          ),
          const SizedBox(height: 8),

          // Details row
          Wrap(
            spacing: 12,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.calendar_month_rounded, size: 13, color: Color(0xFF4F46E5)),
                  const SizedBox(width: 4.5),
                  Text(
                    _formatStudentFriendlyDate(dateStr),
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Color(0xFF334155),
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Outfit',
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.schedule_rounded, size: 13, color: Color(0xFFD97706)),
                  const SizedBox(width: 4.5),
                  Text(
                    timeSlot,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Color(0xFF334155),
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Outfit',
                    ),
                  ),
                ],
              ),
              if (invigilator.isNotEmpty)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.person_pin_rounded, size: 13, color: Color(0xFF059669)),
                    const SizedBox(width: 4),
                    Text(
                      invigilator,
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFF059669),
                        fontWeight: FontWeight.w800,
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Text(
                  '$mode • ${_getTotalMarksStr(nextExam, isTamil)}',
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFFB45309),
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Outfit',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Countdown Blocks (Premium White Cards with subtle borders & vibrant highlights)
          Row(
            children: [
              _buildCountdownBox(countdown['days'] as int, isTamil ? 'நாட்கள்' : 'DAYS'),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Text(':', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 18, fontWeight: FontWeight.w900)),
              ),
              _buildCountdownBox(countdown['hours'] as int, isTamil ? 'மணி' : 'HOURS'),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Text(':', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 18, fontWeight: FontWeight.w900)),
              ),
              _buildCountdownBox(countdown['minutes'] as int, isTamil ? 'நிமி' : 'MINS'),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Text(':', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 18, fontWeight: FontWeight.w900)),
              ),
              _buildCountdownBox(countdown['seconds'] as int, isTamil ? 'நொடிகள்' : 'SECS', isHighlight: true),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCountdownBox(int value, String label, {bool isHighlight = false}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 9),
        decoration: BoxDecoration(
          color: isHighlight ? const Color(0xFFEEF2FF) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isHighlight ? const Color(0xFFC7D2FE) : const Color(0xFFE2E8F0),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: isHighlight
                  ? const Color(0xFF4F46E5).withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.02),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Text(
              value.toString().padLeft(2, '0'),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: isHighlight ? const Color(0xFF4F46E5) : const Color(0xFF0F172A),
                fontFamily: 'Outfit',
              ),
            ),
            const SizedBox(height: 1),
            Text(
              label,
              style: TextStyle(
                fontSize: 8.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.4,
                color: isHighlight ? const Color(0xFF6366F1) : const Color(0xFF64748B),
                fontFamily: 'Outfit',
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Exam Card ---
  Widget _buildExamCard(Map<String, dynamic> ex, bool isTamil) {
    final subject = ex['subject']?.toString() ?? 'Subject';
    final name = ex['name']?.toString() ?? 'Exam';
    final dateStr = ex['date']?.toString() ?? '';
    final timeSlot = ex['timeSlot']?.toString() ?? '';
    final duration = ex['duration']?.toString() ?? '3 Hours';
    final hall = ex['hall']?.toString() ?? 'Hall 1';
    final invigilator = ex['invigilator']?.toString() ?? '';
    final status = ex['status']?.toString() ?? 'Scheduled';
    final examMode = ex['examMode']?.toString() ?? 'Theory';
    final classSection = ex['classSection']?.toString() ?? '';
    final type = ex['type']?.toString() ?? 'Quarterly';

    final isCompleted = status.toLowerCase() == 'completed';
    final isInProgress = status.toLowerCase() == 'in progress';

    Color statusColor = const Color(0xFF10B981);
    String statusLabel = isTamil ? 'வரவிருக்கிறது' : 'Upcoming';

    if (isCompleted) {
      statusColor = const Color(0xFFF43F5E);
      statusLabel = isTamil ? 'தேர்வு முடிந்தது' : 'Exam Done';
    } else if (isInProgress) {
      statusColor = const Color(0xFFF59E0B);
      statusLabel = isTamil ? 'நடக்கிறது' : 'Ongoing';
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Left status accent border
              Container(width: 4, color: statusColor),

              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top Row: Class & Mode + Status Badge
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFBFDBFE)),
                                ),
                                child: Text(
                                  classSection,
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF1D4ED8),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  examMode,
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF475569),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: statusColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: statusColor.withValues(alpha: 0.25)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(width: 5, height: 5, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                                const SizedBox(width: 4),
                                Text(
                                  statusLabel,
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900,
                                    color: statusColor,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Subject & Exam Name
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _getSubjectTranslation(subject, isTamil),
                                  style: const TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Row(
                                  children: [
                                    Text(
                                      name,
                                      style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEEF2FF),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        type,
                                        style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: Color(0xFF4F46E5)),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Text(
                              isTamil ? 'மேசை: ஒதுக்கப்பட்டுள்ளது' : 'Desk: Assigned',
                              style: const TextStyle(fontSize: 9, color: Color(0xFF64748B), fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 8),

                      // Date, Time, Room & Invigilator
                      Row(
                        children: [
                          const Icon(Icons.calendar_month_rounded, size: 13, color: Color(0xFF6366F1)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _formatStudentFriendlyDate(dateStr),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.schedule_rounded, size: 13, color: Color(0xFFF59E0B)),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '$timeSlot ($duration)',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      Row(
                        children: [
                          const Icon(Icons.location_on_rounded, size: 13, color: Color(0xFF9333EA)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              hall.split(' (')[0],
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF9333EA)),
                            ),
                          ),
                          if (invigilator.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            const Icon(Icons.person_pin_rounded, size: 13, color: Color(0xFF059669)),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                invigilator,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF059669)),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Instructions & Tips Card ---
  Widget _buildInstructionsAndTips(bool isTamil) {
    return Column(
      children: [
        // Instructions
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.info_outline_rounded, color: Color(0xFF4F46E5), size: 16),
                  const SizedBox(width: 6),
                  Text(
                    isTamil ? 'முக்கிய தேர்வு வழிமுறைகள்' : 'Important Exam Instructions',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _buildBulletItem(
                isTamil
                    ? 'தேர்வு தொடங்குவதற்கு குறைந்தது 15 நிமிடங்களுக்கு முன்பாக தேர்வு அறையில் இருக்க வேண்டும்.'
                    : 'Be present at the allocated exam hall at least 15 minutes prior to the time slot.',
              ),
              const SizedBox(height: 4),
              _buildBulletItem(
                isTamil
                    ? 'தேவையான அனைத்து பொருட்களையும் கொண்டு வரவும். தேர்வு நேரத்தில் மற்றவர்களிடம் கடன் வாங்குவது கண்டிப்பாக தடைசெய்யப்பட்டுள்ளது.'
                    : 'Bring all necessary stationery items. Borrowing items during the exam is strictly prohibited.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Tips
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.lightbulb_outline_rounded, color: Color(0xFFF59E0B), size: 16),
                  const SizedBox(width: 6),
                  Text(
                    isTamil ? 'தயாரிப்பு மற்றும் தேர்வு குறிப்புகள்' : 'Preparation & Exam Tips',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _buildBulletItem(
                isTamil
                    ? 'வினாத்தாளை கவனமாக படிக்கவும்: முதல் 10 நிமிடங்களை அனைத்து கேள்விகளையும் படிக்க செலவிடவும்.'
                    : 'Read the paper carefully: Spend the first 10 minutes reading all questions.',
              ),
              const SizedBox(height: 4),
              _buildBulletItem(
                isTamil
                    ? 'விடைத்தாளை சரிபார்க்கவும்: உங்கள் பதில்கள் மற்றும் சூத்திரங்களை சரிபார்க்க கடைசி 10 நிமிடங்களை சேமிக்கவும்.'
                    : 'Review your sheet: Save the last 10 minutes to verify your answers and formulas.',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBulletItem(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 5,
          height: 5,
          margin: const EdgeInsets.only(top: 6, right: 8),
          decoration: const BoxDecoration(color: Color(0xFF4F46E5), shape: BoxShape.circle),
        ),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 11, color: Color(0xFF475569), height: 1.35),
          ),
        ),
      ],
    );
  }

  // --- 5. TAB 2: MY MODEL EXAM RESULTS CONTENT ---
  Widget _buildMarksTabContent(bool isTamil) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.emoji_events_rounded, color: Color(0xFF4F46E5), size: 16),
            ),
            const SizedBox(width: 8),
            Text(
              isTamil ? 'என் மாதிரி மற்றும் திருப்புதல் தேர்வு மதிப்பெண்கள்' : 'My Model & Revision Exam Marks',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                fontFamily: 'Outfit',
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          isTamil
              ? 'தலைமையாசிரியர் அலுவலகத்தால் சரிபார்க்கப்பட்டு இறுதி செய்யப்பட்ட தேர்வு முடிவுகள் மட்டுமே இங்கு காட்டப்படும்.'
              : 'Only locked/finalized exam results verified by the Headmaster office are displayed here.',
          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 14),

        if (_isLoadingResults)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5))),
          )
        else if (_studentResults.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.assignment_turned_in_rounded, color: Color(0xFF4F46E5), size: 26),
                ),
                const SizedBox(height: 12),
                Text(
                  isTamil ? 'எந்த தேர்வு முடிவுகளும் இன்னும் வெளியிடப்படவில்லை' : 'No exam results published yet',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isTamil
                      ? 'தலைமையாசிரியர் உங்கள் முடிவுகளை உறுதிசெய்தவுடன் உங்கள் மதிப்பெண் அட்டைகள் தானாகவே இங்கே தோன்றும்.'
                      : 'Your marks cards will appear here automatically once the Headmaster inputs and locks your results in the system.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _studentResults.length,
            separatorBuilder: (context, index) => const SizedBox(height: 14),
            itemBuilder: (context, index) {
              final result = _studentResults[index];
              final exam = result['exam'] as Map? ?? {};
              final isHsc = exam['class'] == '11' || exam['class'] == '12';
              final subjectsList = _getGroupSubjects(exam['group']?.toString());
              final localStats = _calcLocal(result, isHsc);
              final isPassed = localStats['isPassed'] == true;

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isPassed
                        ? const Color(0xFF10B981).withValues(alpha: 0.3)
                        : const Color(0xFFF43F5E).withValues(alpha: 0.3),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Card Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _getSubjectTranslation(exam['examName']?.toString() ?? 'Model Exam', isTamil),
                                style: const TextStyle(
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '${isTamil ? "கல்வி ஆண்டு" : "Academic Year"} ${exam['academicYear'] ?? "2024-25"} • Class ${exam['class'] ?? ""}-${exam['section'] ?? ""}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                        ),

                        // Score metrics
                        Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  isTamil ? 'இறுதி மதிப்பெண்' : 'FINAL SCORE',
                                  style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8)),
                                ),
                                Text(
                                  '${localStats['total']}/${localStats['maxTotal']}',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                ),
                              ],
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isPassed
                                    ? const Color(0xFF10B981).withValues(alpha: 0.12)
                                    : const Color(0xFFF43F5E).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                isPassed ? (isTamil ? 'தேர்ச்சி' : 'PASS') : (isTamil ? 'தோல்வி' : 'FAIL'),
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w900,
                                  color: isPassed ? const Color(0xFF059669) : const Color(0xFFE11D48),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Marks Breakdown Grid
                    LayoutBuilder(
                      builder: (context, constraints) {
                        return Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: subjectsList.map((subj) {
                            final key = subj['key'] as String;
                            final label = subj['label'] as String;
                            final col = subj['color'] as Color;
                            final markVal = result[key];
                            final hasMark = markVal != null;
                            final int numMark = (markVal is int)
                                ? markVal
                                : (int.tryParse(markVal?.toString() ?? '0') ?? 0);
                            final isSubjPass = hasMark && numMark >= 35;

                            final itemWidth = (constraints.maxWidth - 16) / 3;

                            return Container(
                              width: itemWidth.clamp(90.0, 150.0),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                              decoration: BoxDecoration(
                                color: !hasMark
                                    ? const Color(0xFFF8FAFC)
                                    : isSubjPass
                                        ? const Color(0xFFF8FAFC)
                                        : const Color(0xFFFFF1F2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: !hasMark
                                      ? const Color(0xFFE2E8F0)
                                      : isSubjPass
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFFFECDD3),
                                ),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    _getSubjectTranslation(label, isTamil),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      color: col,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text(
                                        hasMark ? '$numMark' : '—',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w900,
                                          color: isSubjPass
                                              ? const Color(0xFF0F172A)
                                              : (hasMark ? const Color(0xFFE11D48) : const Color(0xFF94A3B8)),
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                      if (hasMark)
                                        const Text(
                                          '/100',
                                          style: TextStyle(fontSize: 9, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  if (hasMark)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: isSubjPass
                                            ? const Color(0xFF10B981).withValues(alpha: 0.1)
                                            : const Color(0xFFF43F5E).withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        isSubjPass
                                            ? (isTamil ? 'தேர்ச்சி' : 'PASS')
                                            : (isTamil ? 'தோல்வி' : 'FAIL'),
                                        style: TextStyle(
                                          fontSize: 8,
                                          fontWeight: FontWeight.w900,
                                          color: isSubjPass ? const Color(0xFF059669) : const Color(0xFFE11D48),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            );
                          }).toList(),
                        );
                      },
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  // --- BOTTOM ENCOURAGEMENT BANNER (career2.png) ---
  Widget _buildBottomBanner(bool isTamil) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = (width * 0.32).clamp(100.0, 130.0);

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
            child: Stack(
              children: [
                Positioned.fill(
                  child: Image.asset(
                    'assets/images/career/career2.png',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Image.asset(
                      'assets/images/class/career2.png',
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                Positioned(
                  left: 18,
                  top: 0,
                  bottom: 0,
                  right: width * 0.40,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF4F46E5).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isTamil ? 'விடாமுயற்சி' : 'STUDY HARD',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF4F46E5),
                              letterSpacing: 0.5,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          isTamil ? 'உங்கள் எதிர்காலத்தை பிரகாசமாக்குங்கள்!' : 'Shape Your Bright Future!',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isTamil ? 'திட்டமிட்ட படிப்பு அதிக மதிப்பெண் தரும்' : 'Consistent prep leads to high scores',
                          maxLines: 2,
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
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

