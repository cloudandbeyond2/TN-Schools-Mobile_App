import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/localization/app_localization.dart';
import '../widgets/bottom_nav_bar.dart';
import '../services/course_service.dart';

class ScholarshipsCompetitionsScreen extends StatefulWidget {
  final bool hideBottomNav;
  const ScholarshipsCompetitionsScreen({super.key, this.hideBottomNav = false});

  @override
  State<ScholarshipsCompetitionsScreen> createState() => _ScholarshipsCompetitionsScreenState();
}

class _ScholarshipsCompetitionsScreenState extends State<ScholarshipsCompetitionsScreen> {
  final Set<String> _appliedScholarshipIds = {};
  final Set<String> _registeredCompetitionIds = {};

  final List<Map<String, dynamic>> _scholarships = const [
    {
      'id': 'sch_1',
      'title': 'Tamil Nadu Chief Minister Merit Scholarship 2026',
      'amount': '₹12,000 / Year',
      'monthlyStipend': '₹1,000 / Month (Direct Bank Transfer)',
      'status': 'Eligible',
      'statusColor': Color(0xFF16A34A),
      'statusBg': Color(0xFFDCFCE7),
      'statusIcon': Icons.check_circle_rounded,
      'cardBg': Colors.white,
      'borderColor': Color(0xFFE2E8F0),
      'deadline': '30 Sep 2026',
      'examDate': '15 Oct 2026',
      'desc': 'For students scoring 85%+ in previous exams. Monthly stipend of ₹1,000 directly deposited to bank account.',
      'authority': 'Department of School Education, Govt. of Tamil Nadu',
      'eligibility': [
        'Studying in Tamil Nadu Government or Government-Aided Schools.',
        'Scored 85% or above aggregate marks in 9th or 10th standard.',
        'Annual household income limit below ₹2,50,000.',
        'Must possess active EMIS student ID and linked bank account.',
      ],
      'documents': [
        'Aadhaar Card Copy',
        'Previous Academic Year Marksheet',
        'Income & Community Certificate',
        'School Bonafide Certificate with EMIS ID',
        'Bank Passbook First Page (Student Name)',
      ],
      'iconType': 'cap_coins',
      'themeColor': Color(0xFFD97706),
      'actionLabel': 'Apply Online',
    },
    {
      'id': 'sch_2',
      'title': 'National Means-cum-Merit Scholarship (NMMS)',
      'amount': '₹12,000 / Year',
      'monthlyStipend': '₹1,000 / Month for 4 Years (Class 9 to 12)',
      'status': 'Open for Apply',
      'statusColor': Color(0xFF2563EB),
      'statusBg': Color(0xFFEFF6FF),
      'statusIcon': Icons.access_time_rounded,
      'cardBg': Colors.white,
      'borderColor': Color(0xFFE2E8F0),
      'deadline': '15 Oct 2026',
      'examDate': '25 Nov 2026',
      'desc': 'Centrally sponsored state-level merit examination for meritorious students from economically weaker sections.',
      'authority': 'Ministry of Education, Government of India',
      'eligibility': [
        'Students studying in Class 8, 9, or 10 in Government / Aided schools.',
        'Minimum 55% marks in previous annual examination.',
        'Parental income from all sources not exceeding ₹3,50,000 per annum.',
        'Selection via State Level Mental Ability & Scholastic Aptitude Test (MAT & SAT).',
      ],
      'documents': [
        'Student EMIS ID & School ID Card',
        'Passport Size Photograph',
        'Caste / Income Certificate issued by Revenue Authority',
        'Bank Account Details with IFSC Code',
      ],
      'iconType': 'merit_cap',
      'themeColor': Color(0xFF0284C7),
      'actionLabel': 'View Guidelines & Apply',
    },
  ];

