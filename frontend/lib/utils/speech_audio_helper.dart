// ignore: avoid_web_libraries_in_flutter
import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:html' as html;

/// High-level service for Speech-to-Text (Voice Recognition)
/// and Text-to-Speech (AI Audio Playback) supporting Tamil and English.
class SpeechAudioHelper {
  static final SpeechAudioHelper _instance = SpeechAudioHelper._internal();
  factory SpeechAudioHelper() => _instance;
  SpeechAudioHelper._internal();

  static const String _baseUrl = 'http://localhost:5000';

  html.SpeechRecognition? _recognition;
  bool _isListening = false;
  html.AudioElement? _currentAudioElement;
  bool _isPlaying = false;
  VoidCallback? _onAudioComplete;

  bool get isListening => _isListening;
  bool get isPlaying => _isPlaying;

  /// Check if speech recognition is supported in current browser
  bool get isSpeechRecognitionSupported {
    if (!kIsWeb) return false;
    try {
      return html.SpeechRecognition.supported;
    } catch (_) {
      return false;
    }
  }

  /// Start Voice Recognition with real-time text transcription
  bool startListening({
    required String language, // 'tamil' | 'english' | 'bilingual'
    required Function(String text, bool isFinal) onResult,
    required Function(String error) onError,
    required VoidCallback onDone,
  }) {
    if (!kIsWeb || !isSpeechRecognitionSupported) {
      onError('Speech recognition is not supported in this environment.');
      return false;
    }

    try {
      stopListening();

      _recognition = html.SpeechRecognition();
      _recognition!.continuous = true;
      _recognition!.interimResults = true;

      // Select proper BCP-47 language tag
      if (language == 'tamil') {
        _recognition!.lang = 'ta-IN';
      } else if (language == 'english') {
        _recognition!.lang = 'en-IN';
      } else {
        // Bilingual: Default to Tamil or Indian English based on query context
        _recognition!.lang = 'ta-IN';
      }

      _recognition!.onStart.listen((_) {
        _isListening = true;
      });

      _recognition!.onResult.listen((html.SpeechRecognitionEvent event) {
        final results = event.results;
        if (results == null || results.isEmpty) return;

        final buffer = StringBuffer();
        bool hasFinal = false;

        for (var i = 0; i < results.length; i++) {
          final res = results[i];
          if ((res.length ?? 0) > 0) {
            final alt = res.item(0);
            final transcript = alt.transcript ?? '';
            buffer.write(transcript);
            if (res.isFinal == true) {
              hasFinal = true;
            }
          }
        }

        final fullTranscript = buffer.toString().trim();
        if (fullTranscript.isNotEmpty) {
          onResult(fullTranscript, hasFinal);
        }
      });

      _recognition!.onError.listen((html.SpeechRecognitionError error) {
        _isListening = false;
        final errorMsg = error.error ?? 'Voice recognition error';
        if (errorMsg != 'no-speech') {
          onError(errorMsg);
        }
      });

      _recognition!.onEnd.listen((_) {
        _isListening = false;
        onDone();
      });

      _recognition!.start();
      _isListening = true;
      return true;
    } catch (e) {
      _isListening = false;
      onError(e.toString());
      return false;
    }
  }

  /// Stop current listening session
  void stopListening() {
    if (!kIsWeb) return;
    try {
      if (_recognition != null) {
        _recognition!.stop();
        _recognition = null;
      }
    } catch (_) {}
    _isListening = false;
  }

  /// Request TTS MP3 audio generation from Tamil Nadu education backend
  Future<String?> generateTTSAudio({
    required String text,
    String language = 'bilingual',
  }) async {
    try {
      // Clean markdown tags, emojis, and symbols from speech text
      String cleanText = text
          .replaceAll(RegExp(r'[\*\#\_\[\]\(\)\{\}\`\>]'), ' ')
          .replaceAll(RegExp(r'\s+'), ' ')
          .trim();

      // Limit audio speech to first 400 characters for snappy response
      if (cleanText.length > 400) {
        final periodIdx = cleanText.indexOf('.', 250);
        if (periodIdx != -1 && periodIdx < 400) {
          cleanText = cleanText.substring(0, periodIdx + 1);
        } else {
          cleanText = '${cleanText.substring(0, 380)}...';
        }
      }

      // Voice selection: PallaviNeural for Tamil, NeerjaNeural for English
      final isTamil = language == 'tamil' || RegExp(r'[\u0B80-\u0BFF]').hasMatch(cleanText);
      final voice = isTamil ? 'ta-IN-PallaviNeural' : 'en-IN-NeerjaNeural';

      final res = await http.post(
        Uri.parse('$_baseUrl/api/language-coaching/tts'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'text': cleanText,
          'voice': voice,
          'rate': '0%',
        }),
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['audioUrl'] != null) {
          final audioPath = data['audioUrl'].toString();
          return audioPath.startsWith('http') ? audioPath : '$_baseUrl$audioPath';
        }
      }
    } catch (e) {
      debugPrint('TTS generation error: $e');
    }
    return null;
  }

  /// Play audio via HTML5 AudioElement
  void playAudioUrl(
    String url, {
    VoidCallback? onComplete,
    Function(String error)? onError,
  }) {
    if (!kIsWeb) return;

    try {
      stopAudio();

      _currentAudioElement = html.AudioElement(url);
      _onAudioComplete = onComplete;

      _currentAudioElement!.onPlay.listen((_) {
        _isPlaying = true;
      });

      _currentAudioElement!.onEnded.listen((_) {
        _isPlaying = false;
        _onAudioComplete?.call();
      });

      _currentAudioElement!.onError.listen((e) {
        _isPlaying = false;
        onError?.call('Audio playback failed');
      });

      _currentAudioElement!.play();
      _isPlaying = true;
    } catch (e) {
      _isPlaying = false;
      onError?.call(e.toString());
    }
  }

  /// Stop current audio playback
  void stopAudio() {
    if (!kIsWeb) return;
    try {
      if (_currentAudioElement != null) {
        _currentAudioElement!.pause();
        _currentAudioElement!.currentTime = 0;
        _currentAudioElement = null;
      }
      // Also cancel any browser speech synthesis if active
      html.window.speechSynthesis?.cancel();
    } catch (_) {}
    _isPlaying = false;
  }

  /// Browser native speech synthesis fallback
  void speakWithBrowserFallback(String text, {bool isTamil = false}) {
    if (!kIsWeb) return;
    try {
      stopAudio();
      final clean = text.replaceAll(RegExp(r'[\*\#\_\[\]]'), '').trim();
      final utterance = html.SpeechSynthesisUtterance(clean);
      utterance.lang = isTamil ? 'ta-IN' : 'en-IN';
      utterance.rate = 1.0;
      utterance.onEnd.listen((_) {
        _isPlaying = false;
        _onAudioComplete?.call();
      });
      _isPlaying = true;
      html.window.speechSynthesis?.speak(utterance);
    } catch (_) {
      _isPlaying = false;
    }
  }
}
