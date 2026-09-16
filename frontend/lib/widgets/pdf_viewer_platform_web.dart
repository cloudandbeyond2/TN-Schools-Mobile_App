// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';

Widget createPdfPlatformView(String url, String viewId) {
  // Register unique view factory for the embedded iframe
  ui_web.platformViewRegistry.registerViewFactory(
    viewId,
    (int id) {
      final iframe = html.IFrameElement()
        ..src = url
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allowFullscreen = true;
      return iframe;
    },
  );

  return HtmlElementView(viewType: viewId);
}

String? _extractYouTubeId(String url) {
  final regExp = RegExp(
    r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})',
    caseSensitive: false,
  );
  final match = regExp.firstMatch(url);
  return match?.group(1);
}

Widget createVideoPlatformView(String url, String viewId) {
  final ytId = _extractYouTubeId(url);

  ui_web.platformViewRegistry.registerViewFactory(
    viewId,
    (int id) {
      final iframe = html.IFrameElement()
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allowFullscreen = true;

      if (ytId != null && ytId.isNotEmpty) {
        iframe.src =
            'https://www.youtube-nocookie.com/embed/$ytId?autoplay=1&rel=0';
        iframe.allow =
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      } else {
        iframe.srcdoc = '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #000; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    video { width: 100%; height: 100%; max-height: 100vh; object-fit: contain; outline: none; }
  </style>
</head>
<body>
  <video src="$url" controls autoplay playsinline></video>
</body>
</html>
''';
      }
      return iframe;
    },
  );

  return HtmlElementView(viewType: viewId);
}
