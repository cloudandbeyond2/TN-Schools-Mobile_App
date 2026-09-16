import 'package:flutter/material.dart';

/// Mini Wavy Sparkline Painter for KPI Cards
class WavySparklinePainter extends CustomPainter {
  final Color color;

  WavySparklinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round;

    final w = size.width;
    final h = size.height;

    final path = Path()
      ..moveTo(0, h * 0.7)
      ..quadraticBezierTo(w * 0.25, h * 0.2, w * 0.5, h * 0.6)
      ..quadraticBezierTo(w * 0.75, h * 0.9, w * 0.9, h * 0.3)
      ..lineTo(w, h * 0.4);

    canvas.drawPath(path, paint);
    canvas.drawCircle(Offset(w, h * 0.4), 2.5, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D AIRobotMascotPainter drawing the exact robot with green ear pads, visor face, and pointing hand
class AIRobotMascotPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final shadowCenter = Offset(w * 0.55, h * 0.92);
    canvas.drawOval(
      Rect.fromCenter(center: shadowCenter, width: w * 0.6, height: h * 0.12),
      Paint()
        ..color = const Color(0xFF047857).withOpacity(0.3)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );

    final earPaint = Paint()..color = const Color(0xFF10B981);
    canvas.drawCircle(Offset(w * 0.22, h * 0.35), w * 0.14, earPaint);
    canvas.drawCircle(Offset(w * 0.88, h * 0.35), w * 0.14, earPaint);

    final headCenter = Offset(w * 0.55, h * 0.35);
    final headRadius = w * 0.36;
    canvas.drawCircle(headCenter, headRadius, Paint()..color = Colors.white);
    canvas.drawCircle(
      headCenter,
      headRadius,
      Paint()
        ..color = const Color(0xFFE2E8F0).withOpacity(0.5)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );

    final visorRect = RRect.fromLTRBR(
      w * 0.28, h * 0.22, w * 0.82, h * 0.48, const Radius.circular(16),
    );
    canvas.drawRRect(visorRect, Paint()..color = const Color(0xFF0F172A));

    final eyePaint = Paint()
      ..color = const Color(0xFF10B981)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2
      ..strokeCap = StrokeCap.round;

    final leftEye = Path()
      ..moveTo(w * 0.38, h * 0.36)
      ..lineTo(w * 0.44, h * 0.30)
      ..lineTo(w * 0.50, h * 0.36);
    canvas.drawPath(leftEye, eyePaint);

    final rightEye = Path()
      ..moveTo(w * 0.60, h * 0.36)
      ..lineTo(w * 0.66, h * 0.30)
      ..lineTo(w * 0.72, h * 0.36);
    canvas.drawPath(rightEye, eyePaint);

    final mouth = Path()
      ..moveTo(w * 0.48, h * 0.41)
      ..quadraticBezierTo(w * 0.55, h * 0.46, w * 0.62, h * 0.41);
    canvas.drawPath(mouth, eyePaint);

    canvas.drawRRect(
      RRect.fromLTRBR(w * 0.38, h * 0.60, w * 0.72, h * 0.66, const Radius.circular(4)),
      Paint()..color = const Color(0xFF10B981),
    );

    final bodyRect = RRect.fromLTRBR(
      w * 0.32, h * 0.64, w * 0.78, h * 0.88, const Radius.circular(22),
    );
    canvas.drawRRect(bodyRect, Paint()..color = Colors.white);

    final armPaint = Paint()
      ..color = const Color(0xFF1E293B)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round;

    final armPath = Path()
      ..moveTo(w * 0.35, h * 0.68)
      ..lineTo(w * 0.18, h * 0.56)
      ..lineTo(w * 0.12, h * 0.45);
    canvas.drawPath(armPath, armPaint);
    canvas.drawCircle(Offset(w * 0.12, h * 0.43), 4, Paint()..color = const Color(0xFF1E293B));

    final leftArm = Path()
      ..moveTo(w * 0.75, h * 0.68)
      ..quadraticBezierTo(w * 0.86, h * 0.75, w * 0.82, h * 0.84);
    canvas.drawPath(leftArm, armPaint);
    canvas.drawCircle(Offset(w * 0.82, h * 0.84), 4, Paint()..color = const Color(0xFF1E293B));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Pixar-Style Quiz Banner Student Mascot Painter with face features, 3D shading, and glowing ?
class QuizStudentMascotPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Background Yellow Sparkle Star ✦ (Center left near plant)
    final starCenter = Offset(w * 0.22, h * 0.55);
    final starPath = Path()
      ..moveTo(starCenter.dx, starCenter.dy - 12)
      ..quadraticBezierTo(starCenter.dx, starCenter.dy, starCenter.dx + 12, starCenter.dy)
      ..quadraticBezierTo(starCenter.dx, starCenter.dy, starCenter.dx, starCenter.dy + 12)
      ..quadraticBezierTo(starCenter.dx, starCenter.dy, starCenter.dx - 12, starCenter.dy)
      ..quadraticBezierTo(starCenter.dx, starCenter.dy, starCenter.dx, starCenter.dy - 12)
      ..close();
    canvas.drawPath(starPath, Paint()..color = const Color(0xFFFACC15));

    // 2. Floating Glowing Yellow 3D Question Mark (?) Aura Glow
    final qCenter = Offset(w * 0.76, h * 0.24);
    canvas.drawCircle(
      qCenter,
      36,
      Paint()
        ..color = const Color(0xFFFDE047).withOpacity(0.5)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 16),
    );

