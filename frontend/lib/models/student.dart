class Student {
  final String id;
  final String name;
  final String rollNumber;
  final String phone;
  final String avatarUrl;
  final int coins;
  final List<String> enrolledCourseIds;
  final String classStandard;
  final String section;
  final String gender;
  final String medium;
  final String stream;
  final String? group;
  final String schoolName;
  final int xp;
  final int streakDays;
  final int attendancePercentage;
  final int academicScore;
  final String? schoolId;
  final String? studentId;
  final String? token;

  const Student({
    required this.id,
    required this.name,
    this.rollNumber = '',
    this.phone = '',
    required this.avatarUrl,
    required this.coins,
    required this.enrolledCourseIds,
    this.classStandard = '6th Standard',
    this.section = 'A',
    this.gender = 'male',
    this.medium = 'English Medium',
    this.stream = 'General',
    this.group,
    this.schoolName = 'Government Higher Secondary School',
    this.xp = 2450,
    this.streakDays = 12,
    this.attendancePercentage = 92,
    this.academicScore = 84,
    this.schoolId = 'd9962dbb-f572-47a4-8240-6eef99b5c5bb',
    this.studentId,
    this.token,
  });

  String get grade => classStandard.replaceAll(RegExp(r'\D'), '');
  String get classSection => section.isNotEmpty ? '$classStandard - $section' : classStandard;
  String get effectiveGroup => (group != null && group!.trim().isNotEmpty) ? group!.trim() : stream.trim();

  String get displayClassAndSection {
    String formattedClass = classStandard;
    if (!formattedClass.toLowerCase().contains('standard') && !formattedClass.toLowerCase().contains('th') && !formattedClass.toLowerCase().contains('st') && !formattedClass.toLowerCase().contains('nd') && !formattedClass.toLowerCase().contains('rd')) {
      final numVal = int.tryParse(formattedClass);
      if (numVal != null) {
        final suffix = (numVal == 1) ? 'st' : (numVal == 2) ? 'nd' : (numVal == 3) ? 'rd' : 'th';
        formattedClass = '$numVal$suffix Standard';
      }
    } else if (!formattedClass.toLowerCase().contains('standard')) {
      formattedClass = '$formattedClass Standard';
    }

    if (section.isNotEmpty) {
      return '$formattedClass - $section Section';
    }
    return formattedClass;
  }

  Student copyWith({
    String? id,
    String? name,
    String? rollNumber,
    String? phone,
    String? avatarUrl,
    int? coins,
    List<String>? enrolledCourseIds,
    String? classStandard,
    String? section,
    String? gender,
    String? medium,
    String? stream,
    String? group,
    String? schoolName,
    int? xp,
    int? streakDays,
    int? attendancePercentage,
    int? academicScore,
    String? schoolId,
    String? studentId,
    String? token,
  }) {
    return Student(
      id: id ?? this.id,
      name: name ?? this.name,
      rollNumber: rollNumber ?? this.rollNumber,
      phone: phone ?? this.phone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      coins: coins ?? this.coins,
      enrolledCourseIds: enrolledCourseIds ?? this.enrolledCourseIds,
      classStandard: classStandard ?? this.classStandard,
      section: section ?? this.section,
      gender: gender ?? this.gender,
      medium: medium ?? this.medium,
      stream: stream ?? this.stream,
      group: group ?? this.group,
      schoolName: schoolName ?? this.schoolName,
      xp: xp ?? this.xp,
      streakDays: streakDays ?? this.streakDays,
      attendancePercentage: attendancePercentage ?? this.attendancePercentage,
      academicScore: academicScore ?? this.academicScore,
      schoolId: schoolId ?? this.schoolId,
      studentId: studentId ?? this.studentId,
      token: token ?? this.token,
    );
  }
}