  final List<Map<String, dynamic>> _competitions = const [
    {
      'id': 'comp_1',
      'title': 'State Level Tamil Essay & Elocution Competition',
      'prize': '₹25,000 Prize',
      'prizeBreakdown': '1st: ₹25,000 • 2nd: ₹15,000 • 3rd: ₹10,000 + Certificate',
      'prizeColor': Color(0xFFEA580C),
      'prizeBg': Color(0xFFFFF7ED),
      'cardBg': Colors.white,
      'borderColor': Color(0xFFE2E8F0),
      'date': '12 Nov 2026',
      'venue': 'District Science Centre & Online Video Upload',
      'desc': 'Annual state-wide competition on Tamil classical literature, historical glory, and modern scientific progress.',
      'organizer': 'Tamil Nadu School Education & Cultural Department',
      'topics': [
        'தமிழ் இலக்கியத்தில் அறிவியல் மற்றும் வாழ்வியல் அறங்கள்',
        'செயற்கை நுண்ணறிவும் எதிர்காலத் தமிழகமும்',
        'சுற்றுச்சூழல் பாதுகாப்பு மற்றும் மரபுவழி வேளாண்மை',
      ],
      'rules': [
        'Word limit for essay: 500 to 750 words in clear handwritten Tamil.',
        'Elocution speech duration: 3 to 5 minutes.',
        'Every participant receives an official State Participation Certificate.',
      ],
      'iconType': 'podium_mic',
      'themeColor': Color(0xFFEA580C),
    },
    {
      'id': 'comp_2',
      'title': 'TN Schools STEM Science & AI Innovation Challenge',
      'prize': 'State Award + Shield',
      'prizeBreakdown': 'State Gold Trophy + ₹30,000 Lab Grant for School + STEM Kits',
      'prizeColor': Color(0xFF7C3AED),
      'prizeBg': Color(0xFFF3E8FF),
      'cardBg': Colors.white,
      'borderColor': Color(0xFFE2E8F0),
      'date': '05 Dec 2026',
      'venue': 'Anna University Campus, Chennai',
      'desc': 'Showcase innovative working science models, IoT robotics, clean energy solutions, and Python coding projects.',
      'organizer': 'Tamil Nadu Science and Technology Centre (TNSTC)',
      'topics': [
        'Smart Agriculture & Automated Water Irrigation',
        'Renewable Solar & Wind Energy Harvesters',
        'AI Assisted Accessibility Tools for Students',
      ],
      'rules': [
        'Individual or team entries (up to 3 students per team).',
        'Project report and 2-minute demonstration video required.',
        'Selected prototypes will receive mentorship from IIT Madras researchers.',
      ],
      'iconType': 'trophy_science',
      'themeColor': Color(0xFF7C3AED),
    },
  ];

