import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Una barra del gráfico: etiqueta, valor y color.
class BarPoint {
  const BarPoint(this.label, this.value, this.color);
  final String label;
  final double value;
  final Color color;
}

/// Gráfico de barras sencillo con los colores de la app.
class SimpleBarChart extends StatelessWidget {
  const SimpleBarChart({
    super.key,
    required this.points,
    this.maxY,
    this.height = 170,
    this.format = _plain,
    this.labelEvery = 1,
    this.barWidth = 16,
  });

  final List<BarPoint> points;
  final double? maxY;
  final double height;
  final String Function(double) format;

  /// Muestra una etiqueta cada N barras (para meses con 31 días).
  final int labelEvery;
  final double barWidth;

  static String _plain(double v) => v.round().toString();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final small = TextStyle(fontSize: 11, color: c.muted);
    final top = maxY ?? math.max(1, points.fold<double>(0, (m, p) => math.max(m, p.value)) * 1.15);
    return SizedBox(
      height: height,
      child: BarChart(
        BarChartData(
          minY: 0,
          maxY: top,
          alignment: BarChartAlignment.spaceAround,
          borderData: FlBorderData(show: false),
          gridData: FlGridData(
            drawVerticalLine: false,
            horizontalInterval: top / 2,
            getDrawingHorizontalLine: (_) => FlLine(color: c.grid, strokeWidth: 1),
          ),
          titlesData: FlTitlesData(
            topTitles: const AxisTitles(),
            rightTitles: const AxisTitles(),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 40,
                interval: top / 2,
                getTitlesWidget: (v, meta) => Text(format(v), style: small),
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 22,
                getTitlesWidget: (v, meta) {
                  final i = v.toInt();
                  if (i < 0 || i >= points.length || i % labelEvery != 0) return const SizedBox.shrink();
                  return Padding(padding: const EdgeInsets.only(top: 4), child: Text(points[i].label, style: small));
                },
              ),
            ),
          ),
          barTouchData: BarTouchData(
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (_) => c.surface,
              tooltipBorder: BorderSide(color: c.line),
              getTooltipItem: (group, _, rod, _) => BarTooltipItem(
                '${points[group.x].label}\n${format(rod.toY)}',
                TextStyle(color: c.ink, fontWeight: FontWeight.w700, fontSize: 12),
              ),
            ),
          ),
          barGroups: [
            for (final (i, p) in points.indexed)
              BarChartGroupData(
                x: i,
                barRods: [
                  BarChartRodData(
                    toY: p.value,
                    color: p.color,
                    width: barWidth,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

/// Anillo de progreso que se dibuja desde arriba al aparecer.
class ProgressRing extends StatelessWidget {
  const ProgressRing({super.key, required this.value, required this.color, required this.label, this.size = 120});
  final double value;
  final Color color;
  final String label;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox.square(
      dimension: size,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: value.clamp(0, 1)),
        duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 1000),
        curve: Curves.easeOutCubic,
        builder: (context, v, child) => CustomPaint(
          painter: _RingPainter(progress: v, color: color, track: c.surface2, stroke: size * 0.1),
          child: child,
        ),
        child: Center(
          child: Text(
            label,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.progress, required this.color, required this.track, required this.stroke});
  final double progress;
  final Color color;
  final Color track;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(stroke / 2, stroke / 2, size.width - stroke, size.height - stroke);
    final base = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, 0, math.pi * 2, false, base..color = track);
    if (progress > 0) canvas.drawArc(rect, -math.pi / 2, math.pi * 2 * progress, false, base..color = color);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.progress != progress || old.color != color || old.track != track;
}
