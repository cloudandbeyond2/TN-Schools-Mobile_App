import 'package:flutter/material.dart';

class Course {
  final String id;
  final String title;
  final String instructor;
  final String university;
  final String imagePath;
  final Color themeColor;
  final int lessons;
  final int videos;
  final int coins;
  final double rating;
  final int studentsCount;
  final double progress; // 0.0 to 1.0
  final String subject;
  final String description;
  final String level;
  final String duration;
  final bool isEnrolled;
  final bool isCompleted;
  final String courseType; // 'text' (Text-Based E-Book & Notes) or 'image' (Visual Diagrams & 3D Art)
  final String? pdfFileName;

  const Course({
    required this.id,
    required this.title,
    required this.instructor,
    this.university = 'Global Learning Institute',
    required this.imagePath,
    required this.themeColor,
    required this.lessons,
    this.videos = 12,
    required this.coins,
    required this.rating,
    this.studentsCount = 5600,
    this.progress = 0.0,
    required this.subject,
    required this.description,
    this.level = 'Beginner',
    this.duration = '2.5 hrs',
    this.isEnrolled = false,
    this.isCompleted = false,
    this.courseType = 'image',
    this.pdfFileName,
  });

  int get progressPercentage => (progress * 100).round();
  int get completedLessons => (progress * lessons).round();
  bool get isTextBased => courseType == 'text';
  bool get isImageBased => courseType == 'image';

  Course copyWith({
    String? id,
    String? title,
    String? instructor,
    String? university,
    String? imagePath,
    Color? themeColor,
    int? lessons,
    int? videos,
    int? coins,
    double? rating,
    int? studentsCount,
    double? progress,
    String? subject,
    String? description,
    String? level,
    String? duration,
    bool? isEnrolled,
    bool? isCompleted,
    String? courseType,
    String? pdfFileName,
  }) {
    return Course(
      id: id ?? this.id,
      title: title ?? this.title,
      instructor: instructor ?? this.instructor,
      university: university ?? this.university,
      imagePath: imagePath ?? this.imagePath,
      themeColor: themeColor ?? this.themeColor,
      lessons: lessons ?? this.lessons,
      videos: videos ?? this.videos,
      coins: coins ?? this.coins,
      rating: rating ?? this.rating,
      studentsCount: studentsCount ?? this.studentsCount,
      progress: progress ?? this.progress,
      subject: subject ?? this.subject,
      description: description ?? this.description,
      level: level ?? this.level,
      duration: duration ?? this.duration,
      isEnrolled: isEnrolled ?? this.isEnrolled,
      isCompleted: isCompleted ?? this.isCompleted,
      courseType: courseType ?? this.courseType,
      pdfFileName: pdfFileName ?? this.pdfFileName,
    );
  }
}
