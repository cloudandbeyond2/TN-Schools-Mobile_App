import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app.dart';
import 'services/course_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Suppress noisy debug logs in browser console
  if (kIsWeb) {
    debugPrint = (String? message, {int? wrapWidth}) {};
  }

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  final courseService = CourseService();
  await courseService.initSession();

  runApp(StudentApp(courseService: courseService));
}
