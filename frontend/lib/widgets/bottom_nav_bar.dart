import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/course_service.dart';
import '../core/localization/app_localization.dart';

class CustomBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int>? onTap;

  const CustomBottomNavBar({
    super.key,
    required this.currentIndex,
    this.onTap,
  });

  static void defaultNavigate(BuildContext context, int targetIndex, int currentIndex) {
    if (targetIndex == currentIndex) return;

    final courseService = Provider.of<CourseService>(context, listen: false);
    courseService.setBottomNavIndex(targetIndex);

    if (Navigator.canPop(context)) {
      Navigator.popUntil(context, (route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    final navItems = [
      {
        'iconSelected': Icons.home_rounded,
        'iconUnselected': Icons.home_outlined,
        'label': AppLocalization.get('nav_home'),
      },
      {
        'iconSelected': Icons.grid_view_rounded,
        'iconUnselected': Icons.grid_view_outlined,
        'label': AppLocalization.get('nav_my_classes'),
      },
      {
        'iconSelected': Icons.menu_book_rounded,
        'iconUnselected': Icons.menu_book_outlined,
        'label': AppLocalization.get('nav_study'),
      },
      {
        'iconSelected': Icons.assignment_rounded,
        'iconUnselected': Icons.assignment_outlined,
        'label': AppLocalization.get('nav_homework'),
      },
      {
        'iconSelected': Icons.person_rounded,
        'iconUnselected': Icons.person_outline_rounded,
        'label': AppLocalization.get('nav_profile'),
      },
    ];

    const activeColor = Color(0xFF1E293B);
    const inactiveColor = Color(0xFF94A3B8);

    return SafeArea(
      top: false,
      child: Container(
        height: 66,
        margin: const EdgeInsets.only(left: 16, right: 16, bottom: 12, top: 4),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(36),
          border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 20,
              spreadRadius: 1,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List.generate(navItems.length, (index) {
            final isSelected = currentIndex == index;
            final item = navItems[index];

            return Expanded(
              child: GestureDetector(
                onTap: () {
                  if (onTap != null) {
                    onTap!(index);
                  } else {
                    defaultNavigate(context, index, currentIndex);
                  }
                },
                behavior: HitTestBehavior.opaque,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      (isSelected
                          ? item['iconSelected']
                          : item['iconUnselected']) as IconData,
                      color: isSelected ? activeColor : inactiveColor,
                      size: 22,
                    ),
                    const SizedBox(height: 2),
                    // Small horizontal indicator dash for active state
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: isSelected ? 14 : 0,
                      height: 2.5,
                      decoration: BoxDecoration(
                        color: isSelected ? activeColor : Colors.transparent,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item['label'] as String,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? activeColor : inactiveColor,
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

typedef TNBottomNavBar = CustomBottomNavBar;
