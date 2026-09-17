import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/course.dart';
import '../models/subject.dart';
import '../models/student.dart';
import '../models/homework.dart';
import '../models/exam.dart';
import '../theme/app_theme.dart';
import '../core/localization/app_localization.dart';
import '../core/constants/app_constants.dart';

class CourseService extends ChangeNotifier {
  // Base URL Options:
  // Option 1: Production (Vercel) -> https://tn-schools-mobile-app-backend.vercel.app
  // Option 2: Localhost Development -> http://localhost:5000
  static String get _baseUrl => AppConstants.baseUrl;

  static const String _prefKeyIsLoggedIn = 'tn_student_is_logged_in';
  static const String _prefKeyStudentData = 'tn_student_data';
  static const String _prefKeyHasSeenWelcome = 'tn_student_has_seen_welcome';

  bool _isLoggedIn = false;
  bool _hasSeenWelcome = false;

  bool get isLoggedIn => _isLoggedIn;
  bool get hasSeenWelcome => _hasSeenWelcome;

  Student _student = const Student(
    id: 'f7bfdf58-6567-4f68-ab56-4cac65df54a5',
    name: 'Praveen',
    avatarUrl: 'assets/images/home/Boy.png',
    coins: 845,
    enrolledCourseIds: ['c1', 'c5', 'c7'],
    classStandard: '6th Standard',
    section: 'A',
    schoolId: 'd9962dbb-f572-47a4-8240-6eef99b5c5bb',
    medium: 'English Medium',
    stream: 'General',
    schoolName: 'Government Higher Secondary School',
  );

  String _selectedSubjectId = 'sub1';
  int _currentBottomNavIndex = 0;

  bool _isLoadingSubjects = false;
  List<Subject> _fetchedClassSubjects = [];

  bool get isLoadingSubjects => _isLoadingSubjects;
  List<Subject> get fetchedClassSubjects => _fetchedClassSubjects;

  CourseService() {
    fetchClassSubjects();
  }

  Future<void> initSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _isLoggedIn = prefs.getBool(_prefKeyIsLoggedIn) ?? false;
      _hasSeenWelcome = prefs.getBool(_prefKeyHasSeenWelcome) ?? false;

