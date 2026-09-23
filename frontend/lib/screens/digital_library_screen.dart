import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/localization/app_localization.dart';
import '../services/course_service.dart';
import '../utils/pdf_downloader.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/embedded_video_player.dart';
import '../widgets/pdf_viewer_dialog.dart';
import '../widgets/video_viewer_dialog.dart';
import '../core/constants/app_constants.dart';

class DigitalLibraryScreen extends StatefulWidget {
  final bool hideBottomNav;
  const DigitalLibraryScreen({super.key, this.hideBottomNav = false});

  @override
  State<DigitalLibraryScreen> createState() => _DigitalLibraryScreenState();
}

class _DigitalLibraryScreenState extends State<DigitalLibraryScreen> {
  // Base URL Options:
  // Option 1: Production (Vercel) -> https://tn-schools-mobile-app-backend.vercel.app
  // Option 2: Localhost Development -> http://localhost:5000
  static String get _baseUrl => AppConstants.baseUrl;

  int _selectedCategoryIndex = -1; // -1: All, 0: Textbooks, 1: Notes, 2: Papers, 3: Videos, 4: Reference
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _downloadedItemIds = {};
  final Set<String> _bookmarkedItemIds = {};

  bool _isLoading = false;
  bool _hasInitialFetched = false;
  String _lastFetchedClass = '';
  String _lastFetchedSchool = '';
  List<Map<String, dynamic>> _libraryItems = [];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final courseService = Provider.of<CourseService>(context);
    final student = courseService.student;
    final rawClass = student.grade.isNotEmpty
        ? student.grade
        : student.classStandard.replaceAll(RegExp(r'\D'), '');
    final studentClass = rawClass.isNotEmpty ? rawClass : '6';
    final schoolId = student.schoolId ?? '';

