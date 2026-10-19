import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/hero_app_bar.dart';
import '../../shared/widgets.dart';
import '../home/profile_button.dart';
import 'finance_data.dart';
import 'movement_form.dart';

enum _Tab { summary, movements }

enum _KindFilter { all, income, expense }

class FinanceScreen extends ConsumerStatefulWidget {
  const FinanceScreen({super.key});

  @override
  ConsumerState<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends ConsumerState<FinanceScreen> {
  _Tab _tab = _Tab.summary;
  DateTime _month = DateTime(Fmt.today().year, Fmt.today().month);
  _KindFilter _kind = _KindFilter.all;

  Future<void> _refresh() async {
    ref.invalidate(financeSummaryProvider);
    ref.invalidate(movementsProvider(monthKey(_month)));
    await ref.read(financeSummaryProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => openMovementForm(context),
        icon: const Icon(Icons.add),
        label: const Text('Registrar'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        edgeOffset: 120,
        child: CustomScrollView(
          slivers: [
            const HeroAppBar(
              title: 'Finanzas',
              subtitle: 'Tus cuentas y movimientos, de un vistazo.',
              actions: [ProfileButton()],
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              sliver: SliverToBoxAdapter(
                child: SegmentedButton<_Tab>(
                  showSelectedIcon: false,
                  segments: const [
                    ButtonSegment(value: _Tab.summary, label: Text('Resumen'), icon: Icon(Icons.insights_outlined)),
                    ButtonSegment(value: _Tab.movements, label: Text('Movimientos'), icon: Icon(Icons.swap_vert)),
                  ],
                  selected: {_tab},
                  onSelectionChanged: (s) => setState(() => _tab = s.first),
                ),
              ),
            ),
            if (_tab == _Tab.summary)
              AsyncSliver<FinanceSummary>(
                value: ref.watch(financeSummaryProvider),
                onRetry: () => ref.invalidate(financeSummaryProvider),
                builder: (s) => SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  sliver: SliverList.list(children: [
                    _TotalsCard(summary: s),
                    const SizedBox(height: 12),
                    _AccountsGrid(summary: s),
                    const SizedBox(height: 12),
                    _MonthCard(summary: s),
                    const SizedBox(height: 12),
                    _SixMonthsCard(summary: s),
                  ]),
                ),
              )
            else
              ..._movements(),
          ],
        ),
      ),
    );
  }

  List<Widget> _movements() {
    final c = context.colors;
    final key = monthKey(_month);
    final isCurrent = monthKey(DateTime.now()) == key;
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(8, 10, 8, 0),
        sliver: SliverToBoxAdapter(
          child: Row(
            children: [
              IconButton(
                tooltip: 'Mes anterior',
                onPressed: () => setState(() => _month = DateTime(_month.year, _month.month - 1)),
                icon: const Icon(Icons.chevron_left),
              ),
              Expanded(
                child: Text(
                  '${Fmt.monthNames[_month.month - 1]} ${_month.year}',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              IconButton(
                tooltip: 'Mes siguiente',
                onPressed: isCurrent ? null : () => setState(() => _month = DateTime(_month.year, _month.month + 1)),
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverToBoxAdapter(
          child: SegmentedButton<_KindFilter>(
           showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: _KindFilter.all, label: Text('Todos')),
              ButtonSegment(value: _KindFilter.income, label: Text('Entradas')),
              ButtonSegment(value: _KindFilter.expense, label: Text('Salidas')),
            ],
            selected: {_kind},
            onSelectionChanged: (s) => setState(() => _kind = s.first),
          ),
        ),
      ),
      AsyncSliver<List<Movement>>(
        value: ref.watch(movementsProvider(key)),
        onRetry: () => ref.invalidate(movementsProvider(key)),
        builder: (all) {
          final list = all.where((m) => switch (_kind) {
                _KindFilter.all => true,
                _KindFilter.income => m.income,
                _KindFilter.expense => !m.income,
              }).toList();
          final real = all.where((m) => !m.transfer);
          final inUsd = real.where((m) => m.income).fold<double>(0, (s, m) => s + m.usdValue);
          final outUsd = real.where((m) => !m.income).fold<double>(0, (s, m) => s + m.usdValue);
          return SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
            sliver: SliverList.list(children: [
              SectionCard(
                child: Wrap(
                  spacing: 24,
                  runSpacing: 12,
                  children: [
                    StatValue(label: 'Entradas', value: Fmt.usd(inUsd), color: c.goodInk),
                    StatValue(label: 'Salidas', value: Fmt.usd(outUsd)),
                    StatValue(label: 'Movimientos', value: '${all.length}'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (list.isEmpty)
                const EmptyState(icon: Icons.receipt_long_outlined, title: 'No hay movimientos en este mes')
              else
                for (final m in list) ...[_MovementTile(movement: m), const SizedBox(height: 10)],
            ]),
          );
        },
      ),
    ];
  }
}

class _TotalsCard extends ConsumerStatefulWidget {
  const _TotalsCard({required this.summary});
  final FinanceSummary summary;

  @override
  ConsumerState<_TotalsCard> createState() => _TotalsCardState();
}

class _TotalsCardState extends ConsumerState<_TotalsCard> {
  bool _refreshing = false;

  Future<void> _refreshRates() async {
    setState(() => _refreshing = true);
    try {
      await ref.read(financeActionsProvider).refreshRates();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final s = widget.summary;
    final r = s.rates;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Lo que tengo', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (s.totalUsd == null)
            Text('Carga la tasa BCV para ver tus totales convertidos.', style: TextStyle(color: c.ink2))
          else ...[
            StatValue(label: 'Total en dólares', value: Fmt.usd(s.totalUsd!), big: true),
            const SizedBox(height: 10),
            Wrap(
              spacing: 24,
              runSpacing: 8,
              children: [
                StatValue(label: 'En bolívares', value: Fmt.bs(s.totalBs ?? 0)),
                StatValue(label: 'En euros', value: Fmt.eur(s.totalEur ?? 0)),
              ],
            ),
          ],
          const Divider(height: 28),
          Row(
            children: [
              Expanded(
                child: Text(
                  r == null
                      ? 'Sin tasa BCV'
                      : 'BCV \$ ${Fmt.money(r.usd)} · € ${Fmt.money(r.eur)}\n${r.official ? 'Tasa oficial' : 'Tasa escrita a mano'} del ${Fmt.dm(r.date)}',
                  style: TextStyle(color: c.ink2, fontSize: 13),
                ),
              ),
              _refreshing
                  ? const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4)))
                  : IconButton(tooltip: 'Actualizar tasa BCV', onPressed: _refreshRates, icon: const Icon(Icons.refresh)),
            ],
          ),
        ],
      ),
    );
  }
}

