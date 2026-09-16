import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class QuickActionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String type; // 'all_classes', 'my_courses', 'my_progress', etc.
  final VoidCallback onTap;

  const QuickActionCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.type,
    required this.onTap,
  });

  static const Map<String, Map<String, dynamic>> _styles = {
    'all_classes': {
      'emoji': '🏫',
      'bgColor': Color(0xFFEAF8F1),
      'borderColor': Color(0xFFD3F2E3),
      'iconBg': Color(0xFF34D399),
      'iconBg2': Color(0xFF10B981),
      'imagePath': 'assets/images/home/AllClass.png',
    },
    'my_courses': {
      'emoji': '🎓',
      'bgColor': Color(0xFFF3EDFD),
      'borderColor': Color(0xFFE5D5FB),
      'iconBg': Color(0xFFA78BFA),
      'iconBg2': Color(0xFF7C3AED),
      'imagePath': 'assets/images/home/MyCourse.png',
    },
    'my_progress': {
      'emoji': '📈',
      'bgColor': Color(0xFFFFF2EB),
      'borderColor': Color(0xFFFFDFD1),
      'iconBg': Color(0xFFFB923C),
      'iconBg2': Color(0xFFEA580C),
      'imagePath': 'assets/images/home/Progress.png',
    },
    'homework': {
      'emoji': '📋',
      'bgColor': Color(0xFFFFF9E6),
      'borderColor': Color(0xFFFEEDBA),
      'iconBg': Color(0xFFFBBF24),
      'iconBg2': Color(0xFFD97706),
      'imagePath': 'assets/images/home/HoweWork.png',
    },
    'timetable': {
      'emoji': '🗓️',
      'bgColor': Color(0xFFFFF0F5),
      'borderColor': Color(0xFFFFD9E8),
      'iconBg': Color(0xFFF472B6),
      'iconBg2': Color(0xFFDB2777),
      'imagePath': 'assets/images/home/TimeTable.png',
    },
    'library': {
      'emoji': '📚',
      'bgColor': Color(0xFFEDF7FF),
      'borderColor': Color(0xFFD4ECFF),
      'iconBg': Color(0xFF38BDF8),
      'iconBg2': Color(0xFF0284C7),
      'imagePath': 'assets/images/home/Digital.png',
    },
    'career': {
      'emoji': '📝',
      'bgColor': Color(0xFFE8FAF8),
      'borderColor': Color(0xFFC7F3ED),
      'iconBg': Color(0xFF2DD4BF),
      'iconBg2': Color(0xFF0D9488),
      'imagePath': 'assets/images/home/Career.png',
    },
    'ai_tutor': {
      'emoji': '🤖',
      'bgColor': Color(0xFFF5F3FF),
      'borderColor': Color(0xFFDDD6FE),
      'iconBg': Color(0xFF818CF8),
      'iconBg2': Color(0xFF4F46E5),
      'imagePath': 'assets/images/home/MyCourse.png',
    },
    'scholarships': {
      'emoji': '🏆',
      'bgColor': Color(0xFFEEFAF2),
      'borderColor': Color(0xFFCFF3DC),
      'iconBg': Color(0xFF4ADE80),
      'iconBg2': Color(0xFF16A34A),
      'imagePath': 'assets/images/home/ScholarShip.png',
    },
    'announcements': {
      'emoji': '📢',
      'bgColor': Color(0xFFFFF0F3),
      'borderColor': Color(0xFFFFD5DE),
      'iconBg': Color(0xFFFB7185),
      'iconBg2': Color(0xFFE11D48),
      'imagePath': 'assets/images/home/Announment.png',
    },
  };

  static const Map<String, Map<String, dynamic>> _default = {
    '_': {
      'emoji': '📖',
      'bgColor': Color(0xFFEAF8F1),
      'borderColor': Color(0xFFD3F2E3),
      'iconBg': Color(0xFF34D399),
      'iconBg2': Color(0xFF10B981),
      'imagePath': '',
    },
  };

  @override
  Widget build(BuildContext context) {
    final style = _styles[type] ?? _default['_']!;
    final Color bgColor = style['bgColor'] as Color;
    final Color borderColor = style['borderColor'] as Color;
    final Color iconBg = style['iconBg'] as Color;
    final Color iconBg2 = style['iconBg2'] as Color;
    final String emoji = style['emoji'] as String;
    final String imagePath = style['imagePath'] as String;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: borderColor, width: 1.0),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top 3D illustration centered
              Expanded(
                child: Center(
                  child: _buildIcon(imagePath, emoji, iconBg, iconBg2),
                ),
              ),
              const SizedBox(height: 6),

              // Title and Subtitle with Chevron Icon
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textDark,
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 9,
                            color: AppTheme.textMedium,
                            height: 1.1,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 16,
                    color: AppTheme.textMedium,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIcon(
    String imagePath,
    String emoji,
    Color iconBg,
    Color iconBg2,
  ) {
    if (imagePath.isNotEmpty) {
      return Image.asset(
        imagePath,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => _emojiIcon(emoji, iconBg, iconBg2),
      );
    }
    return _emojiIcon(emoji, iconBg, iconBg2);
  }

  Widget _emojiIcon(String emoji, Color from, Color to) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [from, to],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: to.withValues(alpha: 0.35),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Center(
        child: Text(
          emoji,
          style: const TextStyle(fontSize: 22),
        ),
      ),
    );
  }
}
