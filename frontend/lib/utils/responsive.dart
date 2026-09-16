import 'package:flutter/material.dart';

class Responsive {
  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < 600;

  static bool isTablet(BuildContext context) =>
      MediaQuery.of(context).size.width >= 600 &&
      MediaQuery.of(context).size.width < 1100;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= 1100;

  static double width(BuildContext context) => MediaQuery.of(context).size.width;
  static double height(BuildContext context) => MediaQuery.of(context).size.height;

  static int getGridCrossAxisCount(BuildContext context, {int base = 2}) {
    double w = MediaQuery.of(context).size.width;
    if (w >= 1100) return base + 2;
    if (w >= 700) return base + 1;
    return base;
  }

  static double horizontalPadding(BuildContext context) {
    double w = MediaQuery.of(context).size.width;
    if (w > 800) return (w - 700) / 2;
    return 18.0;
  }
}
