import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../services/course_service.dart';
import '../core/constants/app_constants.dart';

class OnboardingScreen extends StatefulWidget {
  final int initialStep;
  const OnboardingScreen({super.key, this.initialStep = 0});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  // Base URL Options:
  // Option 1: Production (Vercel) -> https://tn-schools-mobile-app-backend.vercel.app
  // Option 2: Localhost Development -> http://localhost:5000
  static String get _baseUrl => AppConstants.baseUrl;

  late int _currentStep; // 0: Welcome, 1: Login
  bool _rememberMe = true;
  bool _isLoading = false;

  final TextEditingController _rollNumberController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  // Animation Controllers
  late AnimationController _entranceController;
  late AnimationController _loopController;

  // Staggered Entrance Animations
  late Animation<double> _heroScale;
  late Animation<double> _heroFade;
  late Animation<Offset> _title1Slide;
  late Animation<double> _title1Fade;
  late Animation<Offset> _title2Slide;
  late Animation<double> _title2Fade;
  late Animation<Offset> _subtitleSlide;
  late Animation<double> _subtitleFade;
  late Animation<Offset> _card1Slide;
  late Animation<double> _card1Fade;
  late Animation<Offset> _card2Slide;
  late Animation<double> _card2Fade;
  late Animation<Offset> _card3Slide;
  late Animation<double> _card3Fade;
  late Animation<double> _bottomDotsFade;
  late Animation<Offset> _buttonSlide;
  late Animation<double> _buttonFade;

  // Looping Micro-Animations
  late Animation<double> _heroFloat;
  late Animation<double> _arrowNudge;
  late Animation<double> _buttonGlow;
  late Animation<double> _iconFloat;
  late Animation<double> _sparklePulse;

  @override
  void initState() {
    super.initState();
    _currentStep = widget.initialStep;

    // 1. Entrance Sequence Controller (2.2 seconds total, smooth 60 FPS)
    _entranceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );

