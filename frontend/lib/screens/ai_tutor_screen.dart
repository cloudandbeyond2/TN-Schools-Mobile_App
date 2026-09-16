import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/localization/app_localization.dart';
import '../services/course_service.dart';
import '../widgets/bottom_nav_bar.dart';
import '../utils/speech_audio_helper.dart';

class AITutorScreen extends StatefulWidget {
  final String? initialSubject;
  final String? initialQuestion;

  const AITutorScreen({
    super.key,
    this.initialSubject,
    this.initialQuestion,
  });

  @override
  State<AITutorScreen> createState() => _AITutorScreenState();
}

class _ChatMessage {
  final String role; // "user" | "assistant"
  final String content;
  final String time;
  final bool isVoiceQuery;
  final String? detectedTopic;
  final String? queryIntent;
  final List<String>? keyConcepts;
  String? audioUrl;
  bool isAudioLoading = false;
  bool isAudioPlaying = false;
  bool showAnalysis = true;

  _ChatMessage({
    required this.role,
    required this.content,
    required this.time,
    this.isVoiceQuery = false,
    this.detectedTopic,
    this.queryIntent,
    this.keyConcepts,
    this.showAnalysis = true,
  });

  Map<String, dynamic> toJson() => {
        'role': role,
        'content': content,
        'isVoiceQuery': isVoiceQuery,
        'detectedTopic': detectedTopic,
        'queryIntent': queryIntent,
        'keyConcepts': keyConcepts,
        'audioUrl': audioUrl,
      };
}

class _SavedSession {
  final String id;
  final String sessionId;
  final String subject;
  final String language;
  final List<_ChatMessage> messages;
  final String createdAt;

  _SavedSession({
    required this.id,
    required this.sessionId,
    required this.subject,
    required this.language,
    required this.messages,
    required this.createdAt,
  });
}

