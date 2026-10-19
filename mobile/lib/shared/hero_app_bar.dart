import 'package:flutter/material.dart';

import '../core/format.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';

class HeroStat {
  const HeroStat(this.label, this.value, {this.suffix});
  final String label;
  final int value;

  /// Texto tras la cifra, p. ej. "/5".
  final String? suffix;
}

enum _Phase { morning, afternoon, night }

_Phase _phaseOf(DateTime now) {
  if (now.hour >= 5 && now.hour < 12) return _Phase.morning;
  if (now.hour >= 12 && now.hour < 19) return _Phase.afternoon;
  return _Phase.night;
}

const _sky = {
  _Phase.morning: [AppColors.tide950, AppColors.tide900, AppColors.tide500],
  _Phase.afternoon: [AppColors.dusk950, AppColors.dusk800, AppColors.dusk400],
  _Phase.night: [AppColors.night950, AppColors.night900, AppColors.night800],
};

/// Encabezado de cada módulo: un paisaje (cielo, sol y colinas) que se pliega al hacer scroll.
/// Las capas se desplazan a distinta velocidad mientras se pliega (parallax).
class HeroAppBar extends StatelessWidget {
  const HeroAppBar({super.key, required this.title, required this.subtitle, this.stats = const [], this.actions = const []});

  final String title;
  final String subtitle;
  final List<HeroStat> stats;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final phase = _phaseOf(now);
    final expanded = stats.isEmpty ? 170.0 : 250.0;

    return SliverAppBar(
      pinned: true,
      stretch: true,
      expandedHeight: expanded,
      backgroundColor: _sky[phase]![1],
      foregroundColor: AppColors.mist,
      surfaceTintColor: Colors.transparent,
      actions: actions,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(bottom: Radius.circular(Radii.hero))),
      flexibleSpace: LayoutBuilder(
        builder: (context, constraints) {
          final top = MediaQuery.paddingOf(context).top;
          final minHeight = kToolbarHeight + top;
          final t = ((constraints.maxHeight - minHeight) / (expanded + top - minHeight)).clamp(0.0, 1.0);
          final hidden = 1 - t;
          return ClipRRect(
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(Radii.hero)),
            child: Stack(
              fit: StackFit.expand,
              children: [
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: _sky[phase]!,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      stops: const [0, 0.5, 1],
                    ),
                  ),
                ),
                // Capas del paisaje: cuanto más lejos, más acompañan al pliegue.
                Positioned(
                  top: top + 22 + hidden * 26,
                  right: -16,
                  child: Opacity(opacity: 0.35 + 0.65 * t, child: _Sun(night: phase == _Phase.night)),
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: -hidden * 18,
                  height: 90,
                  child: CustomPaint(painter: _HillsPainter()),
                ),
                // Contenido desplegado
                Positioned(
                  left: 20,
                  right: 20,
                  bottom: 20,
                  child: IgnorePointer(
                    ignoring: t < 0.5,
                    child: Opacity(
                      opacity: Curves.easeIn.transform(t),
                      child: Transform.translate(
                        offset: Offset(0, hidden * 24),
                        child: _HeroContent(title: title, subtitle: subtitle, stats: stats, now: now),
                      ),
                    ),
                  ),
                ),
                // Título plegado
                Positioned(
                  left: 20,
                  right: 20 + actions.length * 48,
                  top: top,
                  height: kToolbarHeight,
                  child: IgnorePointer(
                    child: Opacity(
                      opacity: Curves.easeIn.transform(hidden),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppColors.mist),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _HeroContent extends StatelessWidget {
  const _HeroContent({required this.title, required this.subtitle, required this.stats, required this.now});

  final String title;
  final String subtitle;
  final List<HeroStat> stats;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final soft = AppColors.mist.withValues(alpha: 0.8);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: AppColors.dawn400,
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: AppColors.dawn400.withValues(alpha: 0.35), spreadRadius: 4)],
              ),
            ),
            const SizedBox(width: 10),
            Text(Fmt.longDate(now), style: text.labelLarge?.copyWith(color: soft, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: text.headlineMedium?.copyWith(color: AppColors.mist, height: 1.1),
        ),
        const SizedBox(height: 4),
        Text(subtitle, style: text.bodyMedium?.copyWith(color: soft)),
        if (stats.isNotEmpty) ...[
          const SizedBox(height: 14),
          Row(
            children: [
              for (final (i, s) in stats.indexed) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(child: _StatChip(stat: s)),
              ],
            ],
          ),
        ],
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.stat});
  final HeroStat stat;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0x6B031A1C),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // La cifra sube desde cero al aparecer.
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: stat.value.toDouble()),
            duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 700),
            curve: Curves.easeOutCubic,
            builder: (context, v, _) => Text.rich(
              TextSpan(
                text: '${v.round()}',
                children: [
                  if (stat.suffix != null)
                    TextSpan(
                      text: stat.suffix,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xB3F2FBF9)),
                    ),
                ],
              ),
              style: AppTheme.display(text.titleLarge)
                  .copyWith(color: AppColors.mist, fontWeight: FontWeight.w800, fontFeatures: const [FontFeature.tabularFigures()]),
            ),
          ),
          Text(
            stat.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: text.labelSmall?.copyWith(color: AppColors.mist.withValues(alpha: 0.8)),
          ),
        ],
      ),
    );
  }
}