class _AccountsGrid extends StatelessWidget {
  const _AccountsGrid({required this.summary});
  final FinanceSummary summary;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    Widget tile(AccountBalance a) => Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: c.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${a.account.icon}  ${a.account.label}', style: TextStyle(color: c.ink2, fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  a.account.format(a.balance),
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 17,
                    color: a.balance < 0 ? c.badInk : c.ink,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              if (a.account.usd ? a.bsValue != null : a.usdValue != null)
                Text(
                  '≈ ${a.account.usd ? Fmt.bs(a.bsValue!) : Fmt.usd(a.usdValue!)}',
                  style: TextStyle(color: c.ink2, fontSize: 12),
                ),
            ],
          ),
        );

    final items = summary.accounts;
    return Column(
      children: [
        for (var i = 0; i < items.length; i += 2) ...[
          if (i > 0) const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: tile(items[i])),
              const SizedBox(width: 10),
              Expanded(child: i + 1 < items.length ? tile(items[i + 1]) : const SizedBox.shrink()),
            ],
          ),
        ],
      ],
    );
  }
}

class _MonthCard extends StatelessWidget {
  const _MonthCard({required this.summary});
  final FinanceSummary summary;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final s = summary;
    final balance = s.income - s.expense;
    final maxCat = s.byCategory.fold<double>(0, (m, e) => math.max(m, e.$2));
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(Fmt.monthNames[Fmt.today().month - 1], style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 10),
          Wrap(
            spacing: 22,
            runSpacing: 12,
            children: [
              StatValue(label: 'Entradas', value: Fmt.usd(s.income), color: c.goodInk),
              StatValue(label: 'Salidas', value: Fmt.usd(s.expense)),
              StatValue(label: 'Balance', value: Fmt.usd(balance), color: balance >= 0 ? c.goodInk : c.badInk),
              StatValue(label: 'Gastos', value: Fmt.usd(s.expenses)),
              StatValue(label: 'Costos', value: Fmt.usd(s.costs)),
            ],
          ),
          const SizedBox(height: 18),
          Text('Salidas por categoría', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          if (s.byCategory.isEmpty)
            Text('Sin salidas este mes.', style: TextStyle(color: c.ink2))
          else
            for (final (cat, usd) in s.byCategory)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    SizedBox(width: 96, child: Text(cat, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: c.ink2, fontSize: 13))),
                    Expanded(child: ProgressBar(value: maxCat == 0 ? 0 : usd / maxCat, color: c.flowOut, height: 10)),
                    SizedBox(
                      width: 86,
                      child: Text(Fmt.usd(usd), textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

/// Entradas frente a salidas de los últimos seis meses, dos barras por mes.
class _SixMonthsCard extends StatelessWidget {
  const _SixMonthsCard({required this.summary});
  final FinanceSummary summary;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final points = summary.lastSixMonths;
    final top = math.max(1.0, points.fold<double>(0, (m, p) => math.max(m, math.max(p.income, p.expense))) * 1.15);
    final small = TextStyle(fontSize: 11, color: c.muted);

    Widget legend(Color color, String label) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(color: c.ink2, fontSize: 13)),
          ],
        );

    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Entradas vs salidas', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Row(children: [legend(c.flowIn, 'Entradas'), const SizedBox(width: 14), legend(c.flowOut, 'Salidas')]),
          const SizedBox(height: 14),
          SizedBox(
            height: 190,
            child: BarChart(
              BarChartData(
                minY: 0,
                maxY: top,
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
                      reservedSize: 46,
                      interval: top / 2,
                      getTitlesWidget: (v, _) => Text('\$${Fmt.integer(v)}', style: small),
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 22,
                      getTitlesWidget: (v, _) {
                        final i = v.toInt();
                        if (i < 0 || i >= points.length) return const SizedBox.shrink();
                        return Padding(padding: const EdgeInsets.only(top: 4), child: Text(Fmt.monthShort[points[i].month.month - 1], style: small));
                      },
                    ),
                  ),
                ),
                barTouchData: BarTouchData(
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (_) => c.surface,
                    tooltipBorder: BorderSide(color: c.line),
                    getTooltipItem: (group, _, rod, rodIndex) => BarTooltipItem(
                      '${rodIndex == 0 ? 'Entradas' : 'Salidas'}\n${Fmt.usd(rod.toY)}',
                      TextStyle(color: c.ink, fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                ),
                barGroups: [
                  for (final (i, p) in points.indexed)
                    BarChartGroupData(
                      x: i,
                      barsSpace: 3,
                      barRods: [
                        BarChartRodData(toY: p.income, color: c.flowIn, width: 12, borderRadius: const BorderRadius.vertical(top: Radius.circular(4))),
                        BarChartRodData(toY: p.expense, color: c.flowOut, width: 12, borderRadius: const BorderRadius.vertical(top: Radius.circular(4))),
                      ],
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

class _MovementTile extends ConsumerWidget {
  const _MovementTile({required this.movement});
  final Movement movement;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final m = movement;
    final tags = <Widget>[
      if (m.transfer)
        Tag(m.income ? 'Cambio' : (m.reason?.label ?? 'Cambio'), background: c.surface2, foreground: c.ink2)
      else if (m.income)
        Tag(m.incomeType?.label ?? 'Entrada', background: c.goodSoft, foreground: c.goodInk)
      else ...[
        if (m.expenseClass != null)
          Tag(
            m.expenseClass!.label,
            background: (m.expenseClass == ExpenseClass.cost ? c.accent : c.flowOut).withValues(alpha: 0.16),
            foreground: c.ink,
          ),
        if (m.category != null) Tag(m.category!, background: c.surface2, foreground: c.ink2),
      ],
    ];

    Future<void> delete() async {
      final ok = await confirmAction(
        context,
        title: 'Eliminar movimiento',
        message: m.transfer ? 'Es parte de un cambio: se borrarán la salida y la entrada enlazadas.' : 'Esta acción no se puede deshacer.',
      );
      if (!ok) return;
      try {
        await ref.read(financeActionsProvider).delete(m.id);
        if (context.mounted) showMessage(context, 'Movimiento eliminado.');
      } catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    return SectionCard(
      padding: const EdgeInsets.fromLTRB(14, 12, 4, 12),
      onTap: m.transfer ? null : () => openMovementForm(context, m),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(12)),
            child: Text(m.account.icon, style: const TextStyle(fontSize: 20)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(m.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                Text('${Fmt.dm(m.date)} · ${m.account.label}', style: TextStyle(color: c.ink2, fontSize: 13)),
                if (tags.isNotEmpty) ...[const SizedBox(height: 6), Wrap(spacing: 6, runSpacing: 6, children: tags)],
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${m.income ? '+' : '−'}${m.account.format(m.amount)}',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: m.income ? c.goodInk : c.ink,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              Text(
                '≈ ${m.account.usd ? Fmt.bs(m.bsValue) : Fmt.usd(m.usdValue)}',
                style: TextStyle(color: c.ink2, fontSize: 12),
              ),
            ],
          ),
          IconButton(tooltip: 'Eliminar', onPressed: delete, icon: Icon(Icons.delete_outline, color: c.muted)),
        ],
      ),
    );
  }
}
