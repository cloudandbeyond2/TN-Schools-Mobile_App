import 'package:flutter/material.dart';

/// 3D Student Boy Studying Mascot Painter
class StudentStudyMascotPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Desk Surface (Brown wood)
    final deskPaint = Paint()..color = const Color(0xFFE2A062);
    final deskTop = h * 0.82;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, deskTop, w, h * 0.18),
        const Radius.circular(6),
      ),
      deskPaint,
    );
    final deskEdgePaint = Paint()..color = const Color(0xFFC78446);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, deskTop + 14, w, h * 0.08),
        const Radius.circular(4),
      ),
      deskEdgePaint,
    );

    // 2. Stack of Books on Left of Desk
    // Blue book
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.02, deskTop - 8, w * 0.22, 9),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xFF0284C7),
    );
    // Yellow book
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.04, deskTop - 16, w * 0.20, 8),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xFFF59E0B),
    );
    // Red book
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.03, deskTop - 24, w * 0.21, 8),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xFFEF4444),
    );

    // 3. Small Plant Pot on Right of Desk
    final potPaint = Paint()..color = const Color(0xFFD97706);
    final potPath = Path()
      ..moveTo(w * 0.88, deskTop)
      ..lineTo(w * 0.90, deskTop - 18)
      ..lineTo(w * 0.98, deskTop - 18)
      ..lineTo(w * 1.00, deskTop)
      ..close();
    canvas.drawPath(potPath, potPaint);

    // Green leaves
    final leafPaint = Paint()..color = const Color(0xFF16A34A);
    canvas.drawOval(
      Rect.fromCenter(center: Offset(w * 0.94, deskTop - 24), width: 14, height: 16),
      leafPaint,
    );
    canvas.drawOval(
      Rect.fromCenter(center: Offset(w * 0.90, deskTop - 20), width: 12, height: 10),
      leafPaint,
    );

    // 4. Open Book in Front of Student
    final openBookPaint = Paint()..color = Colors.white;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(w * 0.52, deskTop - 4), width: w * 0.36, height: 14),
        const Radius.circular(4),
      ),
      openBookPaint,
    );
    // Book center crease
    canvas.drawLine(
      Offset(w * 0.52, deskTop - 11),
      Offset(w * 0.52, deskTop + 3),
      Paint()..color = const Color(0xFFCBD5E1)..strokeWidth = 1.5,
    );

    // 5. Boy's Body (Blue T-shirt)
    final shirtPaint = Paint()..color = const Color(0xFF3B82F6);
    final bodyRect = Rect.fromLTWH(w * 0.36, h * 0.54, w * 0.34, h * 0.30);
    canvas.drawRRect(
      RRect.fromRectAndRadius(bodyRect, const Radius.circular(16)),
      shirtPaint,
    );

    // 6. Boy's Head & Face
    final skinPaint = Paint()..color = const Color(0xFFFFDBAC);
    final headCenter = Offset(w * 0.53, h * 0.40);
    canvas.drawCircle(headCenter, w * 0.21, skinPaint);

    // Ears
    canvas.drawCircle(Offset(w * 0.32, h * 0.40), 6, skinPaint);
    canvas.drawCircle(Offset(w * 0.74, h * 0.40), 6, skinPaint);

    // Hair (Dark Brown Cute Style)
    final hairPaint = Paint()..color = const Color(0xFF451A03);
    final hairPath = Path()
      ..addArc(
        Rect.fromCircle(center: headCenter, radius: w * 0.22),
        -3.14,
        3.14,
      )
      ..quadraticBezierTo(w * 0.72, h * 0.36, w * 0.60, h * 0.30)
      ..quadraticBezierTo(w * 0.52, h * 0.35, w * 0.44, h * 0.30)
      ..quadraticBezierTo(w * 0.34, h * 0.36, w * 0.31, h * 0.40)
      ..close();
    canvas.drawPath(hairPath, hairPaint);

    // Cute Tuft
    canvas.drawOval(
      Rect.fromCenter(center: Offset(w * 0.53, h * 0.18), width: 14, height: 16),
      hairPaint,
    );

    // Eyes (Big expressive brown eyes)
    final eyePaint = Paint()..color = const Color(0xFF1E293B);
    canvas.drawOval(
      Rect.fromCenter(center: Offset(w * 0.46, h * 0.40), width: 5.5, height: 7.5),
      eyePaint,
    );
    canvas.drawOval(
      Rect.fromCenter(center: Offset(w * 0.60, h * 0.40), width: 5.5, height: 7.5),
      eyePaint,
    );

    // Eye catchlights
    final shinePaint = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(w * 0.45, h * 0.38), 1.8, shinePaint);
    canvas.drawCircle(Offset(w * 0.59, h * 0.38), 1.8, shinePaint);

    // Cheerful Smile (Red mouth)
    final mouthPaint = Paint()
      ..color = const Color(0xFFDC2626)
      ..style = PaintingStyle.fill;
    final mouthPath = Path()
      ..moveTo(w * 0.47, h * 0.47)
      ..quadraticBezierTo(w * 0.53, h * 0.55, w * 0.59, h * 0.47)
      ..close();
    canvas.drawPath(mouthPath, mouthPaint);

    // Rosy Cheeks
    final blushPaint = Paint()
      ..color = const Color(0xFFFCA5A5).withValues(alpha: 0.6)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);
    canvas.drawCircle(Offset(w * 0.40, h * 0.45), 5, blushPaint);
    canvas.drawCircle(Offset(w * 0.66, h * 0.45), 5, blushPaint);

    // 7. Left Arm holding Yellow Pencil Up
    final armPaint = Paint()
      ..color = const Color(0xFFFFDBAC)
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset(w * 0.36, h * 0.60), Offset(w * 0.22, h * 0.44), armPaint);

    // Yellow Pencil
    final pencilPaint = Paint()..color = const Color(0xFFFBBF24);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(w * 0.21, h * 0.40), width: 4.5, height: 20),
        const Radius.circular(2),
      ),
      pencilPaint,
    );
    // Pencil tip
    final tipPath = Path()
      ..moveTo(w * 0.19, h * 0.30)
      ..lineTo(w * 0.23, h * 0.30)
      ..lineTo(w * 0.21, h * 0.26)
      ..close();
    canvas.drawPath(tipPath, Paint()..color = const Color(0xFF1E293B));

    // 8. Right Arm Pointing Index Finger Up
    canvas.drawLine(Offset(w * 0.68, h * 0.60), Offset(w * 0.80, h * 0.46), armPaint);
    // Finger pointing up
    canvas.drawLine(Offset(w * 0.80, h * 0.46), Offset(w * 0.82, h * 0.38), armPaint);

    // 9. Glowing Lightbulb above on left
    final bulbCenter = Offset(w * 0.22, h * 0.16);
    final bulbPaint = Paint()..color = const Color(0xFFFACC15);
    canvas.drawCircle(bulbCenter, 9, bulbPaint);
    // Light rays
    final rayPaint = Paint()
      ..color = const Color(0xFFF59E0B)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    for (int i = 0; i < 6; i++) {
      final angle = i * (3.14159 / 3) - 3.14159 / 2;
      canvas.drawLine(
        Offset(bulbCenter.dx + 12 * mathCos(angle), bulbCenter.dy + 12 * mathSin(angle)),
        Offset(bulbCenter.dx + 16 * mathCos(angle), bulbCenter.dy + 16 * mathSin(angle)),
        rayPaint,
      );
    }
  }

  double mathCos(double angle) => angle == 0 ? 1.0 : (angle > 1.5 && angle < 4.7 ? -0.8 : 0.8);
  double mathSin(double angle) => angle < 0 ? -0.9 : 0.5;

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Mascot Widget with Speech Bubble
class StudentStudyMascotWidget extends StatelessWidget {
  final String? bubbleText;
  const StudentStudyMascotWidget({super.key, this.bubbleText});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      height: 120,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // 1. Custom Painted Student Mascot with desk, books, plant & pencil
          Positioned.fill(
            child: CustomPaint(
              painter: StudentStudyMascotPainter(),
            ),
          ),

