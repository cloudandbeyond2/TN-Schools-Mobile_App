import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/course_service.dart';
import 'pdf_viewer_platform_stub.dart'
    if (dart.library.html) 'pdf_viewer_platform_web.dart';

class VideoViewerDialog extends StatefulWidget {
  final String url;
  final String title;
  final String? subject;

  const VideoViewerDialog({
    super.key,
    required this.url,
    required this.title,
    this.subject,
  });

  static void show(
    BuildContext context, {
    required String url,
    required String title,
    String? subject,
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => VideoViewerDialog(
        url: url,
        title: title,
        subject: subject,
      ),
    );
  }

  @override
  State<VideoViewerDialog> createState() => _VideoViewerDialogState();
}

class _VideoViewerDialogState extends State<VideoViewerDialog> {
  late final String _viewId;

  @override
  void initState() {
    super.initState();
    _viewId =
        'video-viewer-${DateTime.now().millisecondsSinceEpoch}-${widget.url.hashCode}';

    // Record video lesson view in CourseService
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        try {
          final cs = Provider.of<CourseService>(context, listen: false);
          cs.recordVideoWatched(
            url: widget.url,
            title: widget.title,
            subject: widget.subject,
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
      debugPrint('Error launching video URL: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final isMobile = mediaQuery.size.width < 700;

    final dialogWidth = isMobile
        ? mediaQuery.size.width * 0.96
        : (mediaQuery.size.width * 0.82).clamp(650.0, 950.0);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: EdgeInsets.symmetric(
        horizontal: isMobile ? 8 : 24,
        vertical: isMobile ? 12 : 24,
      ),
      child: Center(
        child: Container(
          width: dialogWidth,
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 30,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 1. Sleek Video Header Bar
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
                      // Video Icon Badge
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
                          ),
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFDC2626)
                                  .withValues(alpha: 0.35),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 22,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Video Title & Subject Badge
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
                                      color: const Color(0xFFF87171)
                                          .withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(5),
                                    ),
                                    child: Text(
                                      widget.subject!,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFFFCA5A5),
                                        fontFamily: 'Outfit',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                ],
                                const Flexible(
                                  child: Text(
                                    'TN SCERT Video Lesson',
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

                      // Open in External Tab / Browser
                      Tooltip(
                        message: 'Open in new tab',
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
                        message: 'Close Video',
                        child: InkWell(
                          onTap: () => Navigator.of(context).pop(),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444)
                                  .withValues(alpha: 0.2),
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

                // 2. Video Player Body (16:9 Aspect Ratio)
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Container(
                    color: Colors.black,
                    width: double.infinity,
                    child: createVideoPlatformView(widget.url, _viewId),
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