    // 3D Question Mark (?) Text Render
    final qPainter = TextPainter(
      text: const TextSpan(
        text: '?',
        style: TextStyle(
          fontSize: 52,
          fontWeight: FontWeight.w900,
          color: Color(0xFFFDE047),
          fontFamily: 'Outfit',
          shadows: [
            Shadow(color: Color(0xFFB45309), offset: Offset(3, 4), blurRadius: 6),
          ],
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    qPainter.paint(canvas, Offset(w * 0.68, h * 0.01));

    // 3. Wooden Desk Top Edge with 3D gradient
    final deskRect = RRect.fromLTRBR(w * 0.05, h * 0.84, w * 0.98, h * 0.96, const Radius.circular(8));
    final deskPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFF59E0B), Color(0xFFD97706), Color(0xFFB45309)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(deskRect.outerRect);
    canvas.drawRRect(deskRect, deskPaint);

    // 4. Potted Green Plant (3 Leaves in Terra Cotta Pot)
    final potPath = Path()
      ..moveTo(w * 0.12, h * 0.74)
      ..lineTo(w * 0.22, h * 0.74)
      ..lineTo(w * 0.20, h * 0.84)
      ..lineTo(w * 0.14, h * 0.84)
      ..close();
    canvas.drawPath(potPath, Paint()..color = const Color(0xFFC2410C));

    // 3 Green Leaves with glossy highlights
    canvas.drawCircle(Offset(w * 0.14, h * 0.68), 6, Paint()..color = const Color(0xFF34D399));
    canvas.drawCircle(Offset(w * 0.20, h * 0.68), 6, Paint()..color = const Color(0xFF10B981));
    canvas.drawCircle(Offset(w * 0.17, h * 0.62), 7, Paint()..color = const Color(0xFF047857));

    // 5. Open Book lying flat on desk
    final bookLeft = Path()
      ..moveTo(w * 0.28, h * 0.84)
      ..quadraticBezierTo(w * 0.38, h * 0.78, w * 0.46, h * 0.84)
      ..lineTo(w * 0.46, h * 0.92)
      ..lineTo(w * 0.28, h * 0.92)
      ..close();
    canvas.drawPath(bookLeft, Paint()..color = Colors.white);

    final bookRight = Path()
      ..moveTo(w * 0.46, h * 0.84)
      ..quadraticBezierTo(w * 0.54, h * 0.78, w * 0.64, h * 0.84)
      ..lineTo(w * 0.64, h * 0.92)
      ..lineTo(w * 0.46, h * 0.92)
      ..close();
    canvas.drawPath(bookRight, Paint()..color = const Color(0xFFF1F5F9));

    // 6. Stack of 4 Colorful Books on Right Desk with 3D gradient fills
    canvas.drawRRect(RRect.fromLTRBR(w * 0.72, h * 0.78, w * 0.94, h * 0.84, const Radius.circular(3)), Paint()..color = const Color(0xFFF59E0B));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.74, h * 0.71, w * 0.92, h * 0.77, const Radius.circular(3)), Paint()..color = const Color(0xFFEF4444));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.73, h * 0.64, w * 0.93, h * 0.70, const Radius.circular(3)), Paint()..color = const Color(0xFF3B82F6));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.75, h * 0.57, w * 0.91, h * 0.63, const Radius.circular(3)), Paint()..color = Colors.white);

    // 7. Student Body (3D Green Hoodie with gradient)
    final bodyRect = RRect.fromLTRBR(w * 0.38, h * 0.46, w * 0.66, h * 0.84, const Radius.circular(18));
    final bodyPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF10B981), Color(0xFF047857), Color(0xFF064E3B)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(bodyRect.outerRect);
    canvas.drawRRect(bodyRect, bodyPaint);

    // Green Hoodie Collar Ring
    final collarPath = Path()
      ..moveTo(w * 0.42, h * 0.48)
      ..quadraticBezierTo(w * 0.52, h * 0.54, w * 0.62, h * 0.48);
    canvas.drawPath(collarPath, Paint()..color = const Color(0xFF34D399)..style = PaintingStyle.stroke..strokeWidth = 4);

    // 8. Student Head (3D Skin Tone Sphere with Radial Gradient)
    final headCenter = Offset(w * 0.52, h * 0.32);
    final skinPaint = Paint()
      ..shader = const RadialGradient(
        colors: [Color(0xFFFFEDD5), Color(0xFFFED7AA), Color(0xFFFDBA74)],
        stops: [0.0, 0.7, 1.0],
      ).createShader(Rect.fromCircle(center: headCenter, radius: 24));
    canvas.drawCircle(headCenter, 24, skinPaint);
    // Ear on right
    canvas.drawCircle(Offset(w * 0.64, h * 0.34), 6, Paint()..color = const Color(0xFFFDBA74));

    // 9. Facial Features (3D Pixar Style)
    final eyePaint = Paint()..color = const Color(0xFF0F172A);
    canvas.drawOval(Rect.fromLTWH(w * 0.43, h * 0.28, 6.5, 8.5), eyePaint);
    canvas.drawCircle(Offset(w * 0.445, h * 0.295), 1.8, Paint()..color = Colors.white); // Reflection

    canvas.drawOval(Rect.fromLTWH(w * 0.54, h * 0.28, 6.5, 8.5), eyePaint);
    canvas.drawCircle(Offset(w * 0.555, h * 0.295), 1.8, Paint()..color = Colors.white); // Reflection

    // Eyebrows
    final browPaint = Paint()
      ..color = const Color(0xFF451A03)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;

    final leftBrow = Path()
      ..moveTo(w * 0.41, h * 0.25)
      ..quadraticBezierTo(w * 0.45, h * 0.22, w * 0.49, h * 0.25);
    canvas.drawPath(leftBrow, browPaint);

    final rightBrow = Path()
      ..moveTo(w * 0.52, h * 0.25)
      ..quadraticBezierTo(w * 0.56, h * 0.22, w * 0.60, h * 0.25);
    canvas.drawPath(rightBrow, browPaint);

    // Cute Rosy Cheeks
    canvas.drawCircle(Offset(w * 0.41, h * 0.34), 4.5, Paint()..color = const Color(0xFFF87171).withOpacity(0.6));
    canvas.drawCircle(Offset(w * 0.61, h * 0.34), 4.5, Paint()..color = const Color(0xFFF87171).withOpacity(0.6));

    // Smile Mouth
    final smilePath = Path()
      ..moveTo(w * 0.46, h * 0.36)
      ..quadraticBezierTo(w * 0.51, h * 0.41, w * 0.56, h * 0.36);
    canvas.drawPath(smilePath, Paint()..color = const Color(0xFF991B1B)..style = PaintingStyle.stroke..strokeWidth = 2.4..strokeCap = StrokeCap.round);

    // 10. Brown Wavy Hair (Layered 3D Hair Locks)
    final hairPaint = Paint()..color = const Color(0xFF451A03);
    final hairTop = Path()
      ..moveTo(w * 0.38, h * 0.28)
      ..quadraticBezierTo(w * 0.42, h * 0.14, w * 0.54, h * 0.14)
      ..quadraticBezierTo(w * 0.64, h * 0.14, w * 0.66, h * 0.28)
      ..quadraticBezierTo(w * 0.52, h * 0.21, w * 0.38, h * 0.28)
      ..close();
    canvas.drawPath(hairTop, hairPaint);

    final tuft1 = Path()
      ..moveTo(w * 0.45, h * 0.18)
      ..quadraticBezierTo(w * 0.48, h * 0.11, w * 0.52, h * 0.18);
    canvas.drawPath(tuft1, hairPaint);

    // 11. Thinking Hand under Chin
    canvas.drawRRect(
      RRect.fromLTRBR(w * 0.48, h * 0.40, w * 0.54, h * 0.50, const Radius.circular(4)),
      Paint()..color = const Color(0xFFFED7AA),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for Mathematics (Divider Compass, Triangle Ruler, and 3D Green Base)
class AllClasses3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final backShape = Path()
      ..moveTo(w * 0.15, h * 0.7)
      ..lineTo(w * 0.4, h * 0.5)
      ..lineTo(w * 0.5, h * 0.85)
      ..lineTo(w * 0.25, h * 0.9)
      ..close();
    canvas.drawPath(backShape, Paint()..color = const Color(0xFF10B981));

    final ruler = Path()
      ..moveTo(w * 0.48, h * 0.85)
      ..lineTo(w * 0.85, h * 0.85)
      ..lineTo(w * 0.65, h * 0.45)
      ..close();
    canvas.drawPath(ruler, Paint()..color = const Color(0xFFF97316));

    final innerRuler = Path()
      ..moveTo(w * 0.56, h * 0.78)
      ..lineTo(w * 0.76, h * 0.78)
      ..lineTo(w * 0.65, h * 0.58)
      ..close();
    canvas.drawPath(innerRuler, Paint()..color = Colors.white);

    final compassHinge = Offset(w * 0.5, h * 0.2);
    canvas.drawCircle(compassHinge, 5, Paint()..color = const Color(0xFF475569));
    canvas.drawCircle(compassHinge, 3, Paint()..color = const Color(0xFF94A3B8));

    final compassLeft = Path()
      ..moveTo(w * 0.5, h * 0.2)
      ..lineTo(w * 0.28, h * 0.75);
    canvas.drawPath(compassLeft, Paint()..color = const Color(0xFF64748B)..style = PaintingStyle.stroke..strokeWidth = 3.5);

    final compassRight = Path()
      ..moveTo(w * 0.5, h * 0.2)
      ..lineTo(w * 0.72, h * 0.75);
    canvas.drawPath(compassRight, Paint()..color = const Color(0xFF94A3B8)..style = PaintingStyle.stroke..strokeWidth = 3.5);

    canvas.drawLine(Offset(w * 0.35, h * 0.52), Offset(w * 0.65, h * 0.52), Paint()..color = const Color(0xFF475569)..strokeWidth = 2.5);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class MyCourses3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final screenRect = RRect.fromLTRBR(w * 0.18, h * 0.15, w * 0.82, h * 0.68, const Radius.circular(8));
    canvas.drawRRect(screenRect, Paint()..color = const Color(0xFF6366F1));

    final displayRect = RRect.fromLTRBR(w * 0.24, h * 0.21, w * 0.76, h * 0.62, const Radius.circular(5));
    canvas.drawRRect(displayRect, Paint()..color = const Color(0xFF60A5FA));

    final playPath = Path()
      ..moveTo(w * 0.44, h * 0.33)
      ..lineTo(w * 0.60, h * 0.415)
      ..lineTo(w * 0.44, h * 0.50)
      ..close();
    canvas.drawPath(playPath, Paint()..color = Colors.white);

    final baseRect = RRect.fromLTRBR(w * 0.1, h * 0.68, w * 0.9, h * 0.82, const Radius.circular(6));
    canvas.drawRRect(baseRect, Paint()..color = const Color(0xFF4338CA));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class MyProgress3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    canvas.drawRRect(RRect.fromLTRBR(w * 0.1, h * 0.55, w * 0.26, h * 0.88, const Radius.circular(4)), Paint()..color = const Color(0xFFF59E0B));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.31, h * 0.38, w * 0.47, h * 0.88, const Radius.circular(4)), Paint()..color = const Color(0xFF3B82F6));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.52, h * 0.22, w * 0.68, h * 0.88, const Radius.circular(4)), Paint()..color = const Color(0xFFF97316));

    final targetCenter = Offset(w * 0.78, h * 0.42);
    canvas.drawCircle(targetCenter, w * 0.18, Paint()..color = const Color(0xFFEF4444));
    canvas.drawCircle(targetCenter, w * 0.12, Paint()..color = Colors.white);
    canvas.drawCircle(targetCenter, w * 0.06, Paint()..color = const Color(0xFFEF4444));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class Homework3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final board = RRect.fromLTRBR(w * 0.18, h * 0.18, w * 0.72, h * 0.88, const Radius.circular(8));
    canvas.drawRRect(board, Paint()..color = const Color(0xFF60A5FA));

    final paper = RRect.fromLTRBR(w * 0.24, h * 0.26, w * 0.66, h * 0.82, const Radius.circular(4));
    canvas.drawRRect(paper, Paint()..color = Colors.white);

    final clip = RRect.fromLTRBR(w * 0.36, h * 0.12, w * 0.54, h * 0.22, const Radius.circular(3));
    canvas.drawRRect(clip, Paint()..color = const Color(0xFFF59E0B));

    final checkPaint = Paint()..color = const Color(0xFF10B981)..style = PaintingStyle.stroke..strokeWidth = 2.0;
    final c1 = Path()..moveTo(w * 0.3, h * 0.38)..lineTo(w * 0.36, h * 0.44)..lineTo(w * 0.46, h * 0.34);
    canvas.drawPath(c1, checkPaint);

    final pencilPath = Path()
      ..moveTo(w * 0.65, h * 0.45)
      ..lineTo(w * 0.85, h * 0.65)
      ..lineTo(w * 0.75, h * 0.85)
      ..lineTo(w * 0.55, h * 0.65)
      ..close();
    canvas.drawPath(pencilPath, Paint()..color = const Color(0xFFF59E0B));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class Timetable3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final cal = RRect.fromLTRBR(w * 0.15, h * 0.18, w * 0.75, h * 0.78, const Radius.circular(10));
    canvas.drawRRect(cal, Paint()..color = const Color(0xFFF472B6));

    final clockCenter = Offset(w * 0.72, h * 0.68);
    canvas.drawCircle(clockCenter, w * 0.2, Paint()..color = const Color(0xFFE11D48));
    canvas.drawCircle(clockCenter, w * 0.15, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class DigitalLibrary3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    canvas.drawRRect(RRect.fromLTRBR(w * 0.15, h * 0.68, w * 0.85, h * 0.85, const Radius.circular(5)), Paint()..color = const Color(0xFFEF4444));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.18, h * 0.48, w * 0.82, h * 0.65, const Radius.circular(5)), Paint()..color = const Color(0xFF3B82F6));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.22, h * 0.28, w * 0.78, h * 0.45, const Radius.circular(5)), Paint()..color = const Color(0xFF10B981));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class CareerGuidance3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final center = Offset(w * 0.5, h * 0.5);
    final radius = w * 0.38;

    canvas.drawCircle(center, radius, Paint()..color = const Color(0xFFB45309));
    canvas.drawCircle(center, radius * 0.88, Paint()..color = const Color(0xFFFEF3C7));
    canvas.drawCircle(center, radius * 0.78, Paint()..color = const Color(0xFF0284C7));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class Scholarships3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final cap = Path()
      ..moveTo(w * 0.45, h * 0.15)
      ..lineTo(w * 0.75, h * 0.28)
      ..lineTo(w * 0.45, h * 0.41)
      ..lineTo(w * 0.15, h * 0.28)
      ..close();
    canvas.drawPath(cap, Paint()..color = const Color(0xFF1E293B));

    final coinCenter = Offset(w * 0.72, h * 0.68);
    canvas.drawCircle(coinCenter, w * 0.18, Paint()..color = const Color(0xFFF59E0B));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class Announcements3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final cone = Path()
      ..moveTo(w * 0.3, h * 0.4)
      ..lineTo(w * 0.75, h * 0.2)
      ..lineTo(w * 0.75, h * 0.7)
      ..lineTo(w * 0.3, h * 0.55)
      ..close();
    canvas.drawPath(cone, Paint()..color = const Color(0xFFF43F5E));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for Tamil Literature (3D Purple book with Tamil character)
