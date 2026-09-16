class AppConstants {
  // ===========================================================================
  // Backend API Base URL Configuration
  // ===========================================================================
  // Option 1: Production (Vercel)
  static const String baseUrlProduction = 'https://tn-schools-mobile-app-backend.vercel.app';

  // Option 2: Localhost Development
  static const String baseUrlLocal = 'http://localhost:5000';

  // Active Base URL: Connecting to Vercel Production
  static const String baseUrl = baseUrlProduction;

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
