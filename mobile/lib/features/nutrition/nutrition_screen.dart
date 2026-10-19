import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/hero_app_bar.dart';
import '../../shared/widgets.dart';
import '../home/profile_button.dart';
import 'nutrition_data.dart';
import 'nutrition_forms.dart';

enum _Tab { diary, body }

class NutritionScreen extends ConsumerStatefulWidget {
  const NutritionScreen({super.key});

  @override
  ConsumerState<NutritionScreen> createState() => _NutritionScreenState();
}

class _NutritionScreenState extends ConsumerState<NutritionScreen> {
  _Tab _tab = _Tab.diary;
  DateTime _day = Fmt.today();

  Future<void> _refresh() async {
    if (_tab == _Tab.diary) {
      ref.invalidate(diaryProvider(_day));
      await ref.read(diaryProvider(_day).future);
    } else {
      ref.invalidate(bodyProvider);
      await ref.read(bodyProvider.future);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _tab == _Tab.diary ? openEntryForm(context, _day) : openBodyForm(context),
        icon: const Icon(Icons.add),
        label: Text(_tab == _Tab.diary ? 'Agregar comida' : 'Nuevo registro'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        edgeOffset: 120,
        child: CustomScrollView(
          slivers: [
            const HeroAppBar(
              title: 'Nutrición',
              subtitle: 'Diario de comidas, macros y progreso corporal.',
              actions: [ProfileButton()],
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              sliver: SliverToBoxAdapter(
                child: SegmentedButton<_Tab>(
                  showSelectedIcon: false,
                  segments: const [
                    ButtonSegment(value: _Tab.diary, label: Text('Diario'), icon: Icon(Icons.restaurant_outlined)),
                    ButtonSegment(value: _Tab.body, label: Text('Cuerpo'), icon: Icon(Icons.monitor_weight_outlined)),
                  ],
                  selected: {_tab},
                  onSelectionChanged: (s) => setState(() => _tab = s.first),
                ),
              ),
            ),
            if (_tab == _Tab.diary) ..._diary() else ..._body(),
          ],
        ),
      ),
    );
  }

  List<Widget> _diary() {
    final today = Fmt.today();
    final label = Fmt.sameDay(_day, today)
        ? 'Hoy'
        : Fmt.sameDay(_day, today.subtract(const Duration(days: 1)))
            ? 'Ayer'
            : '${Fmt.dayNames[_day.weekday - 1]} ${Fmt.dm(_day)}';
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(8, 10, 8, 0),
        sliver: SliverToBoxAdapter(
          child: Row(
            children: [
              IconButton(
                tooltip: 'Día anterior',
                onPressed: () => setState(() => _day = _day.subtract(const Duration(days: 1))),
                icon: const Icon(Icons.chevron_left),
              ),
              Expanded(child: Text(label, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium)),
              IconButton(
                tooltip: 'Día siguiente',
                onPressed: Fmt.sameDay(_day, today) ? null : () => setState(() => _day = _day.add(const Duration(days: 1))),
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
        ),
      ),
      AsyncSliver<Diary>(
        value: ref.watch(diaryProvider(_day)),
        onRetry: () => ref.invalidate(diaryProvider(_day)),
        builder: (d) => SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
          sliver: SliverList.list(children: [
            _MacrosCard(diary: d),
            const SizedBox(height: 12),
            for (final g in d.meals) ...[_MealCard(day: _day, group: g), const SizedBox(height: 10)],
          ]),
        ),
      ),
    ];
  }

  List<Widget> _body() => [
        AsyncSliver<BodySummary>(
          value: ref.watch(bodyProvider),
          onRetry: () => ref.invalidate(bodyProvider),
          builder: (b) => SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            sliver: SliverList.list(children: [
              if (b.latest == null)
                EmptyState(
                  icon: Icons.monitor_weight_outlined,
                  title: 'Aún no hay registros',
                  message: 'Registra tu peso para ver tu progreso.',
                  action: FilledButton.icon(onPressed: () => openBodyForm(context), icon: const Icon(Icons.add), label: const Text('Nuevo registro')),
                )
              else ...[
                _BodyStats(summary: b),
                if (b.history.length >= 2) ...[const SizedBox(height: 12), _WeightChart(history: b.history)],
                const SizedBox(height: 12),
                const SectionTitle('Historial'),
                for (final e in b.history.reversed) ...[_BodyRow(entry: e), const SizedBox(height: 8)],
              ],
            ]),
          ),
        ),
      ];
}

