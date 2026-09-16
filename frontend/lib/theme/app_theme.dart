import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppTheme {
  AppTheme._();

  // Primary Colors matching exact specification
  static const Color primaryEmerald = Color(0xFF078A5B);
  static const Color primaryGreen = Color(0xFF078A5B);
  static const Color primaryDarkEmerald = Color(0xFF056844);
  static const Color primaryLightEmerald = Color(0xFFE6F4EA);
  static const Color lightGreenBg = Color(0xFFE6F4EA);
  static const Color accentGreen = Color(0xFF10B981);

  // Background Colors
  static const Color backgroundLight = Colors.white;
  static const Color cardWhite = Colors.white;

  // Secondary Color Palette matching reference illustration styles
  static const Color pastelPurple = Color(0xFFE9E3FD);
  static const Color textPurple = Color(0xFF5B3CC4);

  static const Color pastelBlue = Color(0xFFE0F2FE);
  static const Color textBlue = Color(0xFF0284C7);

  static const Color pastelOrange = Color(0xFFFFEDD5);
  static const Color textOrange = Color(0xFFE65100);

  static const Color pastelYellow = Color(0xFFFEF3C7);
  static const Color textYellow = Color(0xFFD97706);

  static const Color pastelPink = Color(0xFFFCE7F3);
  static const Color pastelGreen = Color(0xFFDCFCE7);

  // Text Colors
  static const Color textDark = Color(0xFF10213A);
  static const Color textNavy = Color(0xFF10213A);
  static const Color textMedium = Color(0xFF64748B);
  static const Color textLight = Color(0xFF94A3B8);

  // Borders & Shadows
  static const Color borderLight = Color(0xFFE2E8F0);

  static BoxShadow softShadow = BoxShadow(
    color: Colors.black.withValues(alpha: 0.04),
    blurRadius: 12,
    offset: const Offset(0, 4),
  );

  static BoxShadow mediumShadow = BoxShadow(
    color: Colors.black.withValues(alpha: 0.08),
    blurRadius: 20,
    offset: const Offset(0, 6),
  );

  static ThemeData get lightTheme {
    final baseTextTheme = ThemeData.light().textTheme;

    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: backgroundLight,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryEmerald,
        primary: primaryEmerald,
        secondary: accentGreen,
        surface: cardWhite,
      ),
      textTheme: baseTextTheme.copyWith(
        displayLarge: baseTextTheme.displayLarge?.copyWith(
          color: textDark,
          fontWeight: FontWeight.bold,
          fontSize: 32,
        ),
        headlineMedium: baseTextTheme.headlineMedium?.copyWith(
          color: textDark,
          fontWeight: FontWeight.bold,
          fontSize: 24,
        ),
        titleLarge: baseTextTheme.titleLarge?.copyWith(
          color: textDark,
          fontWeight: FontWeight.w700,
          fontSize: 18,
        ),
        titleMedium: baseTextTheme.titleMedium?.copyWith(
          color: textDark,
          fontWeight: FontWeight.w600,
          fontSize: 16,
        ),
        bodyLarge: baseTextTheme.bodyLarge?.copyWith(
          color: textDark,
          fontSize: 15,
        ),
        bodyMedium: baseTextTheme.bodyMedium?.copyWith(
          color: textMedium,
          fontSize: 13,
        ),
        labelLarge: baseTextTheme.labelLarge?.copyWith(
          color: textDark,
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
      ),
      cardTheme: CardThemeData(
        color: cardWhite,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: backgroundLight,
        elevation: 0,
        centerTitle: true,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          statusBarBrightness: Brightness.light,
          systemNavigationBarColor: Colors.white,
          systemNavigationBarIconBrightness: Brightness.dark,
        ),
        iconTheme: IconThemeData(color: textDark),
        titleTextStyle: TextStyle(
          color: textDark,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryEmerald,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
