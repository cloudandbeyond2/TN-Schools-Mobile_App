import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class LoadingStateWidget extends StatelessWidget {
  const LoadingStateWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(
        color: AppTheme.primaryEmerald,
        strokeWidth: 3,
      ),
    );
  }
}