class TamilSubject3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Spine/Pages Shadow
    canvas.drawRRect(
      RRect.fromLTRBR(w * 0.18, h * 0.16, w * 0.82, h * 0.86, const Radius.circular(10)),
      Paint()..color = const Color(0xFF6D28D9),
    );

    // Book Cover
    final book = RRect.fromLTRBR(w * 0.22, h * 0.14, w * 0.82, h * 0.82, const Radius.circular(8));
    canvas.drawRRect(book, Paint()..color = const Color(0xFF8B5CF6));

    // Page Edge Spine
    canvas.drawRRect(
      RRect.fromLTRBR(w * 0.24, h * 0.82, w * 0.80, h * 0.86, const Radius.circular(4)),
      Paint()..color = const Color(0xFFF8FAFC),
    );

    // Tamil Golden Symbol 'அ'
    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'அ',
        style: TextStyle(
          fontSize: 26,
          fontWeight: FontWeight.w900,
          color: Color(0xFFFDE047),
          fontFamily: 'Outfit',
          shadows: [
            Shadow(color: Color(0xFFB45309), offset: Offset(2, 2), blurRadius: 3),
          ],
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset(w * 0.36, h * 0.26));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for Social Science (3D Globe on stand)
class SocialScienceSubject3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final center = Offset(w * 0.5, h * 0.40);
    final radius = w * 0.32;

    // Stand Base
    final standPath = Path()
      ..moveTo(w * 0.3, h * 0.85)
      ..lineTo(w * 0.7, h * 0.85)
      ..lineTo(w * 0.6, h * 0.78)
      ..lineTo(w * 0.4, h * 0.78)
      ..close();
    canvas.drawPath(standPath, Paint()..color = const Color(0xFF0284C7));

    // Stand Arc
    canvas.drawCircle(
      center,
      radius * 1.15,
      Paint()
        ..color = const Color(0xFF0284C7)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4.0,
    );

    // Earth Ocean Sphere
    canvas.drawCircle(center, radius, Paint()..color = const Color(0xFF0284C7));

    // Green Continents
    canvas.drawCircle(Offset(w * 0.42, h * 0.34), radius * 0.45, Paint()..color = const Color(0xFF10B981));
    canvas.drawCircle(Offset(w * 0.64, h * 0.46), radius * 0.35, Paint()..color = const Color(0xFF10B981));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for Science (3D Glass Flask with purple liquid & floating bubbles)
