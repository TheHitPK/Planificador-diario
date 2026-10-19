import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../shared/widgets.dart';
import '../auth/auth_controller.dart';

/// Se lanza si un dato se pide sin sesión (p. ej. justo después de cerrar sesión).
class NoSession implements Exception {
  const NoSession();
}

/// Usuario actual; los datos dependen de él para recargarse al cambiar de cuenta.
AppUser requireUser(Ref ref) => ref.watch(currentUserProvider) ?? (throw const NoSession());

// ------------------------------------------------------------------ disciplinas

class Discipline {
  const Discipline({required this.id, required this.name, required this.icon, required this.description, required this.position});

  final String id;
  final String name;
  final String icon;
  final String description;
  final int position;

  factory Discipline.fromJson(Map<String, dynamic> j) => Discipline(
        id: j['id'] as String,
        name: j['name'] as String,
        icon: j['icon'] as String,
        description: (j['description'] as String?) ?? '',
        position: (j['position'] as num).toInt(),
      );
}

final disciplinesProvider = AsyncNotifierProvider<DisciplinesNotifier, List<Discipline>>(DisciplinesNotifier.new);

class DisciplinesNotifier extends AsyncNotifier<List<Discipline>> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<List<Discipline>> build() async {
    requireUser(ref);
    final list = await _api.get('/disciplines') as List;
    return list.map((e) => Discipline.fromJson(e as Map<String, dynamic>)).toList();
  }

  Map<String, dynamic> _body(String name, String icon, String description) =>
      {'name': name, 'icon': icon, 'description': description.isEmpty ? null : description};

  Future<void> create(String name, String icon, String description) async {
    await _api.post('/disciplines', _body(name, icon, description));
    _afterChange();
  }

  Future<void> edit(String id, String name, String icon, String description) async {
    await _api.put('/disciplines/$id', _body(name, icon, description));
    _afterChange();
  }

  Future<void> remove(String id) async {
    await _api.delete('/disciplines/$id');
    _afterChange();
  }

  /// Cambia el orden al instante y lo deshace si la API falla. [to] es la posición final del elemento.
  Future<void> reorder(int from, int to) async {
    final current = [...?state.value];
    if (current.isEmpty) return;
    final moved = [...current];
    moved.insert(to, moved.removeAt(from));
    state = AsyncData(moved);
    try {
      await _api.put('/disciplines/order', {'ids': moved.map((d) => d.id).toList()});
      ref.invalidate(weekProvider);
    } catch (e) {
      state = AsyncData(current);
      rethrow;
    }
  }

  /// Las disciplinas cambian los totales de la planificación y las estadísticas.
  void _afterChange() {
    ref.invalidateSelf();
    ref.invalidate(weekProvider);
    ref.invalidate(planningStatsProvider);
  }
}

// --------------------------------------------------------------- planificación

class PlanningDay {
  const PlanningDay({required this.date, required this.completed, required this.done, required this.total, required this.level});

  final DateTime date;
  final Set<String> completed;
  final int done;
  final int total;
  final Level level;

  double? get ratio => total == 0 ? null : done / total;

  factory PlanningDay.fromJson(Map<String, dynamic> j) => PlanningDay(
        date: Fmt.parseIso(j['date'] as String),
        completed: {for (final id in j['completed'] as List) id as String},
        done: (j['done'] as num).toInt(),
        total: (j['total'] as num).toInt(),
        level: Level.fromApi(j['level'] as String?),
      );

  PlanningDay toggled(String disciplineId) {
    final next = {...completed};
    if (!next.remove(disciplineId)) next.add(disciplineId);
    return PlanningDay(
      date: date,
      completed: next,
      done: next.length,
      total: total,
      level: Level.fromRatio(total == 0 ? null : next.length / total),
    );
  }
}

class PlanningSummary {
  const PlanningSummary({required this.done, required this.total, required this.ratio, required this.level});
  final int done;
  final int total;
  final double? ratio;
  final Level level;

  factory PlanningSummary.fromJson(Map<String, dynamic> j) => PlanningSummary(
        done: (j['done'] as num).toInt(),
        total: (j['total'] as num).toInt(),
        ratio: toDoubleOrNull(j['ratio']),
        level: Level.fromApi(j['level'] as String?),
      );
}

class PlanningRange {
  const PlanningRange({required this.days, required this.summary});
  final List<PlanningDay> days;
  final PlanningSummary summary;

  factory PlanningRange.fromJson(Map<String, dynamic> j) => PlanningRange(
        days: (j['days'] as List).map((e) => PlanningDay.fromJson(e as Map<String, dynamic>)).toList(),
        summary: PlanningSummary.fromJson(j['summary'] as Map<String, dynamic>),
      );

  PlanningDay? dayOf(DateTime d) {
    for (final day in days) {
      if (Fmt.sameDay(day.date, d)) return day;
    }
    return null;
  }
}

Future<PlanningRange> fetchRange(ApiClient api, DateTime from, DateTime to) async =>
    PlanningRange.fromJson(await api.get('/planning?from=${Fmt.iso(from)}&to=${Fmt.iso(to)}') as Map<String, dynamic>);

/// Una semana (de lunes a domingo) identificada por su lunes.
final weekProvider = AsyncNotifierProvider.family<WeekNotifier, PlanningRange, DateTime>(WeekNotifier.new);

class WeekNotifier extends AsyncNotifier<PlanningRange> {
  WeekNotifier(this.monday);
  final DateTime monday;

  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<PlanningRange> build() {
    requireUser(ref);
    return fetchRange(_api, monday, monday.add(const Duration(days: 6)));
  }

  /// Marca o desmarca al instante y revierte si la API falla.
  Future<void> toggle(DateTime day, String disciplineId) async {
    final current = state.value;
    final target = current?.dayOf(day);
    if (current == null || target == null) return;
    final wasDone = target.completed.contains(disciplineId);
    state = AsyncData(PlanningRange(
      days: [for (final d in current.days) Fmt.sameDay(d.date, day) ? d.toggled(disciplineId) : d],
      summary: current.summary,
    ));
    try {
      final path = '/planning/${Fmt.iso(day)}/disciplines/$disciplineId';
      wasDone ? await _api.delete(path) : await _api.put(path);
      ref.invalidate(planningStatsProvider);
    } catch (e) {
      state = AsyncData(current);
      rethrow;
    }
  }
}

/// Resumen para "¿Cómo voy?": semana, mes y año en curso.
class PlanningStats {
  const PlanningStats({required this.week, required this.month, required this.year});
  final PlanningRange week;
  final PlanningRange month;
  final PlanningSummary year;
}

final planningStatsProvider = FutureProvider<PlanningStats>((ref) async {
  requireUser(ref);
  final api = ref.read(apiClientProvider);
  final today = Fmt.today();
  final monday = Fmt.startOfWeek(today);
  final results = await Future.wait([
    fetchRange(api, monday, monday.add(const Duration(days: 6))),
    fetchRange(api, DateTime(today.year, today.month, 1), DateTime(today.year, today.month + 1, 0)),
    fetchRange(api, DateTime(today.year, 1, 1), DateTime(today.year, 12, 31)),
  ]);
  return PlanningStats(week: results[0], month: results[1], year: results[2].summary);
});
