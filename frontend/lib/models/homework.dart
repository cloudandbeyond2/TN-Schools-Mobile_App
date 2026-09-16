class HomeworkItem {
  final String id;
  final String subject;
  final String className;
  final String title;
  final String teacherName;
  final String dueDate;
  final String priority;
  final bool isCompleted;
  final String status;
  final String description;
  final String fullBrief;
  final String? score;
  final String? feedback;
  final String? submittedFileName;
  final String? submittedDate;
  final String? submittedAnswer;
  final List<dynamic> submittedFiles;
  final String? subjectColor;

  const HomeworkItem({
    required this.id,
    required this.subject,
    this.className = '',
    required this.title,
    required this.teacherName,
    required this.dueDate,
    this.priority = 'Normal',
    this.isCompleted = false,
    this.status = 'not_submitted',
    this.description = '',
    this.fullBrief = '',
    this.score,
    this.feedback,
    this.submittedFileName,
    this.submittedDate,
    this.submittedAnswer,
    this.submittedFiles = const [],
    this.subjectColor,
  });

  factory HomeworkItem.fromJson(Map<String, dynamic> json) {
    final statusStr = json['status']?.toString() ?? 'not_submitted';
    final isDone = statusStr == 'submitted' ||
        statusStr == 'graded' ||
        statusStr == 'late_submission';

    String? firstFileName;
    final rawFiles = json['submittedFiles'];
    if (rawFiles is List && rawFiles.isNotEmpty) {
      if (rawFiles.first is Map) {
        firstFileName = rawFiles.first['name']?.toString() ??
            rawFiles.first['id']?.toString();
      } else {
        firstFileName = rawFiles.first.toString();
      }
    } else if (json['submittedFileName'] != null) {
      firstFileName = json['submittedFileName']?.toString();
    }

    final rawClass = json['classLabel']?.toString() ??
        json['className']?.toString() ??
        '';

    final rawDue = json['dueDate']?.toString() ??
        json['dueLabel']?.toString() ??
        'Upcoming';
    final cleanDue = rawDue.startsWith('Due:')
        ? rawDue.replaceFirst('Due:', '').trim()
        : rawDue;

    return HomeworkItem(
      id: json['id']?.toString() ?? '',
      subject: json['subject']?.toString() ?? 'General',
      className: rawClass,
      title: json['title']?.toString() ?? '',
      teacherName: json['teacher']?.toString() ??
          json['teacherName']?.toString() ??
          'Teacher',
      dueDate: cleanDue,
      priority: json['priority']?.toString() ?? 'Normal',
      isCompleted: isDone,
      status: statusStr,
      description: json['description']?.toString() ?? '',
      fullBrief: json['fullBrief']?.toString() ??
          json['description']?.toString() ??
          '',
      score: json['score']?.toString(),
      feedback: json['feedback']?.toString(),
      submittedFileName: firstFileName,
      submittedDate: json['submittedDate']?.toString(),
      submittedAnswer: json['submittedAnswer']?.toString(),
      submittedFiles: (rawFiles is List) ? rawFiles : const [],
      subjectColor: json['subjectColor']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subject': subject,
      'className': className,
      'title': title,
      'teacher': teacherName,
      'dueDate': dueDate,
      'priority': priority,
      'status': status,
      'description': description,
      'fullBrief': fullBrief,
      'score': score,
      'feedback': feedback,
      'submittedFileName': submittedFileName,
      'submittedDate': submittedDate,
      'submittedAnswer': submittedAnswer,
      'submittedFiles': submittedFiles,
      'subjectColor': subjectColor,
    };
  }

  HomeworkItem copyWith({
    String? id,
    String? subject,
    String? className,
    String? title,
    String? teacherName,
    String? dueDate,
    String? priority,
    bool? isCompleted,
    String? status,
    String? description,
    String? fullBrief,
    String? score,
    String? feedback,
    String? submittedFileName,
    String? submittedDate,
    String? submittedAnswer,
    List<dynamic>? submittedFiles,
    String? subjectColor,
  }) {
    return HomeworkItem(
      id: id ?? this.id,
      subject: subject ?? this.subject,
      className: className ?? this.className,
      title: title ?? this.title,
      teacherName: teacherName ?? this.teacherName,
      dueDate: dueDate ?? this.dueDate,
      priority: priority ?? this.priority,
      isCompleted: isCompleted ?? this.isCompleted,
      status: status ?? this.status,
      description: description ?? this.description,
      fullBrief: fullBrief ?? this.fullBrief,
      score: score ?? this.score,
      feedback: feedback ?? this.feedback,
      submittedFileName: submittedFileName ?? this.submittedFileName,
      submittedDate: submittedDate ?? this.submittedDate,
      submittedAnswer: submittedAnswer ?? this.submittedAnswer,
      submittedFiles: submittedFiles ?? this.submittedFiles,
      subjectColor: subjectColor ?? this.subjectColor,
    );
  }
}
