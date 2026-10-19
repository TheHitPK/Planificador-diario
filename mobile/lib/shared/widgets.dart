import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api/api_exception.dart';
import '../core/format.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';

/// Semáforo de cumplimiento: verde = todo, amarillo = 40 % o más, rojo = menos.
enum Level {
  green('Completo', '✓'),
  yellow('A medias', '◐'),
  red('Bajo', '✕'),
  none('Sin datos', '·');

  const Level(this.label, this.icon);
  final String label;
  final String icon;

  static Level fromApi(String? v) => switch (v) {
        'GREEN' => Level.green,
        'YELLOW' => Level.yellow,
        'RED' => Level.red,
        _ => Level.none,
      };

  static Level fromRatio(double? r) {
    if (r == null) return Level.none;
    if (r >= 1) return Level.green;
    if (r >= 0.4) return Level.yellow;
    return Level.red;
  }

  Color color(AppColors c) => switch (this) {
        Level.green => c.good,
        Level.yellow => c.warn,
        Level.red => c.bad,
        Level.none => c.muted,
      };
}

/// Tarjeta de contenido.
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child, this.padding = const EdgeInsets.all(18), this.onTap});

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
    );
  }
}

/// Título de sección con la franja de color de la marca.
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.trailing});
  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 20,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(4),
              gradient: LinearGradient(colors: [c.brandTo, AppColors.dawn400, AppColors.coral500], begin: Alignment.topCenter, end: Alignment.bottomCenter),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: Theme.of(context).textTheme.titleLarge)),
          ?trailing,
        ],
      ),
    );
  }
}

/// Píldora de semáforo: color + icono + texto, nunca solo color.
class LevelPill extends StatelessWidget {
  const LevelPill({super.key, required this.level, required this.text});
  final Level level;
  final String text;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (bg, fg) = switch (level) {
      Level.green => (c.goodSoft, c.goodInk),
      Level.yellow => (c.warnSoft, c.warnInk),
      Level.red => (c.badSoft, c.badInk),
      Level.none => (c.surface2, c.muted),
    };
    return Container(
      padding: const EdgeInsets.fromLTRB(4, 3, 10, 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 18,
            height: 18,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: level.color(c), shape: BoxShape.circle),
            child: Text(level.icon, style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 6),
          Text(text, style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}

/// Etiqueta pequeña (prioridad, categoría…).
class Tag extends StatelessWidget {
  const Tag(this.text, {super.key, required this.background, required this.foreground});
  final String text;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(6)),
        child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: foreground)),
      );
}

/// Cifra destacada con su etiqueta.
class StatValue extends StatelessWidget {
  const StatValue({super.key, required this.label, required this.value, this.color, this.big = false});
  final String label;
  final String value;
  final Color? color;
  final bool big;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: text.bodySmall?.copyWith(color: context.colors.ink2)),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTheme.display(big ? text.headlineMedium : text.titleMedium).copyWith(
            color: color,
            fontWeight: FontWeight.w800,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}

/// Estado vacío: qué pasa y qué hacer.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.message, this.action});
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(color: c.accent.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(icon, color: c.accent),
          ),
          const SizedBox(height: 12),
          Text(title, textAlign: TextAlign.center, style: text.titleMedium),
          if (message != null) ...[
            const SizedBox(height: 4),
            Text(message!, textAlign: TextAlign.center, style: text.bodyMedium?.copyWith(color: c.ink2)),
          ],
          if (action != null) ...[const SizedBox(height: 14), action!],
        ],
      ),
    );
  }
}

/// Carga, error (con reintento) o contenido de un dato asíncrono, como sliver.
class AsyncSliver<T> extends StatelessWidget {
  const AsyncSliver({super.key, required this.value, required this.onRetry, required this.builder});
  final AsyncValue<T> value;
  final VoidCallback onRetry;
  final Widget Function(T data) builder;

  @override
  Widget build(BuildContext context) {
    final data = value.value;
    if (data != null) return builder(data);
    if (value.hasError) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: EmptyState(
          icon: Icons.cloud_off_rounded,
          title: 'No se pudieron cargar los datos',
          message: errorMessage(value.error!),
          action: OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Reintentar')),
        ),
      );
    }
    return const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator()));
  }
}

/// Avisos breves.
void showMessage(BuildContext context, String text, {bool error = false}) {
  final c = context.colors;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(error ? Icons.error_outline : Icons.check_circle_outline, color: error ? c.badInk : c.goodInk),
            const SizedBox(width: 10),
            Expanded(child: Text(text, style: TextStyle(color: c.ink))),
          ],
        ),
        backgroundColor: c.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: c.line)),
      ),
    );
}

void showError(BuildContext context, Object error) => showMessage(context, errorMessage(error), error: true);

/// Confirmación antes de una acción destructiva.
Future<bool> confirmAction(BuildContext context, {required String title, required String message, String confirm = 'Eliminar'}) async {
  final c = context.colors;
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: c.bad, foregroundColor: Colors.white, minimumSize: const Size(48, 44)),
          onPressed: () => Navigator.pop(context, true),
          child: Text(confirm),
        ),
      ],
    ),
  );
  return ok ?? false;
}

/// Hoja inferior con un formulario: título, contenido desplazable y se ajusta al teclado.
Future<T?> showFormSheet<T>(BuildContext context, {required String title, required Widget Function(BuildContext) builder}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            builder(context),
          ],
        ),
      ),
    ),
  );
}

/// Botón principal de un formulario, con indicador de carga.
class SubmitButton extends StatelessWidget {
  const SubmitButton({super.key, required this.label, required this.onPressed, this.busy = false});
  final String label;
  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: busy ? null : onPressed,
      child: busy
          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
          : Text(label),
    );
  }
}

/// Barra de progreso de un objetivo (macros, categorías).
class ProgressBar extends StatelessWidget {
  const ProgressBar({super.key, required this.value, required this.color, this.height = 12});
  final double value;
  final Color color;
  final double height;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: SizedBox(
        height: height,
        child: Stack(
          children: [
            Container(color: context.colors.surface2),
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: value.clamp(0, 1)),
              duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 800),
              curve: Curves.easeOutCubic,
              builder: (context, v, _) => FractionallySizedBox(
                widthFactor: v,
                child: Container(decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99))),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Lee un número de un campo de texto aceptando coma decimal.
double? readAmount(TextEditingController c) => Fmt.parseAmount(c.text);
