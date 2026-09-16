import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/course_service.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import '../widgets/subject_chip.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/pdf_viewer_dialog.dart';
import '../widgets/video_viewer_dialog.dart';

/// Academic Resource Model from Academics Hub
class AcademicResource {
  final String id;
  final String title;
  final String subject;
  final String category; // 'syllabus', 'textbooks', 'materials', 'notes', 'videos', 'digital', 'reference'
  final String type; // 'PDF', 'DOC', 'Video', 'Audio', 'Interactive', 'eBook', 'Link'
  final String meta;
  final String description;
  final String? url;
  final String? addedBy;
  final String? chapterNumber;
  final String? topicName;
  final List<String> topics;
  final String? term;

  AcademicResource({
    required this.id,
    required this.title,
    required this.subject,
    required this.category,
    required this.type,
    required this.meta,
    required this.description,
    this.url,
    this.addedBy,
    this.chapterNumber,
    this.topicName,
    this.topics = const [],
    this.term,
  });

  factory AcademicResource.fromJson(Map<String, dynamic> json) {
    final subObj = json['subject'];
    String subName = 'General';
    if (subObj is Map) {
      subName = subObj['name']?.toString() ?? 'General';
    } else if (subObj is String && subObj.isNotEmpty) {
      subName = subObj;
    } else if (json['subjectName'] != null) {
      subName = json['subjectName'].toString();
    }

    final cat = (json['category']?.toString() ?? '').toLowerCase();
    final rawUrl = json['url']?.toString();
    final rawYt = json['youtubeUrl']?.toString();
    final rawFile = json['fileUrl']?.toString();
    final rawVid = json['videoUrl']?.toString();
    final urlStr = (rawUrl != null && rawUrl.trim().isNotEmpty && rawUrl != '#')
        ? rawUrl.trim()
        : ((rawYt != null && rawYt.trim().isNotEmpty)
            ? rawYt.trim()
            : ((rawFile != null && rawFile.trim().isNotEmpty)
                ? rawFile.trim()
                : ((rawVid != null && rawVid.trim().isNotEmpty)
                    ? rawVid.trim()
                    : rawUrl)));
    final isVideo = cat == 'videos' ||
        (urlStr != null &&
            (urlStr.contains('.mp4') ||
                urlStr.contains('.webm') ||
                urlStr.contains('youtu.be') ||
                urlStr.contains('youtube.com')));
    final resType = isVideo
        ? 'Video'
        : (json['type']?.toString() ?? (cat == 'textbooks' ? 'eBook' : 'PDF'));

    // Extract syllabus subtopics
    final desc = json['description']?.toString() ?? '';
    List<String> topicList = [];
    if (desc.contains('•') || desc.contains('\n')) {
      topicList = desc
          .split(RegExp(r'[•\n]'))
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
    } else if (desc.isNotEmpty) {
      topicList = [desc];
    }

    return AcademicResource(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      subject: subName,
      category: cat,
      type: resType,
      meta: (json['meta'] != null && json['meta'].toString().trim().isNotEmpty)
          ? json['meta'].toString().trim()
          : (isVideo ? 'Video Lesson' : (cat == 'textbooks' ? 'Digital Textbook' : 'Study Resource')),
      description: desc,
      url: urlStr,
      addedBy: (json['addedBy'] != null &&
              json['addedBy'].toString().trim().isNotEmpty &&
              !json['addedBy'].toString().toLowerCase().contains('super admin'))
          ? json['addedBy'].toString().trim()
          : 'TN SCERT Curriculum',
      chapterNumber: json['chapterNumber']?.toString() ?? json['chapter']?.toString(),
      topicName: json['topicName']?.toString(),
      topics: topicList,
      term: json['term']?.toString() ?? 'Term 1',
    );
  }
}

class AllClassesScreen extends StatefulWidget {
  final bool hideBottomNav;
  const AllClassesScreen({super.key, this.hideBottomNav = false});

  @override
  State<AllClassesScreen> createState() => _AllClassesScreenState();
}

class _AllClassesScreenState extends State<AllClassesScreen> {
  static const String _baseUrl = 'http://localhost:5000';

