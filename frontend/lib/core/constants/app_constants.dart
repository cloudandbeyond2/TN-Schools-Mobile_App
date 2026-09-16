import 'package:flutter/foundation.dart';

class AppConstants {
  // ===========================================================================
  // Backend API Base URL Configuration
  // ===========================================================================
  // Option 1: Production (Vercel Cloud)
  static const String baseUrlProduction = 'https://tn-schools-mobile-app-backend.vercel.app';

  // Option 2: Localhost Development (Flutter Web & Desktop)
  static const String baseUrlLocal = 'http://localhost:5000';

  // Option 3: Android Emulator (maps 10.0.2.2 to PC localhost:5000)
  static const String baseUrlEmulator = 'http://10.0.2.2:5000';

  // Option 4: Real Mobile Device on same Wi-Fi (PC LAN IP)
  static const String baseUrlMobileLan = 'http://192.168.1.7:5000';

  // Active Base URL:
  // • Web browser        → Vercel production (no CORS issue)
  // • Release Android    → Vercel production (LAN IP unreachable outside Wi-Fi)
  // • Debug Android      → LAN backend at 192.168.1.7:5000 (fast local dev)
  static String get baseUrl {
    if (kIsWeb) return baseUrlProduction;              // Web always → production
    if (kReleaseMode) return baseUrlProduction;        // Release APK → production
    return baseUrlMobileLan;                           // Debug on device → LAN
  }

  // Login timeout: 15 s for production (Vercel cold-start), 8 s for LAN
  static Duration get loginTimeout =>
      kReleaseMode ? const Duration(seconds: 15) : const Duration(seconds: 8);

  static const List<String> classes = [
    '6th Standard',
    '7th Standard',
    '8th Standard',
    '9th Standard',
    '10th Standard',
    '11th Standard',
    '12th Standard',
  ];

  static const List<String> mediums = [
    'English',
    'Tamil',
    'Hindi',
    'Telugu',
    'Malayalam',
    'Kannada',
    'Urdu',
    'Sanskrit',
    'French',
    'German',
  ];

  static const List<String> languages = [
    'English',
    'Tamil',
    'Hindi',
    'Telugu',
    'Malayalam',
    'Kannada',
    'Urdu',
    'Sanskrit',
    'French',
    'German',
  ];

  static const List<String> higherSecondaryStreams = [
    'Science (Bio-Maths)',
    'Computer Science',
    'Commerce',
    'Arts & Humanities',
    'Vocational',
  ];
}
