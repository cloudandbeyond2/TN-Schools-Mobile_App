import 'package:flutter/material.dart';
import '../models/subject.dart';

class SubjectChip extends StatelessWidget {
  final Subject subject;
  final bool isSelected;
  final VoidCallback onTap;

  const SubjectChip({
    super.key,
    required this.subject,
    required this.isSelected,
    required this.onTap,
  });

  String? _getAssetImagePath() {
    final subName = subject.name.toLowerCase();

    if (subName.contains('math') || subName.contains('கணிதம்') || subName.contains('account') || subName.contains('commerce') || subName.contains('statistic')) {
      return 'assets/images/class/mathematics.png';
    } else if (subName.contains('tamil') || subName.contains('தமிழ்')) {
      return 'assets/images/class/tamil.png';
    } else if (subName.contains('social') || subName.contains('சமூக') || subName.contains('history') || subName.contains('geography') || subName.contains('civics') || subName.contains('politic')) {
      return 'assets/images/class/social.png';
    } else if (subName.contains('science') || subName.contains('அறிவியல்') || subName.contains('physics') || subName.contains('chemistry') || subName.contains('biology') || subName.contains('botany') || subName.contains('zoology')) {
      return 'assets/images/class/seience.png';
    } else if (subName.contains('english') || subName.contains('ஆங்கிலம்') || subName.contains('hindi') || subName.contains('french') || subName.contains('language')) {
      return 'assets/images/class/english.png';
    } else if (subName.contains('computer') || subName.contains('கணினி') || subName.contains('coding') || subName.contains('it')) {
      return 'assets/images/class/computer.png';
    } else if (subName.contains('general') || subName.contains('பொது') || subName.contains('gk')) {
      return 'assets/images/class/general.png';
    } else if (subName.contains('more') || subName.contains('மேலும்')) {
      return 'assets/images/class/moresubject.png';
    }
    return null;
  }

  Widget _buildIcon() {
    final assetPath = _getAssetImagePath();
    if (assetPath != null) {
      return Image.asset(
        assetPath,
        width: 38,
        height: 38,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => Icon(
          subject.icon,
          color: isSelected ? Colors.white : const Color(0xFF0066FF),
          size: 28,
        ),
      );
    }

    return Icon(
      subject.icon,
      color: isSelected ? Colors.white : const Color(0xFF0066FF),
      size: 28,
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.fromLTRB(8, 6, 8, 7),
        decoration: BoxDecoration(
          color: isSelected ? null : Colors.white,
          gradient: isSelected
              ? const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF0075FF),
                    Color(0xFF0056F6),
                  ],
                )
              : null,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF38BDF8)
                : const Color(0xFFE2E8F0),
            width: isSelected ? 1.5 : 1.0,
          ),
          boxShadow: [
            if (isSelected)
              BoxShadow(
                color: const Color(0xFF0066FF).withValues(alpha: 0.38),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            else
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
          ],
        ),
        child: Stack(
          children: [
            // Top Right Checkmark Badge (Only when selected)
            if (isSelected)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  width: 17,
                  height: 17,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 4,
                        offset: Offset(0, 1),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    size: 12,
                    color: Color(0xFF0066FF),
                  ),
                ),
              ),

            // Card Content
            Column(
              children: [
                // Centered 3D Illustration Icon with subtle glow background
                Expanded(
                  child: Center(
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isSelected
                            ? Colors.white.withValues(alpha: 0.16)
                            : const Color(0xFFF1F5F9).withValues(alpha: 0.6),
                      ),
                      child: Center(
                        child: _buildIcon(),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 3),

                // Bottom Row: Subject Title + Chevron Right Arrow
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        subject.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? Colors.white
                              : const Color(0xFF0F172A),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                    const SizedBox(width: 2),
                    Container(
                      width: 15,
                      height: 15,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? Colors.white.withValues(alpha: 0.25)
                            : const Color(0xFFF1F5F9),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.chevron_right_rounded,
                        size: 11,
                        color: isSelected
                            ? Colors.white
                            : const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
