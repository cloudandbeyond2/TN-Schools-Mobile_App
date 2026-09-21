import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants/app_constants.dart';
import '../services/course_service.dart';
import '../utils/responsive.dart';
import '../widgets/bottom_nav_bar.dart';

class NotificationItem {
  final String id;
  String title;
  final String message;
  final String time;
  final String category; // 'Homework', 'Exams', 'AI Tutor', 'Sports', 'Announcements'
  final IconData icon;
  final List<Color> gradientColors;
  final Color categoryBgColor;
  final Color categoryTextColor;
  final Color buttonColor;
  final String? route;
  final String actionLabel;
  bool isRead;
  final DateTime? createdAt;
  final String? type;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    required this.category,
    required this.icon,
    required this.gradientColors,
    required this.categoryBgColor,
    required this.categoryTextColor,
    required this.buttonColor,
    this.route,
    required this.actionLabel,
    this.isRead = false,
    this.createdAt,
    this.type,
  });

  String get topicKey {
    // 1. Quoted topic if available (e.g. "Components of Food – Homework 1" -> "componentsoffood")
    final quoteMatch = RegExp(r'["“]([^"”]+)["”]').firstMatch('$title $message');
    if (quoteMatch != null && quoteMatch.group(1)!.trim().length > 2) {
      final clean = quoteMatch.group(1)!
          .toLowerCase()
          .replaceAll(RegExp(r'[\–\-\_].*$'), '')
          .replaceAll(RegExp(r'[^a-z0-9]'), '');
      if (clean.isNotEmpty) return '$category:$clean';
    }

    // 2. Exam subject (e.g. "An exam for Tamil is scheduled" -> "Exams:tamil")
    final examMatch = RegExp(r'exam for ([a-zA-Z]+)', caseSensitive: false).firstMatch(message);
    if (examMatch != null && examMatch.group(1) != null) {
      return 'Exams:${examMatch.group(1)!.trim().toLowerCase()}';
    }

    // 3. Fallback to normalized title
    final cleanTitle = title.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
    if (cleanTitle.isNotEmpty &&
        cleanTitle != 'notification' &&
        cleanTitle != 'homeworkassignment' &&
        cleanTitle != 'examtimetable' &&
        cleanTitle != 'schoolannouncement' &&
        cleanTitle != 'sportsgames') {
      return '$category:$cleanTitle';
    }

    // 4. Fallback to clean message start
    final cleanMsg = message.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
    final prefix = cleanMsg.length > 30 ? cleanMsg.substring(0, 30) : cleanMsg;
    return '$category:$prefix';
  }

  static bool isDummyOrTest(Map<String, dynamic> json) {
    final title = (json['title']?.toString() ?? '').trim();
    final message = (json['message']?.toString() ?? json['body']?.toString() ?? '').trim();
    if (message.isEmpty && title.isEmpty) return true;

    final lowerTitle = title.toLowerCase();
    final lowerMsg = message.toLowerCase();

    // Direct test or dummy titles
    if (lowerTitle == 'test' ||
        lowerTitle == 'testing' ||
        lowerTitle == 'dummy' ||
        lowerTitle == 'sample' ||
        lowerTitle == 'temp' ||
        lowerTitle == 'placeholder') {
      return true;
    }

    // Direct test messages
    if (lowerMsg == 'test' ||
        lowerMsg == 'testing' ||
        lowerMsg == 'dummy' ||
        lowerMsg == 'sample' ||
        lowerMsg == 'placeholder') {
      return true;
    }

    // "New Homework: "Test"" or "Test" homework
    if (RegExp(r'["“]test["”]', caseSensitive: false).hasMatch(message) ||
        RegExp(r'["“]dummy["”]', caseSensitive: false).hasMatch(message)) {
      return true;
    }

    final dummyKeywords = [
      'test notification',
      'dummy notification',
      'dummy data',
      'sample notification',
      'lorem ipsum',
      'testing message',
      'test homework',
    ];
    for (final kw in dummyKeywords) {
      if (lowerTitle.contains(kw) || lowerMsg.contains(kw)) return true;
    }

    return false;
  }

  static NotificationItem fromBackendJson(Map<String, dynamic> json) {
    final id = json['id']?.toString() ?? '';
    var rawTitle = json['title']?.toString() ?? '';
    final message = json['message']?.toString() ?? json['body']?.toString() ?? '';
    final type = (json['type']?.toString() ?? '').toUpperCase();
    final isRead = json['read'] == true || json['isRead'] == true;
    final createdAtStr = json['createdAt']?.toString();
    final createdAt = createdAtStr != null ? DateTime.tryParse(createdAtStr) : null;
    final time = _formatRelativeTime(createdAt);

    final textToInspect = '$type $rawTitle $message'.toLowerCase();

    // Extract a descriptive title if rawTitle is empty or generic
    String title = rawTitle.trim();
    final lowerTitle = title.toLowerCase();
    if (title.isEmpty ||
        lowerTitle == 'notification' ||
        lowerTitle == 'alert' ||
        lowerTitle == 'general' ||
        lowerTitle == 'new notification') {
      final quoteMatch = RegExp(r'["“]([^"”]+)["”]').firstMatch(message);
      if (quoteMatch != null && quoteMatch.group(1) != null && quoteMatch.group(1)!.trim().isNotEmpty) {
        title = quoteMatch.group(1)!.trim();
      } else if (textToInspect.contains('exam for')) {
        final match = RegExp(r'exam for ([a-zA-Z\s]+) is scheduled', caseSensitive: false).firstMatch(message);
        if (match != null && match.group(1) != null) {
          title = '${match.group(1)!.trim()} Exam Schedule';
        }
      }
    }

    String category;
    IconData icon;
    List<Color> gradientColors;
    Color categoryBgColor;
    Color categoryTextColor;
    Color buttonColor;
    String? route;
    String actionLabel;

    // Condition-based category mapping
    // 1. Homework & Assignments
    if (type.contains('HOMEWORK') ||
        textToInspect.contains('homework') ||
        textToInspect.contains('assignment') ||
        textToInspect.contains('exercise') ||
        textToInspect.contains('worksheet')) {
      category = 'Homework';
      icon = Icons.assignment_rounded;
      gradientColors = const [Color(0xFFFF7A00), Color(0xFFFF5252)];
      categoryBgColor = const Color(0xFFFFF1E8);
      categoryTextColor = const Color(0xFFEA580C);
      buttonColor = const Color(0xFFFF5722);
      route = '/homework';
      actionLabel = 'Submit Work';
      if (title.isEmpty || title.toLowerCase() == 'notification') {
        title = 'Homework Assignment';
      }
    }
    // 2. Exams & Academics / Marks / Timetable
    else if (type.contains('EXAM') ||
        type.contains('MARK') ||
        type.contains('ACADEMIC') ||
        textToInspect.contains('exam') ||
        textToInspect.contains('timetable') ||
        textToInspect.contains('revision') ||
        textToInspect.contains('scheduled on') ||
        textToInspect.contains('test result')) {
      category = 'Exams';
      icon = Icons.calendar_month_rounded;
      gradientColors = const [Color(0xFF3B82F6), Color(0xFF1D4ED8)];
      categoryBgColor = const Color(0xFFEFF6FF);
      categoryTextColor = const Color(0xFF2563EB);
      buttonColor = const Color(0xFF2563EB);
      route = '/timetable';
      actionLabel = 'View Schedule';
      if (title.isEmpty || title.toLowerCase() == 'notification') {
        title = 'Exam Timetable';
      }
    }
    // 3. AI Tutor & Rapid Quiz & Learning Streaks
    else if (type.contains('AI') ||
        type.contains('TUTOR') ||
        type.contains('QUIZ') ||
        textToInspect.contains('ai tutor') ||
        textToInspect.contains('quiz') ||
        textToInspect.contains('streak') ||
        textToInspect.contains('coins') ||
        textToInspect.contains('badge')) {
      category = 'AI Tutor';
      icon = Icons.auto_awesome_rounded;
      gradientColors = const [Color(0xFF10B981), Color(0xFF059669)];
      categoryBgColor = const Color(0xFFECFDF5);
      categoryTextColor = const Color(0xFF059669);
      buttonColor = const Color(0xFF059669);
      route = '/mock-test';
      actionLabel = 'Start Quiz';
      if (title.isEmpty || title.toLowerCase() == 'notification') {
        title = 'AI Tutor Alert';
      }
    }
    // 4. Sports & Games & Tournaments
    else if (type.contains('SPORT') ||
        textToInspect.contains('sport') ||
        textToInspect.contains('kabaddi') ||
        textToInspect.contains('athletics') ||
        textToInspect.contains('tournament') ||
        textToInspect.contains('competition') ||
        textToInspect.contains('championship') ||
        textToInspect.contains('match')) {
      category = 'Sports';
      icon = Icons.emoji_events_rounded;
      gradientColors = const [Color(0xFFEA580C), Color(0xFFD97706)];
      categoryBgColor = const Color(0xFFFEF3C7);
      categoryTextColor = const Color(0xFFD97706);
      buttonColor = const Color(0xFFD97706);
      route = '/announcements';
      actionLabel = 'View Event';
      if (title.isEmpty || title.toLowerCase() == 'notification') {
        title = 'Sports & Games';
      }
    }
    // 5. Welfare & Scholarships & Schemes
    else if (type.contains('SCHOLARSHIP') ||
        type.contains('WELFARE') ||
        textToInspect.contains('scholarship') ||
        textToInspect.contains('scheme') ||
        textToInspect.contains('merit') ||
        textToInspect.contains('welfare') ||
        textToInspect.contains('benefit')) {
      category = 'Announcements';
      icon = Icons.school_rounded;
      gradientColors = const [Color(0xFFA855F7), Color(0xFF7C3AED)];
      categoryBgColor = const Color(0xFFFAF5FF);
      categoryTextColor = const Color(0xFF7C3AED);
      buttonColor = const Color(0xFF7C3AED);
      route = '/scholarships';
      actionLabel = 'Apply Now';
      if (title.isEmpty || title.toLowerCase() == 'notification') {
        title = 'Scholarship Scheme';
      }
    }
    // 6. Attendance & Leave
    else if (type.contains('ATTENDANCE') ||
        type.contains('LEAVE') ||
        textToInspect.contains('attendance') ||
        textToInspect.contains('leave request') ||
        textToInspect.contains('absent')) {
      category = 'Announcements';
      icon = Icons.event_available_rounded;
      gradientColors = const [Color(0xFF06B6D4), Color(0xFF0891B2)];
      categoryBgColor = const Color(0xFFECFEFF);
      categoryTextColor = const Color(0xFF0891B2);
      buttonColor = const Color(0xFF0891B2);
      route = '/timetable';
      actionLabel = 'View Status';
      if (title.isEmpty || title.toLowerCase() == 'notification') {
        title = 'Attendance Update';
      }
    }
    // 7. General Announcements & Broadcasts
    else {
      category = 'Announcements';
      icon = Icons.campaign_rounded;
      gradientColors = const [Color(0xFFFBBF24), Color(0xFFF59E0B)];
      categoryBgColor = const Color(0xFFFFFBEB);
      categoryTextColor = const Color(0xFFD97706);
      buttonColor = const Color(0xFFD97706);
      route = '/announcements';
      actionLabel = 'View Details';
      if (title.isEmpty || title.toLowerCase() == 'notification') {
        title = 'School Announcement';
      }
    }

    return NotificationItem(
      id: id,
      title: title,
      message: message,
      time: time,
      category: category,
      icon: icon,
      gradientColors: gradientColors,
      categoryBgColor: categoryBgColor,
      categoryTextColor: categoryTextColor,
      buttonColor: buttonColor,
      route: route,
      actionLabel: actionLabel,
      isRead: isRead,
      createdAt: createdAt,
      type: type,
    );
  }

  static String _formatRelativeTime(DateTime? date) {
    if (date == null) return 'Recently';
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.isNegative || difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      final mins = difference.inMinutes;
      return '$mins min${mins > 1 ? 's' : ''} ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return '$hours hr${hours > 1 ? 's' : ''} ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return '${date.day} ${months[date.month - 1]} ${date.year}';
    }
  }
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  int _selectedFilterIndex = 0;
  final List<Map<String, dynamic>> _filters = [
    {'label': 'All', 'icon': Icons.grid_view_rounded, 'color': const Color(0xFFFF5722)},
    {'label': 'Homework', 'icon': Icons.menu_book_rounded, 'color': const Color(0xFFA855F7)},
    {'label': 'Exams', 'icon': Icons.calendar_month_rounded, 'color': const Color(0xFF3B82F6)},
    {'label': 'AI Tutor', 'icon': Icons.smart_toy_rounded, 'color': const Color(0xFF10B981)},
    {'label': 'Sports', 'icon': Icons.emoji_events_rounded, 'color': const Color(0xFFEA580C)},
    {'label': 'Announcements', 'icon': Icons.campaign_rounded, 'color': const Color(0xFFF59E0B)},
  ];

  List<NotificationItem> _notifications = [];
  bool _isLoading = true;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchNotifications();
    });
  }

  Future<void> _fetchNotifications({bool isSilent = false}) async {
    final courseService = Provider.of<CourseService>(context, listen: false);
    final student = courseService.student;
    final userId = student.id;
    final schoolId = student.schoolId ?? '';
    final studentClass = student.classStandard.replaceAll(RegExp(r'\D'), '');
    final section = student.section;

    if (!isSilent) {
      setState(() => _isLoading = true);
    } else {
      setState(() => _isRefreshing = true);
    }

    try {
      final baseUrl = AppConstants.baseUrl;
      final authHeaders = <String, String>{
        'Content-Type': 'application/json',
      };
      if (student.token != null && student.token!.isNotEmpty) {
        authHeaders['Authorization'] = 'Bearer ${student.token}';
      }

      final List<NotificationItem> rawCandidates = [];

      // 1. Fetch personal user notifications from backend
      if (userId.isNotEmpty) {
        try {
          final res = await http
              .get(Uri.parse('$baseUrl/api/notifications?userId=$userId'), headers: authHeaders)
              .timeout(const Duration(seconds: 8));
          if (res.statusCode == 200) {
            final json = jsonDecode(res.body);
            if (json['success'] == true && json['data'] is List) {
              for (final raw in json['data']) {
                final rawMap = Map<String, dynamic>.from(raw);
                if (!NotificationItem.isDummyOrTest(rawMap)) {
                  rawCandidates.add(NotificationItem.fromBackendJson(rawMap));
                }
              }
            }
          }
        } catch (e) {
          debugPrint('⚠️ Error fetching user notifications: $e');
        }
      }

      // 2. Fetch class/school announcements
      try {
        final annParams = <String>[];
        if (schoolId.isNotEmpty) annParams.add('schoolId=$schoolId');
        if (studentClass.isNotEmpty) annParams.add('class=$studentClass');
        if (section.isNotEmpty) annParams.add('section=$section');

        final annUrl = '$baseUrl/api/students/announcements${annParams.isNotEmpty ? '?${annParams.join('&')}' : ''}';
        final annRes = await http.get(Uri.parse(annUrl), headers: authHeaders).timeout(const Duration(seconds: 8));

        if (annRes.statusCode == 200) {
          final annJson = jsonDecode(annRes.body);
          if (annJson['success'] == true && annJson['data'] is List) {
            for (final raw in annJson['data']) {
              final rawMap = Map<String, dynamic>.from(raw);
              rawMap['type'] = rawMap['type'] ?? 'ANNOUNCEMENT';
              if (!NotificationItem.isDummyOrTest(rawMap)) {
                rawCandidates.add(NotificationItem.fromBackendJson(rawMap));
              }
            }
          }
        }
      } catch (e) {
        debugPrint('⚠️ Error fetching school announcements: $e');
      }

      // Sort newest first
      rawCandidates.sort((a, b) {
        if (a.createdAt == null && b.createdAt == null) return 0;
        if (a.createdAt == null) return 1;
        if (b.createdAt == null) return -1;
        return b.createdAt!.compareTo(a.createdAt!);
      });

      // Deduplicate by ID and topicKey (removes duplicate announcements & repeating exam/sports alerts)
      final List<NotificationItem> fetchedItems = [];
      final Set<String> seenIds = {};
      final Set<String> seenTopics = {};

      for (final item in rawCandidates) {
        if (item.id.isNotEmpty && seenIds.contains(item.id)) continue;
        if (seenTopics.contains(item.topicKey)) {
          // If already added, prefer the item that has an actionable navigation route
          final existingIdx = fetchedItems.indexWhere((it) => it.topicKey == item.topicKey);
          if (existingIdx != -1) {
            final existing = fetchedItems[existingIdx];
            if (existing.route == null && item.route != null) {
              fetchedItems[existingIdx] = item;
            }
          }
          continue;
        }

        if (item.id.isNotEmpty) seenIds.add(item.id);
        seenTopics.add(item.topicKey);
        fetchedItems.add(item);
      }

      if (mounted) {
        setState(() {
          _notifications = fetchedItems;
          _isLoading = false;
          _isRefreshing = false;
        });
      }
    } catch (e) {
      debugPrint('Error in _fetchNotifications: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isRefreshing = false;
        });
      }
    }
  }

  Future<void> _markAllAsRead() async {
    final unreadItems = _notifications.where((n) => !n.isRead).toList();
    if (unreadItems.isEmpty) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
              SizedBox(width: 8),
              Text('All notifications are already read ✓', style: TextStyle(fontFamily: 'Outfit')),
            ],
          ),
          backgroundColor: const Color(0xFF047857),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    setState(() {
      for (var n in _notifications) {
        n.isRead = true;
      }
    });

    final courseService = Provider.of<CourseService>(context, listen: false);
    final userId = courseService.student.id;

    try {
      final baseUrl = AppConstants.baseUrl;
      http.put(
        Uri.parse('$baseUrl/api/notifications/read-all'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId}),
      ).catchError((_) => http.Response('', 500));
    } catch (_) {}

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '${unreadItems.length} notification${unreadItems.length > 1 ? 's' : ''} marked as read',
          style: const TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.w600),
        ),
        backgroundColor: const Color(0xFF047857),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'UNDO',
          textColor: const Color(0xFFFDE047),
          onPressed: () {
            setState(() {
              for (var n in unreadItems) {
                n.isRead = false;
              }
            });
            for (var n in unreadItems) {
              try {
                http.put(Uri.parse('${AppConstants.baseUrl}/api/notifications/${n.id}/unread')).catchError((_) => http.Response('', 500));
              } catch (_) {}
            }
          },
        ),
      ),
    );
  }

  Future<void> _markAsRead(NotificationItem item) async {
    if (item.isRead) return;

    setState(() {
      item.isRead = true;
    });

    try {
      final baseUrl = AppConstants.baseUrl;
      http.put(Uri.parse('$baseUrl/api/notifications/${item.id}/read')).catchError((_) => http.Response('', 500));
    } catch (_) {}

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Notification marked as read', style: TextStyle(fontFamily: 'Outfit')),
        backgroundColor: const Color(0xFF0F172A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'UNDO',
          textColor: const Color(0xFF34D399),
          onPressed: () {
            setState(() {
              item.isRead = false;
            });
            try {
              http.put(Uri.parse('${AppConstants.baseUrl}/api/notifications/${item.id}/unread')).catchError((_) => http.Response('', 500));
            } catch (_) {}
          },
        ),
      ),
    );
  }

  void _deleteNotification(NotificationItem item) {
    final index = _notifications.indexOf(item);
    setState(() {
      _notifications.removeWhere((n) => n.id == item.id);
    });

    bool undone = false;

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Notification dismissed', style: TextStyle(fontFamily: 'Outfit')),
        backgroundColor: const Color(0xFF1E293B),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'UNDO',
          textColor: const Color(0xFF38BDF8),
          onPressed: () {
            undone = true;
            setState(() {
              if (index >= 0 && index <= _notifications.length) {
                _notifications.insert(index, item);
              } else {
                _notifications.add(item);
              }
            });
          },
        ),
      ),
    ).closed.then((reason) {
      if (!undone && reason != SnackBarClosedReason.action) {
        try {
          http.delete(Uri.parse('${AppConstants.baseUrl}/api/notifications/${item.id}')).catchError((_) => http.Response('', 500));
        } catch (_) {}
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !n.isRead).length;

    final filteredNotifications = _notifications.where((n) {
      if (_selectedFilterIndex == 0) return true;
      final filter = _filters[_selectedFilterIndex]['label'] as String;
      final f = filter.toLowerCase();
      final cat = n.category.toLowerCase();
      if (f == 'exams') {
        return cat == 'exams' || cat.contains('academic') || (n.type?.contains('EXAM') ?? false);
      }
      if (f == 'sports') {
        return cat == 'sports' || (n.type?.contains('SPORT') ?? false);
      }
      if (f == 'homework') {
        return cat == 'homework';
      }
      if (f == 'ai tutor') {
        return cat == 'ai tutor';
      }
      if (f == 'announcements') {
        return cat == 'announcements' || cat == 'welfare' || cat == 'attendance';
      }
      return cat == f;
    }).toList();

    int countForFilter(String filterLabel) {
      if (filterLabel == 'All') return _notifications.length;
      final f = filterLabel.toLowerCase();
      return _notifications.where((n) {
        final cat = n.category.toLowerCase();
        if (f == 'exams') {
          return cat == 'exams' || cat.contains('academic') || (n.type?.contains('EXAM') ?? false);
        }
        if (f == 'sports') {
          return cat == 'sports' || (n.type?.contains('SPORT') ?? false);
        }
        if (f == 'homework') {
          return cat == 'homework';
        }
        if (f == 'ai tutor') {
          return cat == 'ai tutor';
        }
        if (f == 'announcements') {
          return cat == 'announcements' || cat == 'welfare' || cat == 'attendance';
        }
        return cat == f;
      }).length;
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(68),
        child: SafeArea(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: Responsive.horizontalPadding(context),
              vertical: 8,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Back Button
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.chevron_left_rounded,
                      color: Color(0xFF1E293B),
                      size: 26,
                    ),
                  ),
                ),

                // Title + Unread Badge
                Row(
                  children: [
                    const Text(
                      'Notifications',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                        fontFamily: 'Outfit',
                      ),
                    ),
                    if (unreadCount > 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 9, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF3B30),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(
                          '$unreadCount New',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ),
                    ],
                  ],
                ),

                // Right Header Actions (Refresh / Sync + Read All)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Refresh Button
                    GestureDetector(
                      onTap: () => _fetchNotifications(isSilent: true),
                      child: Container(
                        width: 38,
                        height: 38,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Center(
                          child: _isRefreshing
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF5722)),
                                  ),
                                )
                              : const Icon(
                                  Icons.refresh_rounded,
                                  color: Color(0xFF64748B),
                                  size: 20,
                                ),
                        ),
                      ),
                    ),

                    // 'Read All' Button with Orange Checkmark
                    GestureDetector(
                      onTap: _markAllAsRead,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: unreadCount > 0
                                ? const Color(0xFFFFEDD5)
                                : const Color(0xFFE2E8F0),
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
                            Icon(
                              Icons.check_circle_rounded,
                              color: unreadCount > 0
                                  ? const Color(0xFFF97316)
                                  : const Color(0xFF94A3B8),
                              size: 16,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'Read All',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: unreadCount > 0
                                    ? const Color(0xFFEA580C)
                                    : const Color(0xFF94A3B8),
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Filter Pills Bar (All, Homework, Exams, AI Tutor, Sports, Announcements)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.symmetric(
                  horizontal: Responsive.horizontalPadding(context),
                ),
                child: Row(
                  children: List.generate(_filters.length, (index) {
                    final item = _filters[index];
                    final isSelected = _selectedFilterIndex == index;
                    final Color itemColor = item['color'] as Color;
                    final count = countForFilter(item['label'] as String);

                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _selectedFilterIndex = index);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFFFF5722) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFFFF5722)
                                  : const Color(0xFFE2E8F0),
                              width: 1.2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: isSelected
                                    ? const Color(0xFFFF5722).withValues(alpha: 0.25)
                                    : Colors.black.withValues(alpha: 0.02),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                item['icon'] as IconData,
                                size: 15,
                                color: isSelected ? Colors.white : itemColor,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                count > 0 ? '${item['label']} ($count)' : item['label'] as String,
                                style: TextStyle(
                                  fontSize: 12,
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
              ),
            ),
            const SizedBox(height: 6),

            // Notifications List with RefreshIndicator
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => _fetchNotifications(isSilent: false),
                color: const Color(0xFFFF5722),
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF5722)),
                        ),
                      )
                    : filteredNotifications.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                            children: [
                              SizedBox(height: MediaQuery.of(context).size.height * 0.16),
                              Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      width: 80,
                                      height: 80,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFF1F5F9),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.notifications_off_rounded,
                                        size: 40,
                                        color: Color(0xFF94A3B8),
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      "You're all caught up!",
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0F172A),
                                        fontFamily: 'Outfit',
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      "No notifications found in this category",
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    ElevatedButton.icon(
                                      onPressed: () => _fetchNotifications(isSilent: false),
                                      icon: const Icon(Icons.refresh_rounded, size: 16),
                                      label: const Text('Refresh Notifications'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFFFF5722),
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(14),
                                        ),
                                        elevation: 0,
                                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                            padding: EdgeInsets.symmetric(
                              horizontal: Responsive.horizontalPadding(context),
                              vertical: 6,
                            ),
                            itemCount: filteredNotifications.length,
                            itemBuilder: (context, index) {
                              final item = filteredNotifications[index];
                              return _buildNotificationCard(item);
                            },
                          ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const CustomBottomNavBar(currentIndex: -1),
    );
  }

  Widget _buildNotificationCard(NotificationItem item) {
    return Dismissible(
      key: Key(item.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => _deleteNotification(item),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFFEE2E2),
          borderRadius: BorderRadius.circular(22),
        ),
        child: const Icon(
          Icons.delete_outline_rounded,
          color: Color(0xFFDC2626),
          size: 26,
        ),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: !item.isRead
                ? item.buttonColor.withValues(alpha: 0.35)
                : const Color(0xFFF1F5F9),
            width: !item.isRead ? 1.5 : 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Top Header Row: Gradient Icon Box + Category Pill + Timestamp & Dot
                Row(
                  children: [
                    // Squircle Gradient Icon
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: item.gradientColors,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: item.gradientColors.first.withValues(alpha: 0.3),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Icon(
                          item.icon,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),

                    // Category Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: item.categoryBgColor,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        item.category,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: item.categoryTextColor,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),

                    const Spacer(),

                    // Timestamp + Unread Dot
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          item.time,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (!item.isRead) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: item.buttonColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 2. Main Content Row: (Left Texts & Actions) + (Right 3D/Vector Illustration)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Left Column (Takes available space)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title
                          Text(
                            item.title,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 5),

                          // Description
                          Text(
                            item.message,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF64748B),
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Action Buttons: Primary Pill + 'Mark as read' in responsive Wrap
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              GestureDetector(
                                onTap: () {
                                  _markAsRead(item);
                                  if (item.route != null) {
                                    Navigator.pushNamed(context, item.route!);
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: item.buttonColor,
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: [
                                      BoxShadow(
                                        color: item.buttonColor.withValues(alpha: 0.3),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          item.actionLabel,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                            fontFamily: 'Outfit',
                                          ),
                                        ),
                                        const SizedBox(width: 3),
                                        const Icon(
                                          Icons.chevron_right_rounded,
                                          color: Colors.white,
                                          size: 15,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              if (!item.isRead)
                                GestureDetector(
                                  onTap: () => _markAsRead(item),
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 4),
                                    child: Text(
                                      'Mark as read',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF64748B),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 8),

                    // Right Illustration
                    SizedBox(
                      width: 84,
                      height: 84,
                      child: Center(
                        child: _buildCategoryIllustration(item.category),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryIllustration(String category) {
    switch (category.toLowerCase()) {
      case 'homework':
        return _buildHomeworkIllustration();
      case 'exams':
        return _buildExamsIllustration();
      case 'ai tutor':
        return _buildAiTutorIllustration();
      case 'sports':
        return _buildSportsIllustration();
      default:
        return _buildAnnouncementsIllustration();
    }
  }

  // Sports Illustration
  Widget _buildSportsIllustration() {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFFEF3C7),
            ),
          ),
          Positioned(
            right: 12,
            top: 14,
            child: Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFDE68A).withValues(alpha: 0.7),
              ),
            ),
          ),
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFD97706).withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: const Center(
              child: Icon(
                Icons.emoji_events_rounded,
                color: Colors.white,
                size: 28,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 1. Homework Illustration (Notebook + Pencil + Soft Glow)
  Widget _buildHomeworkIllustration() {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Glow Circle
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFFFF1E8),
            ),
          ),
          Positioned(
            right: 12,
            top: 14,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFFEDD5).withValues(alpha: 0.6),
              ),
            ),
          ),
          // Angled Notebook
          Transform.rotate(
            angle: -0.08,
            child: Container(
              width: 58,
              height: 68,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFFB74D), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFEA580C).withValues(alpha: 0.15),
                    blurRadius: 8,
                    offset: const Offset(2, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Binding Tab
                  Container(
                    height: 10,
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFFE0B2),
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(8),
                        topRight: Radius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Ruled Lines
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Column(
                      children: List.generate(
                        4,
                        (i) => Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          height: 3,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFE0B2),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Orange Pencil
          Positioned(
            right: 12,
            bottom: 16,
            child: Transform.rotate(
              angle: 0.6,
              child: Container(
                width: 10,
                height: 46,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFF9800), Color(0xFFE65100)],
                  ),
                  borderRadius: BorderRadius.circular(4),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.15),
                      blurRadius: 4,
                      offset: const Offset(1, 2),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 2. Exams Illustration (Calendar Block + Clock Badge)
  Widget _buildExamsIllustration() {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Glow Circle
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFEFF6FF),
            ),
          ),
          // 3D Calendar Box
          Container(
            width: 62,
            height: 62,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF93C5FD), width: 1.8),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF1D4ED8).withValues(alpha: 0.15),
                  blurRadius: 8,
                  offset: const Offset(2, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                // Calendar Top Bar
                Container(
                  height: 16,
                  decoration: const BoxDecoration(
                    color: Color(0xFF3B82F6),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(12),
                      topRight: Radius.circular(12),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: List.generate(
                      4,
                      (i) => Container(
                        width: 3,
                        height: 5,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                  ),
                ),
                // Calendar Days Grid
                Padding(
                  padding: const EdgeInsets.all(6),
                  child: GridView.count(
                    crossAxisCount: 4,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 3,
                    crossAxisSpacing: 3,
                    children: List.generate(
                      8,
                      (i) => Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFDBEAFE),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Clock Badge
          Positioned(
            right: 6,
            bottom: 8,
            child: Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF2563EB), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1D4ED8).withValues(alpha: 0.2),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Center(
                child: Icon(
                  Icons.access_time_rounded,
                  color: Color(0xFF2563EB),
                  size: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 3. AI Tutor Illustration (Cute Robot with Sparkles)
  Widget _buildAiTutorIllustration() {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Glow Circle
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFECFDF5),
            ),
          ),
          // Sparkle Stars
          Positioned(
            left: 12,
            top: 14,
            child: Icon(
              Icons.auto_awesome,
              size: 14,
              color: const Color(0xFF10B981).withValues(alpha: 0.8),
            ),
          ),
          // Robot Avatar Box
          Container(
            width: 58,
            height: 64,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFA7F3D0), Color(0xFF6EE7B7)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF10B981), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF059669).withValues(alpha: 0.15),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Robot Eyes Visor
                Container(
                  width: 40,
                  height: 20,
                  decoration: BoxDecoration(
                    color: const Color(0xFF064E3B),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Color(0xFF34D399),
                          shape: BoxShape.circle,
                        ),
                      ),
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Color(0xFF34D399),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                // Robot Tablet
                Container(
                  width: 28,
                  height: 14,
                  decoration: BoxDecoration(
                    color: const Color(0xFF047857),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Center(
                    child: Icon(Icons.code_rounded, color: Colors.white, size: 10),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 4. Announcements Illustration (Golden Trophy + Stars)
  Widget _buildAnnouncementsIllustration() {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Glow Circle
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFFFFBEB),
            ),
          ),
          // Sparkle Stars
          Positioned(
            right: 12,
            top: 14,
            child: Icon(
              Icons.star_rounded,
              size: 16,
              color: const Color(0xFFF59E0B).withValues(alpha: 0.8),
            ),
          ),
          // Trophy Cup
          Container(
            width: 54,
            height: 58,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFDE047), Color(0xFFF59E0B)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFD97706).withValues(alpha: 0.25),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Center(
              child: Icon(
                Icons.emoji_events_rounded,
                color: Colors.white,
                size: 34,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

