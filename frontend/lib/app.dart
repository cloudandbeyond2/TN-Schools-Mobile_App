import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'services/course_service.dart';
import 'theme/app_theme.dart';
import 'screens/onboarding_screen.dart';
import 'screens/main_navigation_screen.dart';
import 'screens/all_classes_screen.dart';
import 'screens/my_courses_screen.dart';
import 'screens/course_purchase_screen.dart';
import 'screens/reading_screen.dart';
import 'screens/ai_chat_screen.dart';
import 'screens/mock_test_screen.dart';
import 'screens/homework_assignments_screen.dart';
import 'screens/timetable_attendance_screen.dart';
import 'screens/digital_library_screen.dart';
import 'screens/career_guidance_screen.dart';
import 'screens/scholarships_competitions_screen.dart';
import 'screens/announcements_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/my_progress_screen.dart';
import 'screens/course_lessons_screen.dart';
import 'screens/course_upload_screen.dart';
import 'screens/course_management_screen.dart';
import 'screens/ai_tutor_screen.dart';

class StudentApp extends StatelessWidget {
  const StudentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => CourseService(),
      child: Consumer<CourseService>(
        builder: (context, courseService, child) {
          return MaterialApp(
            title: 'TN Smart Student Learning Portal',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            builder: (context, child) {
              return AnnotatedRegion<SystemUiOverlayStyle>(
                value: const SystemUiOverlayStyle(
                  statusBarColor: Colors.transparent,
                  statusBarIconBrightness: Brightness.dark,
                  statusBarBrightness: Brightness.light,
                  systemNavigationBarColor: Colors.white,
                  systemNavigationBarIconBrightness: Brightness.dark,
                ),
                child: child ?? const SizedBox.shrink(),
              );
            },
            initialRoute: '/onboarding',
            routes: {
              '/': (context) => const MainNavigationScreen(),
              '/onboarding': (context) => const OnboardingScreen(),
              '/all-classes': (context) => const AllClassesScreen(),
              '/my-courses': (context) => const MyCoursesScreen(),
              '/course-purchase': (context) => const CoursePurchaseScreen(),
              '/reading': (context) => const ReadingScreen(),
              '/ai-chat': (context) => const AIChatScreen(),
              '/mock-test': (context) => const MockTestScreen(),
              '/homework': (context) => const HomeworkAssignmentsScreen(),
              '/timetable': (context) => const TimetableAttendanceScreen(),
              '/library': (context) => const DigitalLibraryScreen(),
              '/career': (context) => const CareerGuidanceScreen(),
              '/scholarships': (context) => const ScholarshipsCompetitionsScreen(),
              '/announcements': (context) => const AnnouncementsScreen(),
              '/profile': (context) => const ProfileScreen(),
              '/notifications': (context) => const NotificationsScreen(),
              '/progress': (context) => const MyProgressScreen(),
              '/my-progress': (context) => const MyProgressScreen(),
              '/course-lessons': (context) => const CourseLessonsScreen(),
              '/course-upload': (context) => const CourseUploadScreen(),
              '/course-management': (context) => const CourseManagementScreen(),
              '/ai-tutor': (context) => const AITutorScreen(),
            },
          );
        },
      ),
    );
  }
}