    // 2. Infinite Looping Controller for subtle floating, arrow pulse & breathing
    _loopController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);

    _initAnimations();
    _entranceController.forward();
  }

  void _initAnimations() {
    final easeOutCubic = Curves.easeOutCubic;

    // Hero 3D Student Illustration (0.08 -> 0.42) - scale 90% to 100% with soft spring
    _heroScale = Tween<double>(begin: 0.88, end: 1.0).animate(CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.08, 0.42, curve: Curves.easeOutBack),
    ));
    _heroFade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.08, 0.35, curve: Curves.easeOut),
    ));

    // Title 1: "Welcome to Your" (0.42 -> 0.62)
    _title1Slide = Tween<Offset>(
      begin: const Offset(0, 0.35),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entranceController,
      curve: Interval(0.42, 0.62, curve: easeOutCubic),
    ));
    _title1Fade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.42, 0.60, curve: Curves.easeOut),
    ));

    // Title 2: "Smart Learning Journey" (0.48 -> 0.68)
    _title2Slide = Tween<Offset>(
      begin: const Offset(0, 0.35),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entranceController,
      curve: Interval(0.48, 0.68, curve: easeOutCubic),
    ));
    _title2Fade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.48, 0.66, curve: Curves.easeOut),
    ));

    // Subtitle (0.54 -> 0.74)
    _subtitleSlide = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entranceController,
      curve: Interval(0.54, 0.74, curve: easeOutCubic),
    ));
    _subtitleFade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.54, 0.72, curve: Curves.easeOut),
    ));

    // Sequential Feature Cards (Staggered by ~80ms)
    // Card 1: Smart Lessons (0.62 -> 0.80)
    _card1Slide = Tween<Offset>(
      begin: const Offset(0, 0.4),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entranceController,
      curve: Interval(0.62, 0.80, curve: easeOutCubic),
    ));
    _card1Fade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.62, 0.78, curve: Curves.easeOut),
    ));

    // Card 2: AI Tutor (0.68 -> 0.86)
    _card2Slide = Tween<Offset>(
      begin: const Offset(0, 0.4),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entranceController,
      curve: Interval(0.68, 0.86, curve: easeOutCubic),
    ));
    _card2Fade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.68, 0.84, curve: Curves.easeOut),
    ));

    // Card 3: Track Progress (0.74 -> 0.92)
    _card3Slide = Tween<Offset>(
      begin: const Offset(0, 0.4),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entranceController,
      curve: Interval(0.74, 0.92, curve: easeOutCubic),
    ));
    _card3Fade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.74, 0.90, curve: Curves.easeOut),
    ));

    // Bottom Dots & Continue Button (0.80 -> 1.0)
    _bottomDotsFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.78, 0.94, curve: Curves.easeOut),
      ),
    );
    _buttonSlide = Tween<Offset>(
      begin: const Offset(0, 0.4),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entranceController,
      curve: Interval(0.82, 1.0, curve: easeOutCubic),
    ));
    _buttonFade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.82, 0.98, curve: Curves.easeOut),
    ));

    // Looping animations
    _heroFloat = Tween<double>(begin: 0.0, end: -6.0).animate(CurvedAnimation(
      parent: _loopController,
      curve: Curves.easeInOut,
    ));
    _arrowNudge = Tween<double>(begin: 0.0, end: 5.0).animate(CurvedAnimation(
      parent: _loopController,
      curve: Curves.easeInOut,
    ));
    _buttonGlow = Tween<double>(begin: 2.0, end: 6.0).animate(CurvedAnimation(
      parent: _loopController,
      curve: Curves.easeInOut,
    ));
    _iconFloat = Tween<double>(begin: 0.0, end: -2.5).animate(CurvedAnimation(
      parent: _loopController,
      curve: Curves.easeInOut,
    ));
    _sparklePulse = Tween<double>(begin: 0.3, end: 1.0).animate(CurvedAnimation(
      parent: _loopController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _entranceController.dispose();
    _loopController.dispose();
    _rollNumberController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final rollNumber = _rollNumberController.text.trim();
    final phone = _phoneController.text.trim();

    if (rollNumber.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Please enter both Roll Number and Phone Number.',
                  style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/users/auth'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'loginType': 'student',
          'rollNumber': rollNumber,
          'phone': phone,
        }),
      ).timeout(AppConstants.loginTimeout);

      final Map<String, dynamic> data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final studentData = data['data'] ?? {};
        if (mounted) {
          final courseService = Provider.of<CourseService>(context, listen: false);
          final rawClass = studentData['class']?.toString();
          String? formattedClass;
          if (rawClass != null && rawClass.isNotEmpty) {
            if (rawClass.toLowerCase().contains('standard') || rawClass.toLowerCase().contains('th') || rawClass.toLowerCase().contains('st') || rawClass.toLowerCase().contains('nd') || rawClass.toLowerCase().contains('rd')) {
              formattedClass = rawClass;
            } else {
              formattedClass = '${rawClass}th Standard';
            }
          }

          courseService.setStudentAuth(
            id: studentData['id']?.toString(),
            studentId: studentData['studentId']?.toString() ?? studentData['id']?.toString(),
            token: studentData['token']?.toString(),
            schoolId: studentData['schoolId']?.toString() ?? studentData['school']?['id']?.toString() ?? 'd9962dbb-f572-47a4-8240-6eef99b5c5bb',
            rollNumber: studentData['rollNumber'] ?? rollNumber,
            phone: phone,
            name: studentData['name'],
            schoolName: studentData['school']?['name'] ?? studentData['schoolName'],
            classStandard: formattedClass,
            section: studentData['section']?.toString(),
            gender: studentData['gender']?.toString(),
            medium: studentData['medium']?.toString() ?? studentData['mediumOfInstruction']?.toString(),
            group: studentData['group']?.toString(),
            stream: studentData['group']?.toString() ?? studentData['stream']?.toString(),
          );
          _navigateToHome(studentData['name'] ?? 'Student');
        }
      } else {
        final errorMsg = data['error'] ?? 'Student not found or incorrect phone number. Please check and try again.';
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      errorMsg,
                      style: const TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFFDC2626),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            ),
          );
        }
      }
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.wifi_off_rounded, color: Colors.white, size: 20),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Unable to connect to authentication server. Please check your connection and try again.',
                    style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _navigateToHome(String studentName) {
    Navigator.pushReplacementNamed(context, '/');
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Text(
              'Login Successful! Welcome, $studentName.',
              style: const TextStyle(
                fontFamily: 'Outfit',
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Colors.white,
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF047857),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // --- TOP PROGRESS INDICATOR ---
  Widget _buildTopStepIndicator() {
    return Center(
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(2, (index) {
            final isActive = _currentStep == index;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: isActive ? 22 : 6,
              height: 5,
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFF047857) : const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(4),
              ),
            );
          }),
        ),
      ),
    );
  }

  // ==========================================
  // STEP 1: WELCOME SCREEN (Top 40px Padding & Unified Flow)
  // ==========================================
  Widget _buildStep1Welcome() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final totalHeight = constraints.maxHeight;

        // If totalHeight > 620, fill the entire screen dynamically using an Expanded hero
        if (totalHeight > 620) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              children: [
                // 1. Hero 3D Student Illustration (Expanded to responsively fill available upper space)
                Expanded(
                  child: Center(
                    child: AnimatedBuilder(
                      animation: Listenable.merge([_heroScale, _heroFloat, _sparklePulse]),
                      builder: (context, child) {
                        return Transform.translate(
                          offset: Offset(0, _heroFloat.value),
                          child: Transform.scale(
                            scale: _heroScale.value,
                            child: FadeTransition(
                              opacity: _heroFade,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  // Educational Floating Sparkles
                                  Positioned(
                                    top: 15,
                                    right: 40,
                                    child: Opacity(
                                      opacity: _sparklePulse.value,
                                      child: const Text('✨', style: TextStyle(fontSize: 16)),
                                    ),
                                  ),
                                  Positioned(
                                    bottom: 25,
                                    left: 30,
                                    child: Opacity(
                                      opacity: 1.0 - (_sparklePulse.value * 0.5),
                                      child: const Text('✦',
                                          style: TextStyle(
                                              fontSize: 13, color: Color(0xFF0D9488))),
                                    ),
                                  ),
                                  Positioned(
                                    top: 45,
                                    left: 35,
                                    child: Opacity(
                                      opacity: _sparklePulse.value * 0.8,
                                      child: const Text('✦',
                                          style: TextStyle(
                                              fontSize: 12, color: Color(0xFF6366F1))),
                                    ),
                                  ),

                                  // Main Hero 3D Illustration (Fills available space responsively)
                                  Image.asset(
                                    'assets/images/splash/splash.png',
                                    fit: BoxFit.contain,
                                    filterQuality: FilterQuality.high,
                                    errorBuilder: (context, error, stackTrace) =>
                                        const Center(
                                      child: Icon(Icons.school_rounded,
                                          size: 110, color: Color(0xFF047857)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // 2. Welcome Title (Slide Up + Fade)
                Column(
                  children: [
                    SlideTransition(
                      position: _title1Slide,
                      child: FadeTransition(
                        opacity: _title1Fade,
                        child: const Text(
                          'Welcome to Your',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                            height: 1.2,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 2),
                    SlideTransition(
                      position: _title2Slide,
                      child: FadeTransition(
                        opacity: _title2Fade,
                        child: const Text(
                          'Smart Learning Journey',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF047857),
                            height: 1.2,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // 3. Subtitle Paragraph (Fade + Slide)
                SlideTransition(
                  position: _subtitleSlide,
                  child: FadeTransition(
                    opacity: _subtitleFade,
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Smart TN Student Portal for Classes 6 to 12.\nPersonalized lessons, AI tutor assistance,\nhomework tracker & exam prep.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: Color(0xFF64748B),
                          height: 1.4,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // 4. Three Highlight Feature Cards (Sequential Staggered Entrances)
                Row(
                  children: [
                    Expanded(
                      child: SlideTransition(
                        position: _card1Slide,
                        child: FadeTransition(
                          opacity: _card1Fade,
                          child: _buildFeatureHighlightCard(
                            icon: Icons.school_rounded,
                            title: 'Smart\nLessons',
                            color: const Color(0xFF6366F1),
                            bgColor: const Color(0xFFEEF2FF),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: SlideTransition(
                        position: _card2Slide,
                        child: FadeTransition(
                          opacity: _card2Fade,
                          child: _buildFeatureHighlightCard(
                            icon: Icons.smart_toy_rounded,
                            title: 'AI\nTutor',
                            color: const Color(0xFF0D9488),
                            bgColor: const Color(0xFFE6F8F3),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: SlideTransition(
                        position: _card3Slide,
                        child: FadeTransition(
                          opacity: _card3Fade,
                          child: _buildFeatureHighlightCard(
                            icon: Icons.assignment_turned_in_rounded,
                            title: 'Track\nProgress',
                            color: const Color(0xFFEA580C),
                            bgColor: const Color(0xFFFFF0EE),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // 5. Bottom Step Dots (Fade)
                FadeTransition(
                  opacity: _bottomDotsFade,
                  child: _buildTopStepIndicator(),
                ),
                const SizedBox(height: 14),

                // 6. Continue Button with Breathing Glow + Arrow Nudge Animation
                SlideTransition(
                  position: _buttonSlide,
                  child: FadeTransition(
                    opacity: _buttonFade,
                    child: AnimatedBuilder(
                      animation: Listenable.merge([_arrowNudge, _buttonGlow]),
                      builder: (context, child) {
                        return Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(32),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF007A55)
                                    .withValues(alpha: 0.28),
                                blurRadius: _buttonGlow.value * 2.5,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              onPressed: () => setState(() => _currentStep = 1),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF007A55),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(32),
                                ),
                                elevation: 0,
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 20),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const SizedBox(width: 28), // Balance centering
                                  const Text(
                                    'Continue',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                  Transform.translate(
                                    offset: Offset(_arrowNudge.value, 0),
                                    child: Container(
                                      width: 32,
                                      height: 32,
                                      decoration: BoxDecoration(
                                        color: Colors.white
                                            .withValues(alpha: 0.18),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.arrow_forward_rounded,
                                        color: Colors.white,
                                        size: 18,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          );
        } else {
          // Fallback scrollable for small screens / landscape
          return SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
              child: Column(
                children: [
                  SizedBox(
                    height: 220,
                    width: double.infinity,
                    child: Image.asset(
                      'assets/images/splash/splash.png',
                      fit: BoxFit.contain,
                      filterQuality: FilterQuality.high,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Column(
                    children: [
                      SlideTransition(
                        position: _title1Slide,
                        child: FadeTransition(
                          opacity: _title1Fade,
                          child: const Text(
                            'Welcome to Your',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              height: 1.2,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 2),
                      SlideTransition(
                        position: _title2Slide,
                        child: FadeTransition(
                          opacity: _title2Fade,
                          child: const Text(
                            'Smart Learning Journey',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF047857),
                              height: 1.2,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SlideTransition(
                    position: _subtitleSlide,
                    child: FadeTransition(
                      opacity: _subtitleFade,
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          'Smart TN Student Portal for Classes 6 to 12.\nPersonalized lessons, AI tutor assistance,\nhomework tracker & exam prep.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF64748B),
                            height: 1.4,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: SlideTransition(
                          position: _card1Slide,
                          child: FadeTransition(
                            opacity: _card1Fade,
                            child: _buildFeatureHighlightCard(
                              icon: Icons.school_rounded,
                              title: 'Smart\nLessons',
                              color: const Color(0xFF6366F1),
                              bgColor: const Color(0xFFEEF2FF),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SlideTransition(
                          position: _card2Slide,
                          child: FadeTransition(
                            opacity: _card2Fade,
                            child: _buildFeatureHighlightCard(
                              icon: Icons.smart_toy_rounded,
                              title: 'AI\nTutor',
                              color: const Color(0xFF0D9488),
                              bgColor: const Color(0xFFE6F8F3),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SlideTransition(
                          position: _card3Slide,
                          child: FadeTransition(
                            opacity: _card3Fade,
                            child: _buildFeatureHighlightCard(
                              icon: Icons.assignment_turned_in_rounded,
                              title: 'Track\nProgress',
                              color: const Color(0xFFEA580C),
                              bgColor: const Color(0xFFFFF0EE),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  FadeTransition(
                    opacity: _bottomDotsFade,
                    child: _buildTopStepIndicator(),
                  ),
                  const SizedBox(height: 14),
                  SlideTransition(
                    position: _buttonSlide,
                    child: FadeTransition(
                      opacity: _buttonFade,
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: () {
                            Provider.of<CourseService>(context, listen: false).markWelcomeSeen();
                            setState(() => _currentStep = 1);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF007A55),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(32),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                          ),
                          child: const Text(
                            'Continue',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
      },
    );
  }

  Widget _buildFeatureHighlightCard({
    required IconData icon,
    required String title,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [
          AnimatedBuilder(
            animation: _iconFloat,
            builder: (context, child) {
              return Transform.translate(
                offset: Offset(0, _iconFloat.value),
                child: Icon(icon, color: color, size: 26),
              );
            },
          ),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
              height: 1.25,
              fontFamily: 'Outfit',
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // STEP 2: LOGIN TO YOUR ACCOUNT (Full Size Bottom Card - No Scroll)
  // ==========================================
  Widget _buildStepLogin() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final totalHeight = constraints.maxHeight;
        // Compact bottom card so top illustration fully reveals the school and students walking on pathway
        final bottomCardHeight = (totalHeight < 720) ? 300.0 : 325.0;
        final topAreaHeight = totalHeight - bottomCardHeight;

        return Container(
          width: double.infinity,
          height: totalHeight,
          color: Colors.white,
          child: Stack(
            children: [
              // 1. Top Illustration Banner (Flush at top 0)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: topAreaHeight + 36,
                child: Image.asset(
                  'assets/images/splash/login.png',
                  width: double.infinity,
                  fit: BoxFit.cover,
                  alignment: Alignment.topCenter,
                  filterQuality: FilterQuality.high,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: const Color(0xFFECFDF5),
                    child: const Center(
                      child: Icon(Icons.domain_rounded,
                          size: 80, color: Color(0xFF047857)),
                    ),
                  ),
                ),
              ),

              // Back Button to Welcome
              Positioned(
                top: MediaQuery.of(context).padding.top + 10,
                left: 16,
                child: GestureDetector(
                  onTap: () => setState(() => _currentStep = 0),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.92),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.arrow_back_rounded,
                      size: 18,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ),
              ),

              // 2. White Sheet Card Container (Full Size to Bottom 0)
              Positioned(
                top: topAreaHeight,
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(32),
                      topRight: Radius.circular(32),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 16,
                        offset: Offset(0, -4),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Header Texts
                      Column(
                        children: const [
                          Text(
                            'Login to Your Account',
                            style: TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Enter your Roll Number and registered Phone Number',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),

                      // Roll Number Input Field
                      Container(
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TextField(
                          controller: _rollNumberController,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.badge_outlined,
                                color: Color(0xFF64748B), size: 19),
                            hintText: 'Enter Your Roll Number (e.g. TN-2026-10482)',
                            hintStyle:
                                TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                            border: InputBorder.none,
                            contentPadding:
                                EdgeInsets.symmetric(horizontal: 12, vertical: 13),
                          ),
                        ),
                      ),

                      // Phone Number Input Field
                      Container(
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TextField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.phone_iphone_rounded,
                                color: Color(0xFF64748B), size: 19),
                            hintText: 'Enter Registered Phone Number',
                            hintStyle:
                                TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                            border: InputBorder.none,
                            contentPadding:
                                EdgeInsets.symmetric(horizontal: 12, vertical: 13),
                          ),
                        ),
                      ),

                      // Remember me Row
                      Row(
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: Checkbox(
                              value: _rememberMe,
                              onChanged: (val) =>
                                  setState(() => _rememberMe = val ?? true),
                              activeColor: const Color(0xFF047857),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            'Remember me',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),

                      // Login Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF047857),
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: const Color(0xFF047857).withValues(alpha: 0.6),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(28),
                            ),
                            elevation: 2,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text(
                                  'Login',
                                  style: TextStyle(
                                    fontSize: 15.5,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Exact background color matching splash.png for 100% seamless blend
    final Color screenBg = _currentStep == 0
        ? const Color(0xFFF6F9FD)
        : Colors.white;

    return Scaffold(
      backgroundColor: screenBg,
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 380),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        transitionBuilder: (child, animation) {
          final isLogin = child.key == const ValueKey('login');
          return SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0.25, 0.0),
              end: Offset.zero,
            ).animate(animation),
            child: FadeTransition(
              opacity: animation,
              child: isLogin
                  ? child
                  : SafeArea(child: child),
            ),
          );
        },
        child: _currentStep == 0
            ? KeyedSubtree(
                key: const ValueKey('step1'),
                child: Container(
                  color: const Color(0xFFF6F9FD),
                  child: _buildStep1Welcome(),
                ),
              )
            : KeyedSubtree(
                key: const ValueKey('login'),
                child: _buildStepLogin(),
              ),
      ),
    );
  }
}


