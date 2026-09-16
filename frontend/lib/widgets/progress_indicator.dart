import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../services/course_service.dart';
import '../theme/app_theme.dart';
import '../core/localization/app_localization.dart';
import '../core/constants/app_constants.dart';

// ─── 1. CUSTOM PROGRESS INDICATOR ──────────────────────────────────────────
class CustomProgressIndicator extends StatelessWidget {
  final double progress; // 0.0 to 1.0
  final double height;
  final Color color;
  final Color backgroundColor;
  final Duration duration;
  final BorderRadius? borderRadius;

  const CustomProgressIndicator({
    super.key,
    required this.progress,
    this.height = 7.0,
    this.color = AppTheme.primaryEmerald,
    this.backgroundColor = AppTheme.borderLight,
    this.duration = const Duration(milliseconds: 600),
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(height / 2);
    final clamped = progress.clamp(0.0, 1.0);

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: radius,
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Stack(
            children: [
              AnimatedContainer(
                duration: duration,
                curve: Curves.easeOutCubic,
                width: constraints.maxWidth * clamped,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: radius,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ─── 2. SUBJECT PROGRESS DATA MODEL ────────────────────────────────────────
class SubjectProgressData {
  final String key;
  final String nameEn;
  final String nameTa;
  final String iconAsset;
  final Color color;
  final Color cardBg;
  final double progress; // 0.0 to 1.0
  final int percent; // 0 to 100
  final int lessonsCompleted;
  final int totalLessons;
  final int examsCount;
  final bool hasData;

  const SubjectProgressData({
    required this.key,
    required this.nameEn,
    required this.nameTa,
    required this.iconAsset,
    required this.color,
    required this.cardBg,
    required this.progress,
    required this.percent,
    required this.lessonsCompleted,
    this.totalLessons = 20,
    required this.examsCount,
    required this.hasData,
  });

  SubjectProgressData copyWith({
    double? progress,
    int? percent,
    int? lessonsCompleted,
    int? totalLessons,
    int? examsCount,
    bool? hasData,
  }) {
    return SubjectProgressData(
      key: key,
      nameEn: nameEn,
      nameTa: nameTa,
      iconAsset: iconAsset,
      color: color,
      cardBg: cardBg,
      progress: progress ?? this.progress,
      percent: percent ?? this.percent,
      lessonsCompleted: lessonsCompleted ?? this.lessonsCompleted,
      totalLessons: totalLessons ?? this.totalLessons,
      examsCount: examsCount ?? this.examsCount,
      hasData: hasData ?? this.hasData,
    );
  }
}

// ─── 3. SUBJECT WISE PROGRESS CARD ─────────────────────────────────────────
class SubjectWiseProgressCard extends StatelessWidget {
  final SubjectProgressData data;
  final VoidCallback? onTap;

  const SubjectWiseProgressCard({
    super.key,
    required this.data,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bool isTa = AppLocalization.isTamil;
    final String title = isTa ? data.nameTa : data.nameEn;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 136,
        margin: const EdgeInsets.only(right: 12),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: data.cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: data.color.withValues(alpha: 0.22),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: data.color.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Top 3D Subject Icon
            SizedBox(
              width: 46,
              height: 46,
              child: Image.asset(
                data.iconAsset,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) =>
                    Icon(Icons.school_rounded, color: data.color, size: 30),
              ),
            ),
            const SizedBox(height: 8),

            // Subject Title
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E293B),
                fontFamily: 'Outfit',
              ),
            ),
            const SizedBox(height: 9),

            // Progress Bar & Percentage Row
            Row(
              children: [
                Expanded(
                  child: CustomProgressIndicator(
                    progress: data.progress,
                    height: 5.5,
                    color: data.color,
                    backgroundColor: data.color.withValues(alpha: 0.20),
                    duration: const Duration(milliseconds: 900),
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  '${data.percent}%',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w900,
                    color: data.color,
                    fontFamily: 'Outfit',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 5),

            // Subtitle: Lessons Completed or Exam Count
            if (data.hasData && data.examsCount > 0)
              Text(
                '${data.lessonsCompleted} of ${data.totalLessons} Lessons',
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 9.5,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w600,
                  fontFamily: 'Outfit',
                ),
              )
            else
              Text(
                '${data.lessonsCompleted} of ${data.totalLessons} Lessons',
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 9.5,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                  fontFamily: 'Outfit',
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── 4. SUBJECT WISE PROGRESS SECTION (REAL FETCH BASED) ───────────────────
class SubjectWiseProgressSection extends StatefulWidget {
  final bool showHeader;
  final VoidCallback? onViewAll;
  final String? studentId;
  final void Function(double overallProgress, int overallPercent, int completedLessons, int totalLessons)? onProgressCalculated;

  const SubjectWiseProgressSection({
    super.key,
    this.showHeader = true,
    this.onViewAll,
    this.studentId,
    this.onProgressCalculated,
  });

  @override
  State<SubjectWiseProgressSection> createState() => _SubjectWiseProgressSectionState();
}

class _SubjectWiseProgressSectionState extends State<SubjectWiseProgressSection> {
  // Base URL Options:
  // Option 1: Production (Vercel) -> https://tn-schools-mobile-app-backend.vercel.app
  // Option 2: Localhost Development -> http://localhost:5000
  static String get _baseUrl => AppConstants.baseUrl;

  bool _isLoading = true;
  List<SubjectProgressData> _subjectList = [];

  // Default baseline subject metadata matching screenshot aesthetics (Image 1)
  static final List<SubjectProgressData> _initialSubjects = [
    const SubjectProgressData(
      key: 'mathematics',
      nameEn: 'Mathematics',
      nameTa: 'கணிதம்',
      iconAsset: 'assets/images/class/mathematics.png',
      color: Color(0xFF2563EB),
      cardBg: Color(0xFFEFF6FF),
      progress: 0.91,
      percent: 91,
      lessonsCompleted: 18,
      totalLessons: 20,
      examsCount: 0,
      hasData: false,
    ),
    const SubjectProgressData(
      key: 'science',
      nameEn: 'Science',
      nameTa: 'அறிவியல்',
      iconAsset: 'assets/images/class/seience.png',
      color: Color(0xFF16A34A),
      cardBg: Color(0xFFF0FDF4),
      progress: 0.85,
      percent: 85,
      lessonsCompleted: 17,
      totalLessons: 20,
      examsCount: 0,
      hasData: false,
    ),
    const SubjectProgressData(
      key: 'english',
      nameEn: 'English',
      nameTa: 'ஆங்கிலம்',
      iconAsset: 'assets/images/class/english.png',
      color: Color(0xFF7C3AED),
      cardBg: Color(0xFFFAF5FF),
      progress: 0.78,
      percent: 78,
      lessonsCompleted: 16,
      totalLessons: 20,
      examsCount: 0,
      hasData: false,
    ),
    const SubjectProgressData(
      key: 'tamil',
      nameEn: 'Tamil',
      nameTa: 'தமிழ்',
      iconAsset: 'assets/images/class/tamil.png',
      color: Color(0xFFD97706),
      cardBg: Color(0xFFFEFCE8),
      progress: 0.88,
      percent: 88,
      lessonsCompleted: 18,
      totalLessons: 20,
      examsCount: 0,
      hasData: false,
    ),
    const SubjectProgressData(
      key: 'social',
      nameEn: 'Social Studies',
      nameTa: 'சமூக அறிவியல்',
      iconAsset: 'assets/images/class/social.png',
      color: Color(0xFFEA580C),
      cardBg: Color(0xFFFFF7ED),
      progress: 0.75,
      percent: 75,
      lessonsCompleted: 15,
      totalLessons: 20,
      examsCount: 0,
      hasData: false,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _subjectList = List.from(_initialSubjects);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncOverallProgress(_subjectList);
      _fetchRealProgress();
    });
  }

  void _syncOverallProgress(List<SubjectProgressData> list) {
    if (list.isEmpty || !mounted) return;
    int completedSum = 0;
    int totalSum = 0;
    for (final s in list) {
      completedSum += s.lessonsCompleted;
      totalSum += s.totalLessons;
    }
    final overallProg = totalSum > 0 ? (completedSum / totalSum).clamp(0.0, 1.0) : 0.65;
    final overallPct = (overallProg * 100).round();

    try {
      final cs = Provider.of<CourseService>(context, listen: false);
      cs.setOverallProgress(
        progress: overallProg,
        completedLessons: completedSum,
        totalLessons: totalSum,
      );
    } catch (_) {}

    widget.onProgressCalculated?.call(overallProg, overallPct, completedSum, totalSum);
  }

  @override
  void didUpdateWidget(covariant SubjectWiseProgressSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.studentId != widget.studentId) {
      _fetchRealProgress();
    }
  }

  // Subject matching logic aligned with Web Dashboard
  bool _isSubjectMatch(String markSubName, String subjectName) {
    final m = markSubName.toLowerCase().trim();
    final s = subjectName.toLowerCase().trim();
    if (m == s) return true;
    if ((s == 'mathematics' || s == 'கணிதம்') &&
        (m == 'mathematics' || m == 'maths' || m == 'கணிதம்')) {
      return true;
    }
    if ((s == 'science' || s == 'அறிவியல்') &&
        (m == 'science' || m == 'அறிவியல்')) {
      return true;
    }
    if ((s == 'tamil' || s == 'தமிழ்') &&
        (m == 'tamil' || m == 'தமிழ்')) {
      return true;
    }
    if ((s == 'english' || s == 'ஆங்கிலம்') &&
        (m == 'english' || m == 'ஆங்கிலம்')) {
      return true;
    }
    if ((s == 'social studies' || s == 'social science' || s == 'சமூக அறிவியல்') &&
        (m == 'social science' || m == 'social studies' || m == 'social' || m == 'சமூக அறிவியல்')) {
      return true;
    }
    return false;
  }

  Future<void> _fetchRealProgress() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final courseService = Provider.of<CourseService>(context, listen: false);
      final student = courseService.student;

      // 1. Resolve student ID
      String resolvedId = widget.studentId ?? student.studentId ?? student.id;

      final authHeaders = <String, String>{
        'Content-Type': 'application/json',
      };
      if (student.token != null && student.token!.isNotEmpty) {
        authHeaders['Authorization'] = 'Bearer ${student.token}';
      }

      if (resolvedId.isEmpty || resolvedId == 's1') {
        try {
          final res = await http
              .get(Uri.parse('$_baseUrl/api/students'), headers: authHeaders)
              .timeout(const Duration(seconds: 4));
          if (res.statusCode == 200) {
            final j = jsonDecode(res.body);
            if (j['success'] == true && j['data'] is List && (j['data'] as List).isNotEmpty) {
              final list = j['data'] as List;
              final found = list.firstWhere(
                (item) =>
                    item['userId'] == student.id ||
                    item['rollNumber'] == student.rollNumber ||
                    item['id'] == student.id,
                orElse: () => list.first,
              );
              if (found != null && found['id'] != null) {
                resolvedId = found['id'].toString();
              }
            }
          }
        } catch (e) {
          debugPrint('⚠️ Students list fetch: $e');
        }
      }

      // 2. Parallel fetch from analytics, marks, and model exams
      Map<String, dynamic>? analyticsData;
      List<dynamic> recentMarks = [];
      List<dynamic> modelExams = [];

      Future<void> fetchAnalytics() async {
        try {
          final res = await http
              .get(Uri.parse('$_baseUrl/api/analytics/student/$resolvedId'), headers: authHeaders)
              .timeout(const Duration(seconds: 5));
          if (res.statusCode == 200) {
            final j = jsonDecode(res.body);
            if (j['success'] == true && j['data'] != null) {
              analyticsData = j['data'];
            }
          }
        } catch (err) {
          debugPrint('⚠️ Analytics fetch error: $err');
        }
      }

      Future<void> fetchMarks() async {
        try {
          final res = await http
              .get(Uri.parse('$_baseUrl/api/students/$resolvedId/marks'), headers: authHeaders)
              .timeout(const Duration(seconds: 5));
          if (res.statusCode == 200) {
            final j = jsonDecode(res.body);
            if (j['success'] == true && j['data'] is List) {
              recentMarks = j['data'];
            }
          }
        } catch (err) {
          debugPrint('⚠️ Marks fetch error: $err');
        }
      }

      Future<void> fetchModelExams() async {
        try {
          final res = await http
              .get(Uri.parse('$_baseUrl/api/headmaster/model-exams/student/$resolvedId'), headers: authHeaders)
              .timeout(const Duration(seconds: 5));
          if (res.statusCode == 200) {
            final j = jsonDecode(res.body);
            if (j['success'] == true && j['data'] is List) {
              modelExams = j['data'];
            }
          }
        } catch (err) {
          debugPrint('⚠️ Model exams fetch error: $err');
        }
      }

      await Future.wait([
        fetchAnalytics(),
        fetchMarks(),
        fetchModelExams(),
      ]);

      // 3. Process Subject-wise Progress
      final marksSummary = (analyticsData?['marksSummary'] as List?) ?? [];

      final updated = _initialSubjects.map((sub) {
        // A. Match in analytics marksSummary
        dynamic analyticsSub;
        for (final m in marksSummary) {
          final subj = m['subject']?.toString() ?? '';
          if (_isSubjectMatch(subj, sub.nameEn) || _isSubjectMatch(subj, sub.nameTa)) {
            analyticsSub = m;
            break;
          }
        }

        // B. Match in recent marks
        final matchingMarks = recentMarks.where((m) {
          final subj = m['subject']?.toString() ?? '';
          return _isSubjectMatch(subj, sub.nameEn) || _isSubjectMatch(subj, sub.nameTa);
        }).toList();

        // C. Match in model exams
        double? modelScore;
        if (modelExams.isNotEmpty) {
          final firstModel = modelExams.first as Map<String, dynamic>?;
          if (firstModel != null) {
            if (sub.key == 'mathematics' && firstModel['mathematics'] != null) {
              modelScore = (firstModel['mathematics'] as num).toDouble();
            } else if (sub.key == 'science' && firstModel['science'] != null) {
              modelScore = (firstModel['science'] as num).toDouble();
            } else if (sub.key == 'english' && firstModel['english'] != null) {
              modelScore = (firstModel['english'] as num).toDouble();
            } else if (sub.key == 'tamil' && firstModel['tamil'] != null) {
              modelScore = (firstModel['tamil'] as num).toDouble();
            } else if (sub.key == 'social' && firstModel['socialScience'] != null) {
              modelScore = (firstModel['socialScience'] as num).toDouble();
            }
          }
        }

        bool hasData = false;
        int? progressPct;
        int examsCount = 0;

        if (analyticsSub != null && analyticsSub['pct'] != null) {
          hasData = true;
          progressPct = (analyticsSub['pct'] as num).round();
          examsCount = (analyticsSub['exams'] as num?)?.toInt() ?? 1;
        } else if (matchingMarks.isNotEmpty) {
          hasData = true;
          num scoredSum = 0;
          num maxSum = 0;
          for (final m in matchingMarks) {
            scoredSum += (m['scored'] as num?) ?? 0;
            maxSum += (m['maxMarks'] as num?) ?? 100;
          }
          if (maxSum > 0) {
            progressPct = ((scoredSum / maxSum) * 100).round();
          }
          examsCount = matchingMarks.length;
        } else if (modelScore != null) {
          hasData = true;
          progressPct = modelScore.round();
          examsCount = 1;
        }

        if (hasData && progressPct != null) {
          final clampedPct = progressPct.clamp(0, 100);
          final completed = ((clampedPct * sub.totalLessons) / 100).round();
          return sub.copyWith(
            progress: clampedPct / 100.0,
            percent: clampedPct,
            lessonsCompleted: completed,
            examsCount: examsCount,
            hasData: true,
          );
        }

        // Keep baseline fallback
        return sub;
      }).toList();

      if (mounted) {
        setState(() {
          _subjectList = updated;
          _isLoading = false;
        });
        _syncOverallProgress(updated);
      }
    } catch (e) {
      debugPrint('❌ Error in _fetchRealProgress: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.showHeader) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                AppLocalization.isTamil ? 'பாடங்கள் வாரியாக முன்னேற்றம்' : 'Subject Wise Progress',
                style: const TextStyle(
                  fontSize: 16.5,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textDark,
                  fontFamily: 'Outfit',
                ),
              ),
              GestureDetector(
                onTap: widget.onViewAll ?? () => Navigator.pushNamed(context, '/all-classes'),
                child: Row(
                  children: [
                    Text(
                      AppLocalization.isTamil ? 'அனைத்தும் >' : 'View All >',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0284C7),
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],

        // Horizontal Row of Subject Cards
        AnimatedOpacity(
          opacity: _isLoading ? 0.75 : 1.0,
          duration: const Duration(milliseconds: 300),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            clipBehavior: Clip.none,
            child: Row(
              children: _subjectList.map((sub) {
                return SubjectWiseProgressCard(
                  data: sub,
                  onTap: () => Navigator.pushNamed(context, '/all-classes'),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }
}
