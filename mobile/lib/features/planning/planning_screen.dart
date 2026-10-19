import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/charts.dart';
import '../../shared/hero_app_bar.dart';
import '../../shared/widgets.dart';
import '../auth/auth_controller.dart';
import '../home/profile_button.dart';
import '../tasks/tasks_data.dart';
import 'planning_data.dart';

class PlanningScreen extends ConsumerStatefulWidget {
  const PlanningScreen({super.key, required this.onAddDisciplines});

  /// Lleva a la pestaña de disciplinas cuando aún no hay ninguna.
  final VoidCallback onAddDisciplines;

  @override
  ConsumerState<PlanningScreen> createState() => _PlanningScreenState();
}

class _PlanningScreenState extends ConsumerState<PlanningScreen> {
  late DateTime _monday = Fmt.startOfWeek(Fmt.today());
  late DateTime _selected = Fmt.today();

  void _shiftWeek(int weeks) => setState(() {
        _monday = _monday.add(Duration(days: 7 * weeks));
        final today = Fmt.today();
        // Al volver a la semana actual se selecciona hoy; en otras, el lunes.
        _selected = Fmt.sameDay(_monday, Fmt.startOfWeek(today)) ? today : _monday;
      });

  Future<void> _refresh() async {
    ref.invalidate(disciplinesProvider);
    ref.invalidate(weekProvider(_monday));
    ref.invalidate(planningStatsProvider);
    await ref.read(weekProvider(_monday).future);
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final disciplines = ref.watch(disciplinesProvider);
    final stats = ref.watch(planningStatsProvider);
    final today = Fmt.today();
    final todayStats = stats.value?.week.dayOf(today);
    final count = disciplines.value?.length ?? 0;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        edgeOffset: 120,
        child: CustomScrollView(
          slivers: [
            HeroAppBar(
              title: '${Fmt.greeting()}, ${user?.greetName ?? ''}',
              subtitle: 'Marca tus disciplinas y mira cómo va tu semana.',
              stats: [
                HeroStat('Hechas hoy', todayStats?.done ?? 0, suffix: '/$count'),
                HeroStat('Pendientes', ref.watch(openTasksCountProvider)),
                HeroStat('Disciplinas', count),
              ],
              actions: const [ProfileButton()],
            ),
            AsyncSliver<List<Discipline>>(
              value: disciplines,
              onRetry: () => ref.invalidate(disciplinesProvider),
              builder: (list) {
                if (list.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icon: Icons.track_changes_rounded,
                      title: 'Aún no tienes disciplinas',
                      message: 'Agrega los hábitos que quieres cumplir cada día y márcalos aquí.',
                      action: FilledButton.icon(
                        onPressed: widget.onAddDisciplines,
                        icon: const Icon(Icons.add),
                        label: const Text('Agregar disciplinas'),
                      ),
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  sliver: SliverList.list(
                    children: [
                      _WeekCard(
                        monday: _monday,
                        selected: _selected,
                        onSelect: (d) => setState(() => _selected = d),
                        onShift: _shiftWeek,
                      ),
                      const SizedBox(height: 14),
                      _DayChecklist(monday: _monday, day: _selected, disciplines: list),
                      const SizedBox(height: 22),
                      const SectionTitle('¿Cómo voy?'),
                      _StatsSection(stats: stats),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Semana: siete días con su avance; se toca uno para ver y marcar sus disciplinas.
class _WeekCard extends ConsumerWidget {
  const _WeekCard({required this.monday, required this.selected, required this.onSelect, required this.onShift});
  final DateTime monday;
  final DateTime selected;
  final ValueChanged<DateTime> onSelect;
  final ValueChanged<int> onShift;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final week = ref.watch(weekProvider(monday)).value;
    final today = Fmt.today();
    final sunday = monday.add(const Duration(days: 6));
    final isCurrent = Fmt.sameDay(monday, Fmt.startOfWeek(today));

    return SectionCard(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(isCurrent ? 'Semana actual' : 'Semana', style: Theme.of(context).textTheme.titleMedium),
                    Text('${Fmt.dm(monday)} al ${Fmt.dm(sunday)}', style: TextStyle(color: c.ink2, fontSize: 13)),
                  ],
                ),
              ),
              IconButton(tooltip: 'Semana anterior', onPressed: () => onShift(-1), icon: const Icon(Icons.chevron_left)),
              if (!isCurrent)
                TextButton(
                  onPressed: () => onShift(Fmt.startOfWeek(today).difference(monday).inDays ~/ 7),
                  child: const Text('Hoy'),
                ),
              IconButton(tooltip: 'Semana siguiente', onPressed: () => onShift(1), icon: const Icon(Icons.chevron_right)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var i = 0; i < 7; i++)
                Expanded(
                  child: _DayButton(
                    date: monday.add(Duration(days: i)),
                    day: week?.dayOf(monday.add(Duration(days: i))),
                    selected: Fmt.sameDay(selected, monday.add(Duration(days: i))),
                    isToday: Fmt.sameDay(today, monday.add(Duration(days: i))),
                    onTap: () => onSelect(monday.add(Duration(days: i))),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DayButton extends StatelessWidget {
  const _DayButton({required this.date, required this.day, required this.selected, required this.isToday, required this.onTap});
  final DateTime date;
  final PlanningDay? day;
  final bool selected;
  final bool isToday;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final future = date.isAfter(Fmt.today());
    final ratio = future ? 0.0 : (day?.ratio ?? 0);
    final ringColor = (day?.level ?? Level.none).color(c);
    final fg = selected ? c.accentInk : (future ? c.muted : c.ink);

    return Semantics(
      button: true,
      selected: selected,
      label: '${Fmt.dayNames[date.weekday - 1]} ${Fmt.dm(date)}${day == null || future ? '' : ', ${day!.done} de ${day!.total}'}',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: selected ? c.brandGradient : null,
          ),
          child: ExcludeSemantics(
            child: Column(
              children: [
                Text(Fmt.dayShort[date.weekday - 1], style: TextStyle(fontSize: 12, color: selected ? c.accentInk : c.ink2, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                SizedBox.square(
                  dimension: 34,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: ratio,
                        strokeWidth: 3,
                        backgroundColor: selected ? Colors.white.withValues(alpha: 0.25) : c.surface2,
                        color: selected ? Colors.white : ringColor,
                      ),
                      Text('${date.day}', style: TextStyle(fontWeight: FontWeight.w700, color: fg)),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  width: 5,
                  height: 5,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isToday ? (selected ? c.accentInk : c.accent) : Colors.transparent,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Disciplinas del día elegido, con casillas grandes para marcar.
class _DayChecklist extends ConsumerWidget {
  const _DayChecklist({required this.monday, required this.day, required this.disciplines});
  final DateTime monday;
  final DateTime day;
  final List<Discipline> disciplines;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final week = ref.watch(weekProvider(monday));
    final data = week.value?.dayOf(day);
    final today = Fmt.today();
    final future = day.isAfter(today);
    final label = Fmt.sameDay(day, today)
        ? 'Hoy'
        : Fmt.sameDay(day, today.subtract(const Duration(days: 1)))
            ? 'Ayer'
            : '${Fmt.dayNames[day.weekday - 1]} ${Fmt.dm(day)}';

    Future<void> toggle(Discipline d) async {
      HapticFeedback.selectionClick();
      try {
        await ref.read(weekProvider(monday).notifier).toggle(day, d.id);
      } catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    return SectionCard(
      padding: const EdgeInsets.fromLTRB(6, 14, 6, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                Expanded(child: Text(label, style: Theme.of(context).textTheme.titleMedium)),
                if (data != null && !future) LevelPill(level: data.level, text: '${data.done}/${data.total} ${data.level.label}'),
              ],
            ),
          ),
          if (future)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
              child: Text('Este día aún no llega: podrás marcarlo cuando sea hoy.', style: TextStyle(color: c.ink2)),
            ),
          if (week.isLoading && data == null)
            const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
          else
            for (final d in disciplines)
              _CheckRow(
                discipline: d,
                checked: data?.completed.contains(d.id) ?? false,
                enabled: !future && data != null,
                onTap: () => toggle(d),
              ),
        ],
      ),
    );
  }
}

class _CheckRow extends StatelessWidget {
  const _CheckRow({required this.discipline, required this.checked, required this.enabled, required this.onTap});
  final Discipline discipline;
  final bool checked;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      checked: checked,
      enabled: enabled,
      label: discipline.name,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(12)),
                child: Text(discipline.icon, style: const TextStyle(fontSize: 22)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ExcludeSemantics(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(discipline.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                      if (discipline.description.isNotEmpty)
                        Text(discipline.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: c.ink2, fontSize: 13)),
                    ],
                  ),
                ),
              ),
              _AnimatedCheck(checked: checked, enabled: enabled),
            ],
          ),
        ),
      ),
    );
  }
}

/// Casilla que se rellena con el degradado de la marca y deja entrar la palomita con rebote.
class _AnimatedCheck extends StatelessWidget {
  const _AnimatedCheck({required this.checked, required this.enabled});
  final bool checked;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Opacity(
      opacity: enabled ? 1 : 0.4,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(9),
          gradient: checked ? c.brandGradient : null,
          border: Border.all(color: checked ? c.accent : c.muted.withValues(alpha: 0.6), width: 2),
          boxShadow: checked ? [BoxShadow(color: c.accent.withValues(alpha: 0.18), spreadRadius: 4)] : null,
        ),
        child: AnimatedScale(
          scale: checked ? 1 : 0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.elasticOut,
          child: Icon(Icons.check_rounded, size: 20, color: c.accentInk),
        ),
      ),
    );
  }
}

