import 'package:flutter/material.dart';
import '../utils/responsive.dart';
import '../widgets/bottom_nav_bar.dart';

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String time;
  final String category; // 'Homework', 'Exams', 'AI Tutor', 'Announcements'
  final IconData icon;
  final List<Color> gradientColors;
  final Color categoryBgColor;
  final Color categoryTextColor;
  final Color buttonColor;
  final String? route;
  final String actionLabel;
  bool isRead;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    required this.category,
    required this.icon,
    required this.gradientColors,
    required this.categoryBgColor,
    required this.categoryTextColor,
    required this.buttonColor,
    this.route,
    required this.actionLabel,
    this.isRead = false,
  });
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  int _selectedFilterIndex = 0;
  final List<Map<String, dynamic>> _filters = [
    {'label': 'All', 'icon': Icons.grid_view_rounded, 'color': const Color(0xFFFF5722)},
    {'label': 'Homework', 'icon': Icons.menu_book_rounded, 'color': const Color(0xFFA855F7)},
    {'label': 'Exams', 'icon': Icons.calendar_month_rounded, 'color': const Color(0xFF3B82F6)},
    {'label': 'AI Tutor', 'icon': Icons.smart_toy_rounded, 'color': const Color(0xFF10B981)},
    {'label': 'Announcements', 'icon': Icons.campaign_rounded, 'color': const Color(0xFFF59E0B)},
  ];

  late List<NotificationItem> _notifications;

  @override
  void initState() {
    super.initState();
    _notifications = [
      NotificationItem(
        id: 'n1',
        title: 'Math Homework Due Today',
        message:
            'Solve Quadratic Equations Exercise 3.2 before 5:00 PM today. Mr. Ramesh has assigned 5 problem sets.',
        time: '10 mins ago',
        category: 'Homework',
        icon: Icons.assignment_rounded,
        gradientColors: [const Color(0xFFFF7A00), const Color(0xFFFF5252)],
        categoryBgColor: const Color(0xFFFFF1E8),
        categoryTextColor: const Color(0xFFEA580C),
        buttonColor: const Color(0xFFFF5722),
        route: '/homework',
        actionLabel: 'Submit Work',
        isRead: false,
      ),
      NotificationItem(
        id: 'n2',
        title: 'Quarterly Revision Exam Timetable Published',
        message:
            '10th Standard State Board revision exams begin on 15th Sep. Check chapter allocations and syllabus portions.',
        time: '1 hour ago',
        category: 'Exams',
        icon: Icons.calendar_month_rounded,
        gradientColors: [const Color(0xFF3B82F6), const Color(0xFF1D4ED8)],
        categoryBgColor: const Color(0xFFEFF6FF),
        categoryTextColor: const Color(0xFF2563EB),
        buttonColor: const Color(0xFF2563EB),
        route: '/timetable',
        actionLabel: 'View Schedule',
        isRead: false,
      ),
      NotificationItem(
        id: 'n3',
        title: 'AI Tutor Recommended Practice Quiz',
        message:
            'Great job on Geometry! Your AI tutor prepared a 10-question rapid quiz on Trigonometric Identities.',
        time: '3 hours ago',
        category: 'AI Tutor',
        icon: Icons.auto_awesome_rounded,
        gradientColors: [const Color(0xFF10B981), const Color(0xFF059669)],
        categoryBgColor: const Color(0xFFECFDF5),
        categoryTextColor: const Color(0xFF059669),
        buttonColor: const Color(0xFF059669),
        route: '/mock-test',
        actionLabel: 'Start Quiz',
        isRead: false,
      ),
      NotificationItem(
        id: 'n4',
        title: 'TN CM Merit Scholarship 2026 Open',
        message:
            'Applications are now open for TN CM Merit Scholarship 2026. Check eligibility and apply before 30th Sep 2026.',
        time: 'Yesterday',
        category: 'Announcements',
        icon: Icons.campaign_rounded,
        gradientColors: [const Color(0xFFFBBF24), const Color(0xFFF59E0B)],
        categoryBgColor: const Color(0xFFFFFBEB),
        categoryTextColor: const Color(0xFFD97706),
        buttonColor: const Color(0xFFD97706),
        route: '/scholarships',
        actionLabel: 'Apply Now',
        isRead: true,
      ),
      NotificationItem(
        id: 'n5',
        title: '12-Day Learning Streak Milestone! 🔥',
        message:
            'You maintained a 12-day continuous study streak! 50 bonus Reward Coins have been credited to your wallet.',
        time: '2 days ago',
        category: 'Announcements',
        icon: Icons.local_fire_department_rounded,
        gradientColors: [const Color(0xFFA855F7), const Color(0xFF7C3AED)],
        categoryBgColor: const Color(0xFFFAF5FF),
        categoryTextColor: const Color(0xFF7C3AED),
        buttonColor: const Color(0xFF7C3AED),
        route: '/profile',
        actionLabel: 'View Badges',
        isRead: true,
      ),
    ];
  }

  void _markAllAsRead() {
    setState(() {
      for (var n in _notifications) {
        n.isRead = true;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('All notifications marked as read'),
        backgroundColor: Color(0xFF047857),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _deleteNotification(String id) {
    setState(() {
      _notifications.removeWhere((n) => n.id == id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !n.isRead).length;

    final filteredNotifications = _notifications.where((n) {
      if (_selectedFilterIndex == 0) return true;
      final filter = _filters[_selectedFilterIndex]['label'] as String;
      return n.category.toLowerCase() == filter.toLowerCase();
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(68),
        child: SafeArea(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: Responsive.horizontalPadding(context),
              vertical: 8,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Back Button
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.chevron_left_rounded,
                      color: Color(0xFF1E293B),
                      size: 26,
                    ),
                  ),
                ),

                // Title + Unread Badge
                Row(
                  children: [
                    const Text(
                      'Notifications',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                        fontFamily: 'Outfit',
                      ),
                    ),
                    if (unreadCount > 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 9, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF3B30),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(
                          '$unreadCount New',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ),
                    ],
                  ],
                ),

                // 'Read All' Button with Orange Checkmark
                GestureDetector(
                  onTap: _markAllAsRead,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFFEDD5)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.check_circle_rounded,
                          color: Color(0xFFF97316),
                          size: 16,
                        ),
                        SizedBox(width: 5),
                        Text(
                          'Read All',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFEA580C),
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Filter Pills Bar (All, Homework, Exams, AI Tutor, Announcements)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.symmetric(
                  horizontal: Responsive.horizontalPadding(context),
                ),
                child: Row(
                  children: List.generate(_filters.length, (index) {
                    final item = _filters[index];
                    final isSelected = _selectedFilterIndex == index;
                    final Color itemColor = item['color'] as Color;

                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _selectedFilterIndex = index);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFFFF5722) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFFFF5722)
                                  : const Color(0xFFE2E8F0),
                              width: 1.2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: isSelected
                                    ? const Color(0xFFFF5722).withValues(alpha: 0.25)
                                    : Colors.black.withValues(alpha: 0.02),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                item['icon'] as IconData,
                                size: 16,
                                color: isSelected ? Colors.white : itemColor,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                item['label'] as String,
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                  color: isSelected ? Colors.white : const Color(0xFF475569),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ),
            const SizedBox(height: 6),

            // Notifications List
            Expanded(
              child: filteredNotifications.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: const BoxDecoration(
                              color: Color(0xFFF1F5F9),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.notifications_off_rounded,
                              size: 40,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            "You're all caught up!",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            "No unread notifications in this category",
                            style: TextStyle(
                              fontSize: 12.5,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      physics: const BouncingScrollPhysics(),
                      padding: EdgeInsets.symmetric(
                        horizontal: Responsive.horizontalPadding(context),
                        vertical: 6,
                      ),
                      itemCount: filteredNotifications.length,
                      itemBuilder: (context, index) {
                        final item = filteredNotifications[index];
                        return _buildNotificationCard(item);
                      },
                    ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const CustomBottomNavBar(currentIndex: -1),
    );
  }

  Widget _buildNotificationCard(NotificationItem item) {
    return Dismissible(
      key: Key(item.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => _deleteNotification(item.id),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFFEE2E2),
          borderRadius: BorderRadius.circular(22),
        ),
        child: const Icon(
          Icons.delete_outline_rounded,
          color: Color(0xFFDC2626),
          size: 26,
        ),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: !item.isRead
                ? item.buttonColor.withValues(alpha: 0.35)
                : const Color(0xFFF1F5F9),
            width: !item.isRead ? 1.5 : 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Top Header Row: Gradient Icon Box + Category Pill + Timestamp & Dot
                Row(
                  children: [
                    // Squircle Gradient Icon
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: item.gradientColors,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: item.gradientColors.first.withValues(alpha: 0.3),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Icon(
                          item.icon,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),

                    // Category Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: item.categoryBgColor,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        item.category,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: item.categoryTextColor,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),

                    const Spacer(),

                    // Timestamp + Unread Dot
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          item.time,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (!item.isRead) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: item.buttonColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 2. Main Content Row: (Left Texts & Actions) + (Right 3D/Vector Illustration)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Left Column (Takes available space)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title
                          Text(
                            item.title,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 5),

                          // Description
                          Text(
                            item.message,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF64748B),
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Action Buttons: Primary Pill + 'Mark as read' in responsive Wrap
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              GestureDetector(
                                onTap: () {
                                  setState(() => item.isRead = true);
                                  if (item.route != null) {
                                    Navigator.pushNamed(context, item.route!);
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: item.buttonColor,
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: [
                                      BoxShadow(
                                        color: item.buttonColor.withValues(alpha: 0.3),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          item.actionLabel,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                            fontFamily: 'Outfit',
                                          ),
                                        ),
                                        const SizedBox(width: 3),
                                        const Icon(
                                          Icons.chevron_right_rounded,
                                          color: Colors.white,
                                          size: 15,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              if (!item.isRead)
                                GestureDetector(
                                  onTap: () {
                                    setState(() => item.isRead = true);
                                  },
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 4),
                                    child: Text(
                                      'Mark as read',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF64748B),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 8),

                    // Right Illustration
                    SizedBox(
                      width: 84,
                      height: 84,
                      child: Center(
                        child: _buildCategoryIllustration(item.category),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryIllustration(String category) {
    switch (category.toLowerCase()) {
      case 'homework':
        return _buildHomeworkIllustration();
      case 'exams':
        return _buildExamsIllustration();
      case 'ai tutor':
        return _buildAiTutorIllustration();
      default:
        return _buildAnnouncementsIllustration();
    }
  }

  // 1. Homework Illustration (Notebook + Pencil + Soft Glow)
  Widget _buildHomeworkIllustration() {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Glow Circle
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFFFF1E8),
            ),
          ),
          Positioned(
            right: 12,
            top: 14,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFFEDD5).withValues(alpha: 0.6),
              ),
            ),
          ),
          // Angled Notebook
          Transform.rotate(
            angle: -0.08,
            child: Container(
              width: 58,
              height: 68,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFFB74D), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFEA580C).withValues(alpha: 0.15),
                    blurRadius: 8,
                    offset: const Offset(2, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Binding Tab
                  Container(
                    height: 10,
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFFE0B2),
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(8),
                        topRight: Radius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Ruled Lines
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Column(
                      children: List.generate(
                        4,
                        (i) => Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          height: 3,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFE0B2),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Orange Pencil
          Positioned(
            right: 12,
            bottom: 16,
            child: Transform.rotate(
              angle: 0.6,
              child: Container(
                width: 10,
                height: 46,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFF9800), Color(0xFFE65100)],
                  ),
                  borderRadius: BorderRadius.circular(4),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.15),
                      blurRadius: 4,
                      offset: const Offset(1, 2),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 2. Exams Illustration (Calendar Block + Clock Badge)
  Widget _buildExamsIllustration() {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Glow Circle
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFEFF6FF),
            ),
          ),
          // 3D Calendar Box
          Container(
            width: 62,
            height: 62,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF93C5FD), width: 1.8),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF1D4ED8).withValues(alpha: 0.15),
                  blurRadius: 8,
                  offset: const Offset(2, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                // Calendar Top Bar
                Container(
                  height: 16,
                  decoration: const BoxDecoration(
                    color: Color(0xFF3B82F6),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(12),
                      topRight: Radius.circular(12),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: List.generate(
                      4,
                      (i) => Container(
                        width: 3,
                        height: 5,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                  ),
                ),
                // Calendar Days Grid
                Padding(
                  padding: const EdgeInsets.all(6),
                  child: GridView.count(
                    crossAxisCount: 4,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 3,
                    crossAxisSpacing: 3,
                    children: List.generate(
                      8,
                      (i) => Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFDBEAFE),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Clock Badge
          Positioned(
            right: 6,
            bottom: 8,
            child: Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF2563EB), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1D4ED8).withValues(alpha: 0.2),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Center(
                child: Icon(
                  Icons.access_time_rounded,
                  color: Color(0xFF2563EB),
                  size: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 3. AI Tutor Illustration (Cute Robot with Sparkles)
  Widget _buildAiTutorIllustration() {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Glow Circle
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFECFDF5),
            ),
          ),
          // Sparkle Stars
          Positioned(
            left: 12,
            top: 14,
            child: Icon(
              Icons.auto_awesome,
              size: 14,
              color: const Color(0xFF10B981).withValues(alpha: 0.8),
            ),
          ),
          // Robot Avatar Box
          Container(
            width: 58,
            height: 64,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFA7F3D0), Color(0xFF6EE7B7)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF10B981), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF059669).withValues(alpha: 0.15),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Robot Eyes Visor
                Container(
                  width: 40,
                  height: 20,
                  decoration: BoxDecoration(
                    color: const Color(0xFF064E3B),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Color(0xFF34D399),
                          shape: BoxShape.circle,
                        ),
                      ),
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Color(0xFF34D399),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                // Robot Tablet
                Container(
                  width: 28,
                  height: 14,
                  decoration: BoxDecoration(
                    color: const Color(0xFF047857),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Center(
                    child: Icon(Icons.code_rounded, color: Colors.white, size: 10),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 4. Announcements Illustration (Golden Trophy + Stars)
  Widget _buildAnnouncementsIllustration() {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Glow Circle
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFFFFBEB),
            ),
          ),
          // Sparkle Stars
          Positioned(
            right: 12,
            top: 14,
            child: Icon(
              Icons.star_rounded,
              size: 16,
              color: const Color(0xFFF59E0B).withValues(alpha: 0.8),
            ),
          ),
          // Trophy Cup
          Container(
            width: 54,
            height: 58,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFDE047), Color(0xFFF59E0B)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFD97706).withValues(alpha: 0.25),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Center(
              child: Icon(
                Icons.emoji_events_rounded,
                color: Colors.white,
                size: 34,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