      final studentJsonStr = prefs.getString(_prefKeyStudentData);
      if (_isLoggedIn && studentJsonStr != null && studentJsonStr.isNotEmpty) {
        final Map<String, dynamic> studentMap = jsonDecode(studentJsonStr);
        _student = Student.fromJson(studentMap);
      }
      notifyListeners();
      if (_isLoggedIn) {
        fetchClassSubjects();
      }
    } catch (e) {
      debugPrint('Error initializing session from SharedPreferences: $e');
    }
  }

  Future<void> _saveSessionToPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_prefKeyIsLoggedIn, true);
      await prefs.setBool(_prefKeyHasSeenWelcome, true);
      await prefs.setString(_prefKeyStudentData, jsonEncode(_student.toJson()));
    } catch (e) {
      debugPrint('Error saving session to SharedPreferences: $e');
    }
  }

  Future<void> markWelcomeSeen() async {
    _hasSeenWelcome = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_prefKeyHasSeenWelcome, true);
    } catch (e) {
      debugPrint('Error saving hasSeenWelcome to SharedPreferences: $e');
    }
  }

  Future<void> logout() async {
    _isLoggedIn = false;
    _hasSeenWelcome = true;
    _student = const Student(
      id: '',
      name: 'Student',
      avatarUrl: 'assets/images/home/Boy.png',
      coins: 0,
      enrolledCourseIds: [],
    );
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_prefKeyIsLoggedIn, false);
      await prefs.remove(_prefKeyStudentData);
      await prefs.setBool(_prefKeyHasSeenWelcome, true);
    } catch (e) {
      debugPrint('Error clearing session in SharedPreferences: $e');
    }
  }

  // Reading Screen State
  double _readingFontSize = 16.0;
  bool _isDarkMode = false;
  bool _isBookmarked = false;
  int _currentReadingPage = 1;
  final int _totalReadingPages = 12;
  final Map<String, Set<int>> _courseCompletedLessons = {};

  // Homework list (Fetched dynamically per logged-in student)
  List<HomeworkItem> _homeworkItems = [];

  // Dynamic Overall Learning Progress (Calculated from Subject-Wise Progress)
  double _overallProgress = 0.65;
  int _overallCompletedLessons = 26;
  int _overallTotalLessons = 40;

  // Sample Mock Test Exam
  final MockExam _sampleMockExam = const MockExam(
    id: 'exam1',
    title: '10th Standard Mathematics Unit Quiz',
    subject: 'Mathematics',
    totalMarks: 30,
    durationMinutes: 10,
    questions: [
      MockQuestion(
        id: 'q1',
        questionText: 'What is the roots of equation x² - 5x + 6 = 0?',
        options: ['x = 2, 3', 'x = 1, 6', 'x = -2, -3', 'x = 0, 5'],
        correctAnswerIndex: 0,
      ),
      MockQuestion(
        id: 'q2',
        questionText: 'Which theorem states that in a right angled triangle a² + b² = c²?',
        options: ['Thales Theorem', 'Pythagoras Theorem', 'Euler Theorem', 'Newton Law'],
        correctAnswerIndex: 1,
      ),
      MockQuestion(
        id: 'q3',
        questionText: 'What is the sum of angles in a quadrilateral?',
        options: ['180°', '270°', '360°', '540°'],
        correctAnswerIndex: 2,
      ),
    ],
  );

  List<Course> _courses = [
    const Course(
      id: 'c3',
      title: 'Class 6 Mathematics - Samacheer Kalvi (Term 1)',
      instructor: 'TNSCERT Mathematics Faculty',
      university: 'Tamil Nadu School Education Dept',
      imagePath: 'math_power',
      themeColor: AppTheme.pastelYellow,
      lessons: 12,
      videos: 15,
      coins: 580,
      rating: 4.9,
      studentsCount: 9200,
      progress: 0.0,
      subject: 'Mathematics',
      description:
          'Official 6th Standard Mathematics (Term 1) textbook covering all 6 Chapters: Numbers & Place Value, Introduction to Algebra, Ratio & Proportion, Geometry, Statistics, and Information Processing.',
      level: 'Class 6',
      duration: '4.0 hrs',
      isEnrolled: true,
      isCompleted: false,
      courseType: 'text',
    ),
    const Course(
      id: 'c4',
      title: 'Learn Math the Easy and Fun Way',
      instructor: 'Sophia Carter',
      university: 'Elementary STEM Lab',
      imagePath: 'this_way_math',
      themeColor: AppTheme.pastelPurple,
      lessons: 12,
      videos: 20,
      coins: 530,
      rating: 4.8,
      studentsCount: 6100,
      progress: 0.0,
      subject: 'Mathematics',
      description:
          'Step-by-step visual geometry and algebra concepts explained with simple animations.',
      level: 'Beginner',
      duration: '1.5 hrs',
      isEnrolled: false,
      isCompleted: false,
      courseType: 'image',
    ),
    const Course(
      id: 'c1',
      title: 'Animal Safari Learning Adventure',
      instructor: 'James Parker',
      university: 'Oxford Nature Institute',
      imagePath: 'safari',
      themeColor: AppTheme.pastelOrange,
      lessons: 12,
      videos: 24,
      coins: 620,
      rating: 4.8,
      studentsCount: 5600,
      progress: 0.0,
      subject: 'Science',
      description:
          'Join a fun nature trip where kids explore trees, animals, and the outdoor world.',
      level: 'Beginner',
      duration: '2.5 hrs',
      isEnrolled: true,
      isCompleted: false,
      courseType: 'image',
    ),
    const Course(
      id: 'c2',
      title: 'Explore Space with Fun Missions',
      instructor: 'Mia Anderson',
      university: 'Space Exploration Academy',
      imagePath: 'space',
      themeColor: AppTheme.pastelBlue,
      lessons: 12,
      videos: 18,
      coins: 580,
      rating: 4.9,
      studentsCount: 8200,
      progress: 0.0,
      subject: 'Science',
      description:
          'Blast off into astronomical science! Learn about stars, planets, gravity, and the solar system.',
      level: 'Intermediate',
      duration: '3.0 hrs',
      isEnrolled: false,
      isCompleted: false,
      courseType: 'image',
    ),
    const Course(
      id: 'c8',
      title: 'Class 6 Tamil - Samacheer Kalvi (Term 1)',
      instructor: 'Dr. Sundaram & TNSCERT',
      university: 'Tamil Nadu School Education Dept',
      imagePath: 'tamil_morals',
      themeColor: AppTheme.primaryLightEmerald,
      lessons: 12,
      videos: 22,
      coins: 450,
      rating: 4.9,
      studentsCount: 9200,
      progress: 0.0,
      subject: 'Tamil Literature',
      description:
          'Complete 6th Standard Tamil (Term 1) curriculum covering all 3 Units: இன்பத்தமிழ், வளர்தமிழ், சிலப்பதிகாரம், சிறகின் ஓசை, கிழவனும் கடலும், திருக்குறள், காமராசர் மற்றும் இலக்கணம்.',
      level: 'Class 6',
      duration: '4.0 hrs',
      isEnrolled: true,
      isCompleted: false,
      courseType: 'text',
    ),
    const Course(
      id: 'c9',
      title: 'Class 6 English - Samacheer Kalvi (Term 1)',
      instructor: 'TNSCERT English Faculty',
      university: 'Tamil Nadu School Education Dept',
      imagePath: 'english_skills',
      themeColor: AppTheme.pastelPurple,
      lessons: 12,
      videos: 25,
      coins: 500,
      rating: 4.8,
      studentsCount: 7800,
      progress: 0.0,
      subject: 'English',
      description:
          'Complete 6th Standard English (Term 1) textbook course covering all 3 Units: Sea Turtles, When the Trees Walked, A Visitor from Distant Lands, poems, stories, grammar & vocabulary.',
      level: 'Class 6',
      duration: '3.5 hrs',
      isEnrolled: true,
      isCompleted: false,
      courseType: 'text',
    ),
    const Course(
      id: 'c10',
      title: 'Indian Freedom Movement & Social Civics',
      instructor: 'Mr. Joseph',
      university: 'National History Institute',
      imagePath: 'social_science',
      themeColor: AppTheme.pastelOrange,
      lessons: 12,
      videos: 19,
      coins: 480,
      rating: 4.6,
      studentsCount: 5100,
      progress: 0.0,
      subject: 'Social Science',
      description:
          'Understand Indian history, Constitution, geography, and environmental civics.',
      level: 'Intermediate',
      duration: '2.8 hrs',
      isEnrolled: false,
      isCompleted: false,
      courseType: 'text',
    ),
    const Course(
      id: 'c11',
      title: 'Python Programming & AI Basics for Students',
      instructor: 'Mr. Karthik',
      university: 'IIT Madras STEM Lab',
      imagePath: 'computer_science',
      themeColor: AppTheme.pastelBlue,
      lessons: 12,
      videos: 35,
      coins: 700,
      rating: 4.9,
      studentsCount: 11500,
      progress: 0.0,
      subject: 'Computer Science',
      description:
          'Learn basic coding algorithms, Python syntax, and artificial intelligence fundamentals.',
      level: 'Beginner',
      duration: '5.0 hrs',
      isEnrolled: false,
      isCompleted: false,
      courseType: 'image',
    ),
    const Course(
      id: 'c12',
      title: 'Tamil Nadu Heritage & World GK Masterclass',
      instructor: 'Prof. Anbarasan',
      university: 'State Heritage Foundation',
      imagePath: 'general_knowledge',
      themeColor: AppTheme.pastelYellow,
      lessons: 12,
      videos: 28,
      coins: 520,
      rating: 4.8,
      studentsCount: 7800,
      progress: 0.0,
      subject: 'General Knowledge',
      description:
          'Explore Tamil Nadu history, world capitals, inventions, awards, and geography quizzes.',
      level: 'All Levels',
      duration: '3.5 hrs',
      isEnrolled: false,
      isCompleted: false,
      courseType: 'text',
    ),
    const Course(
      id: 'c13',
      title: 'Daily Science Inventions & Current Affairs GK',
      instructor: 'Dr. Meenakshi',
      university: 'National Knowledge Olympiad',
      imagePath: 'science_gk',
      themeColor: AppTheme.pastelGreen,
      lessons: 12,
      videos: 20,
      coins: 490,
      rating: 4.9,
      studentsCount: 9400,
      progress: 0.0,
      subject: 'General Knowledge',
      description:
          'Stay updated with global scientific breakthroughs, environmental events, and space achievements.',
      level: 'Intermediate',
      duration: '2.5 hrs',
      isEnrolled: false,
      isCompleted: false,
      courseType: 'text',
    ),
    const Course(
      id: 'c14',
      title: 'Creative Arts, Logic Puzzles & Life Skills',
      instructor: 'Ms. Shalini',
      university: 'Global Talent Academy',
      imagePath: 'life_skills',
      themeColor: AppTheme.pastelPurple,
      lessons: 12,
      videos: 22,
      coins: 460,
      rating: 4.7,
      studentsCount: 6300,
      progress: 0.0,
      subject: 'More Subjects',
      description:
          'Enhance creative thinking, emotional intelligence, drawing, and problem-solving puzzles.',
      level: 'Beginner',
      duration: '3.0 hrs',
      isEnrolled: false,
      isCompleted: false,
    ),
  ];

  final List<Subject> _customSubjects = [];

  // Dynamic Subjects depending on Class & Language
  List<Subject> get subjects {
    bool ta = AppLocalization.isTamil;
    final defaultSubjects = [
      Subject(
        id: 'sub1',
        name: ta ? 'கணிதம்' : 'Mathematics',
        icon: Icons.calculate_rounded,
        color: const Color(0xFFF59E0B),
      ),
      Subject(
        id: 'sub3',
        name: ta ? 'தமிழ்' : 'Tamil Literature',
        icon: Icons.menu_book_rounded,
        color: AppTheme.primaryEmerald,
      ),
      Subject(
        id: 'sub5',
        name: ta ? 'சமூக அறிவியல்' : 'Social Science',
        icon: Icons.public_rounded,
        color: const Color(0xFFEC4899),
      ),
      Subject(
        id: 'sub2',
        name: ta ? 'அறிவியல்' : 'Science',
        icon: Icons.science_rounded,
        color: const Color(0xFF0284C7),
      ),
      Subject(
        id: 'sub4',
        name: ta ? 'ஆங்கிலம்' : 'English',
        icon: Icons.record_voice_over_rounded,
        color: const Color(0xFF8B5CF6),
      ),
      Subject(
        id: 'sub6',
        name: ta ? 'கணினி' : 'Computer Science',
        icon: Icons.computer_rounded,
        color: const Color(0xFF10B981),
      ),
      Subject(
        id: 'sub7',
        name: ta ? 'பொது அறிவு' : 'General Knowledge',
        icon: Icons.lightbulb_rounded,
        color: const Color(0xFFF59E0B),
      ),
      Subject(
        id: 'sub8',
        name: ta ? 'மேலும்' : 'More Subjects',
        icon: Icons.grid_view_rounded,
        color: const Color(0xFF6366F1),
      ),
    ];

    final baseSubjects = _fetchedClassSubjects.isNotEmpty
        ? _fetchedClassSubjects
        : defaultSubjects;

    final rawClass = _student.classStandard;
    final match = RegExp(r'\d+').firstMatch(rawClass);
    final classNum = match != null ? (int.tryParse(match.group(0)!) ?? 0) : 0;
    final studentGroup = _student.effectiveGroup;

    // Filter by student's class group for Higher Secondary (Classes 11 & 12)
    if (classNum >= 11 && studentGroup.isNotEmpty && studentGroup.toLowerCase() != 'general') {
      final allowed = getAllowedSubjectsForGroup(classNum, studentGroup);
      if (allowed != null && allowed.isNotEmpty) {
        final filtered = baseSubjects.where((s) {
          final sName = s.name.trim().toLowerCase();
          return allowed.any((a) => sName == a || sName.contains(a) || a.contains(sName));
        }).toList();

        if (filtered.isNotEmpty) {
          return [...filtered, ..._customSubjects];
        }
      }
    }

    return [...baseSubjects, ..._customSubjects];
  }

  // Tamil Nadu Higher Secondary (HSC) group subject rules
  static Set<String>? getAllowedSubjectsForGroup(int classNum, String? group) {
    if (classNum < 11 || group == null || group.trim().isEmpty) {
      return null;
    }

    final g = group.trim().toLowerCase();

    // 1. Science with Biology / Bio-Maths (e.g. 2601, 2503, Science Group, etc.)
    if (g.contains('2601') ||
        g.contains('2503') ||
        g.contains('2602') ||
        g.contains('2603') ||
        g.contains('2604') ||
        g.contains('2605') ||
        g.contains('2606') ||
        g.contains('2607') ||
        g.contains('2608') ||
        g.contains('bio') ||
        g.contains('biology') ||
        (g.contains('science') && !g.contains('computer'))) {
      return {
        'tamil',
        'english',
        'mathematics',
        'physics',
        'chemistry',
        'biology',
        'botany',
        'zoology',
      };
    }

    // 2. Science with Computer Science / Pure Science (e.g. 2501, 2502, etc.)
    if (g.contains('2502') ||
        g.contains('2501') ||
        g.contains('2504') ||
        g.contains('2505') ||
        g.contains('2506') ||
        g.contains('computer') ||
        g.contains('cs')) {
      return {
        'tamil',
        'english',
        'mathematics',
        'physics',
        'chemistry',
        'computer science',
        'computer applications',
        'statistics',
      };
    }

    // 3. Commerce stream (e.g. 2701, 2702, etc.)
    if (g.contains('270') ||
        g.contains('2701') ||
        g.contains('commerce') ||
        g.contains('account')) {
      return {
        'tamil',
        'english',
        'commerce',
        'accountancy',
        'economics',
        'business mathematics',
        'computer applications',
        'mathematics',
      };
    }

    // 4. Arts / Humanities stream (e.g. 2801, 2802, etc.)
    if (g.contains('280') ||
        g.contains('arts') ||
        g.contains('humanities') ||
        g.contains('history')) {
      return {
        'tamil',
        'english',
        'history',
        'geography',
        'economics',
        'political science',
        'computer applications',
      };
    }

    // 5. Vocational stream (29xx)
    if (g.contains('29') || g.contains('vocational')) {
      return {
        'tamil',
        'english',
        'employability skills',
        'mathematics',
        'biology',
        'commerce',
        'accountancy',
      };
    }

    return null;
  }

  IconData _resolveSubjectIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('math') || lower.contains('கணிதம்')) {
      return Icons.calculate_rounded;
    } else if (lower.contains('tamil') || lower.contains('தமிழ்')) {
      return Icons.menu_book_rounded;
    } else if (lower.contains('social') || lower.contains('சமூக') || lower.contains('history') || lower.contains('geography') || lower.contains('civics')) {
      return Icons.public_rounded;
    } else if (lower.contains('science') || lower.contains('அறிவியல்') || lower.contains('physics') || lower.contains('chemistry') || lower.contains('biology') || lower.contains('botany') || lower.contains('zoology')) {
      return Icons.science_rounded;
    } else if (lower.contains('english') || lower.contains('ஆங்கிலம்') || lower.contains('language') || lower.contains('hindi') || lower.contains('french')) {
      return Icons.record_voice_over_rounded;
    } else if (lower.contains('computer') || lower.contains('கணினி') || lower.contains('coding') || lower.contains('it')) {
      return Icons.computer_rounded;
    } else if (lower.contains('general') || lower.contains('பொது') || lower.contains('gk')) {
      return Icons.lightbulb_rounded;
    }
    return Icons.auto_stories_rounded;
  }

  // Fetch subjects dynamically based on the student's logged-in class standard
  Future<void> fetchClassSubjects({String? classOverride, String? schoolIdOverride, String? boardOverride}) async {
    _isLoadingSubjects = true;
    notifyListeners();

    try {
      final rawClass = classOverride ?? _student.classStandard;
      final match = RegExp(r'\d+').firstMatch(rawClass);
      final classNum = match != null ? (int.tryParse(match.group(0)!) ?? 0) : 0;
      final schoolId = schoolIdOverride ?? _student.schoolId ?? '';

      final queryParams = <String>[];
      if (classNum > 0) {
        queryParams.add('class=$classNum');
      }
      queryParams.add('status=Active');
      if (schoolId.isNotEmpty) {
        queryParams.add('schoolId=${Uri.encodeComponent(schoolId)}');
      }
      if (boardOverride != null && boardOverride.isNotEmpty && boardOverride != 'All') {
        queryParams.add('board=${Uri.encodeComponent(boardOverride)}');
      }

      final url = Uri.parse('$_baseUrl/api/superadmin/academics/subjects?${queryParams.join('&')}');

      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (_student.token != null && _student.token!.isNotEmpty) {
        headers['Authorization'] = 'Bearer ${_student.token}';
      }

      // If Higher Secondary and group is missing, attempt to retrieve group from student profile
      if (classNum >= 11 && (_student.group == null || _student.group!.isEmpty)) {
        final targetId = _student.studentId ?? _student.id;
        if (targetId.isNotEmpty && targetId != 's1') {
          try {
            final profUrl = Uri.parse('$_baseUrl/api/students/$targetId');
            final profRes = await http.get(profUrl, headers: headers).timeout(const Duration(seconds: 4));
            if (profRes.statusCode == 200) {
              final profData = jsonDecode(profRes.body);
              final sData = profData['data'];
              if (sData != null && sData['group'] != null) {
                final grp = sData['group'].toString().trim();
                if (grp.isNotEmpty) {
                  _student = _student.copyWith(group: grp, stream: grp);
                }
              }
            }
          } catch (e) {
            debugPrint('Could not fetch student group profile: $e');
          }
        }
      }

      final response = await http.get(url, headers: headers).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) {
          final seenNames = <String>{};
          final List<Subject> fetched = [];

          for (final sub in data) {
            if (sub is Map<String, dynamic>) {
              final subName = (sub['name'] ?? '').toString().trim();
              if (subName.isNotEmpty && !seenNames.contains(subName.toLowerCase())) {
                seenNames.add(subName.toLowerCase());

                final colorHex = sub['color']?.toString() ?? '#6366f1';
                Color color;
                try {
                  String hex = colorHex.replaceAll('#', '').trim();
                  if (hex.length == 6) hex = 'FF$hex';
                  color = Color(int.parse(hex, radix: 16));
                } catch (_) {
                  color = const Color(0xFF6366F1);
                }

                final iconData = _resolveSubjectIcon(subName);

                fetched.add(Subject(
                  id: sub['id']?.toString() ?? 'sub_${subName.toLowerCase()}',
                  name: subName,
                  icon: iconData,
                  color: color,
                ));
              }
            }
          }

          if (fetched.isNotEmpty) {
            _fetchedClassSubjects = fetched;
            final currentSubList = subjects;
            if (!currentSubList.any((s) => s.id == _selectedSubjectId)) {
              _selectedSubjectId = currentSubList.first.id;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching class subjects: $e');
    } finally {
      _isLoadingSubjects = false;
      notifyListeners();
    }
  }

  // Course Management APIs
  void addCourse(Course course) {
    _courses.insert(0, course);
    notifyListeners();
  }

  void deleteCourse(String courseId) {
    _courses.removeWhere((c) => c.id == courseId);
    notifyListeners();
  }

  void updateCourse(Course updatedCourse) {
    final index = _courses.indexWhere((c) => c.id == updatedCourse.id);
    if (index != -1) {
      _courses[index] = updatedCourse;
      notifyListeners();
    }
  }

  void addSubject(Subject subject) {
    _customSubjects.add(subject);
    notifyListeners();
  }

  // Getters
  Student get student => _student;
  Map<String, String> get authHeaders => {
    'Content-Type': 'application/json',
    if (_student.token != null && _student.token!.isNotEmpty)
      'Authorization': 'Bearer ${_student.token}',
  };
  List<Course> get courses => List.unmodifiable(_courses);
  String get selectedSubjectId => _selectedSubjectId;
  int get currentBottomNavIndex => _currentBottomNavIndex;

  double get overallProgress => _overallProgress;
  int get overallCompletedLessons => _overallCompletedLessons;
  int get overallTotalLessons => _overallTotalLessons;
  int get overallPercentage => (_overallProgress * 100).round();

  void setOverallProgress({
    required double progress,
    required int completedLessons,
    required int totalLessons,
  }) {
    _overallProgress = progress.clamp(0.0, 1.0);
    _overallCompletedLessons = completedLessons;
    _overallTotalLessons = totalLessons;
    notifyListeners();
  }

  double get readingFontSize => _readingFontSize;
  bool get isDarkMode => _isDarkMode;
  bool get isBookmarked => _isBookmarked;
  int get currentReadingPage => _currentReadingPage;
  int get totalReadingPages => _totalReadingPages;

  List<HomeworkItem> get homeworkItems => List.unmodifiable(_homeworkItems);
  MockExam get sampleMockExam => _sampleMockExam;

  List<Course> get enrolledCourses =>
      _courses.where((c) => c.isEnrolled).toList();

  List<Course> get completedCourses =>
      _courses.where((c) => c.isEnrolled && c.isCompleted).toList();

  // Dynamic Courses filtered by currently selected subject
  List<Course> get filteredCoursesBySubject {
    final selectedSub = subjects.firstWhere(
      (s) => s.id == _selectedSubjectId,
      orElse: () => subjects.first,
    );

    final subName = selectedSub.name.toLowerCase();

    if (subName.contains('math') || subName.contains('கணிதம்')) {
      return _courses.where((c) => c.subject.toLowerCase().contains('math') || c.subject.toLowerCase().contains('கணிதம்')).toList();
    } else if (subName.contains('science') || subName.contains('அறிவியல்')) {
      return _courses.where((c) => c.subject.toLowerCase().contains('science') || c.subject.toLowerCase().contains('அறிவியல்')).toList();
    } else if (subName.contains('tamil') || subName.contains('தமிழ்')) {
      return _courses.where((c) => c.subject.toLowerCase().contains('tamil') || c.subject.toLowerCase().contains('தமிழ்')).toList();
    } else if (subName.contains('english') || subName.contains('ஆங்கிலம்')) {
      return _courses.where((c) => c.subject.toLowerCase().contains('english') || c.subject.toLowerCase().contains('ஆங்கிலம்')).toList();
    } else if (subName.contains('social') || subName.contains('சமூக')) {
      return _courses.where((c) => c.subject.toLowerCase().contains('social') || c.subject.toLowerCase().contains('சமூக')).toList();
    } else if (subName.contains('computer') || subName.contains('கணினி')) {
      return _courses.where((c) => c.subject.toLowerCase().contains('computer') || c.subject.toLowerCase().contains('கணினி')).toList();
    } else if (subName.contains('general') || subName.contains('பொது')) {
      return _courses.where((c) => c.subject.toLowerCase().contains('general') || c.subject.toLowerCase().contains('பொது')).toList();
    } else if (subName.contains('more') || subName.contains('மேலும்')) {
      return _courses;
    } else {
      return _courses.where((c) => c.subject.toLowerCase() == selectedSub.name.toLowerCase()).toList();
    }
  }

  Course getCourseById(String id) {
    return _courses.firstWhere(
      (c) => c.id == id,
      orElse: () => _courses.first,
    );
  }

  // Language Switch
  void toggleLanguage() {
    AppLocalization.isTamil = !AppLocalization.isTamil;
    notifyListeners();
  }

  // Onboarding Selection Update
  void updateOnboardingProfile({
    required String standard,
    required String medium,
    required String stream,
  }) {
    _student = _student.copyWith(
      classStandard: standard,
      medium: medium,
      stream: stream,
    );
    notifyListeners();
    fetchClassSubjects();
  }

  void setOnboardingInfo({
    required String classStandard,
    required String medium,
    required String stream,
  }) {
    updateOnboardingProfile(standard: classStandard, medium: medium, stream: stream);
  }

  void setStudentAuth({
    required String rollNumber,
    required String phone,
    String? id,
    String? studentId,
    String? token,
    String? schoolId,
    String? name,
    String? schoolName,
    String? classStandard,
    String? section,
    String? gender,
    String? medium,
    String? avatarUrl,
    String? group,
    String? stream,
  }) {
    String resolvedAvatar = avatarUrl ?? _student.avatarUrl;
    if (gender != null && gender.isNotEmpty) {
      final g = gender.toLowerCase().trim();
      if (g == 'female' || g == 'girl' || g == 'f' || g == 'woman' || g == 'women') {
        resolvedAvatar = 'assets/images/home/Girl.png';
      } else if (g == 'male' || g == 'boy' || g == 'm' || g == 'man' || g == 'men') {
        resolvedAvatar = 'assets/images/home/Boy.png';
      }
    }

    String resolvedMedium = medium ?? _student.medium;
    if (resolvedMedium.isNotEmpty && !resolvedMedium.toLowerCase().contains('medium')) {
      resolvedMedium = '$resolvedMedium Medium';
    }

    final resolvedGroup = (group != null && group.trim().isNotEmpty) ? group.trim() : _student.group;
    final resolvedStream = (stream != null && stream.trim().isNotEmpty)
        ? stream.trim()
        : (resolvedGroup ?? _student.stream);

    _student = _student.copyWith(
      id: id ?? _student.id,
      studentId: studentId ?? _student.studentId,
      token: token ?? _student.token,
      schoolId: schoolId ?? _student.schoolId,
      rollNumber: rollNumber,
      phone: phone,
      name: name ?? _student.name,
      schoolName: schoolName ?? _student.schoolName,
      classStandard: classStandard ?? _student.classStandard,
      section: section ?? _student.section,
      gender: gender ?? _student.gender,
      medium: resolvedMedium,
      avatarUrl: resolvedAvatar,
      group: resolvedGroup,
      stream: resolvedStream,
    );
    _isLoggedIn = true;
    _hasSeenWelcome = true;
    notifyListeners();
    fetchClassSubjects();
    _saveSessionToPrefs();
  }

  // Subject Selection
  void selectSubject(String subjectId) {
    _selectedSubjectId = subjectId;
    notifyListeners();
  }

  // Navigation
  void setBottomNavIndex(int index) {
    _currentBottomNavIndex = index;
    notifyListeners();
  }

  // Set Entire Homework List (from API)
  void setHomeworkItems(List<HomeworkItem> items) {
    _homeworkItems = items;
    notifyListeners();
  }

  // Homework Status Toggle & Submission
  void toggleHomeworkComplete(String homeworkId) {
    _homeworkItems = _homeworkItems.map((h) {
      if (h.id == homeworkId) {
        final newCompleted = !h.isCompleted;
        return h.copyWith(
          isCompleted: newCompleted,
          status: newCompleted ? 'submitted' : 'not_submitted',
        );
      }
      return h;
    }).toList();
    notifyListeners();
  }

  void submitHomework(
    String homeworkId, {
    String? fileName,
    String? answerText,
    List<dynamic>? files,
    String? submittedDate,
  }) {
    _homeworkItems = _homeworkItems.map((h) {
      if (h.id == homeworkId) {
        return h.copyWith(
          isCompleted: true,
          status: 'submitted',
          submittedFileName: fileName ?? h.submittedFileName,
          submittedAnswer: answerText ?? h.submittedAnswer,
          submittedFiles: files ?? h.submittedFiles,
          submittedDate: submittedDate ?? 'Today, Just now',
        );
      }
      return h;
    }).toList();
    notifyListeners();
  }

  // Coin Reward Update
  void addRewardCoins(int amount) {
    _student = _student.copyWith(coins: _student.coins + amount);
    notifyListeners();
  }

  bool purchaseCourses(List<Course> selectedCourses, [BuildContext? context]) {
    int totalCost = selectedCourses.fold(0, (sum, c) => sum + c.coins);
    if (_student.coins >= totalCost) {
      _student = _student.copyWith(coins: _student.coins - totalCost);
      for (var c in selectedCourses) {
        toggleEnrollCourse(c.id);
      }
      notifyListeners();
      return true;
    }
    return false;
  }

  // Reading Controls
  void setReadingFontSize(double size) {
    _readingFontSize = size;
    notifyListeners();
  }

  void changeFontSize(double delta) {
    _readingFontSize = (_readingFontSize + delta).clamp(12.0, 24.0);
    notifyListeners();
  }

  void toggleDarkMode() {
    _isDarkMode = !_isDarkMode;
    notifyListeners();
  }

  void toggleBookmark() {
    _isBookmarked = !_isBookmarked;
    notifyListeners();
  }

  void setReadingPage(int page) {
    _currentReadingPage = page;
    notifyListeners();
  }

  void previousPage() {
    if (_currentReadingPage > 1) {
      _currentReadingPage--;
      notifyListeners();
    }
  }

  void nextPage() {
    if (_currentReadingPage < _totalReadingPages) {
      _currentReadingPage++;
      notifyListeners();
    }
  }

  bool isLessonCompleted(int lessonNumber, {String? courseId}) {
    if (courseId != null && courseId.isNotEmpty) {
      return _courseCompletedLessons[courseId]?.contains(lessonNumber) ?? false;
    }
    return _courseCompletedLessons.values.any((set) => set.contains(lessonNumber));
  }

  Set<int> getCompletedLessonSet({String? courseId}) {
    if (courseId != null && courseId.isNotEmpty) {
      return _courseCompletedLessons[courseId] ?? {};
    }
    final Set<int> all = {};
    for (var set in _courseCompletedLessons.values) {
      all.addAll(set);
    }
    return all;
  }

  int getCompletedCountForCourse(String courseId) {
    return _courseCompletedLessons[courseId]?.length ?? 0;
  }

  double getCourseProgress(String courseId, {int totalLessons = 12}) {
    final count = _courseCompletedLessons[courseId]?.length ?? 0;
    return (count / (totalLessons > 0 ? totalLessons : 12)).clamp(0.0, 1.0);
  }

  void markLessonCompleted(int lessonNumber, {String? courseId, int totalLessons = 12}) {
    final String targetId = (courseId != null && courseId.isNotEmpty)
        ? courseId
        : (_courses.isNotEmpty ? _courses.first.id : 'c3');

    if (!_courseCompletedLessons.containsKey(targetId)) {
      _courseCompletedLessons[targetId] = <int>{};
    }
    _courseCompletedLessons[targetId]!.add(lessonNumber);

    final int completedCount = _courseCompletedLessons[targetId]!.length;
    final double newProgress = (completedCount / totalLessons).clamp(0.0, 1.0);

    _courses = _courses.map((c) {
      if (c.id == targetId) {
        return c.copyWith(
          progress: newProgress,
          isCompleted: newProgress >= 1.0,
        );
      }
      return c;
    }).toList();

    addRewardCoins(20);
    notifyListeners();
  }

  void toggleEnrollCourse(String courseId) {
    _courses = _courses.map((c) {
      if (c.id == courseId) {
        return c.copyWith(isEnrolled: !c.isEnrolled);
      }
      return c;
    }).toList();
    notifyListeners();
  }
}
