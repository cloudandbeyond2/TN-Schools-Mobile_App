import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/course_service.dart';
import '../theme/app_theme.dart';
import '../widgets/bottom_nav_bar.dart';
import 'ai_tutor_home_screen.dart';
import 'all_classes_screen.dart';
import 'digital_library_screen.dart';
import 'homework_assignments_screen.dart';
import 'profile_screen.dart';

class MainNavigationScreen extends StatelessWidget {
  const MainNavigationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final courseService = Provider.of<CourseService>(context);
    final currentIndex = courseService.currentBottomNavIndex.clamp(0, 4);

    final screens = const [
      AITutorHomeScreen(hideBottomNav: true),
      AllClassesScreen(hideBottomNav: true),
      DigitalLibraryScreen(hideBottomNav: true),
      HomeworkAssignmentsScreen(hideBottomNav: true),
      ProfileScreen(hideBottomNav: true),
    ];

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: AppTheme.backgroundLight,
        body: IndexedStack(
          index: currentIndex,
          children: screens,
        ),
        bottomNavigationBar: CustomBottomNavBar(
          currentIndex: currentIndex,
          onTap: (index) {
            courseService.setBottomNavIndex(index);
          },
        ),
      ),
    );
  }
}