    if (!_hasInitialFetched ||
        _lastFetchedClass != studentClass ||
        _lastFetchedSchool != schoolId) {
      _hasInitialFetched = true;
      _lastFetchedClass = studentClass;
      _lastFetchedSchool = schoolId;
      _fetchResources();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  // ─── 1. FETCH REAL DIGITAL LIBRARY RESOURCES (Student Class Based) ─────
  Future<void> _fetchResources() async {
    final courseService = Provider.of<CourseService>(context, listen: false);
    final student = courseService.student;

    final schoolId = (student.schoolId != null && student.schoolId!.isNotEmpty)
        ? student.schoolId!
        : 'd9962dbb-f572-47a4-8240-6eef99b5c5bb';
    final rawClass = student.grade.isNotEmpty
        ? student.grade
        : student.classStandard.replaceAll(RegExp(r'\D'), '');
    final studentClass = rawClass.isNotEmpty ? rawClass : '6';

    setState(() => _isLoading = true);

    try {
      final List<String> params = [];
      if (schoolId.isNotEmpty) params.add('schoolId=$schoolId');
      params.add('class=$studentClass');

      String url = '$_baseUrl/api/digital-library-upload?${params.join('&')}';

      final res = await http.get(Uri.parse(url), headers: courseService.authHeaders).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (body['success'] == true && body['data'] is List) {
          final List<dynamic> list = body['data'];
          if (mounted) {
            setState(() {
              _libraryItems = list.map((item) => Map<String, dynamic>.from(item)).toList();
            });
          }
        }
      }
    } catch (err) {
      // Fetch error handled silently
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  // ─── 2. OPEN RESOURCE / LAUNCH FILE URL ──────────────────────────────────
  Future<void> _openResource(Map<String, dynamic> item) async {
    String? fileUrl = item['fileUrl']?.toString();

    if (fileUrl == null || fileUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalization.isTamil
              ? 'இந்த உள்ளடக்கத்திற்கு கோப்பு இணைப்பு இல்லை.'
              : 'No file attachment available for this resource.'),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
      return;
    }

    if (fileUrl.startsWith('/')) {
      fileUrl = '$_baseUrl$fileUrl';
    }

    final String title = item['title']?.toString() ?? 'Study Material';
    final String? subject = item['subject']?.toString();
    final String? type = item['type']?.toString();

    // 1. If it is a video, open in in-app video popup on same screen
    final isVideo = (item['category']?.toString().toLowerCase() == 'videos') ||
        (type != null && type.toLowerCase() == 'video') ||
        fileUrl.toLowerCase().contains('.mp4') ||
        fileUrl.toLowerCase().contains('.webm') ||
        fileUrl.toLowerCase().contains('youtu.be') ||
        fileUrl.toLowerCase().contains('youtube.com');

    if (isVideo) {
      VideoViewerDialog.show(
        context,
        url: fileUrl,
        title: title,
        subject: subject,
      );
      return;
    }

    // 2. If it is a PDF or textbook, open in in-app popup viewer
    final isPdf = fileUrl.toLowerCase().contains('.pdf') ||
        (type != null && type.toLowerCase().contains('pdf')) ||
        (item['category']?.toString().toLowerCase() == 'textbooks');

    if (isPdf) {
      PdfViewerDialog.show(
        context,
        url: fileUrl,
        title: title,
        subject: subject,
        category: item['category']?.toString(),
      );
      return;
    }

    try {
      final uri = Uri.parse(fileUrl);
      final isLaunched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );

      if (!isLaunched) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (e) {
      debugPrint('Error launching URL: $e');
      if (mounted) {
        Clipboard.setData(ClipboardData(text: fileUrl));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Copied resource link: $fileUrl'),
            backgroundColor: const Color(0xFF0F172A),
          ),
        );
      }
    }
  }

  // ─── 3. DOWNLOAD BOOK FUNCTION ──────────────────────────────────────────
  void _handleDownloadBook(BuildContext context, Map<String, dynamic> item) async {
    final String id = item['id']?.toString() ?? 'res_${DateTime.now().millisecondsSinceEpoch}';
    final String title = item['title']?.toString() ?? 'TN Study Material';
    final String type = item['type']?.toString() ?? 'Study Material';
    final bool isVideo = type.toLowerCase().contains('video');
    final String rawFileUrl = item['fileUrl']?.toString() ?? '';
    final String fileUrl = rawFileUrl.startsWith('/') ? '$_baseUrl$rawFileUrl' : rawFileUrl;
    final String fileName = (rawFileUrl.isNotEmpty && rawFileUrl.contains('/'))
        ? rawFileUrl.split('/').last
        : '${title.replaceAll(' ', '_')}.${isVideo ? 'mp4' : 'pdf'}';
    final String fileSize = item['size']?.toString() ?? (isVideo ? 'HD Video' : '10.0 MB');

    if (_downloadedItemIds.contains(id)) {
      if (!isVideo) {
        _showPdfViewerModal(context, item);
      } else {
        _showBookDetailsModal(context, item);
      }
      return;
    }

    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final courseService = Provider.of<CourseService>(context, listen: false);
    final nav = Navigator.of(context, rootNavigator: true);

    BuildContext? dialogContext;
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) {
        dialogContext = dialogCtx;
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 48,
                  height: 48,
                  child: CircularProgressIndicator(
                    strokeWidth: 3.5,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      isVideo ? const Color(0xFFE11D48) : const Color(0xFF16A34A),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  AppLocalization.isTamil
                      ? (isVideo ? 'வீடியோ பதிவிறக்கம்...' : 'பாடநூல் பதிவிறக்கம்...')
                      : (isVideo ? 'Downloading Video...' : 'Downloading Study Material...'),
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
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

    await Future.delayed(const Duration(milliseconds: 900));

    // Safely dismiss download progress dialog
    try {
      if (dialogContext != null && dialogContext!.mounted) {
        Navigator.of(dialogContext!).pop();
      } else if (nav.canPop()) {
        nav.pop();
      }
    } catch (e) {
      debugPrint('Error dismissing download dialog: $e');
    }

    if (mounted) {
      setState(() {
        _downloadedItemIds.add(id);
      });
      courseService.addRewardCoins(15);

      if (!isVideo) {
        downloadPdfFile(
          fileName,
          title,
          item['description']?.toString() ?? 'Tamil Nadu School Education Digital Textbook',
          [item['subject']?.toString() ?? 'General'],
        );
      } else if (fileUrl.isNotEmpty) {
        try {
          downloadPdfFile(
            fileName,
            title,
            item['description']?.toString() ?? 'Tamil Nadu Educational Video Lecture',
            [item['subject']?.toString() ?? 'Mathematics'],
          );
        } catch (_) {}
      }

      scaffoldMessenger.hideCurrentSnackBar();
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Color(0xFF4ADE80), size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Downloaded $title ($fileSize) • +15 Coins 🎉',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5),
                ),
              ),
            ],
          ),
          action: SnackBarAction(
            label: isVideo ? 'PLAY' : 'OPEN',
            textColor: const Color(0xFF38BDF8),
            onPressed: () {
              if (context.mounted) {
                if (isVideo) {
                  _showBookDetailsModal(context, item);
                } else {
                  _showPdfViewerModal(context, item);
                }
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

  // ─── 4. BOOKMARK TOGGLE ─────────────────────────────────────────────────
  void _toggleBookmark(BuildContext context, String id, String title) {
    final bool isSaved = !_bookmarkedItemIds.contains(id);
    setState(() {
      if (isSaved) {
        _bookmarkedItemIds.add(id);
      } else {
        _bookmarkedItemIds.remove(id);
      }
    });

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

  // ─── 5. SHARE MODAL SHEET ───────────────────────────────────────────────
  void _showShareModal(BuildContext context, Map<String, dynamic> item) {
    final String title = item['title']?.toString() ?? '';
    final String type = item['type']?.toString() ?? 'Study Material';
    final String size = item['size']?.toString() ?? 'PDF';
    final String fileUrl = item['fileUrl']?.toString() ?? '';
    final fullUrl = fileUrl.startsWith('/') ? '$_baseUrl$fileUrl' : fileUrl;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Share Study Material',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                  fontFamily: 'Outfit',
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '$title ($type • $size)',
                style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 20),
              _buildShareOption(
                icon: Icons.chat_rounded,
                iconBg: const Color(0xFFDCFCE7),
                iconColor: const Color(0xFF16A34A),
                title: 'WhatsApp Study Groups',
                subtitle: 'Share textbook & notes with classmates',
                onTap: () {
                  Navigator.pop(ctx);
                  Clipboard.setData(ClipboardData(
                    text: '📚 *TN Student Portal - Study Material*\n\n*$title*\nFormat: $type | Size: $size\nDownload link: $fullUrl',
                  ));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Study material info copied for WhatsApp!'),
                      backgroundColor: Color(0xFF16A34A),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),
              _buildShareOption(
                icon: Icons.link_rounded,
                iconBg: const Color(0xFFEFF6FF),
                iconColor: const Color(0xFF2563EB),
                title: 'Copy Portal Direct Link',
                subtitle: 'Direct textbook URL for browser access',
                onTap: () {
                  Navigator.pop(ctx);
                  Clipboard.setData(ClipboardData(text: fullUrl));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Link copied to clipboard!'),
                      backgroundColor: Color(0xFF0F172A),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),
              _buildShareOption(
                icon: Icons.sms_rounded,
                iconBg: const Color(0xFFFEF3C7),
                iconColor: const Color(0xFFD97706),
                title: 'SMS to Parents & Teachers',
                subtitle: 'Send SMS recommendation',
                onTap: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('SMS template prepared!'),
                      backgroundColor: Color(0xFFD97706),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _buildShareOption({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                      fontFamily: 'Outfit',
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8), size: 20),
          ],
        ),
      ),
    );
  }

  void _showPdfViewerModal(BuildContext context, Map<String, dynamic> item) {
    final String title = item['title']?.toString() ?? 'Textbook';
    final String subject = item['subject']?.toString() ?? 'General';
    final String description = item['description']?.toString() ?? 'Tamil Nadu SCERT Official Resource';
    final String rawFileUrl = item['fileUrl']?.toString() ?? '';
    final String fileUrl = rawFileUrl.startsWith('/') ? '$_baseUrl$rawFileUrl' : rawFileUrl;

    try {
      Provider.of<CourseService>(context, listen: false).recordPdfOpened(
        url: fileUrl,
        title: title,
        subject: subject,
        category: item['category']?.toString(),
      );
    } catch (_) {}

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.90,
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 16, 12),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFEF4444), size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          Text(
                            '$subject • Verified TN SCERT Official Copy',
                            style: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white, size: 24),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),

              const Divider(color: Color(0xFF1E293B), height: 1),

              // Simulated Content View
              Expanded(
                child: Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Column(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Text(
                                  'GOVERNMENT OF TAMIL NADU',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.0,
                                    color: Color(0xFF1D4ED8),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'DEPARTMENT OF SCHOOL EDUCATION',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                title,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                              const SizedBox(height: 12),
                              const Divider(color: Color(0xFFE2E8F0)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        const Text(
                          'Curriculum Summary & Content',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          description,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF475569),
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Bottom Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _showShareModal(context, item);
                        },
                        icon: const Icon(Icons.share_rounded, size: 17),
                        label: const Text('Share Material', style: TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E293B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _openResource(item);
                        },
                        icon: const Icon(Icons.open_in_new_rounded, size: 18),
                        label: const Text('Open Direct Link', style: TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF16A34A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
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

  // ─── 7. RESOURCE DETAILS & VIDEO POPUP MODAL ────────────────────────────
  void _showBookDetailsModal(BuildContext context, Map<String, dynamic> item) {
    final String id = item['id']?.toString() ?? '';
    final String title = item['title']?.toString() ?? 'Study Material';
    final String subject = item['subject']?.toString() ?? 'General';
    final String type = item['type']?.toString() ?? 'Study Material';
    final String size = (item['size'] != null && item['size'] != 'N/A')
        ? item['size'].toString()
        : (type.toLowerCase().contains('video') ? 'HD Video' : 'PDF Document');
    final String description = (item['description'] != null && item['description'].toString().trim().isNotEmpty)
        ? item['description'].toString()
        : 'Tamil Nadu SCERT State Board Curriculum Learning Material for Class ${item['class'] ?? '10'}. Prepared by educational experts.';
    final String rawFileUrl = item['fileUrl']?.toString() ?? '';
    final String fileUrl = rawFileUrl.startsWith('/') ? '$_baseUrl$rawFileUrl' : rawFileUrl;

    final String coverType = _resolveCoverType(subject, type);
    final themeColor = _resolveThemeColor(coverType);
    final lightBg = _resolveLightBg(coverType);

    final bool isDownloaded = _downloadedItemIds.contains(id);
    final bool isVideo = type.toLowerCase().contains('video') || fileUrl.endsWith('.mp4');
    final bool isImage = fileUrl.endsWith('.png') || fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final isSaved = _bookmarkedItemIds.contains(id);

            return Container(
              height: MediaQuery.of(context).size.height * 0.88,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Column(
                children: [
                  // Handle bar
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Header with Close Button
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isVideo ? const Color(0xFFFFF1F2) : lightBg,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    isVideo
                                        ? Icons.videocam_rounded
                                        : (isImage ? Icons.image_rounded : Icons.menu_book_rounded),
                                    size: 14,
                                    color: isVideo ? const Color(0xFFE11D48) : themeColor,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    isVideo ? 'VIDEO LECTURE' : type.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800,
                                      color: isVideo ? const Color(0xFFE11D48) : themeColor,
                                      fontFamily: 'Outfit',
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Class ${item['class'] ?? '6'}',
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF475569),
                                ),
                              ),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 22),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                  ),

                  const Divider(color: Color(0xFFF1F5F9), height: 1),

                  // Scrollable Body
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // ── If Video: Interactive In-App Video Player ──
                          if (isVideo && fileUrl.isNotEmpty)
                            EmbeddedVideoPlayer(
                              videoUrl: fileUrl,
                              title: title,
                              autoPlay: true,
                            )
                          // ── If Image: Image Preview Card ──
                          else if (isImage && fileUrl.isNotEmpty)
                            Container(
                              width: double.infinity,
                              height: 180,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(20),
                                child: Image.network(
                                  fileUrl,
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) => Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        _buildBookCover(coverType, item['class']?.toString() ?? '10'),
                                        const SizedBox(height: 8),
                                        const Text('Study Material Image', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            )
                          // ── If Book / PDF: Illustrated Header Banner ──
                          else
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildBookCover(coverType, item['class']?.toString() ?? '10'),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        title,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w900,
                                          color: Color(0xFF0F172A),
                                          fontFamily: 'Outfit',
                                          height: 1.3,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        '$subject • Grade ${item['class'] ?? '10'}',
                                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                      ),
                                      const SizedBox(height: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFECFDF5),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: const Text(
                                          '✓ SCERT Verified Resource',
                                          style: TextStyle(
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF059669),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),

                          const SizedBox(height: 18),

                          // ── Title & Subject (if Video / Image) ──
                          if (isVideo || isImage) ...[
                            Text(
                              title,
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                                fontFamily: 'Outfit',
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '$subject • Class ${item['class'] ?? '10'}',
                              style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // ── Metric Stats Grid ──
                          Row(
                            children: [
                              _buildMetricChip(
                                isVideo ? Icons.play_circle_outline_rounded : Icons.menu_book_rounded,
                                'Format',
                                isVideo ? 'MP4 Video' : type,
                              ),
                              const SizedBox(width: 8),
                              _buildMetricChip(Icons.folder_zip_rounded, 'Size', size),
                              const SizedBox(width: 8),
                              _buildMetricChip(Icons.star_rounded, 'Rating', '4.9 ★'),
                              const SizedBox(width: 8),
                              _buildMetricChip(Icons.verified_rounded, 'Status', 'Approved'),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // ── Curriculum Summary & Overview ──
                          Row(
                            children: const [
                              Icon(Icons.description_rounded, size: 16, color: Color(0xFF2563EB)),
                              SizedBox(width: 6),
                              Text(
                                'Overview & Syllabus Details',
                                style: TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Text(
                              description,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF334155),
                                height: 1.55,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // ── Learning Highlights ──
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFDBEAFE)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.school_rounded, color: Color(0xFF2563EB), size: 20),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Tamil Nadu State Board Curriculum',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF1E40AF),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        isVideo
                                            ? 'Watch video lecture to master concepts with solved examples.'
                                            : 'Official SCERT textbook notes aligned with exam blueprints.',
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF3B82F6)),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // ── Bottom Sticky Action Bar ──
                  Container(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
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
                    child: Row(
                      children: [
                        IconButton(
                          icon: Icon(
                            isSaved ? Icons.bookmark_rounded : Icons.bookmark_outline_rounded,
                            color: isSaved ? const Color(0xFFD97706) : const Color(0xFF64748B),
                            size: 24,
                          ),
                          onPressed: () {
                            _toggleBookmark(context, id, title);
                            setModalState(() {});
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.share_rounded, color: Color(0xFF64748B), size: 22),
                          onPressed: () {
                            Navigator.pop(ctx);
                            _showShareModal(context, item);
                          },
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              if (isVideo) {
                                Navigator.pop(ctx);
                                _handleDownloadBook(context, item);
                              } else if (isDownloaded) {
                                Navigator.pop(ctx);
                                _showPdfViewerModal(context, item);
                              } else {
                                Navigator.pop(ctx);
                                _openResource(item);
                              }
                            },
                            icon: Icon(
                              isVideo
                                  ? Icons.download_rounded
                                  : (isDownloaded ? Icons.visibility_rounded : Icons.open_in_new_rounded),
                              size: 18,
                            ),
                            label: Text(
                              isVideo
                                  ? 'Download Video (+15 Coins)'
                                  : (isDownloaded ? 'Read PDF' : 'Open Resource'),
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'Outfit',
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isVideo ? const Color(0xFFE11D48) : const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
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
      },
    );
  }

  Widget _buildMetricChip(IconData icon, String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 16, color: const Color(0xFF2563EB)),
            const SizedBox(height: 4),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            Text(label, style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
          ],
        ),
      ),
    );
  }

  // ─── HELPER MAPPERS ─────────────────────────────────────────────────────
  String _resolveCoverType(String subject, String type) {
    final sub = subject.toLowerCase();
    final t = type.toLowerCase();
    if (t.contains('video')) return 'video';
    if (sub.contains('math')) return 'math';
    if (sub.contains('sci')) return 'science';
    if (sub.contains('tamil')) return 'tamil';
    if (sub.contains('eng')) return 'english';
    if (sub.contains('social') || sub.contains('hist')) return 'social';
    if (t.contains('paper') || t.contains('exam')) return 'model_paper';
    return 'reference';
  }

  Color _resolveThemeColor(String coverType) {
    switch (coverType) {
      case 'math':
        return const Color(0xFF2563EB);
      case 'science':
        return const Color(0xFF16A34A);
      case 'tamil':
        return const Color(0xFFEA580C);
      case 'english':
        return const Color(0xFF7C3AED);
      case 'social':
        return const Color(0xFFD97706);
      case 'video':
        return const Color(0xFFE11D48);
      default:
        return const Color(0xFF6366F1);
    }
  }

  Color _resolveLightBg(String coverType) {
    switch (coverType) {
      case 'math':
        return const Color(0xFFEFF6FF);
      case 'science':
        return const Color(0xFFF0FDF4);
      case 'tamil':
        return const Color(0xFFFFFBEB);
      case 'english':
        return const Color(0xFFFAF5FF);
      case 'social':
        return const Color(0xFFFFFBEB);
      case 'video':
        return const Color(0xFFFFF1F2);
      default:
        return const Color(0xFFEEF2FF);
    }
  }

  // ─── ILLUSTRATED BOOK COVER WIDGET ──────────────────────────────────────
  Widget _buildBookCover(String coverType, [String classNum = '6']) {
    Color bg;
    String badgeText = classNum.replaceAll(RegExp(r'\D'), '');
    if (badgeText.isEmpty) badgeText = '6';
    Color badgeBg;
    Widget coverIllustration;

    if (coverType == 'math') {
      bg = const Color(0xFF1D4ED8);
      badgeBg = const Color(0xFF38BDF8);
      coverIllustration = Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Text('MATHEMATICS', style: TextStyle(color: Colors.white, fontSize: 5.5, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          SizedBox(height: 4),
          Icon(Icons.architecture_rounded, color: Colors.white, size: 18),
        ],
      );
    } else if (coverType == 'science') {
      bg = const Color(0xFF047857);
      badgeBg = const Color(0xFF34D399);
      coverIllustration = Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Text('SCIENCE', style: TextStyle(color: Colors.white, fontSize: 6.5, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          SizedBox(height: 4),
          Icon(Icons.science_rounded, color: Colors.white, size: 18),
        ],
      );
    } else if (coverType == 'english') {
      bg = const Color(0xFF6D28D9);
      badgeBg = const Color(0xFFA78BFA);
      coverIllustration = Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Text('ENGLISH', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 6.5, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          SizedBox(height: 3),
          Icon(Icons.menu_book_rounded, color: Colors.white, size: 16),
        ],
      );
    } else if (coverType == 'tamil') {
      bg = const Color(0xFFC2410C);
      badgeBg = const Color(0xFFFDBA74);
      coverIllustration = Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Text('TAMIL\nதமிழ்', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 6, fontWeight: FontWeight.bold, height: 1.0)),
          SizedBox(height: 3),
          Icon(Icons.auto_stories_rounded, color: Colors.white, size: 16),
        ],
      );
    } else if (coverType == 'video') {
      bg = const Color(0xFFBE123C);
      badgeBg = const Color(0xFFFB7185);
      coverIllustration = Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Text('VIDEO', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 6.5, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          SizedBox(height: 3),
          Icon(Icons.play_circle_fill_rounded, color: Colors.white, size: 18),
        ],
      );
    } else {
      bg = const Color(0xFF4338CA);
      badgeBg = const Color(0xFF818CF8);
      coverIllustration = Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Text('REFERENCE', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 5.5, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          SizedBox(height: 3),
          Icon(Icons.menu_book_rounded, color: Colors.white, size: 16),
        ],
      );
    }

    return Container(
      width: 52,
      height: 64,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: bg.withValues(alpha: 0.35),
            blurRadius: 6,
            offset: const Offset(1, 3),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            left: 4,
            top: 0,
            bottom: 0,
            child: Container(
              width: 1.5,
              color: Colors.white.withValues(alpha: 0.25),
            ),
          ),
          Positioned.fill(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: coverIllustration,
            ),
          ),
          Positioned(
            right: 3,
            bottom: 3,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 3.5, vertical: 1.5),
              decoration: BoxDecoration(
                color: badgeBg,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                badgeText,
                style: const TextStyle(
                  fontSize: 7.5,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── FILTERED RESOURCES ─────────────────────────────────────────────────
  List<Map<String, dynamic>> get _filteredItems {
    final searchLower = _searchController.text.trim().toLowerCase();
    return _libraryItems.where((item) {
      final title = (item['title'] ?? '').toString().toLowerCase();
      final subject = (item['subject'] ?? '').toString().toLowerCase();
      final type = (item['type'] ?? '').toString().toLowerCase();
      final desc = (item['description'] ?? '').toString().toLowerCase();

      final matchesSearch = searchLower.isEmpty ||
          title.contains(searchLower) ||
          subject.contains(searchLower) ||
          type.contains(searchLower) ||
          desc.contains(searchLower);

      bool matchesCategory = true;
      if (_selectedCategoryIndex == 0) {
        matchesCategory = type.contains('book') || type.contains('textbook');
      } else if (_selectedCategoryIndex == 1) {
        matchesCategory = type.contains('note') || type.contains('guide');
      } else if (_selectedCategoryIndex == 2) {
        matchesCategory = type.contains('paper') || type.contains('exam') || type.contains('model');
      } else if (_selectedCategoryIndex == 3) {
        matchesCategory = type.contains('video') || type.contains('educational');
      } else if (_selectedCategoryIndex == 4) {
        matchesCategory = type.contains('reference') || type.contains('government') || type.contains('research');
      }

      return matchesCategory && matchesSearch;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final categories = [
      {
        'label': AppLocalization.get('filter_textbooks'),
        'icon': Icons.menu_book_rounded,
        'color': const Color(0xFF2563EB),
        'index': 0,
      },
      {
        'label': AppLocalization.get('filter_notes'),
        'icon': Icons.description_rounded,
        'color': const Color(0xFFD97706),
        'index': 1,
      },
      {
        'label': AppLocalization.get('filter_question_papers'),
        'icon': Icons.assignment_rounded,
        'color': const Color(0xFF7C3AED),
        'index': 2,
      },
      {
        'label': AppLocalization.isTamil ? 'கல்வி வீடியோக்கள்' : 'Educational Videos',
        'icon': Icons.videocam_rounded,
        'color': const Color(0xFFE11D48),
        'index': 3,
      },
      {
        'label': AppLocalization.get('filter_reference'),
        'icon': Icons.folder_rounded,
        'color': const Color(0xFF16A34A),
        'index': 4,
      },
    ];

    final filteredList = _filteredItems;

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
            backgroundColor: const Color(0xFFF8FAFC),
            body: SafeArea(
              child: RefreshIndicator(
                color: const Color(0xFF2563EB),
                onRefresh: _fetchResources,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Top App Bar
                      _buildTopAppBar(context),
                      const SizedBox(height: 8),

                      // 2. Hero Image Banner (digital.png)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildHeroCardBanner(),
                      ),
                      const SizedBox(height: 14),

                      // 3. Search & Category Filters & Library Items
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Search Bar
                            _buildSearchBar(),
                            const SizedBox(height: 14),

                            // Category Tabs Pills
                            _buildCategoryPills(categories),
                            const SizedBox(height: 16),

                            // Library Items List
                            if (_isLoading && _libraryItems.isEmpty)
                              Container(
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
                                      'Fetching study materials...',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else if (filteredList.isEmpty)
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(32),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Column(
                                  children: [
                                    const Icon(Icons.search_off_rounded, size: 40, color: Color(0xFF94A3B8)),
                                    const SizedBox(height: 8),
                                    Text(
                                      isTamil ? 'பாடப்பொருட்கள் எதுவும் கிடைக்கவில்லை' : 'No study materials found',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: filteredList.length,
                                separatorBuilder: (context, index) => const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  final item = filteredList[index];
                                  return _buildLibraryItemCard(item);
                                },
                              ),
                            const SizedBox(height: 18),

                            // Bottom Encouragement Banner (digital2.png)
                            _buildBottomBanner(),
                            const SizedBox(height: 24),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            bottomNavigationBar: widget.hideBottomNav
                ? null
                : const TNBottomNavBar(currentIndex: 2),
          ),
        );
      },
    );
  }

  // ─── 1. TOP APP BAR ─────────────────────────────────────────────────────
  Widget _buildTopAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () {
              if (Navigator.canPop(context)) {
                Navigator.pop(context);
              } else {
                Provider.of<CourseService>(context, listen: false)
                    .setBottomNavIndex(0);
              }
            },
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
              AppLocalization.get('digital_library_title'),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                fontFamily: 'Outfit',
                letterSpacing: -0.2,
              ),
            ),
          ),
          Container(
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
            child: IconButton(
              icon: const Icon(Icons.bookmark_outline_rounded, color: Color(0xFF0F172A), size: 20),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Saved Bookmarks (${_bookmarkedItemIds.length} materials)'),
                    backgroundColor: const Color(0xFF0F172A),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ─── 2. HERO CARD BANNER (digital.png) ──────────────────────────────────
  Widget _buildHeroCardBanner() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = (width * 0.38).clamp(130.0, 160.0);

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
              'assets/images/class/digital.png',
              fit: BoxFit.cover,
            ),
          ),
        );
      },
    );
  }

  // ─── 3. SEARCH BAR ──────────────────────────────────────────────────────
  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (_) => setState(() {}),
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF0F172A)),
        decoration: InputDecoration(
          hintText: AppLocalization.get('search_books_papers'),
          hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13.5),
          prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 22),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8), size: 18),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }

  // ─── 4. CATEGORY TABS PILLS ─────────────────────────────────────────────
  Widget _buildCategoryPills(List<Map<String, dynamic>> categories) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      clipBehavior: Clip.none,
      child: Row(
        children: [
          // "All" Pill
          GestureDetector(
            onTap: () => setState(() => _selectedCategoryIndex = -1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: _selectedCategoryIndex == -1 ? const Color(0xFF2563EB) : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _selectedCategoryIndex == -1 ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                ),
                boxShadow: _selectedCategoryIndex == -1
                    ? [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.grid_view_rounded,
                    size: 15,
                    color: _selectedCategoryIndex == -1 ? Colors.white : const Color(0xFF64748B),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'All',
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: _selectedCategoryIndex == -1 ? FontWeight.bold : FontWeight.w600,
                      color: _selectedCategoryIndex == -1 ? Colors.white : const Color(0xFF0F172A),
                      fontFamily: 'Outfit',
                    ),
                  ),
                ],
              ),
            ),
          ),
          ...List.generate(categories.length, (index) {
            final cat = categories[index];
            final isSelected = _selectedCategoryIndex == cat['index'];
            final color = cat['color'] as Color;

            return GestureDetector(
              onTap: () => setState(() => _selectedCategoryIndex = cat['index'] as int),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? color : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? color : const Color(0xFFE2E8F0),
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: color.withValues(alpha: 0.25),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  children: [
                    Icon(
                      cat['icon'] as IconData,
                      size: 15,
                      color: isSelected ? Colors.white : color,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      cat['label'] as String,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                        color: isSelected ? Colors.white : const Color(0xFF0F172A),
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ─── 5. LIBRARY ITEM CARD WITH ILLUSTRATED BOOK COVER ────────────────────
  Widget _buildLibraryItemCard(Map<String, dynamic> item) {
    final String id = item['id']?.toString() ?? '';
    final String title = item['title']?.toString() ?? 'Study Material';
    final String type = item['type']?.toString() ?? 'E-books';
    final String size = (item['size'] != null && item['size'] != 'N/A')
        ? item['size'].toString()
        : (type.toLowerCase().contains('video') ? 'Video' : 'PDF Textbook');
    final String subject = item['subject']?.toString() ?? 'General';
    final String coverType = _resolveCoverType(subject, type);

    final bool isDownloaded = _downloadedItemIds.contains(id);
    final bool isBookmarked = _bookmarkedItemIds.contains(id);

    final themeColor = _resolveThemeColor(coverType);
    final lightBg = _resolveLightBg(coverType);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showBookDetailsModal(context, item),
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Left Illustrated Book Cover
                _buildBookCover(coverType, item['class']?.toString() ?? '6'),
                const SizedBox(width: 14),

                // Center Title & Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          fontFamily: 'Outfit',
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: lightBg,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              type,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                                color: themeColor,
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text('•', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              size,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Right 3-Dots Popup Menu
                PopupMenuButton<String>(
                  icon: const Icon(
                    Icons.more_vert_rounded,
                    color: Color(0xFF94A3B8),
                    size: 20,
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  onSelected: (value) {
                    if (value == 'read') {
                      if (type.toLowerCase().contains('video')) {
                        _showBookDetailsModal(context, item);
                      } else {
                        _openResource(item);
                      }
                    } else if (value == 'download') {
                      _handleDownloadBook(context, item);
                    } else if (value == 'bookmark') {
                      _toggleBookmark(context, id, title);
                    } else if (value == 'share') {
                      _showShareModal(context, item);
                    } else if (value == 'details') {
                      _showBookDetailsModal(context, item);
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'read',
                      child: Row(
                        children: [
                          Icon(
                            type.toLowerCase().contains('video')
                                ? Icons.play_circle_fill_rounded
                                : (isDownloaded ? Icons.visibility_rounded : Icons.open_in_new_rounded),
                            color: const Color(0xFF16A34A),
                            size: 18,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            type.toLowerCase().contains('video')
                                ? 'Play Video'
                                : (isDownloaded ? 'Open PDF Reader' : 'Open Resource'),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'details',
                      child: Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: Color(0xFF2563EB), size: 18),
                          SizedBox(width: 10),
                          Text('Book Details & Syllabus', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'download',
                      child: const Row(
                        children: [
                          Icon(Icons.download_rounded, color: Color(0xFF16A34A), size: 18),
                          SizedBox(width: 10),
                          Text('Download / Save', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'bookmark',
                      child: Row(
                        children: [
                          Icon(
                            isBookmarked ? Icons.bookmark_remove_rounded : Icons.bookmark_rounded,
                            color: const Color(0xFFD97706),
                            size: 18,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            isBookmarked ? 'Remove Bookmark' : 'Save to Bookmarks',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'share',
                      child: Row(
                        children: [
                          Icon(Icons.share_rounded, color: Color(0xFF7C3AED), size: 18),
                          SizedBox(width: 10),
                          Text('Share Material', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        ],
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

  // ─── 6. BOTTOM ENCOURAGEMENT BANNER (digital2.png) ───────────────────────
  Widget _buildBottomBanner() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = (width * 0.30).clamp(95.0, 115.0);

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
                    'assets/images/class/digital2.png',
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned(
                  left: width * 0.39,
                  top: 0,
                  bottom: 0,
                  right: width * 0.33,
                  child: Center(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        AppLocalization.get('keep_learning'),
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w900,
                          fontStyle: FontStyle.italic,
                          color: Color(0xFF0F172A),
                          fontFamily: 'Outfit',
                        ),
                      ),
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