  bool _hasInitialFetched = false;
  bool _isLoadingResources = false;
  List<AcademicResource> _academicResources = [];

  // Active Academics Tab
  String _activeTab = 'syllabus'; // 'syllabus', 'textbooks', 'materials', 'notes', 'videos', 'digital', 'reference'

  // Search & Filter
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _showSavedOnly = false;
  final Set<String> _bookmarkedIds = {};

  static const List<Map<String, dynamic>> _academicCategories = [
    {
      'key': 'syllabus',
      'label': 'Syllabus',
      'icon': Icons.menu_book_rounded,
      'color': Color(0xFF059669),
      'activeGradient': [Color(0xFF059669), Color(0xFF0D9488)],
    },
    {
      'key': 'textbooks',
      'label': 'Textbooks',
      'icon': Icons.auto_stories_rounded,
      'color': Color(0xFFEA580C),
      'activeGradient': [Color(0xFFEA580C), Color(0xFFF97316)],
    },
    {
      'key': 'materials',
      'label': 'Study Materials',
      'icon': Icons.description_rounded,
      'color': Color(0xFF2563EB),
      'activeGradient': [Color(0xFF2563EB), Color(0xFF3B82F6)],
    },
    {
      'key': 'notes',
      'label': 'Teacher Notes',
      'icon': Icons.edit_note_rounded,
      'color': Color(0xFFE11D48),
      'activeGradient': [Color(0xFFE11D48), Color(0xFFF43F5E)],
    },
    {
      'key': 'videos',
      'label': 'Video Lessons',
      'icon': Icons.play_circle_fill_rounded,
      'color': Color(0xFFDC2626),
      'activeGradient': [Color(0xFFDC2626), Color(0xFFEF4444)],
    },
    {
      'key': 'digital',
      'label': 'Digital Content',
      'icon': Icons.devices_rounded,
      'color': Color(0xFF9333EA),
      'activeGradient': [Color(0xFF9333EA), Color(0xFFA855F7)],
    },
    {
      'key': 'reference',
      'label': 'Reference Materials',
      'icon': Icons.library_books_rounded,
      'color': Color(0xFF0891B2),
      'activeGradient': [Color(0xFF0891B2), Color(0xFF06B6D4)],
    },
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_hasInitialFetched) {
        _hasInitialFetched = true;
        final courseService = Provider.of<CourseService>(context, listen: false);
        courseService.fetchClassSubjects();
        _fetchAcademicsResources(courseService);
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Fetches backend academics resources for student's logged in class
  Future<void> _fetchAcademicsResources(CourseService courseService) async {
    setState(() => _isLoadingResources = true);
    try {
      final student = courseService.student;
      final rawClass = student.grade.isNotEmpty ? student.grade : student.classStandard;
      final match = RegExp(r'\d+').firstMatch(rawClass);
      final classNum = match != null ? (int.tryParse(match.group(0)!) ?? 6) : 6;
      final schoolId = student.schoolId ?? '';

      final queryParams = <String>[
        'class=$classNum',
        'status=Active',
      ];
      if (schoolId.isNotEmpty) {
        queryParams.add('schoolId=${Uri.encodeComponent(schoolId)}');
      }

      final url = Uri.parse('$_baseUrl/api/superadmin/academics/resources?${queryParams.join('&')}');
      final res = await http.get(url).timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(res.body);
        final resources = jsonList.map((e) => AcademicResource.fromJson(e)).toList();

        if (mounted) {
          setState(() {
            _academicResources = resources;
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching academics resources: $e');
    } finally {
      if (mounted) setState(() => _isLoadingResources = false);
    }
  }

  /// Launch document URL or show in-app popup PDF viewer
  Future<void> _openResource(AcademicResource resource) async {
    final rawUrl = resource.url;
    if (rawUrl == null || rawUrl.trim().isEmpty || rawUrl == '#') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('No document URL attached for "${resource.title}"'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    final fullUrl = rawUrl.startsWith('http') ? rawUrl : '$_baseUrl$rawUrl';

    // 1. If it is a Video Lesson: open in in-app video popup modal on same screen!
    final isVideo = resource.category == 'videos' ||
        resource.type.toLowerCase() == 'video' ||
        fullUrl.toLowerCase().contains('.mp4') ||
        fullUrl.toLowerCase().contains('.webm') ||
        fullUrl.toLowerCase().contains('youtu.be') ||
        fullUrl.toLowerCase().contains('youtube.com');

    if (isVideo) {
      VideoViewerDialog.show(
        context,
        url: fullUrl,
        title: resource.title,
        subject: resource.subject,
      );
      return;
    }

    // 2. If it is a PDF, eBook, Textbook, Notes, or Document: open in in-app popup modal
    final isPdfOrTextbook = resource.category == 'textbooks' ||
        resource.category == 'notes' ||
        resource.category == 'materials' ||
        resource.category == 'reference' ||
        resource.type.toLowerCase().contains('pdf') ||
        resource.type.toLowerCase().contains('ebook') ||
        resource.type.toLowerCase().contains('doc') ||
        fullUrl.toLowerCase().endsWith('.pdf') ||
        fullUrl.toLowerCase().contains('.pdf');

    if (isPdfOrTextbook) {
      PdfViewerDialog.show(
        context,
        url: fullUrl,
        title: resource.title,
        subject: resource.subject,
        category: resource.category,
      );
      return;
    }

    try {
      final uri = Uri.parse(fullUrl);
      final launched = await launchUrl(uri, mode: LaunchMode.platformDefault);
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('Error opening resource URL: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open file: $e'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// Toggle resource bookmark
  void _toggleBookmark(String id) {
    setState(() {
      if (_bookmarkedIds.contains(id)) {
        _bookmarkedIds.remove(id);
      } else {
        _bookmarkedIds.add(id);
      }
    });
  }

  /// Filter resources for the currently selected subject
  List<AcademicResource> _getResourcesForSubject(String subjectName) {
    final subLower = subjectName.toLowerCase();

    return _academicResources.where((r) {
      final rSubLower = r.subject.toLowerCase();
      final isSubjectMatch = rSubLower == subLower ||
          (subLower.contains('math') && rSubLower.contains('math')) ||
          (subLower.contains('science') && rSubLower.contains('science')) ||
          (subLower.contains('social') && rSubLower.contains('social')) ||
          (subLower.contains('tamil') && rSubLower.contains('tamil')) ||
          (subLower.contains('english') && rSubLower.contains('english'));

      if (!isSubjectMatch) return false;
      return true;
    }).toList();
  }

  /// Count resources for a category under the selected subject
  int _getCountForCategory(String subjectName, String categoryKey) {
    final forSubject = _getResourcesForSubject(subjectName);
    return forSubject.where((r) => r.category == categoryKey).length;
  }

  @override
  Widget build(BuildContext context) {
    final courseService = Provider.of<CourseService>(context);
    final subjects = courseService.subjects;
    final selectedSubjectId = courseService.selectedSubjectId;

    final selectedSubject = subjects.firstWhere(
      (s) => s.id == selectedSubjectId,
      orElse: () => subjects.first,
    );

    final rawClass = courseService.student.grade.isNotEmpty
        ? courseService.student.grade
        : courseService.student.classStandard;
    final match = RegExp(r'\d+').firstMatch(rawClass);
    final classNum = match != null ? match.group(0)! : '6';

    // Filter current subject resources by active tab and search
    final subjectResources = _getResourcesForSubject(selectedSubject.name);
    final activeTabResources = subjectResources.where((r) {
      if (r.category != _activeTab) return false;
      if (_showSavedOnly && !_bookmarkedIds.contains(r.id)) return false;
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        return r.title.toLowerCase().contains(q) ||
            r.description.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: AppTheme.backgroundLight,
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(64),
          child: SafeArea(
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: Responsive.horizontalPadding(context),
                vertical: 8,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Back Button (White Rounded Card with Shadow)
                  GestureDetector(
                    onTap: () {
                      if (Navigator.canPop(context)) {
                        Navigator.pop(context);
                      } else {
                        courseService.setBottomNavIndex(0);
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
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.chevron_left_rounded,
                        color: AppTheme.textDark,
                        size: 26,
                      ),
                    ),
                  ),

                  // Center Title
                  const Text(
                    'All Subjects',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textDark,
                      fontFamily: 'Outfit',
                    ),
                  ),

                  // Empty spacer to balance back button
                  const SizedBox(width: 42),
                ],
              ),
            ),
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: EdgeInsets.symmetric(
              horizontal: Responsive.horizontalPadding(context),
              vertical: 10,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Hero Banner — classbanner.png as full background
                ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Stack(
                    children: [
                      Image.asset(
                        'assets/images/class/classbanner.png',
                        width: double.infinity,
                        height: 165,
                        fit: BoxFit.cover,
                      ),
                      Container(
                        width: double.infinity,
                        height: 165,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                            colors: [
                              const Color(0xFF0052CC).withValues(alpha: 0.78),
                              Colors.transparent,
                            ],
                            stops: const [0.0, 0.65],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 20,
                        top: 22,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.3),
                                  width: 1,
                                ),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.workspace_premium_rounded,
                                      color: Colors.white, size: 13),
                                  SizedBox(width: 4),
                                  Text(
                                    'Academic Curriculum Hub',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Class $classNum Curriculum',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Outfit',
                              ),
                            ),
                            const SizedBox(height: 3),
                            const Text(
                              'Syllabus, Textbooks, Notes & Lessons',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),

                // 2. Subjects Section Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'Subjects',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textDark,
                            fontFamily: 'Outfit',
                          ),
                        ),
                        if (courseService.student.grade.isNotEmpty &&
                            (int.tryParse(courseService.student.grade) ?? 0) >=
                                11 &&
                            courseService
                                .student.effectiveGroup.isNotEmpty &&
                            courseService.student.effectiveGroup
                                    .toLowerCase() !=
                                'general') ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0066FF)
                                  .withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: const Color(0xFF0066FF)
                                    .withValues(alpha: 0.2),
                              ),
                            ),
                            child: Text(
                              courseService.student.effectiveGroup.length > 15
                                  ? '${courseService.student.effectiveGroup.substring(0, 15)}...'
                                  : courseService.student.effectiveGroup,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0066FF),
                                fontFamily: 'Outfit',
                              ),
                            ),
                          ),
                        ],
                        if (_isLoadingResources ||
                            courseService.isLoadingSubjects) ...[
                          const SizedBox(width: 8),
                          const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                  Color(0xFF0066FF)),
                            ),
                          ),
                        ],
                      ],
                    ),
                    GestureDetector(
                      onTap: () {
                        courseService.fetchClassSubjects();
                        _fetchAcademicsResources(courseService);
                      },
                      child: const Row(
                        children: [
                          Text(
                            'Refresh',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0066FF),
                            ),
                          ),
                          SizedBox(width: 2),
                          Icon(
                            Icons.refresh_rounded,
                            size: 16,
                            color: Color(0xFF0066FF),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 3. Subjects Grid (English, Mathematics, Science, Social Science, Tamil)
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: subjects.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 0.84,
                  ),
                  itemBuilder: (context, index) {
                    final subject = subjects[index];
                    final isSelected = subject.id == selectedSubjectId;

                    return SubjectChip(
                      subject: subject,
                      isSelected: isSelected,
                      onTap: () {
                        courseService.selectSubject(subject.id);
                      },
                    );
                  },
                ),
                const SizedBox(height: 24),

                // 4. Academics Category Tabs (Syllabus, Textbooks, Study Materials, etc.)
                _buildCategoryTabsBar(selectedSubject.name),
                const SizedBox(height: 16),

                // 5. Dynamic Tab View based on Selected Category & Selected Subject
                if (_isLoadingResources)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: CircularProgressIndicator(
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Color(0xFF0066FF)),
                      ),
                    ),
                  )
                else if (_activeTab == 'syllabus')
                  _buildSyllabusSection(
                    selectedSubject.name,
                    classNum,
                    subjectResources
                        .where((r) => r.category == 'syllabus')
                        .toList(),
                  )
                else
                  _buildResourceListSection(
                    selectedSubject.name,
                    activeTabResources,
                  ),

                const SizedBox(height: 24),

                // 6. Bottom Feature Bar
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: [
                        _buildFeatureBadge(
                          Icons.emoji_events_rounded,
                          const Color(0xFFF59E0B),
                          'Top Instructors',
                          'Learn from experts',
                        ),
                        const SizedBox(width: 20),
                        _buildFeatureBadge(
                          Icons.workspace_premium_rounded,
                          const Color(0xFF8B5CF6),
                          'Official Syllabus',
                          'Samacheer Kalvi aligned',
                        ),
                        const SizedBox(width: 20),
                        _buildFeatureBadge(
                          Icons.auto_graph_rounded,
                          AppTheme.primaryEmerald,
                          'Digital Content',
                          'Learn at your pace',
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
        bottomNavigationBar: widget.hideBottomNav
            ? null
            : const CustomBottomNavBar(currentIndex: 1),
      ),
    );
  }

  // --- 4. CATEGORY TABS BAR ---
  Widget _buildCategoryTabsBar(String selectedSubjectName) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: _academicCategories.map((cat) {
          final key = cat['key'] as String;
          final label = cat['label'] as String;
          final icon = cat['icon'] as IconData;
          final activeGradient = cat['activeGradient'] as List<Color>;
          final count = _getCountForCategory(selectedSubjectName, key);
          final isSelected = _activeTab == key;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _activeTab = key;
                  _searchQuery = '';
                  _searchController.clear();
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                decoration: BoxDecoration(
                  gradient: isSelected
                      ? LinearGradient(
                          colors: activeGradient,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: isSelected ? null : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected
                        ? activeGradient.first
                        : const Color(0xFFE2E8F0),
                    width: 1.2,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: activeGradient.first.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ]
                      : [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 16,
                      color: isSelected ? Colors.white : const Color(0xFF64748B),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: isSelected
                            ? Colors.white
                            : const Color(0xFF334155),
                        fontFamily: 'Outfit',
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? Colors.white.withValues(alpha: 0.25)
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$count',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: isSelected
                              ? Colors.white
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // --- 5A. MODERN RESPONSIVE SYLLABUS SECTION ---
  Widget _buildSyllabusSection(
    String subjectName,
    String classNum,
    List<AcademicResource> syllabusItems,
  ) {
    int totalTopics = 0;
    for (final item in syllabusItems) {
      totalTopics += item.topics.isNotEmpty ? item.topics.length : 1;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Hero Syllabus Overview Card (White Card Based)
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top accent color bar
                Container(
                  height: 4,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF0066FF), Color(0xFF38BDF8)],
                    ),
                  ),
                ),

                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 46,
                            height: 46,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF0066FF), Color(0xFF2563EB)],
                              ),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF0066FF)
                                      .withValues(alpha: 0.28),
                                  blurRadius: 10,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.menu_book_rounded,
                                color: Colors.white,
                                size: 24,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '$subjectName Curriculum',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  'Class $classNum • Tamil Nadu State Board (Samacheer Kalvi)',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF64748B),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      // Overview Chips (White card friendly badges)
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _buildSyllabusStatChip(
                            Icons.layers_rounded,
                            '${syllabusItems.length} ${syllabusItems.length == 1 ? "Chapter" : "Chapters"}',
                            primaryColor: const Color(0xFF1D4ED8),
                            bg: const Color(0xFFEFF6FF),
                            border: const Color(0xFFBFDBFE),
                          ),
                          _buildSyllabusStatChip(
                            Icons.format_list_bulleted_rounded,
                            '$totalTopics Topics',
                            primaryColor: const Color(0xFF047857),
                            bg: const Color(0xFFECFDF5),
                            border: const Color(0xFFA7F3D0),
                          ),
                          _buildSyllabusStatChip(
                            Icons.verified_rounded,
                            'Samacheer Kalvi',
                            primaryColor: const Color(0xFFB45309),
                            bg: const Color(0xFFFFFBEB),
                            border: const Color(0xFFFDE68A),
                          ),
                          _buildSyllabusStatChip(
                            Icons.auto_awesome,
                            'AI Tutor Ready',
                            primaryColor: const Color(0xFF6D28D9),
                            bg: const Color(0xFFF5F3FF),
                            border: const Color(0xFFDDD6FE),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 18),

        // 2. Syllabus Chapters List
        if (syllabusItems.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                const Icon(Icons.school_outlined, size: 40, color: Color(0xFF94A3B8)),
                const SizedBox(height: 10),
                Text(
                  'No syllabus units added yet for $subjectName',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E293B),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'State board syllabus chapters and units will appear here.',
                  style: TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: syllabusItems.length,
            separatorBuilder: (context, index) => const SizedBox(height: 14),
            itemBuilder: (context, index) {
              final item = syllabusItems[index];
              final chapterNo = item.chapterNumber != null &&
                      item.chapterNumber!.isNotEmpty
                  ? (int.tryParse(item.chapterNumber!) != null
                      ? item.chapterNumber!.padLeft(2, '0')
                      : item.chapterNumber!)
                  : '${index + 1}'.padLeft(2, '0');

              final chapterTitle = (item.topicName != null &&
                      item.topicName!.trim().isNotEmpty)
                  ? item.topicName!
                  : (item.title.isNotEmpty ? item.title : 'Chapter $chapterNo');

              return Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Chapter Card Header
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // Number Badge
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF0066FF), Color(0xFF2563EB)],
                              ),
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF0066FF)
                                      .withValues(alpha: 0.25),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Text(
                                chapterNo,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),

                          // Chapter Title & Topic Count
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  chapterTitle,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEFF6FF),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        '${item.topics.isNotEmpty ? item.topics.length : 1} Topics',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF0066FF),
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                    ),
                                    Text(
                                      '•  ${item.term ?? "Term 1"}',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF64748B),
                                        fontFamily: 'Outfit',
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          // Quick AI Tutor Button
                          Container(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF8B5CF6), Color(0xFF7C3AED)],
                              ),
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF8B5CF6)
                                      .withValues(alpha: 0.28),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () {
                                  Navigator.pushNamed(context, '/ai-tutor');
                                },
                                borderRadius: BorderRadius.circular(10),
                                child: const Padding(
                                  padding: EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.auto_awesome,
                                        size: 13,
                                        color: Colors.white,
                                      ),
                                      SizedBox(width: 4),
                                      Text(
                                        'AI Tutor',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.white,
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      // Subunit Topics Grid
                      if (item.topics.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        const Divider(height: 1, color: Color(0xFFF1F5F9)),
                        const SizedBox(height: 12),
                        const Text(
                          'Curriculum Subunits & Key Topics:',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.3,
                            color: Color(0xFF64748B),
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Responsive Subunits (2 columns on wide screens, 1 column on mobile)
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final isWide = constraints.maxWidth >= 580;
                            if (isWide) {
                              List<Widget> rows = [];
                              for (int i = 0; i < item.topics.length; i += 2) {
                                final t1 = item.topics[i];
                                final t2 = (i + 1 < item.topics.length)
                                    ? item.topics[i + 1]
                                    : null;
                                rows.add(
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: _buildSubunitCard(t1, i),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: t2 != null
                                              ? _buildSubunitCard(t2, i + 1)
                                              : const SizedBox(),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }
                              return Column(children: rows);
                            } else {
                              return Column(
                                children: List.generate(
                                  item.topics.length,
                                  (idx) => Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: _buildSubunitCard(
                                        item.topics[idx], idx),
                                  ),
                                ),
                              );
                            }
                          },
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildSyllabusStatChip(
    IconData icon,
    String label, {
    required Color primaryColor,
    required Color bg,
    required Color border,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: primaryColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: primaryColor,
              fontFamily: 'Outfit',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubunitCard(String topic, int index) {
    final clean = topic.replaceFirst(RegExp(r'^[•\-\*]\s*'), '').trim();
    final numMatch = RegExp(r'^(\d+(?:\.\d+)?)\s*(.*)$').firstMatch(clean);
    final tag = numMatch != null ? numMatch.group(1)! : '${index + 1}';
    final text = numMatch != null && numMatch.group(2)!.isNotEmpty
        ? numMatch.group(2)!
        : clean;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
            decoration: BoxDecoration(
              color: const Color(0xFF0066FF).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(7),
              border: Border.all(
                color: const Color(0xFF0066FF).withValues(alpha: 0.2),
              ),
            ),
            child: Text(
              tag,
              style: const TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0066FF),
                fontFamily: 'Outfit',
              ),
            ),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF334155),
                height: 1.35,
                fontFamily: 'Outfit',
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- 5B. MODERN RESPONSIVE RESOURCE LIST VIEW ---
  Widget _buildResourceListSection(
    String subjectName,
    List<AcademicResource> resources,
  ) {
    return Column(
      children: [
        // Search Toolbar + Saved Filter Toggle
        Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    setState(() => _searchQuery = val);
                  },
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit',
                  ),
                  decoration: InputDecoration(
                    hintText: 'Search $_activeTab...',
                    hintStyle: const TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF94A3B8),
                    ),
                    prefixIcon: const Icon(
                      Icons.search_rounded,
                      size: 19,
                      color: Color(0xFF94A3B8),
                    ),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded,
                                size: 16, color: Color(0xFF94A3B8)),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    border: InputBorder.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            GestureDetector(
              onTap: () {
                setState(() => _showSavedOnly = !_showSavedOnly);
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                decoration: BoxDecoration(
                  color: _showSavedOnly
                      ? const Color(0xFFFEF3C7)
                      : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _showSavedOnly
                        ? const Color(0xFFF59E0B)
                        : const Color(0xFFE2E8F0),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.bookmark_rounded,
                      size: 17,
                      color: _showSavedOnly
                          ? const Color(0xFFD97706)
                          : const Color(0xFF64748B),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'Saved (${_bookmarkedIds.length})',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: _showSavedOnly
                            ? const Color(0xFFB45309)
                            : const Color(0xFF475569),
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Responsive Cards Layout
        if (resources.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.folder_open_rounded,
                  size: 42,
                  color: Color(0xFF94A3B8),
                ),
                const SizedBox(height: 10),
                Text(
                  'No $_activeTab found for $subjectName',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E293B),
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Official state board uploads for this subject will appear here.',
                  style: TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          )
        else
          LayoutBuilder(
            builder: (context, constraints) {
              final w = constraints.maxWidth;
              final int crossAxisCount = w >= 900 ? 3 : (w >= 560 ? 2 : 1);

              if (crossAxisCount > 1) {
                // Responsive Multi-Column Grid on Tablet / Web / Desktop
                List<Widget> rows = [];
                for (int i = 0; i < resources.length; i += crossAxisCount) {
                  List<Widget> rowChildren = [];
                  for (int c = 0; c < crossAxisCount; c++) {
                    final idx = i + c;
                    if (idx < resources.length) {
                      rowChildren.add(
                        Expanded(
                          child: _buildResourceCard(resources[idx]),
                        ),
                      );
                      if (c < crossAxisCount - 1) {
                        rowChildren.add(const SizedBox(width: 14));
                      }
                    } else {
                      rowChildren.add(const Expanded(child: SizedBox()));
                      if (c < crossAxisCount - 1) {
                        rowChildren.add(const SizedBox(width: 14));
                      }
                    }
                  }
                  rows.add(
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: rowChildren,
                        ),
                      ),
                    ),
                  );
                }
                return Column(children: rows);
              } else {
                // Mobile Single Column List
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: resources.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 14),
                  itemBuilder: (context, index) =>
                      _buildResourceCard(resources[index]),
                );
              }
            },
          ),
      ],
    );
  }

  // --- MODERN ELEGANT RESOURCE CARD WIDGET ---
  Widget _buildResourceCard(AcademicResource r) {
    final isSaved = _bookmarkedIds.contains(r.id);
    final isVideo = r.category == 'videos' || r.type == 'Video';
    final isTextbook = r.category == 'textbooks';
    final isNotes = r.category == 'notes' || r.category == 'materials';

    // Theme colors based on category
    final Color primaryColor = isVideo
        ? const Color(0xFFDC2626)
        : (isTextbook
            ? const Color(0xFF2563EB)
            : (isNotes ? const Color(0xFF059669) : const Color(0xFF7C3AED)));

    final Color lightBg = isVideo
        ? const Color(0xFFFEF2F2)
        : (isTextbook
            ? const Color(0xFFEFF6FF)
            : (isNotes ? const Color(0xFFECFDF5) : const Color(0xFFF5F3FF)));

    final Color borderCol = isVideo
        ? const Color(0xFFFECACA)
        : (isTextbook
            ? const Color(0xFFBFDBFE)
            : (isNotes ? const Color(0xFFA7F3D0) : const Color(0xFFDDD6FE)));

    final IconData typeIcon = isVideo
        ? Icons.play_circle_fill_rounded
        : (isTextbook
            ? Icons.menu_book_rounded
            : (isNotes ? Icons.edit_note_rounded : Icons.description_rounded));

    final String categoryLabel = isVideo
        ? 'Video Lesson'
        : (isTextbook
            ? 'Official Textbook'
            : (isNotes ? 'Study Notes' : 'Resource'));

    final String buttonLabel = isVideo
        ? 'Watch Lesson'
        : (isTextbook ? 'Read Textbook' : 'Open PDF');

    final IconData buttonIcon = isVideo
        ? Icons.play_arrow_rounded
        : (isTextbook ? Icons.menu_book_rounded : Icons.visibility_rounded);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: primaryColor.withValues(alpha: 0.05),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Colored Accent Bar
            Container(
              height: 4,
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primaryColor, primaryColor.withValues(alpha: 0.6)],
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Row: Type Icon & Badges + Bookmark Button
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Icon Squircle
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: lightBg,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: borderCol, width: 1.2),
                        ),
                        child: Icon(typeIcon, color: primaryColor, size: 24),
                      ),
                      const SizedBox(width: 10),

                      // Category & Subject Badges
                      Expanded(
                        child: Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3.5),
                              decoration: BoxDecoration(
                                color: lightBg,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: borderCol),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(typeIcon, size: 11, color: primaryColor),
                                  const SizedBox(width: 4),
                                  Text(
                                    categoryLabel,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800,
                                      color: primaryColor,
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(8),
                                border:
                                    Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                r.subject,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF475569),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Bookmark Action Button
                      GestureDetector(
                        onTap: () => _toggleBookmark(r.id),
                        child: Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: isSaved
                                ? const Color(0xFFFEF3C7)
                                : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSaved
                                  ? const Color(0xFFF59E0B)
                                  : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Icon(
                            isSaved
                                ? Icons.bookmark_rounded
                                : Icons.bookmark_outline_rounded,
                            color: isSaved
                                ? const Color(0xFFD97706)
                                : const Color(0xFF94A3B8),
                            size: 18,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Resource Title
                  Text(
                    r.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      fontFamily: 'Outfit',
                      height: 1.3,
                    ),
                  ),

                  // Resource Description (if present)
                  if (r.description.isNotEmpty && r.category != 'syllabus') ...[
                    const SizedBox(height: 6),
                    Text(
                      r.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFF64748B),
                        height: 1.4,
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 12),

                  // Footer: Metadata & Action CTA
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Source & Duration
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.school_outlined,
                                    size: 13, color: Color(0xFF64748B)),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    r.addedBy ?? 'TN SCERT',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF475569),
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Row(
                              children: [
                                const Icon(Icons.access_time_rounded,
                                    size: 12, color: Color(0xFF94A3B8)),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    r.meta.isNotEmpty
                                        ? r.meta
                                        : (isVideo
                                            ? 'Video Lecture'
                                            : 'Official SCERT Guide'),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF94A3B8),
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(width: 10),

                      // Action CTA Button
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              primaryColor,
                              primaryColor.withValues(alpha: 0.88),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: primaryColor.withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => _openResource(r),
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 13, vertical: 8.5),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(buttonIcon,
                                      size: 14, color: Colors.white),
                                  const SizedBox(width: 5),
                                  Text(
                                    buttonLabel,
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureBadge(
      IconData icon, Color iconColor, String title, String subtitle) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.textDark,
                fontFamily: 'Outfit',
              ),
            ),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 9.5,
                color: AppTheme.textMedium,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