class ScienceSubject3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Flask Glass Outer Rim
    final flask = Path()
      ..moveTo(w * 0.42, h * 0.16)
      ..lineTo(w * 0.58, h * 0.16)
      ..lineTo(w * 0.58, h * 0.40)
      ..lineTo(w * 0.84, h * 0.80)
      ..quadraticBezierTo(w * 0.5, h * 0.90, w * 0.16, h * 0.80)
      ..lineTo(w * 0.42, h * 0.40)
      ..close();
    canvas.drawPath(flask, Paint()..color = const Color(0xFFE2E8F0));

    // Glowing Purple Liquid
    final liquid = Path()
      ..moveTo(w * 0.30, h * 0.56)
      ..lineTo(w * 0.70, h * 0.56)
      ..lineTo(w * 0.80, h * 0.78)
      ..quadraticBezierTo(w * 0.5, h * 0.86, w * 0.20, h * 0.78)
      ..close();
    canvas.drawPath(liquid, Paint()..color = const Color(0xFFC084FC));

    // Floating Bubbles
    canvas.drawCircle(Offset(w * 0.48, h * 0.35), 4, Paint()..color = const Color(0xFFE9D5FF));
    canvas.drawCircle(Offset(w * 0.56, h * 0.25), 3, Paint()..color = const Color(0xFFE9D5FF));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for English (3D Orange Dictionary with EN badge)
