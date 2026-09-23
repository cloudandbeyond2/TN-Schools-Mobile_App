import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/course_service.dart';
import 'pdf_viewer_platform_stub.dart'
    if (dart.library.html) 'pdf_viewer_platform_web.dart';

class PdfViewerDialog extends StatefulWidget {
  final String url;
  final String title;
  final String? subject;
  final String? category;

  const PdfViewerDialog({
    super.key,
    required this.url,
    required this.title,
    this.subject,
    this.category,
  });

  static void show(
    BuildContext context, {
    required String url,
    required String title,
    String? subject,
    String? category,
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => PdfViewerDialog(
        url: url,
        title: title,
        subject: subject,
        category: category,
      ),
    );
  }

  @override
  State<PdfViewerDialog> createState() => _PdfViewerDialogState();
}

class _PdfViewerDialogState extends State<PdfViewerDialog> {
  late final String _viewId;

  @override
  void initState() {
    super.initState();
    // Unique ID for the platform view registry
    _viewId = 'pdf-viewer-${DateTime.now().millisecondsSinceEpoch}-${widget.url.hashCode}';

    // Record PDF open in CourseService to update progress
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        try {
          final cs = Provider.of<CourseService>(context, listen: false);
          cs.recordPdfOpened(
            url: widget.url,
            title: widget.title,
            subject: widget.subject,
            category: widget.category,
          );
        } catch (_) {}
      }
    });
  }

  Future<void> _openExternal() async {
    try {
      final uri = Uri.parse(widget.url);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('Error launching external URL: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final isMobile = mediaQuery.size.width < 700;

    final dialogWidth = isMobile
        ? mediaQuery.size.width * 0.96
        : (mediaQuery.size.width * 0.88).clamp(700.0, 1200.0);
    final dialogHeight = isMobile
        ? mediaQuery.size.height * 0.94
        : (mediaQuery.size.height * 0.90).clamp(500.0, 950.0);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: EdgeInsets.symmetric(
        horizontal: isMobile ? 8 : 24,
        vertical: isMobile ? 12 : 24,
      ),
      child: Center(
        child: Container(
          width: dialogWidth,
          height: dialogHeight,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 28,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Column(
              children: [
                // 1. Sleek Modern Header Bar
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0F172A),
                    border: Border(
                      bottom: BorderSide(color: Color(0xFF1E293B)),
                    ),
                  ),
                  child: Row(
                    children: [
                      // PDF/Textbook Icon Badge
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF0066FF), Color(0xFF2563EB)],
                          ),
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0066FF).withValues(alpha: 0.3),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.menu_book_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Document Title & Subject Tag
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                fontFamily: 'Outfit',
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                if (widget.subject != null &&
                                    widget.subject!.isNotEmpty) ...[
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 1.5,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF38BDF8)
                                          .withValues(alpha: 0.18),
                                      borderRadius: BorderRadius.circular(5),
                                    ),
                                    child: Text(
                                      widget.subject!,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF38BDF8),
                                        fontFamily: 'Outfit',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                ],
                                const Flexible(
                                  child: Text(
                                    'TN SCERT Interactive Textbook Viewer',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      color: Color(0xFF94A3B8),
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // External Tab Action Button
                      Tooltip(
                        message: 'Open in new tab / download',
                        child: InkWell(
                          onTap: _openExternal,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.open_in_new_rounded,
                              size: 18,
                              color: Colors.white70,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Close Button
                      Tooltip(
                        message: 'Close Reader',
                        child: InkWell(
                          onTap: () => Navigator.of(context).pop(),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.close_rounded,
                              size: 18,
                              color: Color(0xFFFCA5A5),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // 2. PDF Viewer Area (Fills entire modal)
                Expanded(
                  child: Container(
                    color: const Color(0xFF525659), // Matches Chrome's PDF reader dark background
                    width: double.infinity,
                    height: double.infinity,
                    child: createPdfPlatformView(widget.url, _viewId),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
