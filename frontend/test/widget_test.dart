import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/app.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const StudentApp());
    expect(find.byType(StudentApp), findsOneWidget);
  });
}