class EnglishSubject3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Book Base
    final book = RRect.fromLTRBR(w * 0.2, h * 0.14, w * 0.8, h * 0.84, const Radius.circular(8));
    canvas.drawRRect(book, Paint()..color = const Color(0xFFF97316));

    // Book Page Spine Edge
    canvas.drawRRect(
      RRect.fromLTRBR(w * 0.22, h * 0.84, w * 0.78, h * 0.88, const Radius.circular(4)),
      Paint()..color = const Color(0xFFFEF3C7),
    );

    // EN Text Badge
    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'EN',
        style: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w900,
          color: Colors.white,
          fontFamily: 'Outfit',
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset(w * 0.34, h * 0.30));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for Computer Science (3D Desktop Monitor with </> symbol)
class ComputerScienceSubject3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Monitor Stand
    final stand = Path()
      ..moveTo(w * 0.4, h * 0.84)
      ..lineTo(w * 0.6, h * 0.84)
      ..lineTo(w * 0.55, h * 0.68)
      ..lineTo(w * 0.45, h * 0.68)
      ..close();
    canvas.drawPath(stand, Paint()..color = const Color(0xFF334155));

    // Monitor Frame
    final screen = RRect.fromLTRBR(w * 0.14, h * 0.16, w * 0.86, h * 0.68, const Radius.circular(10));
    canvas.drawRRect(screen, Paint()..color = const Color(0xFF1E293B));

    // Code Symbol </>
    final textPainter = TextPainter(
      text: const TextSpan(
        text: '</>',
        style: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w900,
          color: Color(0xFF38BDF8),
          fontFamily: 'Outfit',
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset(w * 0.28, h * 0.28));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for General Knowledge (3D Glowing Yellow Lightbulb)
class GKSubject3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final center = Offset(w * 0.5, h * 0.40);

    // Glowing Rays
    final rayPaint = Paint()
      ..color = const Color(0xFFFDE047)
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(w * 0.5, h * 0.08), Offset(w * 0.5, h * 0.14), rayPaint);
    canvas.drawLine(Offset(w * 0.22, h * 0.22), Offset(w * 0.28, h * 0.26), rayPaint);
    canvas.drawLine(Offset(w * 0.78, h * 0.22), Offset(w * 0.72, h * 0.26), rayPaint);

    // Bulb Glass Body
    canvas.drawCircle(center, w * 0.26, Paint()..color = const Color(0xFFFACC15));

    // Screw Base
    canvas.drawRRect(
      RRect.fromLTRBR(w * 0.38, h * 0.64, w * 0.62, h * 0.80, const Radius.circular(5)),
      Paint()..color = const Color(0xFF64748B),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for More Subjects (4 Colorful Grid Squares)
class MoreSubjects3DPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final r = const Radius.circular(6);

    canvas.drawRRect(RRect.fromLTRBR(w * 0.14, h * 0.14, w * 0.46, h * 0.46, r), Paint()..color = const Color(0xFF60A5FA));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.54, h * 0.14, w * 0.86, h * 0.46, r), Paint()..color = const Color(0xFFF87171));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.14, h * 0.54, w * 0.46, h * 0.86, r), Paint()..color = const Color(0xFF4ADE80));
    canvas.drawRRect(RRect.fromLTRBR(w * 0.54, h * 0.54, w * 0.86, h * 0.86, r), Paint()..color = const Color(0xFFFBBF24));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for Math Course 1 (Green MATH book + compass + purple calculator)