  // --- SHOW SCHOLARSHIP DETAILS SCREEN / MODAL ---
  void _showScholarshipDetailsModal(BuildContext context, Map<String, dynamic> item) {
    final String id = item['id'];
    final String title = item['title'];
    final String amount = item['amount'];
    final String monthlyStipend = item['monthlyStipend'] ?? amount;
    final String deadline = item['deadline'];
    final String examDate = item['examDate'] ?? 'Announced Soon';
    final String authority = item['authority'] ?? 'Govt of Tamil Nadu';
    final String desc = item['desc'];
    final List<String> eligibility = List<String>.from(item['eligibility'] ?? []);
    final List<String> documents = List<String>.from(item['documents'] ?? []);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final currentApplied = _appliedScholarshipIds.contains(id);

            return Container(
              height: MediaQuery.of(context).size.height * 0.88,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Column(
                children: [
                  // Top Drag Handle
                  Container(
                    width: 44,
                    height: 4.5,
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),

                  // Header Row with Title & Close
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.verified_rounded, size: 14, color: Color(0xFF16A34A)),
                              SizedBox(width: 4),
                              Text(
                                'GOVERNMENT SCHOLARSHIP',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF15803D),
                                  fontFamily: 'Outfit',
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 22),
                          onPressed: () => Navigator.pop(modalCtx),
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 1, color: Color(0xFFF1F5F9)),

                  // Scrollable Body Content
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            authority,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Financial Grant Card
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF059669), Color(0xFF10B981)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(18),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF059669).withValues(alpha: 0.25),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.monetization_on_rounded, color: Colors.white, size: 28),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'TOTAL SCHOLARSHIP GRANT',
                                        style: TextStyle(
                                          color: Colors.white70,
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.6,
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        amount,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 20,
                                          fontWeight: FontWeight.w900,
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                      Text(
                                        monthlyStipend,
                                        style: TextStyle(
                                          color: Colors.white.withValues(alpha: 0.9),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Description
                          Text(
                            desc,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF334155),
                              height: 1.45,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Key Deadlines Row (2 Columns)
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF2F2),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: const Color(0xFFFECACA)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(Icons.timer_outlined, size: 14, color: Color(0xFFDC2626)),
                                          SizedBox(width: 4),
                                          Text(
                                            'Last Date',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFFDC2626),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        deadline,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF991B1B),
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: const Color(0xFFBFDBFE)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(Icons.event_note_rounded, size: 14, color: Color(0xFF2563EB)),
                                          SizedBox(width: 4),
                                          Text(
                                            'Exam / Review',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF2563EB),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        examDate,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF1E40AF),
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // Eligibility Criteria Section
                          const Text(
                            'Eligibility Criteria',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...eligibility.map((e) => Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.check_circle_rounded, size: 15, color: Color(0xFF16A34A)),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        e,
                                        style: const TextStyle(
                                          fontSize: 12.5,
                                          color: Color(0xFF475569),
                                          height: 1.4,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                          const SizedBox(height: 18),

                          // Required Documents Section
                          const Text(
                            'Required Documents',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...documents.map((doc) => Container(
                                width: double.infinity,
                                margin: const EdgeInsets.only(bottom: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.insert_drive_file_outlined, size: 16, color: Color(0xFF3B82F6)),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        doc,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF1E293B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Action Button
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
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
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: currentApplied
                            ? null
                            : () {
                                Navigator.pop(modalCtx);
                                setState(() {
                                  _appliedScholarshipIds.add(id);
                                });
                                // Award coins via CourseService
                                Provider.of<CourseService>(context, listen: false).addRewardCoins(50);
                                _showApplicationSuccessDialog(title, 'TNS-2026-${(1000 + id.hashCode % 9000).abs()}');
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: currentApplied ? const Color(0xFF16A34A) : const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFDCFCE7),
                          disabledForegroundColor: const Color(0xFF15803D),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              currentApplied ? Icons.check_circle_rounded : Icons.send_rounded,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              currentApplied ? 'Application Submitted ✓' : 'Apply Now for Scholarship',
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
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // --- SHOW COMPETITION DETAILS SCREEN / MODAL ---
  void _showCompetitionDetailsModal(BuildContext context, Map<String, dynamic> item) {
    final String id = item['id'];
    final String title = item['title'];
    final String prize = item['prize'];
    final String prizeBreakdown = item['prizeBreakdown'] ?? prize;
    final String date = item['date'];
    final String venue = item['venue'] ?? 'District Centre';
    final String desc = item['desc'];
    final String organizer = item['organizer'] ?? 'Government of Tamil Nadu';
    final List<String> topics = List<String>.from(item['topics'] ?? []);
    final List<String> rules = List<String>.from(item['rules'] ?? []);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final bool currentRegistered = _registeredCompetitionIds.contains(id);

            return Container(
              height: MediaQuery.of(context).size.height * 0.88,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Column(
                children: [
                  // Top Drag Handle
                  Container(
                    width: 44,
                    height: 4.5,
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),

                  // Header Row with Title & Close
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF7ED),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFFFEDD5)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.emoji_events_rounded, size: 14, color: Color(0xFFEA580C)),
                              SizedBox(width: 4),
                              Text(
                                'STATE LEVEL COMPETITION',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFFC2410C),
                                  fontFamily: 'Outfit',
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 22),
                          onPressed: () => Navigator.pop(modalCtx),
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 1, color: Color(0xFFF1F5F9)),

                  // Scrollable Body Content
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            organizer,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Prize Card
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF7C3AED), Color(0xFF9333EA)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(18),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF7C3AED).withValues(alpha: 0.25),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.military_tech_rounded, color: Colors.white, size: 28),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'AWARDS & CASH PRIZES',
                                        style: TextStyle(
                                          color: Colors.white70,
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.6,
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        prize,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 19,
                                          fontWeight: FontWeight.w900,
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                      Text(
                                        prizeBreakdown,
                                        style: TextStyle(
                                          color: Colors.white.withValues(alpha: 0.9),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Description
                          Text(
                            desc,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF334155),
                              height: 1.45,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Date & Venue Details
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF7ED),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: const Color(0xFFFFEDD5)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(Icons.calendar_month_rounded, size: 14, color: Color(0xFFEA580C)),
                                          SizedBox(width: 4),
                                          Text(
                                            'Event Date',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFFEA580C),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        date,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFFC2410C),
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF64748B)),
                                          SizedBox(width: 4),
                                          Text(
                                            'Venue',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF64748B),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        venue,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF1E293B),
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // Topics Section
                          const Text(
                            'Themes & Topics',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...topics.map((topic) => Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.stars_rounded, size: 15, color: Color(0xFFD97706)),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        topic,
                                        style: const TextStyle(
                                          fontSize: 12.5,
                                          color: Color(0xFF475569),
                                          height: 1.4,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                          const SizedBox(height: 18),

                          // Rules Section
                          const Text(
                            'Guidelines & Rules',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...rules.map((rule) => Container(
                                width: double.infinity,
                                margin: const EdgeInsets.only(bottom: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.info_outline_rounded, size: 15, color: Color(0xFF7C3AED)),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        rule,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: Color(0xFF1E293B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Action Button
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
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
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: currentRegistered
                            ? null
                            : () {
                                Navigator.pop(modalCtx);
                                setState(() {
                                  _registeredCompetitionIds.add(id);
                                });
                                // Award coins via CourseService
                                Provider.of<CourseService>(context, listen: false).addRewardCoins(30);
                                _showRegistrationSuccessDialog(title, 'TNC-2026-${(2000 + id.hashCode % 8000).abs()}');
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: currentRegistered ? const Color(0xFF16A34A) : const Color(0xFFEA580C),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFDCFCE7),
                          disabledForegroundColor: const Color(0xFF15803D),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              currentRegistered ? Icons.check_circle_rounded : Icons.how_to_reg_rounded,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              currentRegistered ? 'Registered Successfully ✓' : 'Register for Competition',
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
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // --- APPLICATION SUCCESS CONFIRMATION DIALOG ---
  void _showApplicationSuccessDialog(String title, String applicationNo) {
    showDialog(
      context: context,
      builder: (dialogCtx) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: Color(0xFFDCFCE7),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 40),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Application Submitted!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Your application for "$title" has been successfully forwarded to your school administration.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF64748B),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 14),

                // Application Number Card
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Application ID: ',
                        style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                      ),
                      Text(
                        applicationNo,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Coin Reward
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.monetization_on_rounded, color: Color(0xFFD97706), size: 16),
                      SizedBox(width: 4),
                      Text(
                        '+50 Coins Earned!',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFB45309),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(dialogCtx),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text('Done', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // --- REGISTRATION SUCCESS CONFIRMATION DIALOG ---
  void _showRegistrationSuccessDialog(String title, String ticketNo) {
    showDialog(
      context: context,
      builder: (dialogCtx) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFF7ED),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(Icons.stars_rounded, color: Color(0xFFEA580C), size: 40),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Registration Confirmed!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'You are successfully registered for "$title". An entry confirmation badge has been generated.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF64748B),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 14),

                // Registration Ticket No
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Entry Pass No: ',
                        style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                      ),
                      Text(
                        ticketNo,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Coin Reward
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.monetization_on_rounded, color: Color(0xFFD97706), size: 16),
                      SizedBox(width: 4),
                      Text(
                        '+30 Coins Earned!',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFB45309),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(dialogCtx),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEA580C),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text('View Pass & Done', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: AppLocalization.languageNotifier,
      builder: (context, isTamil, _) {
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: const SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
            statusBarBrightness: Brightness.light,
          ),
          child: Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          body: SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Top App Bar
                  _buildTopAppBar(context),
                  const SizedBox(height: 8),

                  // 2. Hero Card Banner (sholarship.png)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: _buildHeroCardBanner(),
                  ),
                  const SizedBox(height: 14),

                  // 3. Main Content Body
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Section 1: "Available Scholarships"
                        _buildSectionHeader(
                          icon: Icons.card_giftcard_rounded,
                          iconBg: const Color(0xFFF3E8FF),
                          iconColor: const Color(0xFF7C3AED),
                          title: AppLocalization.get('available_scholarships'),
                        ),
                        const SizedBox(height: 12),

                        // Scholarship Cards List
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _scholarships.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final item = _scholarships[index];
                            return _buildScholarshipCard(item);
                          },
                        ),
                        const SizedBox(height: 20),

                        // Section 2: "State Competitions"
                        _buildSectionHeader(
                          icon: Icons.emoji_events_rounded,
                          iconBg: const Color(0xFFF3E8FF),
                          iconColor: const Color(0xFF7C3AED),
                          title: AppLocalization.get('state_competitions'),
                          trailingStar: true,
                        ),
                        const SizedBox(height: 12),

                        // Competitions Cards List
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _competitions.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final item = _competitions[index];
                            return _buildCompetitionCard(item);
                          },
                        ),
                        const SizedBox(height: 20),

                        // Bottom Encouragement Banner (sholarship2.png)
                        _buildBottomBanner(),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: widget.hideBottomNav
              ? null
              : const CustomBottomNavBar(currentIndex: 3),
        ),
      );
    },
    );
  }

  // --- 1. TOP APP BAR ---
  Widget _buildTopAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Rounded Card Back Button with Soft Shadow
          GestureDetector(
            onTap: () {
              if (Navigator.canPop(context)) {
                Navigator.pop(context);
              } else {
                Provider.of<CourseService>(context, listen: false)
                    .setBottomNavIndex(0);
              }
            },
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.chevron_left_rounded,
                color: Color(0xFF0F172A),
                size: 26,
              ),
            ),
          ),

          // Center: Bold Title
          Expanded(
            child: Text(
              AppLocalization.get('scholarships_competitions_title'),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
                fontFamily: 'Outfit',
              ),
            ),
          ),

          // Right: Empty spacer to balance the back button
          const SizedBox(width: 42),
        ],
      ),
    );
  }

  // --- 2. HERO CARD BANNER (sholarship.png) ---
  Widget _buildHeroCardBanner() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = (width * 0.44).clamp(150.0, 185.0);

        return Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Image.asset(
              'assets/images/class/sholarship.png',
              fit: BoxFit.cover,
            ),
          ),
        );
      },
    );
  }

  // --- SECTION HEADER WIDGET ---
  Widget _buildSectionHeader({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    bool trailingStar = false,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: iconColor, size: 17),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            fontFamily: 'Outfit',
          ),
        ),
        if (trailingStar) ...[
          const Spacer(),
          const Text('✨', style: TextStyle(fontSize: 14)),
        ],
      ],
    );
  }

  // --- 2. SCHOLARSHIP CARD (Clickable) ---
  Widget _buildScholarshipCard(Map<String, dynamic> item) {
    final String id = item['id'];
    final bool isApplied = _appliedScholarshipIds.contains(id);
    final String title = item['title']?.toString() ?? 'Scholarship';
    final String amount = item['amount']?.toString() ?? '₹12,000 / Year';
    final String deadline = item['deadline']?.toString() ?? '30 Sep 2026';
    final String statusRaw = isApplied ? 'Applied' : (item['status']?.toString() ?? 'Eligible');
    final String status = isApplied
        ? 'Applied ✓'
        : (statusRaw == 'Eligible'
            ? AppLocalization.get('eligible')
            : (statusRaw == 'Open for Apply'
                ? AppLocalization.get('open_for_apply')
                : statusRaw));
    final Color statusColor = isApplied ? const Color(0xFF15803D) : ((item['statusColor'] as Color?) ?? const Color(0xFF16A34A));
    final Color statusBg = isApplied ? const Color(0xFFDCFCE7) : ((item['statusBg'] as Color?) ?? const Color(0xFFDCFCE7));
    final IconData statusIcon = isApplied ? Icons.check_circle_rounded : ((item['statusIcon'] as IconData?) ?? Icons.check_circle_rounded);
    final Color cardBg = (item['cardBg'] as Color?) ?? Colors.white;
    final Color borderColor = isApplied ? const Color(0xFF86EFAC) : ((item['borderColor'] as Color?) ?? const Color(0xFFE2E8F0));
    final String iconType = item['iconType']?.toString() ?? 'cap_coins';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _showScholarshipDetailsModal(context, item),
        child: Container(
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: borderColor, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.025),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Left 3D Icon Box
                _buildScholarshipIcon(iconType),
                const SizedBox(width: 12),

                // Center Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Amount & Status Badge Row
                      Row(
                        children: [
                          Text(
                            amount,
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF059669),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: statusBg,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(statusIcon, size: 11, color: statusColor),
                                const SizedBox(width: 4),
                                Text(
                                  status,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: statusColor,
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),

                      // Title
                      Text(
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                          height: 1.2,
                          fontFamily: 'Outfit',
                        ),
                      ),
                      const SizedBox(height: 5),

                      // Last Date Row
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 12, color: Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Text(
                            '${AppLocalization.isTamil ? 'கடைசி நாள்: ' : 'Last Date: '}$deadline',
                            style: const TextStyle(
                              fontSize: 10.5,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),

                // Right Action Arrow
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 13,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- 3. COMPETITION CARD (Clickable) ---
  Widget _buildCompetitionCard(Map<String, dynamic> item) {
    final String id = item['id'];
    final bool isRegistered = _registeredCompetitionIds.contains(id);
    final String title = item['title']?.toString() ?? 'Competition';
    final String date = item['date']?.toString() ?? '12 Nov 2026';
    final String prize = item['prize']?.toString() ?? 'State Award';
    final Color cardBg = (item['cardBg'] as Color?) ?? Colors.white;
    final Color borderColor = isRegistered ? const Color(0xFF86EFAC) : ((item['borderColor'] as Color?) ?? const Color(0xFFE2E8F0));
    final String iconType = item['iconType']?.toString() ?? 'trophy_science';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _showCompetitionDetailsModal(context, item),
        child: Container(
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: borderColor, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.025),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Left 3D Icon Box
                _buildCompetitionIcon(iconType),
                const SizedBox(width: 12),

                // Center Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      Text(
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                          height: 1.2,
                          fontFamily: 'Outfit',
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Date & Prize Info Row
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 11, color: Color(0xFF64748B)),
                          const SizedBox(width: 3),
                          Text(
                            '${AppLocalization.isTamil ? 'நிகழ்வு: ' : 'Event Date: '}$date',
                            style: const TextStyle(
                              fontSize: 10,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text('|', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10)),
                          const SizedBox(width: 6),
                          const Icon(Icons.card_giftcard_rounded, size: 11, color: Color(0xFF7C3AED)),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              isRegistered ? 'Registered ✓' : '${AppLocalization.isTamil ? 'பரிசு: ' : 'Prize: '}$prize',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 10,
                                color: isRegistered ? const Color(0xFF15803D) : const Color(0xFF475569),
                                fontWeight: isRegistered ? FontWeight.bold : FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),

                // Right Action Arrow
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 13,
                    color: Color(0xFF7C3AED),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- 3D Styled Scholarship Icon Box ---
  Widget _buildScholarshipIcon(String iconType) {
    if (iconType == 'cap_coins') {
      return Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFDE68A)),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned(
              top: 8,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: Color(0xFF7C3AED),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.school_rounded, color: Colors.white, size: 16),
              ),
            ),
            Positioned(
              bottom: 8,
              child: Container(
                padding: const EdgeInsets.all(3),
                decoration: const BoxDecoration(
                  color: Color(0xFFF59E0B),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.currency_rupee_rounded, color: Colors.white, size: 12),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: const Color(0xFF0284C7),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.assignment_turned_in_rounded, color: Colors.white, size: 18),
          ),
          Positioned(
            right: 8,
            bottom: 8,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: Color(0xFFF59E0B),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.star_rounded, color: Colors.white, size: 8),
            ),
          ),
        ],
      ),
    );
  }

  // --- 3D Styled Competition Icon Box ---
  Widget _buildCompetitionIcon(String iconType) {
    if (iconType == 'podium_mic') {
      return Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7ED),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFFEDD5)),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: const Color(0xFF7C3AED),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.record_voice_over_rounded, color: Colors.white, size: 18),
            ),
            Positioned(
              right: 8,
              top: 8,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: const BoxDecoration(
                  color: Color(0xFFF59E0B),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.star_rounded, color: Colors.white, size: 8),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: const Color(0xFFF3E8FF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE9D5FF)),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: const Color(0xFFD97706),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.emoji_events_rounded, color: Colors.white, size: 18),
          ),
          Positioned(
            left: 8,
            bottom: 8,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: Color(0xFF0284C7),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.science_rounded, color: Colors.white, size: 8),
            ),
          ),
        ],
      ),
    );
  }

  // --- 4. BOTTOM ENCOURAGEMENT BANNER (sholarship2.png) ---
  Widget _buildBottomBanner() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = (width * 0.44).clamp(145.0, 180.0);

        return Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Image.asset(
              'assets/images/class/sholarship2.png',
              fit: BoxFit.cover,
            ),
          ),
        );
      },
    );
  }
}
