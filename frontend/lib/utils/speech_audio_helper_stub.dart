import 'dart:async';
import 'package:flutter/foundation.dart';

/// Stub implementation of SpeechAudioHelper for non-web platforms.
/// All methods are no-ops; speech recognition and HTML audio are web-only.
class SpeechAudioHelper {
  static final SpeechAudioHelper _instance = SpeechAudioHelper._internal();
  factory SpeechAudioHelper() => _instance;
  SpeechAudioHelper._internal();

  bool get isListening => false;
  bool get isPlaying => false;

  bool get isSpeechRecognitionSupported => false;

  bool startListening({
    required String language,
    required Function(String text, bool isFinal) onResult,
    required Function(String error) onError,
    required VoidCallback onDone,
  }) {
    onError('Speech recognition is only supported on web.');
    return false;
  }

  void stopListening() {}

  Future<String?> generateTTSAudio({
    required String text,
    String language = 'bilingual',
  }) async {
    return null;
  }

  void playAudioUrl(
    String url, {
    VoidCallback? onComplete,
    Function(String error)? onError,
  }) {
    onError?.call('Audio playback is only supported on web.');
  }

  void stopAudio() {}

  void speakWithBrowserFallback(String text, {bool isTamil = false}) {}
}
