import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/localization/app_localization.dart';
import '../models/homework.dart';
import '../services/course_service.dart';
import '../theme/app_theme.dart';
import '../widgets/bottom_nav_bar.dart';
import '../core/constants/app_constants.dart';

class HomeworkAssignmentsScreen extends StatefulWidget {
  final bool hideBottomNav;
  const HomeworkAssignmentsScreen({super.key, this.hideBottomNav = false});

  @override
  State<HomeworkAssignmentsScreen> createState() =>
      _HomeworkAssignmentsScreenState();
}

class _HomeworkAssignmentsScreenState extends State<HomeworkAssignmentsScreen> {
  // Base URL Options:
  // Option 1: Production (Vercel) -> https://tn-schools-mobile-app-backend.vercel.app
  // Option 2: Localhost Development -> http://localhost:5000
  static String get _baseUrl => AppConstants.baseUrl;
  bool _isLoadingHomework = false;
  bool _hasInitialFetched = false;

  // Local fallback AI guidance dictionary for offline resilience
  static const Map<String, List<String>> _offlineAiGuidance = {
    'Mathematics': [
      'Break down the formula into known and unknown variables first.',
      'Solve quadratic equations step-by-step using factorization or the quadratic formula (-b ± √(b² - 4ac)) / 2a.',
      'Check your roots by plugging them back into the original equation to verify.',
      'Draw coordinate graphs if finding roots visually is helpful.',
    ],
    'Science': [
      'Identify the main biological organs or physical principles involved.',
      'Draw a neat, well-labeled diagram with arrows pointing to each organ/component.',
      'List key functions in concise bullet points with scientific terminology.',
      'Double check spelling of biological terms before final submission.',
    ],
    'Tamil': [
      'திருக்குறளின் மூலக் கருத்து மற்றும் ஆசிரியர் குறிப்பை முதலில் எழுதவும்.',
      'பாடலின் பொருள், நயம், மற்றும் அணிகளைப் பிரித்துத் தெளிவாக விளக்குக.',
      'நடைமுறை வாழ்க்கை எடுத்துக்காட்டுகளுடன் கருத்துக்களை ஒப்பிடுக.',
      'முடிவுரையில் குறளின் வாழ்வியல் படிப்பினையைத் தொகுத்து முடிக்கவும்.',
    ],
    'English': [
      'Structure your essay/answer: Introduction, 2-3 Body Paragraphs, and Conclusion.',
      'Use active voice, descriptive vocabulary, and proper punctuation.',
      'Quote key lines from the text to support your points.',
      'Proofread for subject-verb agreement and spelling before submitting.',
    ],
    'Social Science': [
      'Create a timeline or chronological map of historical events.',
      'Highlight major dates, leaders, treaties, and geographic significance.',
      'Explain cause and effect relationships clearly in separate paragraphs.',
      'Add key map pointers or constitutional articles where relevant.',
    ],
  };