class _AITutorScreenState extends State<AITutorScreen>
    with SingleTickerProviderStateMixin {
  static const String _baseUrl = 'http://localhost:5000';

  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  late AnimationController _soundwaveController;

  static const List<String> _allSubjects = [
    'Mathematics',
    'Science',
    'Tamil',
    'English',
    'Social Science',
    'Physics',
    'Chemistry',
    'Biology',
  ];

  static const List<String> _suggestedQuestions = [
    "Explain Pythagoras Theorem with examples",
    "What is photosynthesis?",
    "Help me understand quadratic equations",
    "Explain Newton's Third Law with examples",
    "How does human digestive system work?",
    "திருக்குறள் அதிகாரம் விளக்கம் கூறுக",
  ];

  String _studentClass = '10';
  String? _studentId;
  String? _studentToken;
  String _selectedSubject = 'Mathematics';
  String _language = 'bilingual'; // 'bilingual' | 'tamil' | 'english'
  String _sessionId = '';
  bool _isTyping = false;
  bool _isLoadingHistory = false;
  bool _autoSpeakAnswers = true;

  Map<String, String> _getAuthHeaders() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (_studentToken != null && _studentToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_studentToken';
    }
    return headers;
  }

  _ChatMessage? _currentPlayingMessage;

  final List<_ChatMessage> _messages = [
    _ChatMessage(
      role: 'assistant',
      content:
          "வணக்கம்! 👋 I am your AI Tutor. I can help you in Tamil or English with audio speech explanations. Ask me anything about your syllabus — concepts, homework doubts, formulas, or exam prep!\n\n(குரல் மூலமாகவும் தட்டச்சு செய்தும் உங்கள் சந்தேகங்களை கேட்கலாம். பதில்களை ஆடியோவாகவும் கேட்கலாம்!)",
      time: 'Now',
      detectedTopic: 'Tamil Nadu Samacheer Kalvi AI Tutor',
      queryIntent: 'Welcome & Bilingual Voice Coaching',
      keyConcepts: [
        'Voice Speech Queries',
        'Audio Explanations',
        'Tamil & English',
        'Concept Analysis',
      ],
      showAnalysis: true,
    ),
  ];

  List<_SavedSession> _pastSessions = [];

  @override
  void initState() {
    super.initState();
    _sessionId = 'session-${DateTime.now().millisecondsSinceEpoch}';

    _soundwaveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat();

    if (widget.initialSubject != null && widget.initialSubject!.isNotEmpty) {
      final matched = _allSubjects.firstWhere(
        (s) => s.toLowerCase() == widget.initialSubject!.toLowerCase(),
        orElse: () => widget.initialSubject!,
      );
      _selectedSubject = matched;
    }

    if (widget.initialQuestion != null && widget.initialQuestion!.isNotEmpty) {
      _textController.text = widget.initialQuestion!;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initStudentAndHistory();
    });
  }

  @override
  void dispose() {
    SpeechAudioHelper().stopAudio();
    SpeechAudioHelper().stopListening();
    _soundwaveController.dispose();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutQuad,
        );
      }
    });
  }

  List<String> _getDisplaySubjects() {
    final parsedClass =
        int.tryParse(RegExp(r'\d+').firstMatch(_studentClass)?.group(0) ?? '10') ??
            10;
    if (parsedClass >= 11) {
      return _allSubjects;
    }
    return ['Tamil', 'English', 'Mathematics', 'Science', 'Social Science'];
  }

  Future<void> _initStudentAndHistory() async {
    try {
      final courseService = Provider.of<CourseService>(context, listen: false);
      final student = courseService.student;
      _studentToken = student.token;

      final cls = student.classStandard.replaceAll(RegExp(r'\D'), '');
      if (cls.isNotEmpty) {
        setState(() => _studentClass = cls);
      }

      String? sId =
          student.studentId ?? (student.id.isNotEmpty ? student.id : null);

      if (student.id.isNotEmpty) {
        final profileRes = await http
            .get(Uri.parse('$_baseUrl/api/students?userId=${student.id}'), headers: _getAuthHeaders())
            .timeout(const Duration(seconds: 5));
        if (profileRes.statusCode == 200) {
          final pJson = jsonDecode(profileRes.body);
          if (pJson['success'] == true && pJson['data'] != null) {
            final sData = pJson['data'] is List
                ? (pJson['data'] as List).firstOrNull
                : pJson['data'];
            if (sData != null && sData['id'] != null) {
              sId = sData['id'].toString();
            }
          }
        }
      }

      if (sId != null) {
        setState(() => _studentId = sId);
        _fetchPastSessions(sId);
      }
    } catch (e) {
      debugPrint('Error in _initStudentAndHistory: $e');
    }
  }

  Future<void> _fetchPastSessions(String studentId) async {
    setState(() => _isLoadingHistory = true);
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl/api/ai/chat/$studentId'), headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true && json['data'] is List) {
          final sessions = (json['data'] as List).map<_SavedSession>((s) {
            final rawMsgs = s['messages'] as List? ?? [];
            final msgs = rawMsgs.map<_ChatMessage>((m) {
              return _ChatMessage(
                role: m['role']?.toString() ?? 'user',
                content: m['content']?.toString() ?? '',
                time: 'Saved',
                isVoiceQuery: m['isVoiceQuery'] == true,
                detectedTopic: m['detectedTopic']?.toString(),
                queryIntent: m['queryIntent']?.toString(),
                keyConcepts: (m['keyConcepts'] as List?)
                    ?.map((e) => e.toString())
                    .toList(),
              );
            }).toList();

            return _SavedSession(
              id: s['_id']?.toString() ?? '',
              sessionId: s['sessionId']?.toString() ?? '',
              subject: s['subject']?.toString() ?? 'General',
              language: s['language']?.toString() ?? 'bilingual',
              messages: msgs,
              createdAt: s['createdAt']?.toString() ?? '',
            );
          }).toList();

          setState(() => _pastSessions = sessions);
        }
      }
    } catch (e) {
      debugPrint('Error fetching past sessions: $e');
    } finally {
      if (mounted) setState(() => _isLoadingHistory = false);
    }
  }

  Future<void> _saveChatSession(List<_ChatMessage> updatedMessages) async {
    if (_studentId == null || _sessionId.isEmpty) return;
    try {
      final formattedMsgs = updatedMessages.map((m) => m.toJson()).toList();
      await http.post(
        Uri.parse('$_baseUrl/api/ai/chat'),
        headers: _getAuthHeaders(),
        body: jsonEncode({
          'studentId': _studentId,
          'sessionId': _sessionId,
          'subject': _selectedSubject,
          'language': _language,
          'messages': formattedMsgs,
        }),
      );

      _fetchPastSessions(_studentId!);
    } catch (err) {
      debugPrint('Failed to save chat session: $err');
    }
  }

  /// Extracts concept topic, pedagogical intent, and key takeaways
  Map<String, dynamic> _extractConceptAnalysis(
    String query,
    String response,
    String subject,
  ) {
    final lowerQ = query.toLowerCase();

    // 1. Topic Identification
    String topic = '$subject Topic Analysis';
    if (lowerQ.contains('pythagor')) {
      topic = 'Pythagoras Theorem • Geometry & Right Triangles';
    } else if (lowerQ.contains('photosynthe') || lowerQ.contains('ஒளிச்சேர்க்கை')) {
      topic = 'Photosynthesis • Plant Physiology & Solar Energy';
    } else if (lowerQ.contains('quadratic') || lowerQ.contains('இருபடி')) {
      topic = 'Quadratic Equations • Algebraic Roots & Factoring';
    } else if (lowerQ.contains('newton') || lowerQ.contains('நியூட்டன்')) {
      topic = "Newton's Laws of Motion • Classical Dynamics";
    } else if (lowerQ.contains('digest') || lowerQ.contains('செரிமான')) {
      topic = 'Human Digestive System • Biology & Enzymes';
    } else if (lowerQ.contains('french revolution') || lowerQ.contains('புரட்சி')) {
      topic = 'French Revolution • World History & Liberty';
    } else if (lowerQ.contains('essay') || lowerQ.contains('கட்டுரை')) {
      topic = 'Formal Composition & Grammar Rules';
    } else if (lowerQ.contains('trig') || lowerQ.contains('முக்கோண')) {
      topic = 'Trigonometry • Sin, Cos & Tangent Applications';
    } else if (lowerQ.contains('gravity') || lowerQ.contains('ஈர்ப்பு')) {
      topic = 'Gravitation • Planetary Motion & Acceleration';
    } else {
      // Pick clean snippet from query
      final cleanWords = query
          .replaceAll(RegExp(r'[^\w\s\u0B80-\u0BFF]'), '')
          .split(' ')
          .where((w) => w.length > 2)
          .take(4)
          .join(' ');
      if (cleanWords.isNotEmpty) {
        topic = '$subject: ${cleanWords[0].toUpperCase()}${cleanWords.substring(1)}';
      }
    }

    // 2. Query Intent
    String intent = 'Core Concept Explanation';
    if (lowerQ.contains('how') || lowerQ.contains('solve') || lowerQ.contains('calculate')) {
      intent = 'Step-by-Step Problem Solving';
    } else if (lowerQ.contains('formula') || lowerQ.contains('equation') || lowerQ.contains('விதி')) {
      intent = 'Formula & Rule Derivation';
    } else if (lowerQ.contains('why') || lowerQ.contains('காரணம்')) {
      intent = 'Scientific Reasoning & Cause';
    } else if (lowerQ.contains('example') || lowerQ.contains('உதாரணம்')) {
      intent = 'Practical Applications & Examples';
    } else if (lowerQ.contains('exam') || lowerQ.contains('important') || lowerQ.contains('முக்கிய')) {
      intent = 'High-Weightage Exam Revision';
    }

    // 3. Key Concepts extracted from response
    final concepts = <String>[];
    final boldMatches = RegExp(r'\*\*([^*]+)\*\*').allMatches(response);
    for (final m in boldMatches) {
      final term = m.group(1)?.trim() ?? '';
      if (term.isNotEmpty &&
          term.length <= 25 &&
          !term.toLowerCase().contains('note') &&
          !term.toLowerCase().contains('explanation') &&
          !concepts.contains(term)) {
        concepts.add(term);
      }
      if (concepts.length >= 4) break;
    }

    if (concepts.isEmpty) {
      if (lowerQ.contains('pythagor')) {
        concepts.addAll(['Hypotenuse (கர்ணம்)', 'a² + b² = c²', 'Right Angle (செங்கோணம்)']);
      } else if (lowerQ.contains('photosynthe')) {
        concepts.addAll(['Chlorophyll (பச்சையம்)', 'Sunlight (சூரிய ஒளி)', 'Glucose & Oxygen']);
      } else if (lowerQ.contains('newton')) {
        concepts.addAll(['Action & Reaction', 'Force Pair', 'Conservation of Momentum']);
      } else {
        concepts.addAll([subject, 'Conceptual Understanding', 'TN Samacheer Kalvi']);
      }
    }

    return {
      'topic': topic,
      'intent': intent,
      'concepts': concepts,
    };
  }

  /// Sends a message, extracts concept analysis, and triggers audio answer playback
  Future<void> _sendMessage([String? presetText, bool isVoice = false]) async {
    final text = presetText ?? _textController.text.trim();
    if (text.isEmpty || _isTyping) return;

    // Stop any ongoing audio before sending a new query
    _stopAllAudio();

    final userMsg = _ChatMessage(
      role: 'user',
      content: text,
      time: 'Now',
      isVoiceQuery: isVoice,
    );
    setState(() {
      _messages.add(userMsg);
      _isTyping = true;
    });

    if (presetText == null) {
      _textController.clear();
    }
    _scrollToBottom();

    try {
      final history = _messages
          .where((m) => m.role == 'user' || m.role == 'assistant')
          .map((m) => {'role': m.role, 'content': m.content})
          .toList();

      final res = await http.post(
        Uri.parse('$_baseUrl/api/ai/chat-tutor'),
        headers: _getAuthHeaders(),
        body: jsonEncode({
          'subject': _selectedSubject,
          'grade': 'Grade $_studentClass',
          'messages':
              history.length > 15 ? history.sublist(history.length - 15) : history,
          'currentMessage': userMsg.content,
          'language': _language,
          if (_studentId != null) 'studentId': _studentId,
        }),
      ).timeout(const Duration(seconds: 40));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['text'] != null) {
          final replyText = data['text'].toString();
          final analysis = _extractConceptAnalysis(
            userMsg.content,
            replyText,
            _selectedSubject,
          );

          final aiMsg = _ChatMessage(
            role: 'assistant',
            content: replyText,
            time: 'Now',
            isVoiceQuery: isVoice,
            detectedTopic: analysis['topic'] as String?,
            queryIntent: analysis['intent'] as String?,
            keyConcepts: (analysis['concepts'] as List?)?.cast<String>(),
            showAnalysis: true,
          );

          if (mounted) {
            setState(() {
              _messages.add(aiMsg);
            });
            _saveChatSession(_messages);
            _scrollToBottom();

            // Spoken Answer Playback: trigger if auto-speak is enabled or was voice query
            if (_autoSpeakAnswers || isVoice) {
              _playMessageAudio(aiMsg);
            }
          }
          return;
        }
      }

      throw Exception('Server error: ${res.statusCode}');
    } catch (err) {
      debugPrint('AI Chat Error: $err');
      if (mounted) {
        setState(() {
          _messages.add(_ChatMessage(
            role: 'assistant',
            content:
                'Error connecting to AI Tutor. Please check your connection and try again.\n\n(AI ஆசிரியருடன் இணைக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.)',
            time: 'Now',
          ));
        });
        _scrollToBottom();
      }
    } finally {
      if (mounted) setState(() => _isTyping = false);
    }
  }

  /// Stop all active audio playing across messages
  void _stopAllAudio() {
    SpeechAudioHelper().stopAudio();
    if (mounted) {
      setState(() {
        for (final m in _messages) {
          m.isAudioPlaying = false;
          m.isAudioLoading = false;
        }
        _currentPlayingMessage = null;
      });
    }
  }

  /// Play audio answer via Tamil Nadu TTS neural service or fallback
  Future<void> _playMessageAudio(_ChatMessage msg) async {
    if (msg.isAudioPlaying) {
      _stopAllAudio();
      return;
    }

    // If another message was playing, stop it
    _stopAllAudio();

    setState(() {
      msg.isAudioLoading = true;
      _currentPlayingMessage = msg;
    });

    try {
      // 1. Get or Generate TTS Audio MP3
      if (msg.audioUrl == null) {
        final audioUrl = await SpeechAudioHelper().generateTTSAudio(
          text: msg.content,
          language: _language,
        );
        if (mounted && audioUrl != null) {
          msg.audioUrl = audioUrl;
        }
      }

      if (!mounted) return;

      setState(() {
        msg.isAudioLoading = false;
      });

      // 2. Play Audio via HTML5 AudioElement
      if (msg.audioUrl != null) {
        setState(() {
          msg.isAudioPlaying = true;
        });

        SpeechAudioHelper().playAudioUrl(
          msg.audioUrl!,
          onComplete: () {
            if (mounted) {
              setState(() {
                msg.isAudioPlaying = false;
                if (_currentPlayingMessage == msg) {
                  _currentPlayingMessage = null;
                }
              });
            }
          },
          onError: (err) {
            debugPrint('TTS Audio playback failed, using fallback: $err');
            if (mounted) {
              setState(() {
                msg.isAudioPlaying = false;
              });
              // Fallback to browser SpeechSynthesis
              final isTamil = _language == 'tamil' ||
                  RegExp(r'[\u0B80-\u0BFF]').hasMatch(msg.content);
              SpeechAudioHelper().speakWithBrowserFallback(
                msg.content.substring(
                  0,
                  math.min(250, msg.content.length),
                ),
                isTamil: isTamil,
              );
            }
          },
        );
      } else {
        // Fallback directly
        final isTamil = _language == 'tamil' ||
            RegExp(r'[\u0B80-\u0BFF]').hasMatch(msg.content);
        SpeechAudioHelper().speakWithBrowserFallback(
          msg.content.substring(0, math.min(250, msg.content.length)),
          isTamil: isTamil,
        );
        setState(() {
          msg.isAudioPlaying = true;
        });
        Future.delayed(const Duration(seconds: 8), () {
          if (mounted && msg.isAudioPlaying) {
            setState(() => msg.isAudioPlaying = false);
          }
        });
      }
    } catch (e) {
      debugPrint('Error in _playMessageAudio: $e');
      if (mounted) {
        setState(() {
          msg.isAudioLoading = false;
          msg.isAudioPlaying = false;
        });
      }
    }
  }

  /// Voice Query Modal Sheet with Live Transcription & Speech Recognition
  void _showVoiceQueryModal(bool isTamil) {
    String currentTranscript = '';
    bool isListeningNow = true;
    String voiceLang = _language == 'tamil' ? 'tamil' : (_language == 'english' ? 'english' : 'bilingual');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            void handleStartListening() {
              SpeechAudioHelper().startListening(
                language: voiceLang,
                onResult: (transcript, isFinal) {
                  setModalState(() {
                    currentTranscript = transcript;
                  });
                },
                onError: (err) {
                  setModalState(() {
                    isListeningNow = false;
                  });
                },
                onDone: () {
                  setModalState(() {
                    isListeningNow = false;
                  });
                },
              );
              setModalState(() {
                isListeningNow = true;
              });
            }

            // Start on open
            if (isListeningNow && !SpeechAudioHelper().isListening) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                handleStartListening();
              });
            }

            return Container(
              padding: EdgeInsets.only(
                top: 20,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(modalContext).viewInsets.bottom + 24,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 25,
                    offset: Offset(0, -6),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Top Drag Handle
                  Container(
                    width: 44,
                    height: 5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header with Title & Language Switcher
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.mic_rounded,
                              color: Color(0xFF4F46E5),
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isTamil
                                    ? 'குரல் வழி சந்தேகங்கள்'
                                    : 'Voice Doubt & Speech Chat',
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Outfit',
                                ),
                              ),
                              Text(
                                isTamil
                                    ? 'நேரடி பேச்சு அங்கீகாரம் & உடனடி ஆய்வு'
                                    : 'Live speech recognition & concept analysis',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF64748B),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded,
                            size: 20, color: Color(0xFF94A3B8)),
                        onPressed: () {
                          SpeechAudioHelper().stopListening();
                          Navigator.pop(modalContext);
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Language Segmented Selector for Voice
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        _buildModalLangChip('bilingual', 'தமிழ் + English', voiceLang, (val) {
                          setModalState(() {
                            voiceLang = val;
                            SpeechAudioHelper().stopListening();
                            handleStartListening();
                          });
                        }),
                        _buildModalLangChip('tamil', 'தமிழ் (Tamil)', voiceLang, (val) {
                          setModalState(() {
                            voiceLang = val;
                            SpeechAudioHelper().stopListening();
                            handleStartListening();
                          });
                        }),
                        _buildModalLangChip('english', 'English', voiceLang, (val) {
                          setModalState(() {
                            voiceLang = val;
                            SpeechAudioHelper().stopListening();
                            handleStartListening();
                          });
                        }),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Animated Glowing Microphone Avatar
                  GestureDetector(
                    onTap: () {
                      if (isListeningNow) {
                        SpeechAudioHelper().stopListening();
                        setModalState(() => isListeningNow = false);
                      } else {
                        handleStartListening();
                      }
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: isListeningNow
                              ? [const Color(0xFF4F46E5), const Color(0xFF9333EA)]
                              : [const Color(0xFF94A3B8), const Color(0xFF64748B)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: isListeningNow
                            ? [
                                BoxShadow(
                                  color: const Color(0xFF4F46E5).withValues(alpha: 0.4),
                                  blurRadius: 20,
                                  spreadRadius: 4,
                                ),
                              ]
                            : [],
                      ),
                      child: Center(
                        child: Icon(
                          isListeningNow ? Icons.mic_rounded : Icons.mic_off_rounded,
                          color: Colors.white,
                          size: 40,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Status Label
                  Text(
                    isListeningNow
                        ? (isTamil ? 'பேசுங்கள், நான் கேட்கிறேன்...' : 'Listening... Speak your question clearly')
                        : (isTamil ? 'மைக் நிறுத்தப்பட்டது (தொடவும்)' : 'Microphone paused (tap to speak)'),
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: isListeningNow ? const Color(0xFF4F46E5) : const Color(0xFF64748B),
                      fontFamily: 'Outfit',
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Live Speech Transcript Box
                  Container(
                    width: double.infinity,
                    constraints: const BoxConstraints(minHeight: 80, maxHeight: 130),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: currentTranscript.isNotEmpty
                            ? const Color(0xFF4F46E5)
                            : const Color(0xFFE2E8F0),
                        width: 1.5,
                      ),
                    ),
                    child: SingleChildScrollView(
                      child: Text(
                        currentTranscript.isNotEmpty
                            ? currentTranscript
                            : (isTamil
                                ? 'நீங்கள் பேசும் வார்த்தைகள் இங்கே தோன்றும்...\n(எ.கா: "ஒளிச்சேர்க்கை என்றால் என்ன?")'
                                : 'Your spoken doubt will appear here in real-time...\n(e.g., "Explain Pythagoras Theorem with formula")'),
                        style: TextStyle(
                          fontSize: 13.5,
                          height: 1.4,
                          fontWeight: currentTranscript.isNotEmpty
                              ? FontWeight.w700
                              : FontWeight.w500,
                          color: currentTranscript.isNotEmpty
                              ? const Color(0xFF0F172A)
                              : const Color(0xFF94A3B8),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Quick Spoken Suggestions
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: [
                        _buildQuickPromptChip("Explain Pythagoras theorem", (t) {
                          setModalState(() => currentTranscript = t);
                        }),
                        _buildQuickPromptChip("What is photosynthesis?", (t) {
                          setModalState(() => currentTranscript = t);
                        }),
                        _buildQuickPromptChip("நியூட்டனின் மூன்றாம் விதி", (t) {
                          setModalState(() => currentTranscript = t);
                        }),
                        _buildQuickPromptChip("Quadratic equation formula", (t) {
                          setModalState(() => currentTranscript = t);
                        }),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Action Buttons: Cancel or Send & Analyze
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            SpeechAudioHelper().stopListening();
                            Navigator.pop(modalContext);
                          },
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                          child: Text(
                            isTamil ? 'ரத்து செய்' : 'Cancel',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF475569),
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: currentTranscript.trim().isEmpty
                              ? null
                              : () {
                                  final q = currentTranscript.trim();
                                  SpeechAudioHelper().stopListening();
                                  Navigator.pop(modalContext);
                                  _sendMessage(q, true);
                                },
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            backgroundColor: const Color(0xFF4F46E5),
                            elevation: 3,
                            shadowColor: const Color(0xFF4F46E5).withValues(alpha: 0.4),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.analytics_rounded,
                                  color: Colors.white, size: 18),
                              const SizedBox(width: 6),
                              Text(
                                isTamil ? 'கேளுங்கள் & ஆய்வு செய்' : 'Send & Analyze Doubt',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildModalLangChip(
    String key,
    String label,
    String currentKey,
    Function(String) onSelect,
  ) {
    final isSelected = key == currentKey;
    return Expanded(
      child: GestureDetector(
        onTap: () => onSelect(key),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                color: isSelected ? const Color(0xFF4F46E5) : const Color(0xFF64748B),
                fontFamily: 'Outfit',
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQuickPromptChip(String text, Function(String) onSelect) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ActionChip(
        onPressed: () => onSelect(text),
        backgroundColor: const Color(0xFFF1F5F9),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        label: Text(
          text,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF334155),
            fontFamily: 'Outfit',
          ),
        ),
      ),
    );
  }

  void _loadPastSession(_SavedSession session) {
    _stopAllAudio();
    setState(() {
      _sessionId = session.sessionId;
      _selectedSubject = session.subject;
      _language = session.language;
      _messages.clear();
      _messages.addAll(session.messages);
    });
    _scrollToBottom();
  }

  void _openSessionsDrawer(bool isTamil) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEEF2FF),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.history_rounded,
                              color: Color(0xFF4F46E5), size: 18),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          isTamil
                              ? 'சமீபத்திய உரையாடல்கள்'
                              : 'Recent Learning Sessions',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          size: 20, color: Color(0xFF64748B)),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (_isLoadingHistory)
                  const Center(
                      child: Padding(
                          padding: EdgeInsets.all(20),
                          child: CircularProgressIndicator()))
                else if (_pastSessions.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Text(
                        isTamil
                            ? 'சமீபத்திய அமர்வுகள் எதுவும் இல்லை'
                            : 'No past sessions saved yet',
                        style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF94A3B8),
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: _pastSessions.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final s = _pastSessions[index];
                        return ListTile(
                          onTap: () {
                            Navigator.pop(context);
                            _loadPastSession(s);
                          },
                          tileColor: const Color(0xFFF8FAFC),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          leading: const CircleAvatar(
                            backgroundColor: Color(0xFFEEF2FF),
                            child: Icon(Icons.forum_rounded,
                                color: Color(0xFF4F46E5), size: 18),
                          ),
                          title: Text(
                            s.subject,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Outfit',
                            ),
                          ),
                          subtitle: Text(
                            '${s.messages.length} messages',
                            style: const TextStyle(
                                fontSize: 11, color: Color(0xFF64748B)),
                          ),
                          trailing: const Icon(Icons.chevron_right_rounded,
                              color: Color(0xFF94A3B8), size: 20),
                        );
                      },
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
        final displaySubjects = _getDisplaySubjects();

        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: const SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
            statusBarBrightness: Brightness.light,
          ),
          child: Scaffold(
            backgroundColor: const Color(0xFFF8FAFC),
            body: SafeArea(
              child: Column(
                children: [
                  // 1. Top Navigation Bar
                  _buildTopAppBar(context, isTamil),

                  // 2. Interactive Subject & Language Header (White Luxury Card)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: _buildControlsHeader(displaySubjects, isTamil),
                  ),

                  const SizedBox(height: 8),

                  // 3. Messages Stream with Audio & Speech Analysis
                  Expanded(
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final msg = _messages[index];
                        return _buildMessageBubble(msg, isTamil);
                      },
                    ),
                  ),

                  // 4. Typing Indicator
                  if (_isTyping) _buildTypingIndicator(),

                  // 5. Quick Suggested Questions Row
                  _buildSuggestedQuestionsRow(isTamil),

                  // 6. Input Field Bar with Voice Speech Button
                  _buildInputBar(isTamil),
                ],
              ),
            ),
            bottomNavigationBar: const TNBottomNavBar(currentIndex: -1),
          ),
        );
      },
    );
  }

  // --- Top App Bar ---
  Widget _buildTopAppBar(BuildContext context, bool isTamil) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
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
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.smart_toy_rounded,
                        size: 18, color: Color(0xFF4F46E5)),
                    const SizedBox(width: 6),
                    Text(
                      isTamil ? 'AI ஆசிரியர் & ஆடியோ' : 'AI Tutor & Speech',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
                Text(
                  isTamil
                      ? 'வகுப்பு $_studentClass இருமொழி குரல் வழிகாட்டி'
                      : 'Class $_studentClass Bilingual Speech Assistant',
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                    fontFamily: 'Outfit',
                  ),
                ),
              ],
            ),
          ),
          // History Button
          GestureDetector(
            onTap: () => _openSessionsDrawer(isTamil),
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
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.history_rounded,
                color: Color(0xFF4F46E5),
                size: 22,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- Controls Header (Subject selector, Language toggle & Auto Speak Audio switch) ---
  Widget _buildControlsHeader(List<String> subjects, bool isTamil) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F46E5).withValues(alpha: 0.05),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row: Language Segmented Control + Auto Audio Speak Toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    _buildLangButton('bilingual', 'Tamil + Eng'),
                    _buildLangButton('tamil', 'தமிழ்'),
                    _buildLangButton('english', 'English'),
                  ],
                ),
              ),

              // Auto Audio Answer Toggle Pill
              GestureDetector(
                onTap: () {
                  setState(() {
                    _autoSpeakAnswers = !_autoSpeakAnswers;
                  });
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _autoSpeakAnswers
                        ? const Color(0xFFEEF2FF)
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _autoSpeakAnswers
                          ? const Color(0xFF4F46E5).withValues(alpha: 0.3)
                          : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _autoSpeakAnswers
                            ? Icons.volume_up_rounded
                            : Icons.volume_off_rounded,
                        size: 14,
                        color: _autoSpeakAnswers
                            ? const Color(0xFF4F46E5)
                            : const Color(0xFF94A3B8),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _autoSpeakAnswers ? 'Auto Voice: ON' : 'Auto Voice: OFF',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: _autoSpeakAnswers
                              ? const Color(0xFF4F46E5)
                              : const Color(0xFF64748B),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Row: Horizontal Subject Pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: subjects.map((s) {
                final isSelected = _selectedSubject == s;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedSubject = s),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF4F46E5)
                            : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected
                              ? const Color(0xFF4F46E5)
                              : const Color(0xFFE2E8F0),
                          width: 1.2,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: const Color(0xFF4F46E5)
                                      .withValues(alpha: 0.25),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      child: Text(
                        s,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color:
                              isSelected ? Colors.white : const Color(0xFF475569),
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLangButton(String key, String label) {
    final isSelected = _language == key;
    return GestureDetector(
      onTap: () => setState(() => _language = key),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
            color: isSelected
                ? const Color(0xFF4F46E5)
                : const Color(0xFF64748B),
            fontFamily: 'Outfit',
          ),
        ),
      ),
    );
  }

  // --- Message Bubble Widget with Speech Analysis & Audio Controls ---
  Widget _buildMessageBubble(_ChatMessage msg, bool isTamil) {
    final isUser = msg.role == 'user';

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(11),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF4F46E5).withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(Icons.smart_toy_rounded,
                  color: Colors.white, size: 18),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                // User Voice Query Indicator Pill
                if (isUser && msg.isVoiceQuery)
                  Container(
                    margin: const EdgeInsets.only(bottom: 4, right: 2),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFF4F46E5).withValues(alpha: 0.2),
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.mic_rounded,
                            size: 11, color: Color(0xFF4F46E5)),
                        SizedBox(width: 4),
                        Text(
                          'Voice Doubt Question',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF4F46E5),
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ],
                    ),
                  ),

                // Main Bubble Container
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isUser ? const Color(0xFF4F46E5) : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft: Radius.circular(isUser ? 18 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 18),
                    ),
                    border: Border.all(
                      color: isUser
                          ? const Color(0xFF4338CA)
                          : const Color(0xFFE2E8F0),
                      width: 1.2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isUser
                            ? const Color(0xFF4F46E5).withValues(alpha: 0.15)
                            : Colors.black.withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Formatted Text
                      _renderFormattedText(msg.content, isUser),

                      // Audio Answer Player Toolbar on AI Responses
                      if (!isUser) ...[
                        const SizedBox(height: 12),
                        _buildAudioPlaybackBar(msg, isTamil),
                      ],
                    ],
                  ),
                ),

                // Speech & Concept Analysis Card on AI Responses
                if (!isUser && msg.detectedTopic != null) ...[
                  const SizedBox(height: 6),
                  _buildConceptAnalysisCard(msg, isTamil),
                ],
              ],
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Center(
                child: Text(
                  'S',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    fontFamily: 'Outfit',
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Audio Playback Bar with Play/Pause button, Soundwave animation & status
  Widget _buildAudioPlaybackBar(_ChatMessage msg, bool isTamil) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: msg.isAudioPlaying
              ? const Color(0xFF4F46E5).withValues(alpha: 0.4)
              : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          // Play / Pause / Loading button
          GestureDetector(
            onTap: () => _playMessageAudio(msg),
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: msg.isAudioPlaying
                      ? [const Color(0xFFEF4444), const Color(0xFFDC2626)]
                      : [const Color(0xFF4F46E5), const Color(0xFF6366F1)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: (msg.isAudioPlaying
                            ? const Color(0xFFEF4444)
                            : const Color(0xFF4F46E5))
                        .withValues(alpha: 0.3),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: msg.isAudioLoading
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Icon(
                        msg.isAudioPlaying
                            ? Icons.pause_rounded
                            : Icons.volume_up_rounded,
                        color: Colors.white,
                        size: 17,
                      ),
              ),
            ),
          ),

          const SizedBox(width: 8),

          // Soundwave equalizer animation & Status Text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Text(
                      msg.isAudioPlaying
                          ? (isTamil ? 'ஆடியோ கேட்கிறது...' : 'Playing Spoken Answer...')
                          : (msg.isAudioLoading
                              ? (isTamil ? 'ஆடியோ தயாராகிறது...' : 'Generating Speech Audio...')
                              : (isTamil ? 'பதிலை ஆடியோவாகக் கேள்' : 'Listen Spoken Answer')),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: msg.isAudioPlaying
                            ? const Color(0xFF4F46E5)
                            : const Color(0xFF334155),
                        fontFamily: 'Outfit',
                      ),
                    ),
                    const SizedBox(width: 6),
                    if (msg.isAudioPlaying) _buildSoundwaveEqualizer(),
                  ],
                ),
                Text(
                  isTamil ? 'தமிழ் & English குரல் ஒலிபரப்பு' : 'Tamil & Indian English Neural Voice',
                  style: const TextStyle(
                    fontSize: 9,
                    color: Color(0xFF94A3B8),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

          // Replay / Speaker icon badge
          if (msg.audioUrl != null && !msg.isAudioPlaying)
            IconButton(
              icon: const Icon(Icons.replay_rounded,
                  size: 16, color: Color(0xFF64748B)),
              onPressed: () => _playMessageAudio(msg),
              tooltip: 'Replay audio',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            ),
        ],
      ),
    );
  }

  /// Animated Soundwave Equalizer Bars
  Widget _buildSoundwaveEqualizer() {
    return AnimatedBuilder(
      animation: _soundwaveController,
      builder: (context, _) {
        final val = _soundwaveController.value;
        final h1 = 4.0 + (math.sin(val * 2 * math.pi) * 6.0).abs();
        final h2 = 4.0 + (math.sin((val + 0.3) * 2 * math.pi) * 8.0).abs();
        final h3 = 4.0 + (math.sin((val + 0.6) * 2 * math.pi) * 7.0).abs();
        final h4 = 4.0 + (math.sin((val + 0.9) * 2 * math.pi) * 5.0).abs();

        return Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _buildEqualizerBar(h1),
            const SizedBox(width: 2),
            _buildEqualizerBar(h2),
            const SizedBox(width: 2),
            _buildEqualizerBar(h3),
            const SizedBox(width: 2),
            _buildEqualizerBar(h4),
          ],
        );
      },
    );
  }

  Widget _buildEqualizerBar(double height) {
    return Container(
      width: 2.5,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFF4F46E5),
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  /// Speech & Concept Analysis Card
  Widget _buildConceptAnalysisCard(_ChatMessage msg, bool isTamil) {
    return Container(
      margin: const EdgeInsets.only(top: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9).withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: msg.showAnalysis,
          tilePadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
          childrenPadding:
              const EdgeInsets.only(left: 10, right: 10, bottom: 10),
          dense: true,
          leading: Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: const Color(0xFFEEF2FF),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.psychology_rounded,
                size: 16, color: Color(0xFF4F46E5)),
          ),
          title: Text(
            isTamil
                ? 'பேச்சு & கருத்து ஆய்வு'
                : 'Speech & Concept Analysis',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1E293B),
              fontFamily: 'Outfit',
            ),
          ),
          children: [
            // Detected Topic Row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.bookmark_outline_rounded,
                    size: 13, color: Color(0xFF64748B)),
                const SizedBox(width: 5),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF334155),
                        fontFamily: 'Outfit',
                      ),
                      children: [
                        TextSpan(
                          text: isTamil ? 'கருத்து: ' : 'Concept Topic: ',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        TextSpan(
                          text: msg.detectedTopic ?? '',
                          style: const TextStyle(
                            color: Color(0xFF4F46E5),
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 6),

            // Intent Badge & Speech Clarity
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEDE9FE),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    msg.queryIntent ?? 'Conceptual Doubt',
                    style: const TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF6D28D9),
                      fontFamily: 'Outfit',
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0F2FE),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    msg.isVoiceQuery
                        ? 'Speech: High Accuracy'
                        : 'Query: Text Input',
                    style: const TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0284C7),
                      fontFamily: 'Outfit',
                    ),
                  ),
                ),
              ],
            ),

            // Key Takeaway Tags
            if (msg.keyConcepts != null && msg.keyConcepts!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 5,
                runSpacing: 4,
                children: msg.keyConcepts!.map((c) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Text(
                      '#$c',
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF475569),
                        fontFamily: 'Outfit',
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // Parse Bold Text & Bullets in Messages
  Widget _renderFormattedText(String text, bool isUser) {
    final lines = text.split('\n');
    final textColor = isUser ? Colors.white : const Color(0xFF1E293B);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: lines.map((line) {
        final trimmed = line.trim();

        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          final heading = trimmed.replaceFirst(RegExp(r'^#{2,3}\s+'), '');
          return Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 4),
            child: Text(
              heading,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w900,
                color: isUser ? Colors.white : const Color(0xFF0F172A),
                fontFamily: 'Outfit',
              ),
            ),
          );
        }

        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          final bullet = trimmed.replaceFirst(RegExp(r'^[\*\-]\s+'), '');
          return Padding(
            padding: const EdgeInsets.only(top: 3, bottom: 3, left: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '• ',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: isUser ? Colors.white70 : const Color(0xFF64748B),
                  ),
                ),
                Expanded(child: _buildRichInlineText(bullet, textColor)),
              ],
            ),
          );
        }

        if (trimmed.isEmpty) {
          return const SizedBox(height: 4);
        }

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: _buildRichInlineText(line, textColor),
        );
      }).toList(),
    );
  }

  Widget _buildRichInlineText(String text, Color baseColor) {
    final spans = <TextSpan>[];
    final regExp = RegExp(r'(\*\*[^*]+\*\*)');
    final matches = regExp.allMatches(text);

    int lastIndex = 0;
    for (final m in matches) {
      if (m.start > lastIndex) {
        spans.add(TextSpan(text: text.substring(lastIndex, m.start)));
      }
      final matched = m.group(0)!;
      final boldContent = matched.substring(2, matched.length - 2);
      spans.add(
        TextSpan(
          text: boldContent,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      );
      lastIndex = m.end;
    }

    if (lastIndex < text.length) {
      spans.add(TextSpan(text: text.substring(lastIndex)));
    }

    return RichText(
      text: TextSpan(
        style: TextStyle(
          fontSize: 12.5,
          color: baseColor,
          height: 1.4,
          fontFamily: 'Outfit',
        ),
        children: spans,
      ),
    );
  }

  // --- Typing Indicator ---
  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Color(0xFF4F46E5)),
                ),
                const SizedBox(width: 8),
                Text(
                  'AI Tutor is thinking & analyzing...',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey.shade600,
                    fontFamily: 'Outfit',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- Quick Questions Suggestions Row ---
  Widget _buildSuggestedQuestionsRow(bool isTamil) {
    return Container(
      height: 38,
      margin: const EdgeInsets.only(bottom: 6),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _suggestedQuestions.length,
        separatorBuilder: (context, index) => const SizedBox(width: 6),
        itemBuilder: (context, index) {
          final q = _suggestedQuestions[index];
          return ActionChip(
            onPressed: () => _sendMessage(q),
            backgroundColor: Colors.white,
            side: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            label: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.help_outline_rounded,
                    size: 12, color: Color(0xFF4F46E5)),
                const SizedBox(width: 4),
                Text(
                  q,
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF334155),
                    fontFamily: 'Outfit',
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // --- Input Bar with Voice Speech Button ---
  Widget _buildInputBar(bool isTamil) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        border:
            const Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Clear Chat Button
          IconButton(
            onPressed: () {
              _stopAllAudio();
              setState(() {
                _messages.clear();
                _messages.add(
                  _ChatMessage(
                    role: 'assistant',
                    content: isTamil
                        ? "புதிய உரையாடல் தொடங்கியது! குரல் மூலமாகவும் தட்டச்சு செய்தும் உங்கள் சந்தேகங்களைக் கேட்கலாம்."
                        : "Chat cleared! Ask your doubts via voice or typing, and listen to the spoken answer.",
                    time: 'Now',
                    detectedTopic: 'New Learning Session',
                    queryIntent: 'Doubts & Solutions',
                    keyConcepts: ['Tamil & English', 'Audio Answer'],
                  ),
                );
              });
            },
            icon: const Icon(Icons.delete_outline_rounded,
                color: Color(0xFF94A3B8), size: 22),
            tooltip: 'Clear Chat',
          ),
          const SizedBox(width: 2),

          // Text Field
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: TextField(
                controller: _textController,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
                style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Outfit'),
                decoration: InputDecoration(
                  hintText: isTamil
                      ? 'சந்தேகத்தை தட்டச்சு செய்க...'
                      : 'Ask your doubt or concept...',
                  hintStyle:
                      const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  border: InputBorder.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Microphone Voice Query Button (Pulsing glowing button)
          GestureDetector(
            onTap: () => _showVoiceQueryModal(isTamil),
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(21),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(Icons.mic_rounded, color: Colors.white, size: 21),
            ),
          ),
          const SizedBox(width: 8),

          // Send Button
          GestureDetector(
            onTap: () => _sendMessage(),
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF4F46E5), Color(0xFF6366F1)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(21),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF4F46E5).withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child:
                  const Icon(Icons.send_rounded, color: Colors.white, size: 19),
            ),
          ),
        ],
      ),
    );
  }
}
