// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:convert';

void downloadPdfFile(String fileName, String title, String content, List<String> bullets) {
  final buffer = StringBuffer();
  buffer.writeln('%PDF-1.4');
  buffer.writeln('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  buffer.writeln('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  buffer.writeln('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj');
  
  final textContent = 'BT /F1 18 Tf 50 720 Td ($title) Tj /F1 12 Tf 0 -30 Td (Issued by: Department of School Education, Tamil Nadu) Tj 0 -25 Td (----------------------------------------------------------------) Tj 0 -25 Td (Official Notice:) Tj /F1 10 Tf 0 -20 Td (${content.replaceAll("(", "\\(").replaceAll(")", "\\)")}) Tj ET';
  
  buffer.writeln('4 0 obj << /Length ${textContent.length} >> stream');
  buffer.writeln(textContent);
  buffer.writeln('endstream endobj');
  buffer.writeln('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
  buffer.writeln('xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000250 00000 n \n0000000450 00000 n \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n550\n%%EOF');

  final bytes = utf8.encode(buffer.toString());
  final blob = html.Blob([bytes], 'application/pdf');
  final url = html.Url.createObjectUrlFromBlob(blob);
  html.AnchorElement(href: url)
    ..setAttribute('download', fileName)
    ..click();
  html.Url.revokeObjectUrl(url);
}