  final Set<String> _expandedIds = {};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_hasInitialFetched) {
      _hasInitialFetched = true;
      _fetchHomework();
    }
  }

  // ─── 1. FETCH HOMEWORK ──────────────────────────────────────────────────
  Future<void> _fetchHomework() async {
    final courseService = Provider.of<CourseService>(context, listen: false);
    final student = courseService.student;
    final studentId = (student.studentId != null && student.studentId!.isNotEmpty)
        ? student.studentId!
        : (student.rollNumber.isNotEmpty
            ? student.rollNumber
            : (student.id.isNotEmpty ? student.id : ''));

    if (studentId.isEmpty) return;

    setState(() => _isLoadingHomework = true);

    try {
      final response = await http
          .get(
            Uri.parse('$_baseUrl/api/students/$studentId/homework'),
            headers: {
              'Content-Type': 'application/json',
              if (student.token != null && student.token!.isNotEmpty)
                'Authorization': 'Bearer ${student.token}',
            },
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(response.body);
        if (body['success'] == true && body['data'] is List) {
          final List<dynamic> dataList = body['data'];
          final List<HomeworkItem> parsed =
              dataList.map((item) => HomeworkItem.fromJson(item)).toList();
          courseService.setHomeworkItems(parsed);
          _expandedIds.addAll(parsed.map((e) => e.id));
        }
      }
    } catch (err) {
      debugPrint('Error fetching homework: $err');
      // Graceful fallback to existing courseService mock items
    } finally {
      if (mounted) {
        setState(() => _isLoadingHomework = false);
      }
    }
  }

  // ─── 2. ASK AI HOMEWORK IDEAS / GUIDANCE ────────────────────────────────
  Future<void> _handleAskAiIdeas(HomeworkItem assignment) async {
    List<String> tips = [];
    bool loadingTips = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) {
          // Trigger API call once on mount
          if (loadingTips && tips.isEmpty) {
            _requestAiTips(assignment).then((resultTips) {
              setSheetState(() {
                tips = resultTips;
                loadingTips = false;
              });
            });
          }

          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.78,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            padding: EdgeInsets.only(
              left: 22,
              right: 22,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle Bar
                Center(
                  child: Container(
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppTheme.borderLight,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // AI Header Badge & Title
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.auto_awesome_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                AppLocalization.isTamil
                                    ? 'AI வீட்டுப்பாட வழிகாட்டி'
                                    : 'AI Homework Ideas',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textDark,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEEF2FF),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'Smart Hints',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF4F46E5),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            assignment.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: AppTheme.textMedium,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Content: Loading or Tips List
                Expanded(
                  child: loadingTips
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEEF2FF),
                                  shape: BoxShape.circle,
                                ),
                                child: const CircularProgressIndicator(
                                  color: Color(0xFF6366F1),
                                  strokeWidth: 3,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                AppLocalization.isTamil
                                    ? 'AI யோசனைகளை உருவாக்குகிறது...'
                                    : 'Generating smart ideas & hints...',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF475569),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                AppLocalization.isTamil
                                    ? 'உங்கள் பாடத்திட்டத்திற்கு ஏற்ப யோசனைகள்'
                                    : 'Tailoring guidance to your syllabus',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.textLight,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          physics: const BouncingScrollPhysics(),
                          itemCount: tips.length,
                          separatorBuilder: (context, index) =>
                              const SizedBox(height: 12),
                          itemBuilder: (context, idx) {
                            return Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: const Color(0xFFE2E8F0),
                                ),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 26,
                                    height: 26,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE0E7FF),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '${idx + 1}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF4338CA),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      tips[idx],
                                      style: const TextStyle(
                                        fontSize: 13.5,
                                        color: Color(0xFF1E293B),
                                        height: 1.45,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () {
                                      Clipboard.setData(
                                          ClipboardData(text: tips[idx]));
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            AppLocalization.isTamil
                                                ? 'நகலெடுக்கப்பட்டது!'
                                                : 'Hint copied to clipboard!',
                                          ),
                                          duration:
                                              const Duration(seconds: 1),
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(10)),
                                        ),
                                      );
                                    },
                                    child: const Icon(
                                      Icons.copy_rounded,
                                      size: 16,
                                      color: Color(0xFF94A3B8),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
                const SizedBox(height: 16),

                // Got It / Close Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      AppLocalization.isTamil ? 'புரிந்தது 👍' : 'Got it, Thanks! 👍',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<List<String>> _requestAiTips(HomeworkItem assignment) async {
    final courseService = Provider.of<CourseService>(context, listen: false);
    final token = courseService.student.token;

    try {
      final res = await http
          .post(
            Uri.parse('$_baseUrl/api/ai/homework-ideas'),
            headers: {
              'Content-Type': 'application/json',
              if (token != null && token.isNotEmpty)
                'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'title': assignment.title,
              'description': assignment.description,
              'fullBrief': assignment.fullBrief,
              'subject': assignment.subject,
            }),
          )
          .timeout(const Duration(seconds: 8));

      final data = jsonDecode(res.body);
      if (data['success'] == true && data['tips'] is List) {
        final list = List<String>.from(data['tips']);
        if (list.isNotEmpty) return list;
      }
    } catch (err) {
      debugPrint('Error fetching AI homework ideas: $err');
    }

    // Fallback based on subject or assignment
    for (final entry in _offlineAiGuidance.entries) {
      if (assignment.subject.toLowerCase().contains(entry.key.toLowerCase())) {
        return entry.value;
      }
    }

    return [
      "Review the key definitions and formulas in your textbook chapter.",
      "List out the given information and what you need to solve.",
      "Break the assignment into smaller steps and solve sequentially.",
      "Include neat diagrams or step-by-step reasoning where applicable.",
    ];
  }

  // ─── 3. SUBMIT HOMEWORK MODAL (handleSubmit) ────────────────────────────
  void _showSubmitHomeworkDialog(
      BuildContext context, HomeworkItem hw, CourseService courseService) {
    final TextEditingController answerController =
        TextEditingController(text: hw.submittedAnswer ?? '');
    List<PlatformFile> selectedFiles = [];
    List<dynamic> existingFiles = List.from(hw.submittedFiles);
    bool isSubmitting = false;
    bool isPickingFile = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.88,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            padding: EdgeInsets.only(
              left: 22,
              right: 22,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle Bar
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppTheme.borderLight,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppLocalization.get('submit_solution'),
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textDark,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            hw.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppTheme.textMedium,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          hw.subject,
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF475569),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Solution Notes Text Input (answerText)
                  const Text(
                    'Notes / Solution Text',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: TextField(
                      controller: answerController,
                      maxLines: 3,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                      decoration: InputDecoration(
                        hintText: AppLocalization.isTamil
                            ? 'உங்கள் பதில்கள் அல்லது குறிப்புகளை இங்கே எழுதவும்...'
                            : 'Type your solution, steps, or answer notes here...',
                        hintStyle: const TextStyle(
                            fontSize: 12.5, color: Color(0xFF94A3B8)),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // File Upload Area
                  const Text(
                    'Attached Files (PDF, Images, Docs)',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Interactive File Picker Trigger Box
                  GestureDetector(
                    onTap: isSubmitting
                        ? null
                        : () async {
                            try {
                              setModalState(() => isPickingFile = true);
                              final result =
                                  await FilePickerPlatform.instance.pickFiles(
                                type: FileType.custom,
                                allowedExtensions: [
                                  'pdf',
                                  'png',
                                  'jpg',
                                  'jpeg',
                                  'doc',
                                  'docx'
                                ],
                              );

                              if (result.isNotEmpty) {
                                setModalState(() {
                                  selectedFiles.addAll(result);
                                  isPickingFile = false;
                                });
                              } else {
                                setModalState(() => isPickingFile = false);
                              }
                            } catch (e) {
                              setModalState(() => isPickingFile = false);
                            }
                          },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                          vertical: 16, horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: selectedFiles.isNotEmpty
                              ? const Color(0xFF0284C7)
                              : const Color(0xFFCBD5E1),
                          width: 1.5,
                        ),
                      ),
                      child: isPickingFile
                          ? Column(
                              children: const [
                                SizedBox(
                                  height: 24,
                                  width: 24,
                                  child: CircularProgressIndicator(
                                    color: Color(0xFF0284C7),
                                    strokeWidth: 2.5,
                                  ),
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Opening File Selector...',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF64748B),
                                      fontWeight: FontWeight.w600),
                                ),
                              ],
                            )
                          : Column(
                              children: [
                                const Icon(
                                  Icons.cloud_upload_rounded,
                                  size: 32,
                                  color: Color(0xFF0284C7),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  AppLocalization.isTamil
                                      ? 'கோப்புகளை இணைக்க தட்டவும்'
                                      : 'Tap to Browse & Add Files',
                                  style: const TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textDark,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'Supports Photos, PDF, Word Docs up to 20MB',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: AppTheme.textLight,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // List of Newly Selected Files
                  if (selectedFiles.isNotEmpty) ...[
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: selectedFiles.length,
                      itemBuilder: (context, fIdx) {
                        final file = selectedFiles[fIdx];
                        final ext = file.name.split('.').last;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: const Color(0xFF86EFAC)),
                          ),
                          child: Row(
                            children: [
                              Icon(_getFileIcon(ext),
                                  color: const Color(0xFF16A34A), size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      file.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF166534),
                                      ),
                                    ),
                                    const Text(
                                      'Ready to upload',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF15803D),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                constraints: const BoxConstraints(),
                                padding: EdgeInsets.zero,
                                onPressed: () {
                                  setModalState(() {
                                    selectedFiles.removeAt(fIdx);
                                  });
                                },
                                icon: const Icon(
                                  Icons.close_rounded,
                                  size: 18,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],

                  // List of Existing Previously Submitted Files
                  if (existingFiles.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    const Text(
                      'Previously Uploaded:',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    ...existingFiles.map((ef) {
                      final name = ef is Map
                          ? (ef['name'] ?? ef['id'] ?? 'File')
                          : ef.toString();
                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: const Color(0xFFCBD5E1)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.attach_file_rounded,
                                size: 16, color: Color(0xFF475569)),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontSize: 11.5,
                                    color: Color(0xFF334155)),
                              ),
                            ),
                            IconButton(
                              constraints: const BoxConstraints(),
                              padding: EdgeInsets.zero,
                              onPressed: () {
                                setModalState(() {
                                  existingFiles.remove(ef);
                                });
                              },
                              icon: const Icon(Icons.delete_outline_rounded,
                                  size: 16, color: Color(0xFFEF4444)),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],

                  const SizedBox(height: 20),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              setModalState(() => isSubmitting = true);
                              await _executeSubmitHomework(
                                modalContext: modalContext,
                                hw: hw,
                                answerText: answerController.text.trim(),
                                files: selectedFiles,
                                existingFiles: existingFiles,
                                courseService: courseService,
                              );
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                      ),
                      child: isSubmitting
                          ? Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2.5,
                                  ),
                                ),
                                SizedBox(width: 12),
                                Text(
                                  'Submitting Solution...',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ],
                            )
                          : Text(
                              AppLocalization.get('submit_solution'),
                              style: const TextStyle(
                                fontSize: 15,
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
      ),
    );
  }

  Future<void> _executeSubmitHomework({
    required BuildContext modalContext,
    required HomeworkItem hw,
    required String answerText,
    required List<PlatformFile> files,
    required List<dynamic> existingFiles,
    required CourseService courseService,
  }) async {
    final student = courseService.student;
    final studentId = (student.studentId != null && student.studentId!.isNotEmpty)
        ? student.studentId!
        : (student.id.isNotEmpty ? student.id : 's1');

    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(modalContext);

    try {
      final uri =
          Uri.parse('$_baseUrl/api/students/$studentId/homework/${hw.id}/submit');
      final request = http.MultipartRequest('POST', uri);

      if (student.token != null && student.token!.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer ${student.token}';
      }

      // 1. Text answer
      request.fields['answerText'] = answerText;

      // 2. Existing files
      request.fields['existingFiles'] = jsonEncode(existingFiles);

      // 3. New files
      for (final f in files) {
        if (f.path != null && f.path!.isNotEmpty) {
          request.files.add(await http.MultipartFile.fromPath(
            'files',
            f.path!,
            filename: f.name,
          ));
        }
      }

      final streamedResponse =
          await request.send().timeout(const Duration(seconds: 15));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data['success'] == true) {
          final firstFileName = files.isNotEmpty
              ? files.first.name
              : (existingFiles.isNotEmpty
                  ? (existingFiles.first is Map
                      ? existingFiles.first['name']
                      : existingFiles.first.toString())
                  : 'Submitted Note');

          courseService.submitHomework(
            hw.id,
            fileName: firstFileName,
            answerText: answerText,
            files: [...existingFiles, ...files.map((f) => f.name)],
            submittedDate: 'Today, Just now',
          );

          if (mounted) {
            navigator.pop();
            scaffoldMessenger.showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded,
                        color: Colors.white, size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        AppLocalization.isTamil
                            ? 'வீட்டுப்பாடம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!'
                            : 'Homework solution submitted successfully! 🎉',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                backgroundColor: const Color(0xFF16A34A),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              ),
            );
            // Refresh list from backend
            _fetchHomework();
          }
          return;
        }
      }
    } catch (err) {
      debugPrint('Error in handleSubmit: $err');
    }

    // Local fallback update if offline
    final firstFileName = files.isNotEmpty
        ? files.first.name
        : (existingFiles.isNotEmpty
            ? existingFiles.first.toString()
            : 'homework_solution.pdf');

    courseService.submitHomework(
      hw.id,
      fileName: firstFileName,
      answerText: answerText,
      files: [...existingFiles, ...files.map((f) => f.name)],
      submittedDate: 'Today, Just now',
    );

    if (mounted) {
      navigator.pop();
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded,
                  color: Colors.white, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  AppLocalization.isTamil
                      ? 'வீட்டுப்பாடம் வெற்றிகரமாக சேமிக்கப்பட்டது!'
                      : 'Homework solution submitted successfully! (Saved)',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF16A34A),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      );
    }
  }

  static IconData _getFileIcon(String? ext) {
    if (ext == null) return Icons.insert_drive_file_rounded;
    final lower = ext.toLowerCase();
    if (lower == 'pdf') {
      return Icons.picture_as_pdf_rounded;
    } else if (lower == 'png' || lower == 'jpg' || lower == 'jpeg') {
      return Icons.image_rounded;
    } else if (lower == 'doc' || lower == 'docx') {
      return Icons.description_rounded;
    }
    return Icons.insert_drive_file_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final courseService = Provider.of<CourseService>(context);
    final homeworkList = courseService.homeworkItems;
    final pendingCount = homeworkList.where((h) => !h.isCompleted).length;

    return ValueListenableBuilder<bool>(
      valueListenable: AppLocalization.languageNotifier,
      builder: (context, isTamil, _) {
        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          body: SafeArea(
            child: RefreshIndicator(
              color: const Color(0xFF0284C7),
              onRefresh: _fetchHomework,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Top App Bar
                    _buildTopAppBar(context),
                    const SizedBox(height: 8),

                    // 2. Hero Card Banner (homework.png)
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
                          // Pending Tasks Banner (homework2.png)
                          _buildPendingTasksBanner(pendingCount),
                          const SizedBox(height: 20),

                          // Section Title: "Your Assignments"
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Text('🛍️',
                                      style: TextStyle(fontSize: 18)),
                                  const SizedBox(width: 6),
                                  Text(
                                    AppLocalization.get('assignments'),
                                    style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF0F172A),
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                ],
                              ),
                              if (_isLoadingHomework)
                                const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Color(0xFF0284C7),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Assignments List or Empty / Loading State
                          if (_isLoadingHomework && homeworkList.isEmpty)
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 36),
                              alignment: Alignment.center,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const CircularProgressIndicator(
                                    color: Color(0xFF0284C7),
                                    strokeWidth: 2.5,
                                  ),
                                  const SizedBox(height: 14),
                                  Text(
                                    AppLocalization.isTamil
                                        ? 'வீட்டுப்பாடங்கள் ஏற்றப்படுகின்றன...'
                                        : 'Fetching your assignments...',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else if (homeworkList.isEmpty)
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(
                                  vertical: 28, horizontal: 20),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                    color: const Color(0xFFE2E8F0)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.02),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF0FDF4),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.task_alt_rounded,
                                      size: 36,
                                      color: Color(0xFF16A34A),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    AppLocalization.isTamil
                                        ? 'நிலுவை வீட்டுப்பாடங்கள் இல்லை!'
                                        : 'No Homework Assigned Yet! 🎉',
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0F172A),
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    AppLocalization.isTamil
                                        ? 'உங்கள் ஆசிரியர் புதிய வீட்டுப்பாடங்களை ஒதுக்கியதும் அவை இங்கே தோன்றும்.'
                                        : 'When your teachers assign new homework for your class, it will appear right here.',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF64748B),
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 14),
                                  OutlinedButton.icon(
                                    onPressed: _fetchHomework,
                                    icon: const Icon(Icons.sync_rounded,
                                        size: 16),
                                    label: Text(
                                      AppLocalization.isTamil
                                          ? 'மீண்டும் சரிபார்க்கவும்'
                                          : 'Check for Updates',
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: const Color(0xFF0284C7),
                                      side: const BorderSide(
                                          color: Color(0xFFBAE6FD)),
                                      shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(12),
                                      ),
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 16, vertical: 8),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: homeworkList.length,
                              separatorBuilder: (context, index) =>
                                  const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final hw = homeworkList[index];
                                return _buildAssignmentCard(
                                    context, hw, courseService);
                              },
                            ),
                          const SizedBox(height: 18),

                          // Bottom Encouragement Card
                          _buildBottomEncouragementCard(),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          bottomNavigationBar: widget.hideBottomNav
              ? null
              : const CustomBottomNavBar(currentIndex: 3),
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
          // Left: Rounded Card Back Button
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

          // Center: Title
          Expanded(
            child: Text(
              AppLocalization.get('homework_assignments_title'),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
                fontFamily: 'Outfit',
              ),
            ),
          ),

          // Right: Refresh button
          GestureDetector(
            onTap: _fetchHomework,
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
                Icons.sync_rounded,
                color: Color(0xFF0284C7),
                size: 22,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- 2. HERO CARD BANNER ---
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
              'assets/images/class/homework.png',
              fit: BoxFit.cover,
            ),
          ),
        );
      },
    );
  }

  // --- 3. PENDING TASKS BANNER ---
  Widget _buildPendingTasksBanner(int pendingCount) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = width / 3.65;

        return Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Image.asset(
                    'assets/images/class/homework2.png',
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned(
                  left: width * 0.26,
                  top: 0,
                  bottom: 0,
                  right: width * 0.28,
                  child: Center(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            AppLocalization.isTamil
                                ? '$pendingCount நிலுவைப் பணிகள்'
                                : '$pendingCount Pending Tasks',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            AppLocalization.isTamil
                                ? 'நாணயங்கள் பெற இன்றே முடியுங்கள்!'
                                : 'Complete before due date\nto earn XP!',
                            style: const TextStyle(
                              fontSize: 10.5,
                              color: Color(0xFF64748B),
                              height: 1.2,
                              fontWeight: FontWeight.w500,
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
        );
      },
    );
  }

  // ─── 4. VIEW DETAILS MODAL ──────────────────────────────────────────────
  void _showViewDetailsDialog(
      BuildContext context, HomeworkItem hw, CourseService courseService) {
    try {
      courseService.recordLearningActivity(
        subject: hw.subject,
        resourceIdOrUrl: hw.id,
        title: hw.title,
        category: 'homework',
        type: 'assignment',
      );
    } catch (_) {}

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (detailContext) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: EdgeInsets.only(
          left: 22,
          right: 22,
          top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle Bar
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.borderLight,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Header: Subject Badge & Class & Close
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          hw.subject,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF00B074),
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        hw.className.isNotEmpty
                            ? (hw.className.startsWith('Class')
                                ? hw.className
                                : 'Class ${hw.className}')
                            : 'Class 12A',
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(detailContext),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: const Icon(Icons.close_rounded,
                        size: 22, color: Color(0xFF64748B)),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Title
              Text(
                hw.title,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                  fontFamily: 'Outfit',
                ),
              ),
              const SizedBox(height: 6),

              // Due Date & Status Row
              Row(
                children: [
                  Icon(
                    hw.isCompleted
                        ? Icons.check_circle_rounded
                        : Icons.history_rounded,
                    size: 16,
                    color: hw.isCompleted
                        ? const Color(0xFF10B981)
                        : const Color(0xFF64748B),
                  ),
                  const SizedBox(width: 5),
                  Flexible(
                    child: Text(
                      hw.isCompleted
                          ? (AppLocalization.isTamil
                              ? 'சமர்ப்பிக்கப்பட்டது'
                              : 'Submitted')
                          : (AppLocalization.isTamil
                              ? 'சமர்ப்பிக்கப்படவில்லை'
                              : 'Not submitted'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: hw.isCompleted
                            ? const Color(0xFF10B981)
                            : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Due: ${hw.dueDate}',
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(color: Color(0xFFF1F5F9), height: 1),
              const SizedBox(height: 16),

              // Description / Instructions Title
              Text(
                AppLocalization.isTamil
                    ? 'பணி விவரங்கள் & வழிமுறைகள்'
                    : 'Assignment Description & Instructions',
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                  fontFamily: 'Outfit',
                ),
              ),
              const SizedBox(height: 8),

              // Full Description Content
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Text(
                  hw.description.isNotEmpty
                      ? hw.description
                      : (hw.fullBrief.isNotEmpty
                          ? hw.fullBrief
                          : 'No specific instructions provided for this assignment.'),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF334155),
                    height: 1.5,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // If Graded or Has Feedback
              if (hw.score != null && hw.score != '—') ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF86EFAC)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.military_tech_rounded,
                          color: Color(0xFF16A34A), size: 24),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Score: ${hw.score}',
                              style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF15803D),
                              ),
                            ),
                            if (hw.feedback != null && hw.feedback!.isNotEmpty)
                              Text(
                                'Teacher: "${hw.feedback}"',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF166534),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // If Already Submitted Answer/Files
              if (hw.submittedAnswer != null || hw.submittedFiles.isNotEmpty) ...[
                const Text(
                  'Your Submission:',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (hw.submittedAnswer != null &&
                          hw.submittedAnswer!.isNotEmpty)
                        Text(
                          hw.submittedAnswer!,
                          style: const TextStyle(
                              fontSize: 13, color: Color(0xFF334155)),
                        ),
                      if (hw.submittedFiles.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        ...hw.submittedFiles.map((f) => Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.attach_file_rounded,
                                      size: 15, color: Color(0xFF64748B)),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      f is Map
                                          ? (f['name'] ?? f['id'] ?? 'File')
                                          : f.toString(),
                                      style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: Color(0xFF0F172A)),
                                    ),
                                  ),
                                ],
                              ),
                            )),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 18),
              ],

              // Buttons: AI Guidance + Submit / Resubmit
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(detailContext);
                        _handleAskAiIdeas(hw);
                      },
                      icon: const Icon(Icons.auto_awesome_rounded,
                          size: 16, color: Color(0xFF4F46E5)),
                      label: Text(
                        AppLocalization.isTamil ? 'AI யோசனைகள்' : 'Ask AI Ideas',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF4338CA),
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: const BorderSide(color: Color(0xFFC7D2FE)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(detailContext);
                        _showSubmitHomeworkDialog(context, hw, courseService);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00B074),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        hw.isCompleted
                            ? (AppLocalization.isTamil
                                ? 'மீண்டும் சமர்ப்பி'
                                : 'Resubmit')
                            : (AppLocalization.isTamil
                                ? 'வீட்டுப்பாடம் சமர்ப்பி'
                                : 'Submit Homework'),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- 5. ASSIGNMENT CARD ---
  Widget _buildAssignmentCard(
      BuildContext context, HomeworkItem hw, CourseService courseService) {
    final isExpanded = _expandedIds.contains(hw.id);

    // Dynamic subject color or clean emerald default
    Color subjectColor = const Color(0xFF00B074);
    if (hw.subjectColor != null && hw.subjectColor!.isNotEmpty) {
      try {
        final hex = hw.subjectColor!.replaceAll('#', '');
        subjectColor = Color(int.parse('0xFF$hex'));
      } catch (_) {}
    } else {
      final subLower = hw.subject.toLowerCase();
      if (subLower.contains('math')) {
        subjectColor = const Color(0xFF6366F1);
      } else if (subLower.contains('tamil')) {
        subjectColor = const Color(0xFFEC4899);
      } else if (subLower.contains('eng')) {
        subjectColor = const Color(0xFFF59E0B);
      } else if (subLower.contains('social')) {
        subjectColor = const Color(0xFF3B82F6);
      }
    }

    final classDisplay = hw.className.isNotEmpty
        ? (hw.className.startsWith('Class')
            ? hw.className
            : 'Class ${hw.className}')
        : 'Class 12A';

    final descriptionText = hw.description.isNotEmpty
        ? hw.description
        : (hw.fullBrief.isNotEmpty ? hw.fullBrief : '');

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: const Color(0xFFE2E8F0),
          width: 1.1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Left Document Icon + Subject + Class + Expand Chevron
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Left Green Document Icon Badge
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.description_rounded,
                  color: Color(0xFF00B074),
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),

              // Subject + Class text
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        hw.subject,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: subjectColor,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        classDisplay,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Expand / Collapse Chevron
              GestureDetector(
                onTap: () {
                  setState(() {
                    if (isExpanded) {
                      _expandedIds.remove(hw.id);
                    } else {
                      _expandedIds.add(hw.id);
                    }
                  });
                },
                child: Padding(
                  padding: const EdgeInsets.all(4.0),
                  child: Icon(
                    isExpanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: const Color(0xFF64748B),
                    size: 22,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Row 2: Title
          Text(
            hw.title,
            style: const TextStyle(
              fontSize: 15.5,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
              fontFamily: 'Outfit',
              height: 1.3,
            ),
          ),

          // Row 3: Description (collapsible / expanded)
          if (descriptionText.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              descriptionText,
              maxLines: isExpanded ? null : 2,
              overflow: isExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12.8,
                color: Color(0xFF475569),
                height: 1.45,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],

          const SizedBox(height: 14),

          // Row 4: Status & Due Date
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Left: Status with icon
              Flexible(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      hw.isCompleted
                          ? Icons.check_circle_rounded
                          : Icons.history_rounded,
                      size: 17,
                      color: hw.isCompleted
                          ? const Color(0xFF10B981)
                          : const Color(0xFF64748B),
                    ),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        hw.status == 'graded'
                            ? 'Graded (${hw.score ?? 'A'})'
                            : (hw.isCompleted
                                ? (AppLocalization.isTamil
                                    ? 'சமர்ப்பிக்கப்பட்டது'
                                    : 'Submitted')
                                : (hw.status == 'late_submission'
                                    ? (AppLocalization.isTamil
                                        ? 'தாமதமாக சமர்ப்பிக்கப்பட்டது'
                                        : 'Late Submission')
                                    : (AppLocalization.isTamil
                                        ? 'சமர்ப்பிக்கப்படவில்லை'
                                        : 'Not submitted'))),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: hw.isCompleted
                              ? const Color(0xFF10B981)
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Right: Due Date
              Text(
                'Due: ${hw.dueDate}',
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Row 5: Action Buttons (View Details, AI Ideas & Submit Homework)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  // View Details Button (Outlined white container)
                  GestureDetector(
                    onTap: () =>
                        _showViewDetailsDialog(context, hw, courseService),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 7.5),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: const Color(0xFFE2E8F0),
                          width: 1.2,
                        ),
                      ),
                      child: Text(
                        AppLocalization.isTamil
                            ? 'விவரங்களைக் காண்க'
                            : 'View Details',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ),

                  // AI Ideas Quick Hint Button
                  GestureDetector(
                    onTap: () => _handleAskAiIdeas(hw),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 9, vertical: 7.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: const Color(0xFFC7D2FE),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.auto_awesome_rounded,
                            size: 14,
                            color: Color(0xFF4F46E5),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            AppLocalization.isTamil ? 'AI உதவி' : 'AI Ideas',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF4338CA),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              // Submit Homework / Resubmit Button (Solid Emerald)
              GestureDetector(
                onTap: () =>
                    _showSubmitHomeworkDialog(context, hw, courseService),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 13, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00B074),
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF00B074).withValues(alpha: 0.25),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    hw.isCompleted
                        ? (AppLocalization.isTamil
                            ? 'மீண்டும் சமர்ப்பி'
                            : 'Resubmit')
                        : (AppLocalization.isTamil
                            ? 'வீட்டுப்பாடம் சமர்ப்பி'
                            : 'Submit Homework'),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontFamily: 'Outfit',
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- 6. BOTTOM ENCOURAGEMENT CARD ---
  Widget _buildBottomEncouragementCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F9FF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBAE6FD)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            height: 44,
            child: Image.asset(
              'assets/images/class/progress2.png',
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) =>
                  const Icon(Icons.auto_stories, color: Color(0xFF0284C7)),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  AppLocalization.isTamil
                      ? 'தொடர்ந்து பயிலுங்கள்!'
                      : "Keep going, you're doing great!",
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 1.5),
                Text(
                  AppLocalization.get('keep_it_up'),
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const Text('✈️', style: TextStyle(fontSize: 22)),
        ],
      ),
    );
  }
}