class _MacrosCard extends StatelessWidget {
  const _MacrosCard({required this.diary});
  final Diary diary;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final left = diary.targets[Macro.kcal] - diary.consumed[Macro.kcal];
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            left >= 0 ? 'Te quedan ${Fmt.integer(left)} kcal' : 'Te pasaste ${Fmt.integer(-left)} kcal',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 14),
          for (final m in Macro.values) ...[
            Builder(builder: (context) {
              final target = diary.targets[m];
              final value = diary.consumed[m];
              final pct = target > 0 ? (value / target * 100).round() : 0;
              final ok = m.minimum ? pct >= 100 : (pct >= 90 && pct <= 105);
              final over = !m.minimum && pct > 105;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Text(m.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                      Expanded(
                        child: Text(
                          '  ${Fmt.integer(value)} / ${Fmt.integer(target)} ${m.unit}',
                          style: TextStyle(color: c.ink2, fontSize: 13),
                        ),
                      ),
                      if (over) Icon(Icons.warning_amber_rounded, size: 16, color: c.badInk, semanticLabel: 'Te pasaste'),
                      if (ok) Icon(Icons.check_circle_rounded, size: 16, color: c.goodInk, semanticLabel: 'Objetivo cumplido'),
                      const SizedBox(width: 4),
                      Text(
                        '$pct%',
                        style: TextStyle(fontWeight: FontWeight.w800, color: over ? c.badInk : (ok ? c.goodInk : c.ink)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ProgressBar(value: target > 0 ? value / target : 0, color: m.color(c)),
                  const SizedBox(height: 12),
                ],
              );
            }),
          ],
        ],
      ),
    );
  }
}

class _MealCard extends ConsumerWidget {
  const _MealCard({required this.day, required this.group});
  final DateTime day;
  final MealGroup group;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final t = group.totals;
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 6, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text('${group.meal.icon}  ${group.meal.label}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const Spacer(),
              Text('${Fmt.integer(t[Macro.kcal])} kcal', style: TextStyle(color: c.ink2, fontSize: 13)),
              IconButton(
                tooltip: 'Agregar a ${group.meal.label.toLowerCase()}',
                onPressed: () => openEntryForm(context, day, meal: group.meal),
                icon: Icon(Icons.add_circle_outline, color: c.accent),
              ),
            ],
          ),
          if (group.entries.isEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text('Sin alimentos', style: TextStyle(color: c.muted, fontSize: 13)),
            ),
          for (final e in group.entries)
            Dismissible(
              key: ValueKey(e.id),
              direction: DismissDirection.endToStart,
              background: Container(
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.only(right: 18),
                decoration: BoxDecoration(color: c.badSoft, borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.delete_outline, color: c.badInk),
              ),
              confirmDismiss: (_) async {
                try {
                  await ref.read(nutritionActionsProvider).removeEntry(day, e.id);
                  return true;
                } catch (err) {
                  if (context.mounted) showError(context, err);
                  return false;
                }
              },
              child: Container(
                margin: const EdgeInsets.only(right: 10, bottom: 6),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text.rich(TextSpan(
                            text: e.name,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                            children: [
                              TextSpan(
                                text: ' · ${Fmt.one(e.amount)} ${unitLabel(e.unit)}',
                                style: TextStyle(color: c.ink2, fontWeight: FontWeight.w400, fontSize: 13),
                              ),
                            ],
                          )),
                          Text(
                            'P ${Fmt.one(e.macros[Macro.protein])} g · C ${Fmt.one(e.macros[Macro.carbs])} g · G ${Fmt.one(e.macros[Macro.fat])} g',
                            style: TextStyle(color: c.ink2, fontSize: 12.5),
                          ),
                        ],
                      ),
                    ),
                    Text('${Fmt.integer(e.macros[Macro.kcal])} kcal', style: const TextStyle(fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ),
          if (group.entries.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2, bottom: 2),
              child: Text('Desliza un alimento hacia la izquierda para quitarlo.', style: TextStyle(color: c.muted, fontSize: 11.5)),
            ),
        ],
      ),
    );
  }
}

class _BodyStats extends StatelessWidget {
  const _BodyStats({required this.summary});
  final BodySummary summary;

  @override
  Widget build(BuildContext context) {
    final last = summary.latest!;
    String delta(double? v, String unit) => v == null || v == 0 ? '' : '${v < 0 ? '▼ −' : '▲ +'}${Fmt.one(v.abs())} $unit';
    return SectionCard(
      child: Wrap(
        spacing: 24,
        runSpacing: 14,
        children: [
          _BodyValue(label: 'Peso', value: '${Fmt.one(last.weight)} kg', delta: delta(summary.weightChange, 'kg'), down: (summary.weightChange ?? 0) <= 0),
          _BodyValue(
            label: '% de grasa',
            value: last.bodyFat == null ? '—' : '${Fmt.one(last.bodyFat!)} %',
            delta: delta(summary.fatChange, '%'),
            down: (summary.fatChange ?? 0) <= 0,
          ),
          _BodyValue(label: 'Masa magra', value: last.leanMass == null ? '—' : '${Fmt.one(last.leanMass!)} kg'),
          _BodyValue(label: 'IMC', value: summary.bmi == null ? '—' : Fmt.one(summary.bmi!), note: summary.bmi == null ? 'Pon tu estatura en la web' : null),
        ].map((w) => SizedBox(width: 130, child: w)).toList(),
      ),
    );
  }
}