class _StatsSection extends StatelessWidget {
  const _StatsSection({required this.stats});
  final AsyncValue<PlanningStats> stats;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final data = stats.value;
    if (data == null) {
      return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
    }
    final today = data.week.dayOf(Fmt.today());
    final todayRatio = today?.ratio;

    Widget tile(String title, String subtitle, PlanningSummary s) => _StatTile(title: title, subtitle: subtitle, summary: s);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(
          child: Row(
            children: [
              ProgressRing(
                value: todayRatio ?? 0,
                color: Level.fromRatio(todayRatio).color(c),
                label: Fmt.percent(todayRatio),
                size: 104,
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Hoy', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 2),
                    Text('${today?.done ?? 0} de ${today?.total ?? 0} disciplinas', style: TextStyle(color: c.ink2)),
                    const SizedBox(height: 10),
                    LevelPill(level: Level.fromRatio(todayRatio), text: Level.fromRatio(todayRatio).label),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: tile('Semana', 'Lunes a domingo', data.week.summary)),
            const SizedBox(width: 12),
            Expanded(child: tile('Mes', Fmt.monthNames[Fmt.today().month - 1], data.month.summary)),
          ],
        ),
        const SizedBox(height: 12),
        tile('Año', '${Fmt.today().year}', data.year),
        const SizedBox(height: 12),
        _ChartCard(
          title: 'Esta semana',
          points: [
            for (final d in data.week.days)
              BarPoint(
                Fmt.dayShort[d.date.weekday - 1],
                d.date.isAfter(Fmt.today()) ? 0 : ((d.ratio ?? 0) * 100),
                d.level.color(c),
              ),
          ],
        ),
        const SizedBox(height: 12),
        _ChartCard(
          title: 'Este mes',
          labelEvery: 5,
          barWidth: 6,
          points: [
            for (final d in data.month.days)
              BarPoint(
                '${d.date.day}',
                d.date.isAfter(Fmt.today()) ? 0 : ((d.ratio ?? 0) * 100),
                d.level.color(c),
              ),
          ],
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.title, required this.subtitle, required this.summary});
  final String title;
  final String subtitle;
  final PlanningSummary summary;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final level = Level.fromRatio(summary.ratio);
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          Text(subtitle, style: TextStyle(color: c.ink2, fontSize: 13)),
          const SizedBox(height: 8),
          StatValue(label: '${summary.done} de ${summary.total}', value: Fmt.percent(summary.ratio), big: true),
          const SizedBox(height: 8),
          LevelPill(level: level, text: level.label),
        ],
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({required this.title, required this.points, this.labelEvery = 1, this.barWidth = 16});
  final String title;
  final List<BarPoint> points;
  final int labelEvery;
  final double barWidth;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 14),
          SimpleBarChart(points: points, maxY: 100, format: (v) => '${v.round()}%', labelEvery: labelEvery, barWidth: barWidth),
        ],
      ),
    );
  }
}
