class LessonContent {
  final int lessonNumber;
  final String title;
  final String introPrefix;
  final String highlightTerm1;
  final String highlightTerm2;
  final String introSuffix;
  final String leftBadge;
  final String leftDescription;
  final String rightBadge;
  final String rightDescription;
  final String exampleTitle;
  final List<ExampleBullet> examples;
  final String rememberTitle;
  final List<String> rememberPoints;
  final List<TheorySection> theorySections;
  final List<String> keyFormulas;
  final String thinkQuestion;
  final String thinkHint;
  final List<LessonQuizQuestion> quizQuestions;

  const LessonContent({
    required this.lessonNumber,
    required this.title,
    required this.introPrefix,
    required this.highlightTerm1,
    required this.highlightTerm2,
    required this.introSuffix,
    required this.leftBadge,
    required this.leftDescription,
    required this.rightBadge,
    required this.rightDescription,
    required this.exampleTitle,
    required this.examples,
    required this.rememberTitle,
    required this.rememberPoints,
    this.theorySections = const [],
    this.keyFormulas = const [],
    this.thinkQuestion = 'Is 36 divisible by 12? What does this tell us?',
    this.thinkHint = '💡 Yes! 36 ÷ 12 = 3 with remainder 0, so 12 is a factor of 36.',
    this.quizQuestions = const [],
  });
}

class LessonQuizQuestion {
  final String question;
  final List<String> options;
  final int correctAnswerIndex;
  final String explanation;

  const LessonQuizQuestion({
    required this.question,
    required this.options,
    required this.correctAnswerIndex,
    required this.explanation,
  });
}

class TheorySection {
  final String heading;
  final List<String> lines;
  final String? icon;

  const TheorySection({
    required this.heading,
    required this.lines,
    this.icon,
  });
}

class ExampleBullet {
  final String label;
  final String content;
  final bool isPrimary; // true: blue, false: green

  const ExampleBullet({
    required this.label,
    required this.content,
    this.isPrimary = true,
  });
}
