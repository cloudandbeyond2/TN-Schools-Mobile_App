class MockQuestion {
  final String id;
  final String questionText;
  final List<String> options;
  final int correctAnswerIndex;

  const MockQuestion({
    required this.id,
    required this.questionText,
    required this.options,
    required this.correctAnswerIndex,
  });
}

class MockExam {
  final String id;
  final String title;
  final String subject;
  final int totalMarks;
  final int durationMinutes;
  final List<MockQuestion> questions;

  const MockExam({
    required this.id,
    required this.title,
    required this.subject,
    required this.totalMarks,
    required this.durationMinutes,
    required this.questions,
  });
}