class _BodyValue extends StatelessWidget {
  const _BodyValue({required this.label, required this.value, this.delta = '', this.down = true, this.note});
  final String label;
  final String value;
  final String delta;
  final bool down;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        StatValue(label: label, value: value),
        if (delta.isNotEmpty) Text(delta, style: TextStyle(color: down ? c.goodInk : c.warnInk, fontWeight: FontWeight.w600, fontSize: 13)),
        if (note != null) Text(note!, style: TextStyle(color: c.muted, fontSize: 12)),
      ],
    );
  }
}

class _WeightChart extends StatelessWidget {
  const _WeightChart({required this.history});
  final List<BodyEntry> history;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final weights = history.map((e) => e.weight).toList();
    final minY = (weights.reduce(math.min) - 1).floorToDouble();
    final maxY = (weights.reduce(math.max) + 1).ceilToDouble();
    final small = TextStyle(fontSize: 11, color: c.muted);
    final step = math.max(1, (history.length / 5).ceil());
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Peso (kg)', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 14),
          SizedBox(
            height: 190,
            child: LineChart(
              LineChartData(
                minY: minY,
                maxY: maxY,
                borderData: FlBorderData(show: false),
                gridData: FlGridData(
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => FlLine(color: c.grid, strokeWidth: 1),
                ),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(),
                  rightTitles: const AxisTitles(),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: true, reservedSize: 36, getTitlesWidget: (v, _) => Text(Fmt.one(v), style: small)),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 22,
                      interval: 1,
                      getTitlesWidget: (v, _) {
                        final i = v.toInt();
                        if (v != i || i < 0 || i >= history.length || i % step != 0) return const SizedBox.shrink();
                        return Padding(padding: const EdgeInsets.only(top: 4), child: Text(Fmt.dm(history[i].date), style: small));
                      },
                    ),
                  ),
                ),
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (_) => c.surface,
                    tooltipBorder: BorderSide(color: c.line),
                    getTooltipItems: (spots) => [
                      for (final s in spots)
                        LineTooltipItem(
                          '${Fmt.dm(history[s.x.toInt()].date)}\n${Fmt.one(s.y)} kg',
                          TextStyle(color: c.ink, fontWeight: FontWeight.w700, fontSize: 12),
                        ),
                    ],
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: [for (final (i, e) in history.indexed) FlSpot(i.toDouble(), e.weight)],
                    color: c.flowIn,
                    barWidth: 3,
                    isCurved: true,
                    preventCurveOverShooting: true,
                    belowBarData: BarAreaData(show: true, color: c.flowIn.withValues(alpha: 0.12)),
                    dotData: FlDotData(
                      getDotPainter: (_, _, _, _) =>
                          FlDotCirclePainter(radius: 4, color: c.flowIn, strokeWidth: 2, strokeColor: c.surface),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BodyRow extends ConsumerWidget {
  const _BodyRow({required this.entry});
  final BodyEntry entry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final e = entry;
    final details = [
      if (e.bodyFat != null) '${Fmt.one(e.bodyFat!)} % grasa',
      if (e.waist != null) '${Fmt.one(e.waist!)} cm cintura',
      if (e.note != null && e.note!.isNotEmpty) e.note!,
    ].join(' · ');
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(16, 10, 4, 10),
      child: Row(
        children: [
          SizedBox(width: 92, child: Text('${Fmt.dm(e.date)}/${e.date.year}', style: const TextStyle(fontWeight: FontWeight.w600))),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${Fmt.one(e.weight)} kg', style: const TextStyle(fontWeight: FontWeight.w800)),
                if (details.isNotEmpty) Text(details, style: TextStyle(color: c.ink2, fontSize: 12.5)),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Eliminar registro',
            icon: Icon(Icons.delete_outline, color: c.muted),
            onPressed: () async {
              final ok = await confirmAction(context, title: 'Eliminar registro', message: '¿Eliminar el registro del ${Fmt.dm(e.date)}?');
              if (!ok) return;
              try {
                await ref.read(nutritionActionsProvider).removeBody(e.id);
              } catch (err) {
                if (context.mounted) showError(context, err);
              }
            },
          ),
        ],
      ),
    );
  }
}
