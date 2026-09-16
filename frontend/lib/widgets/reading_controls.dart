import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ReadingControls extends StatelessWidget {
  final bool isBookmarked;
  final bool isDarkMode;
  final VoidCallback onToggleBookmark;
  final VoidCallback onToggleDarkMode;
  final VoidCallback onZoomIn;
  final VoidCallback onZoomOut;
  final VoidCallback onTextToSpeech;

  const ReadingControls({
    super.key,
    required this.isBookmarked,
    required this.isDarkMode,
    required this.onToggleBookmark,
    required this.onToggleDarkMode,
    required this.onZoomIn,
    required this.onZoomOut,
    required this.onTextToSpeech,
  });

  @override
  Widget build(BuildContext context) {
    Color iconColor = isDarkMode ? Colors.white70 : AppTheme.textDark;
    Color containerBg = isDarkMode ? const Color(0xFF334155) : Colors.white;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: containerBg,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            onPressed: onToggleBookmark,
            icon: Icon(
              isBookmarked
                  ? Icons.bookmark_rounded
                  : Icons.bookmark_border_rounded,
              color: isBookmarked ? AppTheme.primaryEmerald : iconColor,
              size: 20,
            ),
            tooltip: 'Bookmark Page',
          ),
          IconButton(
            onPressed: onZoomOut,
            icon: Icon(Icons.text_decrease_rounded, color: iconColor, size: 20),
            tooltip: 'Smaller Font',
          ),
          IconButton(
            onPressed: onZoomIn,
            icon: Icon(Icons.text_increase_rounded, color: iconColor, size: 20),
            tooltip: 'Larger Font',
          ),
          IconButton(
            onPressed: onTextToSpeech,
            icon: const Icon(Icons.volume_up_rounded,
                color: AppTheme.primaryEmerald, size: 20),
            tooltip: 'Read Aloud',
          ),
          IconButton(
            onPressed: onToggleDarkMode,
            icon: Icon(
              isDarkMode
                  ? Icons.light_mode_rounded
                  : Icons.dark_mode_rounded,
              color: isDarkMode ? const Color(0xFFF59E0B) : iconColor,
              size: 20,
            ),
            tooltip: 'Reading Theme',
          ),
        ],
      ),
    );
  }
}