class MathCourse1ArtPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Green MATH Book
    final book = RRect.fromLTRBR(w * 0.1, h * 0.22, w * 0.48, h * 0.88, const Radius.circular(8));
    canvas.drawRRect(book, Paint()..color = const Color(0xFF10B981));

    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'MATH',
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w900,
          color: Colors.white,
          fontFamily: 'Outfit',
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset(w * 0.15, h * 0.50));

    // Silver Compass
    canvas.drawLine(Offset(w * 0.5, h * 0.2), Offset(w * 0.4, h * 0.8), Paint()..color = const Color(0xFF64748B)..strokeWidth = 3.5);
    canvas.drawLine(Offset(w * 0.5, h * 0.2), Offset(w * 0.6, h * 0.8), Paint()..color = const Color(0xFF94A3B8)..strokeWidth = 3.5);

    // Purple Calculator
    final calc = RRect.fromLTRBR(w * 0.58, h * 0.42, w * 0.92, h * 0.90, const Radius.circular(8));
    canvas.drawRRect(calc, Paint()..color = const Color(0xFF8B5CF6));
    canvas.drawRRect(
      RRect.fromLTRBR(w * 0.64, h * 0.48, w * 0.86, h * 0.58, const Radius.circular(3)),
      Paint()..color = const Color(0xFFDDD6FE),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Icon Painter for Math Course 2 (Blackboard 2x+3=11 + yellow ruler)
class MathCourse2ArtPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Blackboard Outer Wood Frame
    final board = RRect.fromLTRBR(w * 0.22, h * 0.16, w * 0.92, h * 0.74, const Radius.circular(10));
    canvas.drawRRect(board, Paint()..color = const Color(0xFF78350F));

    // Green Chalkboard Surface
    canvas.drawRRect(
      RRect.fromLTRBR(w * 0.26, h * 0.20, w * 0.88, h * 0.70, const Radius.circular(6)),
      Paint()..color = const Color(0xFF064E3B),
    );

    // 2x + 3 = 11 Equation
    final textPainter = TextPainter(
      text: const TextSpan(
        text: '2x + 3 = 11',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
          fontFamily: 'Outfit',
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset(w * 0.32, h * 0.38));

    // Yellow Set Square Ruler
    final ruler = Path()
      ..moveTo(w * 0.12, h * 0.88)
      ..lineTo(w * 0.38, h * 0.88)
      ..lineTo(w * 0.25, h * 0.52)
      ..close();
    canvas.drawPath(ruler, Paint()..color = const Color(0xFFF59E0B));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3D Cute Lion Safari Mascot Painter for Continue Learning Card
class LionHeroArtPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Background Hill (Grass)
    final hillPath = Path()
      ..moveTo(0, h * 0.82)
      ..quadraticBezierTo(w * 0.45, h * 0.62, w, h * 0.75)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(
      hillPath,
      Paint()..color = const Color(0xFF86EFAC).withValues(alpha: 0.9),
    );

    // 2. Fluffy Trees in Background
    final treeTrunk = Paint()..color = const Color(0xFF92400E);
    canvas.drawRRect(
      RRect.fromLTRBR(w * 0.82, h * 0.40, w * 0.88, h * 0.78, const Radius.circular(3)),
      treeTrunk,
    );
    final treeFoliage = Paint()..color = const Color(0xFF22C55E);
    canvas.drawCircle(Offset(w * 0.85, h * 0.36), w * 0.12, treeFoliage);
    canvas.drawCircle(Offset(w * 0.77, h * 0.42), w * 0.09, treeFoliage);
    canvas.drawCircle(Offset(w * 0.93, h * 0.42), w * 0.09, treeFoliage);

    // 3. Clouds
    final cloudPaint = Paint()..color = Colors.white.withValues(alpha: 0.85);
    canvas.drawCircle(Offset(w * 0.35, h * 0.20), w * 0.08, cloudPaint);
    canvas.drawCircle(Offset(w * 0.42, h * 0.18), w * 0.10, cloudPaint);
    canvas.drawCircle(Offset(w * 0.50, h * 0.20), w * 0.08, cloudPaint);

    // 4. Lion Mane (fluffy golden circle petals)
    final manePaint = Paint()..color = const Color(0xFFB45309);
    final lionCenterX = w * 0.52;
    final lionCenterY = h * 0.48;
    final maneRadius = w * 0.28;

    canvas.drawCircle(Offset(lionCenterX, lionCenterY), maneRadius, manePaint);
    for (int i = 0; i < 12; i++) {
      final double angle = (i * 3.1415926 * 2) / 12;
      final double petalX = lionCenterX + (maneRadius * 0.85) * (angle > 0 ? (i % 2 == 0 ? 0.95 : 1.0) : 1.0) * (i == 0 || i == 6 ? (i == 0 ? 1 : -1) : (i < 6 ? 0.8 : -0.8));
      final double petalY = lionCenterY + (maneRadius * 0.85) * ((i > 3 && i < 9) ? 0.8 : -0.8);
      canvas.drawCircle(Offset(petalX, petalY), w * 0.07, Paint()..color = const Color(0xFFD97706));
    }

    // 5. Lion Ears
    final earOuter = Paint()..color = const Color(0xFFFBBF24);
    final earInner = Paint()..color = const Color(0xFFFDE68A);
    canvas.drawCircle(Offset(lionCenterX - w * 0.18, lionCenterY - h * 0.18), w * 0.07, earOuter);
    canvas.drawCircle(Offset(lionCenterX - w * 0.18, lionCenterY - h * 0.18), w * 0.04, earInner);
    canvas.drawCircle(Offset(lionCenterX + w * 0.18, lionCenterY - h * 0.18), w * 0.07, earOuter);
    canvas.drawCircle(Offset(lionCenterX + w * 0.18, lionCenterY - h * 0.18), w * 0.04, earInner);

    // 6. Lion Head Face
    final facePaint = Paint()..color = const Color(0xFFFBBF24);
    canvas.drawCircle(Offset(lionCenterX, lionCenterY), w * 0.20, facePaint);

    // 7. Muzzle & Cheeks (Light Yellow)
    final muzzlePaint = Paint()..color = const Color(0xFFFEF3C7);
    canvas.drawOval(
      Rect.fromCenter(center: Offset(lionCenterX - w * 0.05, lionCenterY + h * 0.05), width: w * 0.12, height: h * 0.09),
      muzzlePaint,
    );
    canvas.drawOval(
      Rect.fromCenter(center: Offset(lionCenterX + w * 0.05, lionCenterY + h * 0.05), width: w * 0.12, height: h * 0.09),
      muzzlePaint,
    );

    // 8. Nose
    final nosePath = Path()
      ..moveTo(lionCenterX - w * 0.035, lionCenterY + h * 0.01)
      ..lineTo(lionCenterX + w * 0.035, lionCenterY + h * 0.01)
      ..lineTo(lionCenterX, lionCenterY + h * 0.045)
      ..close();
    canvas.drawPath(nosePath, Paint()..color = const Color(0xFF78350F));

    // 9. Smile
    final smilePaint = Paint()
      ..color = const Color(0xFF78350F)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round;
    final mouthLeft = Path()
      ..moveTo(lionCenterX, lionCenterY + h * 0.045)
      ..quadraticBezierTo(lionCenterX - w * 0.035, lionCenterY + h * 0.07, lionCenterX - w * 0.05, lionCenterY + h * 0.05);
    final mouthRight = Path()
      ..moveTo(lionCenterX, lionCenterY + h * 0.045)
      ..quadraticBezierTo(lionCenterX + w * 0.035, lionCenterY + h * 0.07, lionCenterX + w * 0.05, lionCenterY + h * 0.05);
    canvas.drawPath(mouthLeft, smilePaint);
    canvas.drawPath(mouthRight, smilePaint);

    // 10. Big Cartoon Eyes
    final eyeWhite = Paint()..color = Colors.white;
    final eyeBlack = Paint()..color = const Color(0xFF1E293B);
    final eyeHighlight = Paint()..color = Colors.white;

    // Left eye
    canvas.drawCircle(Offset(lionCenterX - w * 0.08, lionCenterY - h * 0.02), w * 0.045, eyeWhite);
    canvas.drawCircle(Offset(lionCenterX - w * 0.08, lionCenterY - h * 0.02), w * 0.032, eyeBlack);
    canvas.drawCircle(Offset(lionCenterX - w * 0.09, lionCenterY - h * 0.03), w * 0.012, eyeHighlight);

    // Right eye
    canvas.drawCircle(Offset(lionCenterX + w * 0.08, lionCenterY - h * 0.02), w * 0.045, eyeWhite);
    canvas.drawCircle(Offset(lionCenterX + w * 0.08, lionCenterY - h * 0.02), w * 0.032, eyeBlack);
    canvas.drawCircle(Offset(lionCenterX + w * 0.07, lionCenterY - h * 0.03), w * 0.012, eyeHighlight);

    // 11. Lion Paws resting at bottom
    final pawPaint = Paint()..color = const Color(0xFFFBBF24);
    canvas.drawRRect(
      RRect.fromLTRBR(lionCenterX - w * 0.16, h * 0.72, lionCenterX - w * 0.02, h * 0.88, const Radius.circular(10)),
      pawPaint,
    );
    canvas.drawRRect(
      RRect.fromLTRBR(lionCenterX + w * 0.02, h * 0.72, lionCenterX + w * 0.16, h * 0.88, const Radius.circular(10)),
      pawPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
