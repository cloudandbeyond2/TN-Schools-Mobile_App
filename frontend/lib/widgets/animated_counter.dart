import 'package:flutter/material.dart';

/// A high-performance, smooth animated counting text widget for numbers, percentages, and counters.
class AnimatedCountText extends StatelessWidget {
  final num value;
  final num begin;
  final String prefix;
  final String suffix;
  final TextStyle? style;
  final Duration duration;
  final Curve curve;
  final int decimalDigits;
  final String Function(num value)? formatter;

  const AnimatedCountText({
    super.key,
    required this.value,
    this.begin = 0,
    this.prefix = '',
    this.suffix = '',
    this.style,
    this.duration = const Duration(milliseconds: 1200),
    this.curve = Curves.easeOutCubic,
    this.decimalDigits = 0,
    this.formatter,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: begin.toDouble(), end: value.toDouble()),
      duration: duration,
      curve: curve,
      builder: (context, val, child) {
        String text;
        if (formatter != null) {
          text = formatter!(val);
        } else if (decimalDigits == 0) {
          text = '$prefix${val.round()}$suffix';
        } else {
          text = '$prefix${val.toStringAsFixed(decimalDigits)}$suffix';
        }
        return Text(text, style: style);
      },
    );
  }
}

/// An animated circular progress indicator that animates smoothly from 0.0 to target value.
class AnimatedCircularProgress extends StatelessWidget {
  final double value; // 0.0 to 1.0
  final double strokeWidth;
  final Color color;
  final Color backgroundColor;
  final Duration duration;
  final Curve curve;
  final StrokeCap strokeCap;

  const AnimatedCircularProgress({
    super.key,
    required this.value,
    this.strokeWidth = 5.0,
    required this.color,
    this.backgroundColor = const Color(0xFFE2E8F0),
    this.duration = const Duration(milliseconds: 1200),
    this.curve = Curves.easeOutCubic,
    this.strokeCap = StrokeCap.round,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: value.clamp(0.0, 1.0)),
      duration: duration,
      curve: curve,
      builder: (context, animatedVal, child) {
        return CircularProgressIndicator(
          value: animatedVal,
          strokeWidth: strokeWidth,
          backgroundColor: backgroundColor,
          strokeCap: strokeCap,
          valueColor: AlwaysStoppedAnimation<Color>(color),
        );
      },
    );
  }
}

/// An animated linear progress bar that animates smoothly from 0.0 to target value.
class AnimatedLinearProgress extends StatelessWidget {
  final double value; // 0.0 to 1.0
  final double minHeight;
  final Color color;
  final Color backgroundColor;
  final Duration duration;
  final Curve curve;
  final BorderRadiusGeometry borderRadius;

  const AnimatedLinearProgress({
    super.key,
    required this.value,
    this.minHeight = 6.0,
    required this.color,
    this.backgroundColor = const Color(0xFFF1F5F9),
    this.duration = const Duration(milliseconds: 1200),
    this.curve = Curves.easeOutCubic,
    this.borderRadius = const BorderRadius.all(Radius.circular(10)),
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius,
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(begin: 0.0, end: value.clamp(0.0, 1.0)),
        duration: duration,
        curve: curve,
        builder: (context, animatedVal, child) {
          return LinearProgressIndicator(
            value: animatedVal,
            minHeight: minHeight,
            backgroundColor: backgroundColor,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          );
        },
      ),
    );
  }
}