/// Sol (o luna de noche) que "respira" lentamente. Se queda quieto si el sistema pide reducir movimiento.
class _Sun extends StatefulWidget {
  const _Sun({required this.night});
  final bool night;

  @override
  State<_Sun> createState() => _SunState();
}

class _SunState extends State<_Sun> with SingleTickerProviderStateMixin {
  late final AnimationController _breath = AnimationController(vsync: this, duration: const Duration(seconds: 4));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _breath.stop();
    } else if (!_breath.isAnimating) {
      _breath.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = widget.night
        ? const [Colors.white, Color(0xFFDFE7FF), Color(0xFFA9B8EA)]
        : const [AppColors.dawn200, AppColors.dawn400, AppColors.coral500];
    final glow = widget.night ? const Color(0x59BECDFF) : const Color(0x73FBBF5A);
    return SizedBox(
      width: 150,
      height: 150,
      child: Stack(
        alignment: Alignment.center,
        children: [
          for (final (size, alpha) in const [(150.0, 0.06), (118.0, 0.12), (92.0, 0.18)])
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: alpha)),
              ),
            ),
          ScaleTransition(
            scale: Tween(begin: 1.0, end: 1.05).animate(CurvedAnimation(parent: _breath, curve: Curves.easeInOut)),
            child: Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(colors: colors, center: const Alignment(-0.3, -0.4), stops: const [0, 0.45, 1]),
                boxShadow: [BoxShadow(color: glow, blurRadius: 50, spreadRadius: 8)],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Dos colinas superpuestas en la base del encabezado.
class _HillsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 1200;
    final sy = size.height / 200;
    Path hill(List<double> p) {
      final path = Path()..moveTo(0, p[0] * sy);
      path.cubicTo(p[1] * sx, p[2] * sy, p[3] * sx, p[4] * sy, size.width * 0.5, p[5] * sy);
      path.cubicTo(p[6] * sx, p[7] * sy, p[8] * sx, p[9] * sy, size.width, p[10] * sy);
      return path
        ..lineTo(size.width, size.height)
        ..lineTo(0, size.height)
        ..close();
    }

    canvas.drawPath(hill([110, 180, 40, 420, 150, 100, 780, 40, 980, 150, 80]), Paint()..color = Colors.white.withValues(alpha: 0.07));
    canvas.drawPath(hill([150, 220, 110, 420, 190, 140, 800, 100, 1000, 170, 130]), Paint()..color = const Color(0x6B021618));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
