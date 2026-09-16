import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/localization/app_localization.dart';
import '../widgets/bottom_nav_bar.dart';
import '../services/course_service.dart';
import '../utils/pdf_downloader.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  static const String _baseUrl = 'http://localhost:5000';

  int _selectedFilterIndex = 0;
  final Set<String> _bookmarkedIds = {};
  final Set<String> _downloadedIds = {};

  bool _isLoading = false;
  bool _hasInitialFetched = false;
  List<Map<String, dynamic>> _announcements = [];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_hasInitialFetched) {
      _hasInitialFetched = true;
      _fetchAnnouncements();
    }
  }

  // ─── FETCH REAL ANNOUNCEMENTS + NOTIFICATIONS ─────────────────────────────
  Future<void> _fetchAnnouncements() async {
    final courseService = Provider.of<CourseService>(context, listen: false);
    final student = courseService.student;

    final schoolId = student.schoolId ?? '';
    final studentClass = student.classStandard.replaceAll(RegExp(r'\D'), '');
    final section = student.section;
    final userId = student.id;

    debugPrint('📢 Announcements: schoolId=$schoolId, class=$studentClass, section=$section, userId=$userId');

    setState(() => _isLoading = true);

    try {
      final List<Map<String, dynamic>> allItems = [];

      final authHeaders = <String, String>{
        'Content-Type': 'application/json',
      };
      if (student.token != null && student.token!.isNotEmpty) {
        authHeaders['Authorization'] = 'Bearer ${student.token}';
      }

      // 1. Fetch school announcements
      final annParams = <String>[];
      if (schoolId.isNotEmpty) annParams.add('schoolId=$schoolId');
      if (studentClass.isNotEmpty) annParams.add('class=$studentClass');
      if (section.isNotEmpty) annParams.add('section=$section');
      
      final annUrl = '$_baseUrl/api/students/announcements${annParams.isNotEmpty ? '?${annParams.join('&')}' : ''}';
      debugPrint('📢 Announcements URL: $annUrl');
      
      try {
        final annRes = await http.get(Uri.parse(annUrl), headers: authHeaders).timeout(const Duration(seconds: 8));
        if (annRes.statusCode == 200) {
          final annBody = jsonDecode(annRes.body);
          if (annBody['success'] == true && annBody['data'] is List) {
            for (final item in annBody['data']) {
              allItems.add(Map<String, dynamic>.from(item));
            }
          }
        }
      } catch (e) {
        debugPrint('⚠️ Announcements fetch error: $e');
      }

      // 2. Fetch personal notifications
      if (userId.isNotEmpty) {
        try {
          final notifRes = await http
              .get(Uri.parse('$_baseUrl/api/notifications?userId=$userId'), headers: authHeaders)
              .timeout(const Duration(seconds: 8));
          if (notifRes.statusCode == 200) {
            final notifBody = jsonDecode(notifRes.body);
            if (notifBody['success'] == true && notifBody['data'] is List) {
              for (final n in notifBody['data']) {
                allItems.add({
                  'id': n['id']?.toString() ?? '',
                  'title': n['title']?.toString() ?? '',
                  'body': n['message']?.toString() ?? n['body']?.toString() ?? '',
                  'target': 'Personal',
                  'sender': 'System Automated',
                  'type': n['type']?.toString() ?? 'Personal Alert',
                  'pinned': false,
                  'createdAt': n['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
                });
              }
            }
          }
        } catch (e) {
          debugPrint('⚠️ Notifications fetch error: $e');
        }
      }

      // 3. Deduplicate by unique id and title+body
      final seenIds = <String>{};
      final seenKeys = <String>{};
      final uniqueItems = <Map<String, dynamic>>[];
      for (final item in allItems) {
        final id = item['id']?.toString() ?? '';
        final normTitle = (item['title'] ?? '').toString().trim().toLowerCase();
        final normBody = (item['body'] ?? item['content'] ?? item['message'] ?? '').toString().trim().toLowerCase();
        final key = '$normTitle:::$normBody';

        if (id.isNotEmpty && seenIds.contains(id)) continue;
        if (normBody.isNotEmpty && seenKeys.contains(key)) continue;

        if (id.isNotEmpty) seenIds.add(id);
        if (normBody.isNotEmpty) seenKeys.add(key);
        uniqueItems.add(item);
      }

      // 4. Sort by createdAt descending
      uniqueItems.sort((a, b) {
        final dtA = DateTime.tryParse(a['createdAt']?.toString() ?? '') ?? DateTime(2020);
        final dtB = DateTime.tryParse(b['createdAt']?.toString() ?? '') ?? DateTime(2020);
        return dtB.compareTo(dtA);
      });

      // 5. Map each item into the UI-compatible format with formattedTitle
      final mappedItems = uniqueItems.map((item) => _formatAnnouncementItem(item)).toList();

      debugPrint('📢 Announcements: Got ${mappedItems.length} total items');

      setState(() {
        _announcements = mappedItems;
      });
    } catch (err) {
      debugPrint('❌ Announcements fetch error: $err');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  // ─── UNICODE SANITIZER (mirrors Next.js sanitizeUnicodeText) ─────────────
  String _sanitizeUnicodeText(String str) {
    if (str.isEmpty) return '';
    // Clean unicode replacement character and lone surrogates
    var clean = str.replaceAll(RegExp(r'[\uFFFD\uD800-\uDFFF]'), '');
    // Clean emojis from beginning of string (exact match to Next.js sanitizeUnicodeText)
    clean = clean.replaceAll(RegExp(r'^(?:[\u2600-\u27BF]|\uFE0F|\u200D|\s|\uFFFD|[\uD800-\uDBFF][\uDC00-\uDFFF])+'), '');
    return clean.trim();
  }

  // ─── FORMAT API ITEM INTO UI MAP (mirrors Next.js formatNotification) ────
  Map<String, dynamic> _formatAnnouncementItem(Map<String, dynamic> raw) {
    final String rawTitle = raw['title']?.toString().trim() ?? '';
    final String rawBody = (raw['body'] ?? raw['content'] ?? raw['message'])?.toString().trim() ?? '';
    final String sender = raw['sender']?.toString().trim() ?? '';
    final String createdAt = raw['createdAt']?.toString() ?? '';
    final String target = raw['target']?.toString() ?? '';
    final String rawDate = raw['date']?.toString().trim() ?? '';
    final bool pinned = raw['pinned'] == true;

    // Clean raw emojis from beginning of body and title
    final String cleanBody = _sanitizeUnicodeText(rawBody);

    final text = '$rawTitle $rawBody $target'.toLowerCase();

    // 1. DYNAMIC SENDER RESOLUTION (mirrors Next.js dynamicSender)
    String dynamicSender = sender;
    if (sender.isEmpty || sender == 'System Automated' || sender == 'System' || sender == 'You (Teacher)') {
      if (text.contains('sport') || text.contains('competition') || text.contains('athletics') ||
          text.contains('badminton') || text.contains('chess') || text.contains('football') || text.contains('stadium')) {
        dynamicSender = 'Physical Education Dept';
      } else if (text.contains('social activity') || text.contains('approved') || text.contains('remarks') || text.contains('teacher')) {
        dynamicSender = 'Class Teacher';
      } else if (text.contains('badge') || text.contains('unlocked') || text.contains('volunteer') || text.contains('changemaker')) {
        dynamicSender = 'Awards & Recognition Committee';
      } else if (text.contains('science') || text.contains('lab') || text.contains('exhibition') || text.contains('robotics')) {
        dynamicSender = 'Science Dept';
      } else {
        dynamicSender = 'Headmaster Office';
      }
    }

    // 2. TYPE & FORMATTED TITLE RESOLUTION (mirrors Next.js type & formattedTitle)
    String type = 'General';
    String fallbackTitle = (rawTitle.isNotEmpty && rawTitle != 'Personal Alert' && rawTitle != 'Notification')
        ? rawTitle
        : 'School Circular';
    String formattedTitle = _sanitizeUnicodeText(fallbackTitle);
    if (formattedTitle.isEmpty) formattedTitle = 'School Circular';

    Color themeColor = const Color(0xFF10B981);
    Color tagBg = const Color(0xFFDCFCE7);
    Color tagColor = const Color(0xFF16A34A);
    Color iconCircleBg = const Color(0xFFECFDF5);
    String iconType = 'ptm_circular';
    bool isUrgent = false;

    // 1. Badges & Achievements
    if (text.contains('badge') || text.contains('unlocked') || text.contains('achievement') || text.contains('volunteer') || text.contains('changemaker')) {
      type = 'Personal Alert';
      formattedTitle = (rawTitle.isEmpty || rawTitle == 'Personal Alert' || rawTitle == 'Notification')
          ? 'Achievement Badge Unlocked!'
          : _sanitizeUnicodeText(rawTitle);
      themeColor = const Color(0xFFD97706);
      tagBg = const Color(0xFFFEF3C7);
      tagColor = const Color(0xFFB45309);
      iconCircleBg = const Color(0xFFFFFBEB);
      iconType = 'stem_science';
    }
    // 2. Approvals & Dashboard Remarks
    else if (text.contains('approved') || text.contains('activity') || text.contains('remarks') || text.contains('verified')) {
      type = 'Personal Alert';
      formattedTitle = (rawTitle.isEmpty || rawTitle == 'Personal Alert' || rawTitle == 'Notification')
          ? 'Social Activity Approved'
          : _sanitizeUnicodeText(rawTitle);
      themeColor = const Color(0xFFD97706);
      tagBg = const Color(0xFFFEF3C7);
      tagColor = const Color(0xFFB45309);
      iconCircleBg = const Color(0xFFFFFBEB);
      iconType = 'ptm_circular';
    }
    // 3. Urgent / Emergency
    else if (text.contains('urgent') || text.contains('closure') || text.contains('emergency') ||
        text.contains('closed') || text.contains('holiday') || text.contains('heavy rain') ||
        text.contains('bus route') || text.contains('water supply') || text.contains('parent meeting')) {
      type = 'Urgent';
      isUrgent = true;
      formattedTitle = (rawTitle.isEmpty || rawTitle == 'Personal Alert' || rawTitle == 'Notification')
          ? 'Urgent School Notice'
          : _sanitizeUnicodeText(rawTitle);
      themeColor = const Color(0xFFDC2626);
      tagBg = const Color(0xFFFEE2E2);
      tagColor = const Color(0xFFDC2626);
      iconCircleBg = const Color(0xFFFEF2F2);
      iconType = 'exam_clock';
    }
    // 4. Academic / Exams / Study Material / Homework
    else if (text.contains('exam') || text.contains('timetable') || text.contains('test') ||
        text.contains('homework') || text.contains('quiz') || text.contains('practical') ||
        text.contains('study') || text.contains('material') || text.contains('progress') ||
        text.contains('report') || text.contains('library') || text.contains('scholarship') ||
        text.contains('workshop') || text.contains('submission') || text.contains('chapter')) {
      type = 'Academic';
      formattedTitle = (rawTitle.isEmpty || rawTitle == 'Personal Alert' || rawTitle == 'Notification')
          ? 'Academic Notice'
          : _sanitizeUnicodeText(rawTitle);
      themeColor = const Color(0xFF0284C7);
      tagBg = const Color(0xFFE0F2FE);
      tagColor = const Color(0xFF0284C7);
      iconCircleBg = const Color(0xFFF0F9FF);
      iconType = 'exam_clock';
    }
    // 5. Events & Sports Competitions
    else if (text.contains('fair') || text.contains('event') || text.contains('cultural') ||
        text.contains('sports') || text.contains('competition') || text.contains('celebration') ||
        text.contains('chess') || text.contains('match') || text.contains('tournament')) {
      type = 'Event';
      formattedTitle = (rawTitle.isEmpty || rawTitle == 'Personal Alert' || rawTitle == 'Notification')
          ? 'Event & Sports Update'
          : _sanitizeUnicodeText(rawTitle);
      themeColor = const Color(0xFF7C3AED);
      tagBg = const Color(0xFFF3E8FF);
      tagColor = const Color(0xFF7C3AED);
      iconCircleBg = const Color(0xFFFAF5FF);
      iconType = 'stem_science';
    }

    // 3. DATE RESOLUTION (mirrors Next.js ann.date || toLocaleDateString)
    String displayDate = '';
    if (rawDate.isNotEmpty && !rawDate.toLowerCase().contains('invalid')) {
      displayDate = rawDate;
    } else if (createdAt.isNotEmpty) {
      final dt = DateTime.tryParse(createdAt);
      if (dt != null) {
        displayDate = '${dt.month}/${dt.day}/${dt.year}';
      }
    }
    if (displayDate.isEmpty) {
      final now = DateTime.now();
      displayDate = '${now.month}/${now.day}/${now.year}';
    }

    // Time Ago
    String timeLabel = displayDate;
    if (createdAt.isNotEmpty) {
      final dt = DateTime.tryParse(createdAt);
      if (dt != null) {
        final diff = DateTime.now().difference(dt);
        if (diff.inMinutes < 60) {
          timeLabel = '${diff.inMinutes.clamp(1, 59)}m ago';
        } else if (diff.inHours < 24) {
          timeLabel = '${diff.inHours}h ago';
        } else if (diff.inDays == 1) {
          timeLabel = 'Yesterday';
        } else if (diff.inDays < 7) {
          timeLabel = '${diff.inDays}d ago';
        } else {
          timeLabel = displayDate;
        }
      }
    }

    Color timeColor = const Color(0xFF64748B);
    if (isUrgent || pinned) {
      timeColor = const Color(0xFFEA580C);
    }

    // Category mapping for tabs:
    String category = 'Circulars';
    if (type == 'Academic') {
      category = 'Exams';
    } else if (type == 'Event' || type == 'Personal Alert') {
      category = 'Events';
    } else {
      category = 'Circulars';
    }

    // Bullets & PDF Actions
    final bool isPdf = (type == 'Academic' || category == 'Exams') &&
        (text.contains('exam') || text.contains('timetable') || text.contains('pdf') || text.contains('circular'));

    List<String> bullets = [];
    if (cleanBody.contains('\n')) {
      bullets = cleanBody
          .split('\n')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty && s.length > 5)
          .toList();
    } else if (cleanBody.contains('. ')) {
      bullets = cleanBody
          .split('. ')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty && s.length > 5)
          .map((s) => s.endsWith('.') ? s : '$s.')
          .toList();
    }

    return {
      'id': raw['id']?.toString() ?? 'ann_${DateTime.now().millisecondsSinceEpoch}',
      'type': type,
      'category': category,
      'isUrgent': isUrgent,
      'time': timeLabel,
      'date': displayDate,
      'timeColor': timeColor,
      'title': formattedTitle,
      'formattedTitle': formattedTitle,
      'cleanBody': cleanBody,
      'content': cleanBody,
      'publisher': dynamicSender,
      'dynamicSender': dynamicSender,
      'tagBg': tagBg,
      'tagColor': tagColor,
      'themeColor': themeColor,
      'actionType': isPdf ? 'pdf' : 'details',
      'actionLabel': isPdf ? 'Download PDF' : 'View Details',
      'pdfFileName': '${formattedTitle.replaceAll(' ', '_').replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '')}.pdf',
      'fileSize': '1.2 MB',
      'iconType': iconType,
      'iconCircleBg': iconCircleBg,
      'bullets': bullets,
    };
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month.clamp(1, 12) - 1];
  }

  // --- 1. TOGGLE SAVE / BOOKMARK ---
  void _handleToggleBookmark(Map<String, dynamic> item) {
    final String id = item['id'] as String;
    final String title = item['title'] as String;
    setState(() {
      if (_bookmarkedIds.contains(id)) {
        _bookmarkedIds.remove(id);
      } else {
        _bookmarkedIds.add(id);
      }
    });

    final bool isSaved = _bookmarkedIds.contains(id);
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isSaved ? Icons.bookmark_rounded : Icons.bookmark_remove_rounded,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isSaved ? 'Saved to Bookmarks: "$title"' : 'Removed from Bookmarks',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: isSaved ? const Color(0xFF0F172A) : const Color(0xFF64748B),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // --- 2. DOWNLOAD PDF FUNCTION ---
  void _handleDownloadPdf(BuildContext context, Map<String, dynamic> item) async {
    final String id = item['id'] as String;
    final String title = item['title'] as String;
    final String fileName = item['pdfFileName'] as String? ?? 'School_Circular.pdf';
    final String fileSize = item['fileSize'] as String? ?? '1.2 MB';

    if (_downloadedIds.contains(id)) {
      _showPdfViewerModal(context, title, fileName);
      return;
    }

    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final courseService = Provider.of<CourseService>(context, listen: false);

    // 1. Show clean loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 48,
                  height: 48,
                  child: CircularProgressIndicator(
                    strokeWidth: 3.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Downloading PDF...',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  fileName,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    // 2. Network simulation delay
    await Future.delayed(const Duration(milliseconds: 800));

    // 3. Auto-close dialog popup
    if (context.mounted && Navigator.canPop(context)) {
      Navigator.pop(context);
    }

    // 4. Trigger download exactly ONCE
    if (mounted) {
      setState(() {
        _downloadedIds.add(id);
      });
      courseService.addRewardCoins(10);
      downloadPdfFile(
        fileName,
        title,
        item['content'] as String? ?? '',
        List<String>.from(item['bullets'] ?? []),
      );

      // 5. Show toast with direct Open action
      scaffoldMessenger.hideCurrentSnackBar();
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Color(0xFF4ADE80), size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Downloaded $fileName ($fileSize) • +10 Coins',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5),
                ),
              ),
            ],
          ),
          action: SnackBarAction(
            label: 'OPEN',
            textColor: const Color(0xFF38BDF8),
            onPressed: () {
              if (context.mounted) {
                _showPdfViewerModal(context, title, fileName);
              }
            },
          ),
          backgroundColor: const Color(0xFF0F172A),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  // --- 3. SAMPLE PDF PREVIEW VIEWER MODAL ---
  void _showPdfViewerModal(BuildContext context, String title, String fileName) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.9,
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              // Top Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFEA580C), size: 22),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: MediaQuery.of(context).size.width * 0.6,
                          child: Text(
                            fileName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white70),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Color(0xFF334155)),

              // PDF Mock Paper Viewer
              Expanded(
                child: Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 15,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Tamil Nadu Seal Header
                        Container(
                          width: 48,
                          height: 48,
                          decoration: const BoxDecoration(
                            color: Color(0xFFEFF6FF),
                            shape: BoxShape.circle,
                          ),
                          child: const Center(
                            child: Icon(Icons.account_balance_rounded, color: Color(0xFF2563EB), size: 28),
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'DEPARTMENT OF SCHOOL EDUCATION',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF1E293B),
                            letterSpacing: 0.5,
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const Text(
                          'Government of Tamil Nadu • Academic Notice',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 14),
                        const Divider(color: Color(0xFFE2E8F0)),
                        const SizedBox(height: 10),

                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            title,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Mock Timetable Table
                        Table(
                          border: TableBorder.all(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(8)),
                          children: const [
                            TableRow(
                              decoration: BoxDecoration(color: Color(0xFFF8FAFC)),
                              children: [
                                Padding(padding: EdgeInsets.all(8), child: Text('Date', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                                Padding(padding: EdgeInsets.all(8), child: Text('Subject', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                                Padding(padding: EdgeInsets.all(8), child: Text('Time', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                              ],
                            ),
                            TableRow(
                              children: [
                                Padding(padding: EdgeInsets.all(8), child: Text('15 Sep 2026', style: TextStyle(fontSize: 11))),
                                Padding(padding: EdgeInsets.all(8), child: Text('Language - Tamil', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600))),
                                Padding(padding: EdgeInsets.all(8), child: Text('10:00 AM - 1:15 PM', style: TextStyle(fontSize: 11))),
                              ],
                            ),
                            TableRow(
                              children: [
                                Padding(padding: EdgeInsets.all(8), child: Text('17 Sep 2026', style: TextStyle(fontSize: 11))),
                                Padding(padding: EdgeInsets.all(8), child: Text('English', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600))),
                                Padding(padding: EdgeInsets.all(8), child: Text('10:00 AM - 1:15 PM', style: TextStyle(fontSize: 11))),
                              ],
                            ),
                            TableRow(
                              children: [
                                Padding(padding: EdgeInsets.all(8), child: Text('19 Sep 2026', style: TextStyle(fontSize: 11))),
                                Padding(padding: EdgeInsets.all(8), child: Text('Mathematics', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600))),
                                Padding(padding: EdgeInsets.all(8), child: Text('10:00 AM - 1:15 PM', style: TextStyle(fontSize: 11))),
                              ],
                            ),
                            TableRow(
                              children: [
                                Padding(padding: EdgeInsets.all(8), child: Text('22 Sep 2026', style: TextStyle(fontSize: 11))),
                                Padding(padding: EdgeInsets.all(8), child: Text('Science', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600))),
                                Padding(padding: EdgeInsets.all(8), child: Text('10:00 AM - 1:15 PM', style: TextStyle(fontSize: 11))),
                              ],
                            ),
                            TableRow(
                              children: [
                                Padding(padding: EdgeInsets.all(8), child: Text('25 Sep 2026', style: TextStyle(fontSize: 11))),
                                Padding(padding: EdgeInsets.all(8), child: Text('Social Science', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600))),
                                Padding(padding: EdgeInsets.all(8), child: Text('10:00 AM - 1:15 PM', style: TextStyle(fontSize: 11))),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        const Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Important Instructions:\n1. Students must occupy seats 15 minutes before exam commencement.\n2. Borrowing of geometry boxes or calculators is strictly prohibited.\n3. Verify all question booklet serial numbers before writing.',
                            style: TextStyle(fontSize: 11, color: Color(0xFF475569), height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- 4. SHARE FUNCTION MODAL ---
  void _handleShare(BuildContext context, Map<String, dynamic> item) {
    final String title = item['title'] as String;
    final String content = item['content'] as String;
    final String publisher = item['publisher'] as String;
    final String date = item['date'] as String? ?? 'Today';
    final String shareText = '📢 *[TN School Notice]*: $title\n🏛️ Issued by: $publisher ($date)\n\n$content\n\n🔗 View details on StudentApp: https://tnschools.gov.in/circulars';

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) {
        return Container(
          padding: const EdgeInsets.all(22),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag bar
              Center(
                child: Container(
                  width: 44,
                  height: 4.5,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),

              const Text(
                'Share Announcement',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                  fontFamily: 'Outfit',
                ),
              ),
              const SizedBox(height: 6),
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 20),

              // Share Options Grid (4 Items)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  // WhatsApp
                  _buildShareAppItem(
                    icon: Icons.chat_rounded,
                    color: const Color(0xFF25D366),
                    bgColor: const Color(0xFFDCFCE7),
                    label: 'WhatsApp',
                    onTap: () {
                      Navigator.pop(modalCtx);
                      Clipboard.setData(ClipboardData(text: shareText));
                      _showShareToast('Shared to WhatsApp & Copied text! 💬');
                    },
                  ),

                  // Copy Link
                  _buildShareAppItem(
                    icon: Icons.link_rounded,
                    color: const Color(0xFF2563EB),
                    bgColor: const Color(0xFFEFF6FF),
                    label: 'Copy Link',
                    onTap: () {
                      Navigator.pop(modalCtx);
                      Clipboard.setData(ClipboardData(text: 'https://tnschools.gov.in/circulars/${item['id']}'));
                      _showShareToast('Circular link copied to clipboard! 📋');
                    },
                  ),

                  // School Parent SMS
                  _buildShareAppItem(
                    icon: Icons.forum_rounded,
                    color: const Color(0xFF7C3AED),
                    bgColor: const Color(0xFFF3E8FF),
                    label: 'Class Group',
                    onTap: () {
                      Navigator.pop(modalCtx);
                      Clipboard.setData(ClipboardData(text: shareText));
                      _showShareToast('Notice shared with Class Parent Group! 👥');
                    },
                  ),

                  // Save Image
                  _buildShareAppItem(
                    icon: Icons.download_rounded,
                    color: const Color(0xFFEA580C),
                    bgColor: const Color(0xFFFFF7ED),
                    label: 'Save Image',
                    onTap: () {
                      Navigator.pop(modalCtx);
                      _showShareToast('Notice snapshot saved to Gallery 🖼️');
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildShareAppItem({
    required IconData icon,
    required Color color,
    required Color bgColor,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 26),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: Color(0xFF334155),
              fontFamily: 'Outfit',
            ),
          ),
        ],
      ),
    );
  }

  void _showShareToast(String msg) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  // --- 5. VIEW DETAILS MODAL ---
  void _showAnnouncementDetailsModal(BuildContext context, Map<String, dynamic> item) {
    final String id = item['id'] as String;
    final String category = item['category'] as String;
    final String time = item['time'] as String;
    final String date = item['date'] as String? ?? 'Today';
    final String title = item['title'] as String;
    final String publisher = item['publisher'] as String;
    final String content = item['content'] as String;
    final Color themeColor = item['themeColor'] as Color;
    final String actionType = item['actionType'] as String;
    final List<String> bullets = List<String>.from(item['bullets'] ?? []);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final currentSaved = _bookmarkedIds.contains(id);

            return Container(
              height: MediaQuery.of(context).size.height * 0.84,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 44,
                    height: 4.5,
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),

                  // Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: themeColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            category.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w900,
                              color: themeColor,
                              fontFamily: 'Outfit',
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: Icon(
                                currentSaved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                                color: currentSaved ? const Color(0xFFD97706) : const Color(0xFF64748B),
                                size: 22,
                              ),
                              onPressed: () {
                                _handleToggleBookmark(item);
                                setSheetState(() {});
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.share_outlined, color: Color(0xFF64748B), size: 20),
                              onPressed: () => _handleShare(context, item),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 22),
                              onPressed: () => Navigator.pop(modalCtx),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 1, color: Color(0xFFF1F5F9)),

                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 18.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 8),

                          Row(
                            children: [
                              const Icon(Icons.account_balance_rounded, size: 14, color: Color(0xFF64748B)),
                              const SizedBox(width: 6),
                              Text(
                                publisher,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                              const Spacer(),
                              Text(
                                '$date • $time',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: Color(0xFF94A3B8),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 18),

                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Text(
                              content,
                              style: const TextStyle(
                                fontSize: 13.5,
                                color: Color(0xFF334155),
                                height: 1.55,
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),

                          if (bullets.isNotEmpty) ...[
                            const Text(
                              'Key Highlights & Instructions',
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                                fontFamily: 'Outfit',
                              ),
                            ),
                            const SizedBox(height: 8),
                            ...bullets.map((b) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.check_circle_rounded, size: 15, color: Color(0xFF16A34A)),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      b,
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        color: Color(0xFF475569),
                                        height: 1.35,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )),
                          ],
                        ],
                      ),
                    ),
                  ),

                  // Bottom Action CTA
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, -3),
                        ),
                      ],
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(modalCtx);
                          if (actionType == 'pdf') {
                            _handleDownloadPdf(context, item);
                          } else {
                            _showPdfViewerModal(context, title, item['pdfFileName'] ?? 'Circular.pdf');
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: themeColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(actionType == 'pdf' ? Icons.file_download_rounded : Icons.open_in_new_rounded, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              actionType == 'pdf' ? 'Download Official PDF' : 'View Full Document',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppLocalization.languageNotifier,
      builder: (context, isTamil, _) {
        final List<Map<String, dynamic>> filters = [
          {
            'label': AppLocalization.get('filter_all'),
            'icon': Icons.grid_view_rounded,
            'color': const Color(0xFF2563EB),
            'category': 'All',
          },
          {
            'label': AppLocalization.get('filter_exams'),
            'icon': Icons.assignment_rounded,
            'color': const Color(0xFFEA580C),
            'category': 'Exams',
          },
          {
            'label': AppLocalization.get('filter_circulars'),
            'icon': Icons.mark_email_unread_rounded,
            'color': const Color(0xFF10B981),
            'category': 'Circulars',
          },
          {
            'label': AppLocalization.get('filter_events'),
            'icon': Icons.emoji_events_rounded,
            'color': const Color(0xFF7C3AED),
            'category': 'Events',
          },
          {
            'label': 'Saved (★)',
            'icon': Icons.bookmark_rounded,
            'color': const Color(0xFFD97706),
            'category': 'Saved',
          },
        ];

        final filteredList = _selectedFilterIndex == 0
            ? _announcements
            : (_selectedFilterIndex == 4
                ? _announcements.where((a) => _bookmarkedIds.contains(a['id'])).toList()
                : _announcements.where((a) => a['category'] == filters[_selectedFilterIndex]['category']).toList());

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
              color: const Color(0xFF2563EB),
              onRefresh: _fetchAnnouncements,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildTopAppBar(context),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _buildHeroCardBanner(),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _buildFilterTabsRow(filters),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _isLoading && _announcements.isEmpty
                          ? Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 40),
                              alignment: Alignment.center,
                              child: const Column(
                                children: [
                                  CircularProgressIndicator(
                                    color: Color(0xFF2563EB),
                                    strokeWidth: 3,
                                  ),
                                  SizedBox(height: 12),
                                  Text(
                                    'Loading announcements...',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : filteredList.isEmpty
                              ? Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(32),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Column(
                                    children: [
                                      Icon(
                                        _selectedFilterIndex == 4
                                            ? Icons.bookmark_border_rounded
                                            : Icons.notifications_off_rounded,
                                        size: 40,
                                        color: const Color(0xFF94A3B8),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        _selectedFilterIndex == 4
                                            ? (isTamil ? 'சேமிக்கப்பட்ட அறிவிப்புகள் இல்லை' : 'No saved notices yet')
                                            : (isTamil ? 'அறிவிப்புகள் இல்லை' : 'No announcements found'),
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              : ListView.separated(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: filteredList.length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 14),
                                  itemBuilder: (context, index) {
                                    final item = filteredList[index];
                                    return _buildAnnouncementCard(item);
                                  },
                                ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
          bottomNavigationBar: const CustomBottomNavBar(currentIndex: -1),
        ),
      );
    },
    );
  }

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
              AppLocalization.get('Announcements'),
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

  Widget _buildHeroCardBanner() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = (width * 0.44).clamp(145.0, 180.0);

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
              'assets/images/class/Announcement.png',
              fit: BoxFit.cover,
            ),
          ),
        );
      },
    );
  }

  Widget _buildFilterTabsRow(List<Map<String, dynamic>> filters) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      clipBehavior: Clip.none,
      child: Row(
        children: List.generate(filters.length, (index) {
          final isSelected = _selectedFilterIndex == index;
          final f = filters[index];
          final Color color = f['color'] as Color;

          return GestureDetector(
            onTap: () => setState(() => _selectedFilterIndex = index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              margin: const EdgeInsets.only(right: 10),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF2563EB) : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.28),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ]
                    : [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.025),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    f['icon'] as IconData,
                    size: 20,
                    color: isSelected ? Colors.white : color,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    f['label'] as String,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: isSelected ? Colors.white : const Color(0xFF334155),
                      fontFamily: 'Outfit',
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }

  // --- 4. ANNOUNCEMENT CARD ---
  Widget _buildAnnouncementCard(Map<String, dynamic> item) {
    final String id = item['id'] as String;
    final String type = item['type'] as String? ?? 'General';
    final bool isUrgent = item['isUrgent'] as bool;
    final String date = item['date'] as String? ?? 'Today';
    final String title = item['formattedTitle'] as String? ?? item['title'] as String;
    final String publisher = item['dynamicSender'] as String? ?? item['publisher'] as String;
    final String content = item['cleanBody'] as String? ?? item['content'] as String;
    final Color tagBg = item['tagBg'] as Color;
    final Color tagColor = item['tagColor'] as Color;
    final Color themeColor = item['themeColor'] as Color;
    final String actionType = item['actionType'] as String;
    final String actionLabel = item['actionLabel'] as String;
    final bool isSaved = _bookmarkedIds.contains(id);
    final bool isDownloaded = _downloadedIds.contains(id);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => _showAnnouncementDetailsModal(context, item),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
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
              // Left Accent Highlight Line
              Positioned(
                left: 0,
                top: 14,
                bottom: 14,
                child: Container(
                  width: 4,
                  decoration: BoxDecoration(
                    color: themeColor,
                    borderRadius: const BorderRadius.horizontal(right: Radius.circular(4)),
                  ),
                ),
              ),

              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Top Row: Type Pill + Formatted Title + Urgent Badge
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Type Badge (ACADEMIC, GENERAL, URGENT, EVENT)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: tagBg,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: tagColor.withValues(alpha: 0.3), width: 0.8),
                          ),
                          child: Text(
                            type.toUpperCase(),
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: tagColor,
                              letterSpacing: 0.6,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Formatted Title
                        Expanded(
                          child: Text(
                            title,
                            style: const TextStyle(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                              height: 1.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),

                        if (isUrgent) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'URGENT',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFFDC2626),
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),

                    // 2. cleanBody Content
                    Text(
                      content,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFF475569),
                        height: 1.45,
                        fontFamily: 'Outfit',
                      ),
                    ),
                    const SizedBox(height: 12),

                    // 3. Divider Line
                    Container(
                      height: 1,
                      color: const Color(0xFFF1F5F9),
                    ),
                    const SizedBox(height: 10),

                    // 4. Footer Row: Posted by dynamicSender (Left) + Calendar Date (Right)
                    Row(
                      children: [
                        const Icon(Icons.drive_file_rename_outline_rounded, size: 15, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 4),
                        const Text(
                          'Posted by: ',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF64748B),
                            fontFamily: 'Outfit',
                          ),
                        ),
                        Flexible(
                          child: Text(
                            publisher,
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Spacer(),
                        const Icon(Icons.calendar_today_outlined, size: 12.5, color: Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Text(
                          date,
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600,
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // 5. Action Row: View Details / Download PDF Button + Bookmark Button + Share Button
                    Row(
                      children: [
                        InkWell(
                          onTap: () {
                            if (actionType == 'pdf') {
                              if (isDownloaded) {
                                _showPdfViewerModal(context, title, item['pdfFileName'] ?? 'Timetable.pdf');
                              } else {
                                _handleDownloadPdf(context, item);
                              }
                            } else {
                              _showAnnouncementDetailsModal(context, item);
                            }
                          },
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5.5),
                            decoration: BoxDecoration(
                              color: isDownloaded
                                  ? const Color(0xFFDCFCE7)
                                  : (actionType == 'pdf' ? const Color(0xFFFFF7ED) : const Color(0xFFF8FAFC)),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isDownloaded
                                    ? const Color(0xFF86EFAC)
                                    : (actionType == 'pdf'
                                        ? const Color(0xFFEA580C).withValues(alpha: 0.3)
                                        : const Color(0xFFCBD5E1)),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (isDownloaded)
                                  const Icon(Icons.check_circle_rounded, size: 13, color: Color(0xFF16A34A))
                                else if (actionType == 'pdf')
                                  const Icon(Icons.picture_as_pdf_rounded, size: 13, color: Color(0xFFEA580C))
                                else
                                  const Icon(Icons.visibility_rounded, size: 13, color: Color(0xFF64748B)),
                                const SizedBox(width: 5),
                                Text(
                                  isDownloaded ? 'Open PDF' : actionLabel,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isDownloaded
                                        ? const Color(0xFF15803D)
                                        : (actionType == 'pdf' ? const Color(0xFFEA580C) : const Color(0xFF334155)),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                                if (actionType != 'pdf' && !isDownloaded) const SizedBox(width: 4),
                                if (actionType != 'pdf' && !isDownloaded)
                                  const Icon(Icons.arrow_forward_rounded, size: 12, color: Color(0xFF64748B)),
                              ],
                            ),
                          ),
                        ),
                        const Spacer(),

                        // Bookmark / Save Icon
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onPressed: () => _handleToggleBookmark(item),
                          icon: Icon(
                            isSaved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                            size: 21,
                            color: isSaved ? const Color(0xFFD97706) : const Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(width: 14),

                        // Share Icon
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onPressed: () => _handleShare(context, item),
                          icon: const Icon(Icons.share_outlined, size: 18, color: Color(0xFF64748B)),
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
    );
  }

  // --- 3D Illustration Circle ---
  Widget _buildIllustrationCircle(String iconType, Color bg) {
    Widget iconWidget;

    if (iconType == 'exam_clock') {
      iconWidget = Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 32,
            height: 38,
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(width: 18, height: 2, color: Colors.white.withValues(alpha: 0.8)),
                const SizedBox(height: 3),
                Container(width: 18, height: 2, color: Colors.white.withValues(alpha: 0.8)),
                const SizedBox(height: 3),
                Container(width: 12, height: 2, color: Colors.white.withValues(alpha: 0.8)),
              ],
            ),
          ),
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: const BoxDecoration(
                color: Color(0xFFEA580C),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.access_time_filled_rounded, size: 13, color: Colors.white),
            ),
          ),
        ],
      );
    } else if (iconType == 'stem_science') {
      iconWidget = Stack(
        alignment: Alignment.center,
        children: const [
          Icon(Icons.science_rounded, size: 30, color: Color(0xFF7C3AED)),
          Positioned(
            right: 0,
            top: 2,
            child: Icon(Icons.star_rounded, size: 12, color: Color(0xFFF59E0B)),
          ),
        ],
      );
    } else {
      iconWidget = Stack(
        alignment: Alignment.center,
        children: const [
          Icon(Icons.groups_rounded, size: 30, color: Color(0xFF2563EB)),
          Positioned(
            right: 0,
            bottom: 2,
            child: Icon(Icons.chat_bubble_rounded, size: 12, color: Color(0xFF38BDF8)),
          ),
        ],
      );
    }

    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
      ),
      child: Center(child: iconWidget),
    );
  }
}
