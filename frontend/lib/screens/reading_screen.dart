import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/course_service.dart';
import '../services/gemini_ai_service.dart';
import '../models/course.dart';
import '../models/lesson_content.dart';
import '../data/course_lessons_data.dart';
import '../widgets/math_visual_illustration.dart';
import '../widgets/bottom_nav_bar.dart';

class ReadingScreen extends StatefulWidget {
  const ReadingScreen({super.key});

  @override
  State<ReadingScreen> createState() => _ReadingScreenState();
}

class _ReadingScreenState extends State<ReadingScreen> {
  final ScrollController _stepperScrollController = ScrollController();
  final Map<int, List<LessonQuizQuestion>> _topicQuizCache = {};
  final Map<int, bool> _topicQuizLoading = {};

  @override
  void dispose() {
    _stepperScrollController.dispose();
    super.dispose();
  }

  void _scrollToCurrentStep(int stepIndex, int totalSteps) {
    if (_stepperScrollController.hasClients) {
      final double targetOffset = (stepIndex - 2).clamp(0, totalSteps - 1) * 44.0;
      _stepperScrollController.animateTo(
        targetOffset,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<List<LessonQuizQuestion>> _fetchTopicQuiz({
    required LessonContent lesson,
    required Course course,
    bool forceRefresh = false,
  }) async {
    final key = lesson.lessonNumber;
    if (!forceRefresh && _topicQuizCache.containsKey(key) && _topicQuizCache[key]!.isNotEmpty) {
      return _topicQuizCache[key]!;
    }

    _topicQuizLoading[key] = true;
    final theoryText = [
      lesson.introPrefix,
      lesson.highlightTerm1,
      lesson.highlightTerm2,
      lesson.introSuffix,
      ...lesson.rememberPoints,
      ...lesson.theorySections.map((s) => '${s.heading}: ${s.lines.join(" ")}'),
      ...lesson.keyFormulas,
      ...lesson.examples.map((e) => '${e.label}: ${e.content}'),
    ].where((t) => t.trim().isNotEmpty).join('\n');

    try {
      final generated = await GeminiAIService().generateTopicQuizQuestions(
        topicTitle: lesson.title,
        subject: course.subject,
        level: course.level,
        courseTitle: course.title,
        theoryContext: theoryText,
        questionCount: 2,
      );
      _topicQuizCache[key] = generated;
      _topicQuizLoading[key] = false;
      return generated;
    } catch (_) {
      _topicQuizLoading[key] = false;
      if (lesson.quizQuestions.isNotEmpty) {
        _topicQuizCache[key] = lesson.quizQuestions;
        return lesson.quizQuestions;
      }
      return [];
    }
  }

  void _showCheckpointQuiz(
    BuildContext context,
    LessonContent lesson,
    CourseService courseService,
    Course course,
    int totalPages,
  ) {
    int currentQIndex = 0;
    int? selectedOption;
    bool isSubmitted = false;
    bool isQuizCompleted = false;
    bool isLoading = false;
    List<LessonQuizQuestion> questions = _topicQuizCache[lesson.lessonNumber] ?? [];

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            // Auto-fetch if not yet cached
            if (questions.isEmpty && !isLoading) {
              isLoading = true;
              _fetchTopicQuiz(lesson: lesson, course: course).then((loaded) {
                if (dialogCtx.mounted) {
                  setModalState(() {
                    questions = loaded;
                    isLoading = false;
                  });
                }
              });
            }

            if (isLoading || questions.isEmpty) {
              return Dialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: const Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            color: Color(0xFF2563EB),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.auto_awesome_rounded, color: Color(0xFF2563EB), size: 18),
                          SizedBox(width: 6),
                          Text(
                            'AI Generating Topic Quiz...',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Generating tailored checkpoint questions for "${lesson.title}"',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: Color(0xFF64748B),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            final q = questions[currentQIndex];
            final bool isLastQuestion = currentQIndex == questions.length - 1;

            if (isQuizCompleted) {
              return Dialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Trophy / Success badge
                      Container(
                        width: 72,
                        height: 72,
                        decoration: const BoxDecoration(
                          color: Color(0xFFDCFCE7),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.check_circle_rounded,
                            color: Color(0xFF16A34A),
                            size: 48,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Topic ${lesson.lessonNumber} Mastered!',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                          fontFamily: 'Outfit',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'You answered both checkpoint questions correctly! Lesson is now marked as Completed.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                          fontFamily: 'Outfit',
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Reward Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.monetization_on_rounded, color: Color(0xFFD97706), size: 20),
                            SizedBox(width: 6),
                            Text(
                              '+20 Knowledge Coins Earned!',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFB45309),
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),

                      // Continue Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(dialogCtx).pop();
                            courseService.markLessonCompleted(
                              lesson.lessonNumber,
                              courseId: course.id,
                              totalLessons: totalPages,
                            );
                            if (courseService.currentReadingPage < totalPages) {
                              courseService.nextPage();
                              _scrollToCurrentStep(courseService.currentReadingPage - 1, totalPages);
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Row(
                                    children: [
                                      Icon(Icons.celebration_rounded, color: Colors.amber, size: 22),
                                      SizedBox(width: 10),
                                      Expanded(
                                        child: Text('🎉 Congratulations! Course completed successfully.'),
                                      ),
                                    ],
                                  ),
                                  backgroundColor: const Color(0xFF047857),
                                  behavior: SnackBarBehavior.floating,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              );
                              Navigator.of(context).pop();
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 0,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                courseService.currentReadingPage < totalPages
                                    ? 'Proceed to Next Lesson →'
                                    : 'Finish Chapter 🎉',
                                style: const TextStyle(
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.bold,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            return Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.auto_awesome_rounded, size: 12, color: Color(0xFF1D4ED8)),
                              const SizedBox(width: 4),
                              Text(
                                'QUESTION ${currentQIndex + 1} OF ${questions.length}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF1D4ED8),
                                  fontFamily: 'Outfit',
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              tooltip: 'Regenerate AI Questions',
                              icon: const Icon(Icons.refresh_rounded, color: Color(0xFF2563EB), size: 20),
                              onPressed: () {
                                setModalState(() {
                                  isLoading = true;
                                  currentQIndex = 0;
                                  selectedOption = null;
                                  isSubmitted = false;
                                });
                                _fetchTopicQuiz(lesson: lesson, course: course, forceRefresh: true).then((loaded) {
                                  if (dialogCtx.mounted) {
                                    setModalState(() {
                                      questions = loaded;
                                      isLoading = false;
                                    });
                                  }
                                });
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, color: Color(0xFF94A3B8), size: 20),
                              onPressed: () => Navigator.of(dialogCtx).pop(),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Title
                    const Text(
                      'Checkpoint Quiz',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                        fontFamily: 'Outfit',
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Answer correctly to complete this lesson and unlock the next topic.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                        fontFamily: 'Outfit',
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Question Box
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Text(
                        q.question,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E293B),
                          fontFamily: 'Outfit',
                          height: 1.35,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Options List
                    ...q.options.asMap().entries.map((entry) {
                      final int optIdx = entry.key;
                      final String optText = entry.value;
                      final bool isChosen = selectedOption == optIdx;
                      final bool isCorrect = optIdx == q.correctAnswerIndex;

                      Color bg = Colors.white;
                      Color border = const Color(0xFFE2E8F0);
                      Color textColor = const Color(0xFF1E293B);
                      Widget? trailingIcon;

                      if (isSubmitted) {
                        if (isCorrect) {
                          bg = const Color(0xFFDCFCE7);
                          border = const Color(0xFF22C55E);
                          textColor = const Color(0xFF15803D);
                          trailingIcon = const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 18);
                        } else if (isChosen) {
                          bg = const Color(0xFFFEE2E2);
                          border = const Color(0xFFEF4444);
                          textColor = const Color(0xFFB91C1C);
                          trailingIcon = const Icon(Icons.cancel_rounded, color: Color(0xFFDC2626), size: 18);
                        }
                      } else if (isChosen) {
                        bg = const Color(0xFFEFF6FF);
                        border = const Color(0xFF2563EB);
                        textColor = const Color(0xFF1D4ED8);
                      }

                      final optionLabels = ['A', 'B', 'C', 'D'];
                      final optLetter = optIdx < optionLabels.length ? optionLabels[optIdx] : '${optIdx + 1}';

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () {
                              setModalState(() {
                                selectedOption = optIdx;
                                isSubmitted = true;
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: bg,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: border, width: isChosen ? 1.8 : 1.2),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 26,
                                    height: 26,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isChosen ? border : const Color(0xFFF1F5F9),
                                    ),
                                    child: Center(
                                      child: Text(
                                        optLetter,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: isChosen ? Colors.white : const Color(0xFF64748B),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      optText,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: isChosen ? FontWeight.bold : FontWeight.w500,
                                        color: textColor,
                                        fontFamily: 'Outfit',
                                      ),
                                    ),
                                  ),
                                  ?trailingIcon,
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }),

                    // Feedback Explanation
                    if (isSubmitted) ...[
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: selectedOption == q.correctAnswerIndex
                              ? const Color(0xFFF0FDF4)
                              : const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: selectedOption == q.correctAnswerIndex
                                ? const Color(0xFF86EFAC)
                                : const Color(0xFFFECACA),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              selectedOption == q.correctAnswerIndex
                                  ? Icons.check_circle_outline_rounded
                                  : Icons.info_outline_rounded,
                              size: 16,
                              color: selectedOption == q.correctAnswerIndex
                                  ? const Color(0xFF16A34A)
                                  : const Color(0xFFDC2626),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                selectedOption == q.correctAnswerIndex
                                    ? '✓ Correct! ${q.explanation}'
                                    : '✗ Incorrect. Tap the correct option above to continue!',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: selectedOption == q.correctAnswerIndex
                                      ? const Color(0xFF166534)
                                      : const Color(0xFF991B1B),
                                  fontWeight: FontWeight.w600,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),

                    // Next / Action Button
                    if (isSubmitted && selectedOption == q.correctAnswerIndex)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            if (!isLastQuestion) {
                              setModalState(() {
                                currentQIndex++;
                                selectedOption = null;
                                isSubmitted = false;
                              });
                            } else {
                              setModalState(() {
                                isQuizCompleted = true;
                              });
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 0,
                          ),
                          child: Text(
                            !isLastQuestion ? 'Next Question →' : 'Complete & Unlock Next Topic 🎉',
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final courseService = Provider.of<CourseService>(context);
    final dynamic args = ModalRoute.of(context)?.settings.arguments;
    Course course;
    if (args is Course) {
      course = args;
    } else if (args is String && args.isNotEmpty) {
      course = courseService.courses.firstWhere(
        (c) => c.id == args || c.title == args,
        orElse: () => courseService.courses.first,
      );
    } else {
      course = courseService.courses.first;
    }

    final List<LessonContent> lessons = CourseLessonsData.getLessonsForCourse(course);
    final String screenTitle = course.title;
    final int totalPages = lessons.length;
    final int currentPage = courseService.currentReadingPage.clamp(1, totalPages > 0 ? totalPages : 1);
    final String subLower = '${course.subject} ${course.title}'.toLowerCase();
    final bool isCustomCourse = CourseLessonsData.hasCustomLessons(course.id);
    final bool isMath = !isCustomCourse && (subLower.contains('math') || subLower.contains('கணிதம்'));

    // Retrieve active lesson safely
    final currentLessonIndex = (currentPage - 1).clamp(0, lessons.isNotEmpty ? lessons.length - 1 : 0);
    final lesson = lessons.isNotEmpty ? lessons[currentLessonIndex] : CourseLessonsData.mathLessons.first;
    final int completedCount = lessons.where((l) => courseService.isLessonCompleted(l.lessonNumber, courseId: course.id)).length;
    final double progressFraction = (completedCount / (totalPages > 0 ? totalPages : 1)).clamp(0.0, 1.0);
    final int progressPercentage = (progressFraction * 100).toInt();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(68),
        child: AppBar(
          backgroundColor: const Color(0xFF0066D6), // Vibrant royal blue
          elevation: 0,
          systemOverlayStyle: const SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.light,
            statusBarBrightness: Brightness.dark,
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white, size: 24),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                screenTitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Outfit',
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Lesson $currentPage of $totalPages • Detailed Theory',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.88),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w400,
                  fontFamily: 'Outfit',
                ),
              ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Center(
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: progressFraction,
                        strokeWidth: 3.5,
                        backgroundColor: Colors.white.withValues(alpha: 0.25),
                        valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                      Text(
                        '$progressPercentage%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Horizontal Step / Stepper Indicator (1 to 12)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              child: SizedBox(
                height: 38,
                child: ListView.builder(
                  controller: _stepperScrollController,
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: totalPages,
                  itemBuilder: (context, index) {
                    final stepNumber = index + 1;
                    final isCompleted = courseService.isLessonCompleted(stepNumber, courseId: course.id);
                    final isCurrent = stepNumber == currentPage;
                    final isLast = stepNumber == totalPages;

                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Circle Indicator
                        GestureDetector(
                          onTap: () {
                            courseService.setReadingPage(stepNumber);
                            _scrollToCurrentStep(index, totalPages);
                          },
                          child: Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isCompleted
                                  ? const Color(0xFF22C55E) // Completed green
                                  : isCurrent
                                      ? const Color(0xFF0066D6) // Current active blue
                                      : Colors.white, // Future step
                              border: Border.all(
                                color: isCompleted
                                    ? const Color(0xFF22C55E)
                                    : isCurrent
                                        ? const Color(0xFF0066D6)
                                        : const Color(0xFFE2E8F0),
                                width: 1.5,
                              ),
                              boxShadow: isCurrent
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFF0066D6)
                                            .withValues(alpha: 0.35),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      )
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: isCompleted
                                  ? const Icon(
                                      Icons.check,
                                      color: Colors.white,
                                      size: 16,
                                    )
                                  : Text(
                                      '$stepNumber',
                                      style: TextStyle(
                                        color: isCurrent
                                            ? Colors.white
                                            : const Color(0xFF94A3B8),
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        fontFamily: 'Outfit',
                                      ),
                                    ),
                            ),
                          ),
                        ),

                        // Connecting Line
                        if (!isLast)
                          Container(
                            width: 18,
                            height: 2.5,
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            decoration: BoxDecoration(
                              color: isCompleted
                                  ? const Color(0xFF22C55E)
                                  : const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ),

            const Divider(height: 1, color: Color(0xFFE2E8F0)),

            // Scrollable Lesson Content with 20+ Lines Theory
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Topic Heading & Mascot Header
                    _buildTopicHeader(lesson, isMath: isMath, subject: course.subject),
                    const SizedBox(height: 18),

                    // 1. Math Visual Comparison Badges (ONLY FOR MATH COURSES!)
                    if (isMath) ...[
                      MathTheoryCard(
                        leftBadgeText: lesson.leftBadge,
                        leftDescription: lesson.leftDescription,
                        rightBadgeText: lesson.rightBadge,
                        rightDescription: lesson.rightDescription,
                      ),
                      const SizedBox(height: 20),
                    ] else if (lesson.leftBadge.isNotEmpty || lesson.rightBadge.isNotEmpty) ...[
                      _buildSubjectKeyPointsCard(lesson, course),
                      const SizedBox(height: 20),
                    ],

                    // 2. Comprehensive 20+ Line Theory Section
                    _buildComprehensiveTheorySection(lesson),
                    const SizedBox(height: 20),

                    // 3. Key Formulas & Notations Card
                    if (lesson.keyFormulas.isNotEmpty) ...[
                      _buildKeyFormulasCard(lesson),
                      const SizedBox(height: 20),
                    ],

                    // 4. Worked Examples Card
                    _buildWorkedExamplesCard(lesson),
                    const SizedBox(height: 18),

                    // 5. Interactive Think & Apply Question (For Math courses)
                    if (isMath) ...[
                      MathThinkCard(
                        onHintTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                lesson.thinkHint,
                                style: const TextStyle(fontFamily: 'Outfit', fontSize: 13),
                              ),
                              backgroundColor: const Color(0xFF1D4ED8),
                              behavior: SnackBarBehavior.floating,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                    ],
                  ],
                ),
              ),
            ),

            // Bottom Navigation Footer (← Previous   Next Quiz & Unlock →)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Previous Button
                  Expanded(
                    child: OutlinedButton(
                      onPressed: currentPage > 1
                          ? () {
                              courseService.previousPage();
                              _scrollToCurrentStep(currentPage - 2, totalPages);
                            }
                          : null,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        side: BorderSide(
                          color: currentPage > 1
                              ? const Color(0xFF2563EB)
                              : const Color(0xFFCBD5E1),
                          width: 1.5,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.arrow_back_rounded,
                            size: 16,
                            color: currentPage > 1
                                ? const Color(0xFF2563EB)
                                : const Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Previous',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: currentPage > 1
                                  ? const Color(0xFF2563EB)
                                  : const Color(0xFF94A3B8),
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Next / Checkpoint Quiz Button
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        // Launch interactive 2-question checkpoint quiz to complete lesson & advance
                        _showCheckpointQuiz(context, lesson, courseService, course, totalPages);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            currentPage < totalPages ? 'Quiz & Next' : 'Quiz & Finish',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(
                            Icons.quiz_rounded,
                            size: 16,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const CustomBottomNavBar(currentIndex: 2),
    );
  }

  // --- 1. TOPIC HEADER ---
  Widget _buildTopicHeader(LessonContent lesson, {required bool isMath, required String subject}) {
    String bubble = '✨ Read';
    final s = subject.toLowerCase();
    if (s.contains('tamil') || s.contains('தமிழ்')) {
      bubble = 'தமிழ் ✨';
    } else if (s.contains('english')) {
      bubble = '📖 Read';
    } else if (s.contains('science')) {
      bubble = '🔬 Idea';
    } else if (s.contains('social')) {
      bubble = '🏛️ Learn';
    } else if (isMath) {
      bubble = '2 × 3 = 6';
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left: Title & Intro
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Text(
                  'TOPIC ${lesson.lessonNumber}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1D4ED8),
                    fontFamily: 'Outfit',
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                lesson.title,
                style: const TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                  fontFamily: 'Outfit',
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              RichText(
                text: TextSpan(
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF475569),
                    height: 1.45,
                    fontFamily: 'Outfit',
                  ),
                  children: [
                    TextSpan(text: lesson.introPrefix),
                    TextSpan(
                      text: lesson.highlightTerm1,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1D4ED8),
                      ),
                    ),
                    const TextSpan(text: ' and '),
                    TextSpan(
                      text: lesson.highlightTerm2,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF16A34A),
                      ),
                    ),
                    TextSpan(text: lesson.introSuffix),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),

        // Right: Mascot Illustration with contextual speech bubble
        StudentStudyMascotWidget(bubbleText: bubble),
      ],
    );
  }

  // --- CLEAN SUBJECT KEY POINTS CARD (NON-MATH SUBJECTS) ---
  Widget _buildSubjectKeyPointsCard(LessonContent lesson, Course course) {
    final sub = course.subject.toLowerCase();
    Color primaryCol = const Color(0xFF0284C7);
    Color secondaryCol = const Color(0xFF16A34A);
    IconData leftIcon = Icons.menu_book_rounded;
    IconData rightIcon = Icons.auto_awesome_rounded;

    if (sub.contains('tamil') || sub.contains('தமிழ்')) {
      primaryCol = const Color(0xFF059669);
      secondaryCol = const Color(0xFFD97706);
      leftIcon = Icons.history_edu_rounded;
      rightIcon = Icons.star_rounded;
    } else if (sub.contains('english')) {
      primaryCol = const Color(0xFF7C3AED);
      secondaryCol = const Color(0xFF2563EB);
      leftIcon = Icons.translate_rounded;
      rightIcon = Icons.psychology_rounded;
    } else if (sub.contains('science')) {
      primaryCol = const Color(0xFF0284C7);
      secondaryCol = const Color(0xFF16A34A);
      leftIcon = Icons.science_rounded;
      rightIcon = Icons.eco_rounded;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.025),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: primaryCol.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.lightbulb_outline_rounded, size: 14, color: primaryCol),
                    const SizedBox(width: 4),
                    Text(
                      'KEY HIGHLIGHTS',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                        color: primaryCol,
                        fontFamily: 'Outfit',
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left Badge
              if (lesson.leftBadge.isNotEmpty)
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: primaryCol.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: primaryCol.withValues(alpha: 0.15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(leftIcon, size: 16, color: primaryCol),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                lesson.leftBadge,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: primaryCol,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (lesson.leftDescription.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            lesson.leftDescription,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF475569),
                              height: 1.35,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),

              if (lesson.leftBadge.isNotEmpty && lesson.rightBadge.isNotEmpty)
                const SizedBox(width: 10),

              // Right Badge
              if (lesson.rightBadge.isNotEmpty)
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: secondaryCol.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: secondaryCol.withValues(alpha: 0.15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(rightIcon, size: 16, color: secondaryCol),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                lesson.rightBadge,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: secondaryCol,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (lesson.rightDescription.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            lesson.rightDescription,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF475569),
                              height: 1.35,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // --- 2. COMPREHENSIVE 20+ LINE THEORY CARD ---
  Widget _buildComprehensiveTheorySection(LessonContent lesson) {
    int totalTheoryLines = 0;
    for (var s in lesson.theorySections) {
      totalTheoryLines += s.lines.length;
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Theory Header Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.vertical(top: Radius.circular(19)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.menu_book_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'COURSE THEORY & CONCEPTS',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.6,
                          fontFamily: 'Outfit',
                        ),
                      ),
                      Text(
                        'Comprehensive Lesson Notes • $totalTheoryLines Detailed Lines',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle_rounded, color: Colors.white, size: 12),
                      SizedBox(width: 4),
                      Text(
                        '20+ Lines',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Theory Content Blocks
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: lesson.theorySections.asMap().entries.map((entry) {
                final int idx = entry.key;
                final TheorySection section = entry.value;

                return Padding(
                  padding: EdgeInsets.only(bottom: idx < lesson.theorySections.length - 1 ? 16 : 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Section Heading
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Color(0xFF2563EB),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                section.heading,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Section Lines
                      ...section.lines.map((lineText) {
                        final trimmed = lineText.trim();
                        final bool hasBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
                        final String cleanText = hasBullet ? trimmed.substring(1).trim() : trimmed;

                        return Padding(
                          padding: const EdgeInsets.only(left: 6, bottom: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '• ',
                                style: TextStyle(
                                  color: const Color(0xFF2563EB).withValues(alpha: 0.7),
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  cleanText,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    color: Color(0xFF334155),
                                    height: 1.45,
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  // --- 3. KEY FORMULAS CARD ---
  Widget _buildKeyFormulasCard(LessonContent lesson) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFBBF7D0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF16A34A),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.calculate_rounded, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 10),
                const Text(
                  'KEY FORMULAS & IDENTITIES',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF166534),
                    fontFamily: 'Outfit',
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...lesson.keyFormulas.map((formula) {
              return Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF86EFAC)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.star_rounded, color: Color(0xFF16A34A), size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        formula,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1E293B),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  // --- 4. WORKED EXAMPLES CARD ---
  Widget _buildWorkedExamplesCard(LessonContent lesson) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF7C3AED), // Vibrant purple
              borderRadius: BorderRadius.vertical(top: Radius.circular(19)),
            ),
            child: Row(
              children: [
                const Icon(Icons.assignment_turned_in_rounded, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Text(
                  lesson.exampleTitle.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.6,
                    fontFamily: 'Outfit',
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: lesson.examples.asMap().entries.map((entry) {
                final ex = entry.value;
                final isLast = entry.key == lesson.examples.length - 1;

                return Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: ex.isPrimary ? const Color(0xFFEFF6FF) : const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: ex.isPrimary ? const Color(0xFF93C5FD) : const Color(0xFF86EFAC),
                            ),
                          ),
                          child: Text(
                            ex.label,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: ex.isPrimary ? const Color(0xFF1D4ED8) : const Color(0xFF15803D),
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            ex.content,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: Color(0xFF1E293B),
                              fontWeight: FontWeight.w500,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (!isLast)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 10),
                        child: Divider(color: Color(0xFFF1F5F9), height: 1),
                      ),
                  ],
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