          // 2. Speech Bubble in top right
          Positioned(
            right: -6,
            top: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
              decoration: BoxDecoration(
                color: const Color(0xFFE0F2FE),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFBAE6FD)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                bubbleText ?? '2 × 3 = 6',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0284C7),
                  fontFamily: 'Outfit',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Venn Diagram Painter for Factors & Multiples
class VennDiagramPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final radius = h * 0.42;

    // Left Circle (Blue: Factors)
    final leftCenter = Offset(w * 0.40, h * 0.50);
    final leftPaint = Paint()
      ..color = const Color(0xFF3B82F6).withValues(alpha: 0.10)
      ..style = PaintingStyle.fill;
    final leftBorder = Paint()
      ..color = const Color(0xFF60A5FA)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    canvas.drawCircle(leftCenter, radius, leftPaint);
    canvas.drawCircle(leftCenter, radius, leftBorder);

    // Right Circle (Green: Multiples)
    final rightCenter = Offset(w * 0.60, h * 0.50);
    final rightPaint = Paint()
      ..color = const Color(0xFF22C55E).withValues(alpha: 0.10)
      ..style = PaintingStyle.fill;
    final rightBorder = Paint()
      ..color = const Color(0xFF4ADE80)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    canvas.drawCircle(rightCenter, radius, rightPaint);
    canvas.drawCircle(rightCenter, radius, rightBorder);

