// Conditional import: uses dart:html (web) or a stub (mobile/desktop).
// ignore: uri_does_not_exist
export 'speech_audio_helper_stub.dart'
    // ignore: uri_does_not_exist
    if (dart.library.html) 'speech_audio_helper_web.dart';