    // Draw little sparkle stars around
    _drawSparkle(canvas, Offset(w * 0.16, h * 0.22), const Color(0xFFF59E0B));
    _drawSparkle(canvas, Offset(w * 0.84, h * 0.22), const Color(0xFF60A5FA));
    _drawSparkle(canvas, Offset(w * 0.18, h * 0.80), const Color(0xFF60A5FA));
  }

  void _drawSparkle(Canvas canvas, Offset center, Color color) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset(center.dx - 3.5, center.dy), Offset(center.dx + 3.5, center.dy), paint);
    canvas.drawLine(Offset(center.dx, center.dy - 3.5), Offset(center.dx, center.dy + 3.5), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 1. THEORY CARD WIDGET
class MathTheoryCard extends StatelessWidget {
  final String leftBadgeText;
  final String leftDescription;
  final String rightBadgeText;
  final String rightDescription;

  const MathTheoryCard({
    super.key,
    this.leftBadgeText = 'Factors',
    this.leftDescription =
        'Numbers that divide\nanother number exactly\nwithout leaving\na remainder.',
    this.rightBadgeText = 'Multiples',
    this.rightDescription =
        'Numbers obtained\nby multiplying a number\nby 1, 2, 3, ...',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Top Left THEORY Pill Badge
          Positioned(
            left: 0,
            top: -12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFF1D4ED8), // Vibrant Royal Blue
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1D4ED8).withValues(alpha: 0.3),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Text(
                'THEORY',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  fontFamily: 'Outfit',
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.only(top: 22, bottom: 18, left: 14, right: 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Left: Factors Column
                Expanded(
                  flex: 3,
                  child: Column(
                    children: [
                      // Division Icon in Blue Circle
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF2563EB).withValues(alpha: 0.25),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Text(
                            '÷',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              height: 1.1,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        leftBadgeText,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF1D4ED8),
                          fontFamily: 'Outfit',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        leftDescription,
                        textAlign: TextAlign.center,
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF475569),
                          height: 1.3,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),

                // Center: Overlapping Venn Circles Graphic with "="
                Expanded(
                  flex: 4,
                  child: SizedBox(
                    height: 110,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Positioned.fill(
                          child: CustomPaint(
                            painter: VennDiagramPainter(),
                          ),
                        ),
                        // Equal symbol in center intersection
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.9),
                            shape: BoxShape.circle,
                          ),
                          child: const Text(
                            '=',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF6366F1),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Right: Multiples Column
                Expanded(
                  flex: 3,
                  child: Column(
                    children: [
                      // Multiplication Icon in Green Circle
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: const Color(0xFF16A34A),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF16A34A).withValues(alpha: 0.25),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Text(
                            '✖',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        rightBadgeText,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF16A34A),
                          fontFamily: 'Outfit',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        rightDescription,
                        textAlign: TextAlign.center,
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF475569),
                          height: 1.3,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 2. EXAMPLE CARD WIDGET
class MathExampleCard extends StatelessWidget {
  const MathExampleCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Top Left EXAMPLE Pill Badge
          Positioned(
            left: 0,
            top: -12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFF7C3AED), // Vibrant Purple
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF7C3AED).withValues(alpha: 0.3),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Text(
                'EXAMPLE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  fontFamily: 'Outfit',
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.only(top: 22, bottom: 16, left: 16, right: 16),
            child: Column(
              children: [
                // --- Row 1: Factors of 12 ---
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left Label & Subtitle
                    Expanded(
                      flex: 4,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Factors of 12',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF1D4ED8),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Numbers that divide 12 exactly.',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF64748B),
                              height: 1.25,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Right Number Chips + Bracket Line
                    Expanded(
                      flex: 6,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _buildNumberChip('1', const Color(0xFFDBEAFE), const Color(0xFF1E40AF)),
                              _buildNumberChip('2', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                              _buildNumberChip('3', const Color(0xFFFEF3C7), const Color(0xFFB45309)),
                              _buildNumberChip('4', const Color(0xFFFCE7F3), const Color(0xFFBE185D)),
                              _buildNumberChip('6', const Color(0xFFF3E8FF), const Color(0xFF7E22CE)),
                              _buildNumberChip('12', const Color(0xFFE0F2FE), const Color(0xFF0369A1)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          // Bracket pointer text
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Text(
                                'These are the factors of 12 ⤴',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF2563EB),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(color: Color(0xFFE2E8F0), height: 1, thickness: 1),
                ),

                // --- Row 2: Multiples of 4 ---
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left Label & Subtitle
                    Expanded(
                      flex: 4,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Multiples of 4',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF16A34A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Numbers obtained by multiplying 4 by 1, 2, 3, ...',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF64748B),
                              height: 1.25,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Right Number Chips + Bracket Line
                    Expanded(
                      flex: 6,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _buildNumberChip('4', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                              _buildNumberChip('8', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                              _buildNumberChip('12', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                              _buildNumberChip('16', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                              _buildNumberChip('20', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                              _buildNumberChip('...', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          // Bracket pointer text
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Text(
                                'These are the multiples of 4 ⤴',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF16A34A),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNumberChip(String text, Color bg, Color textColor) {
    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: bg.withValues(alpha: 0.8)),
      ),
      child: Center(
        child: Text(
          text,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            color: textColor,
            fontFamily: 'Outfit',
          ),
        ),
      ),
    );
  }
}

/// 3. THINK! INTERACTIVE HINT CARD
class MathThinkCard extends StatelessWidget {
  final VoidCallback? onHintTap;

  const MathThinkCard({super.key, this.onHintTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB), // Soft light amber
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE68A), width: 1.2),
      ),
      child: Row(
        children: [
          // 3D Lightbulb Emoji / Icon
          const Text(
            '💡',
            style: TextStyle(fontSize: 26),
          ),
          const SizedBox(width: 10),

          // Question Text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: const [
                Text(
                  'Think!',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFFD97706),
                    fontFamily: 'Outfit',
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Is 12 a factor of 36?',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: Color(0xFF475569),
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Outfit',
                  ),
                ),
              ],
            ),
          ),

          // Right Hint Badge with Chevron
          GestureDetector(
            onTap: onHintTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFCD34D)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Text(
                    'Hint: 36 ÷ 12 = 3',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFD97706),
                      fontFamily: 'Outfit',
                    ),
                  ),
                  SizedBox(width: 4),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 16,
                    color: Color(0xFFD97706),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Fallback compatibility for previous MathVisualIllustration
class MathVisualIllustration extends StatelessWidget {
  final String leftBadgeText;
  final String leftDescription;
  final String rightBadgeText;
  final String rightDescription;

  const MathVisualIllustration({
    super.key,
    this.leftBadgeText = 'Factors',
    this.leftDescription =
        'Numbers that divide another number exactly without leaving a remainder.',
    this.rightBadgeText = 'Multiples',
    this.rightDescription =
        'Numbers obtained by multiplying a number by 1, 2, 3, ...',
  });

  @override
  Widget build(BuildContext context) {
    return MathTheoryCard(
      leftBadgeText: leftBadgeText,
      leftDescription: leftDescription,
      rightBadgeText: rightBadgeText,
      rightDescription: rightDescription,
    );
  }
}
