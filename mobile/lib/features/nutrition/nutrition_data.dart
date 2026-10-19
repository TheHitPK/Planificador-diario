import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../planning/planning_data.dart';

enum Meal {
  breakfast('BREAKFAST', 'Desayuno', '🌅'),
  lunch('LUNCH', 'Almuerzo', '🍽️'),
  dinner('DINNER', 'Cena', '🌙'),
  snack('SNACK', 'Meriendas', '🍎');

  const Meal(this.api, this.label, this.icon);
  final String api;
  final String label;
  final String icon;

  static Meal fromApi(String v) => values.firstWhere((m) => m.api == v);

  /// Comida sugerida según la hora.
  static Meal forNow() {
    final h = DateTime.now().hour;
    return h < 11 ? Meal.breakfast : h < 16 ? Meal.lunch : h < 19 ? Meal.snack : Meal.dinner;
  }
}

String unitLabel(String unit) => switch (unit) { 'G' => 'g', 'ML' => 'ml', _ => 'unid.' };

/// Macronutrientes con su nombre, unidad y color.
enum Macro {
  kcal('Calorías', 'kcal', minimum: false),
  protein('Proteínas', 'g', minimum: true),
  carbs('Carbohidratos', 'g', minimum: false),
  fat('Grasas', 'g', minimum: false),
  fiber('Fibra', 'g', minimum: true);

  const Macro(this.label, this.unit, {required this.minimum});
  final String label;
  final String unit;

  /// Conviene alcanzarlo (proteína, fibra); el resto conviene no pasarlo.
  final bool minimum;

  Color color(AppColors c) => switch (this) {
        Macro.kcal => c.macroKcal,
        Macro.protein => c.macroProtein,
        Macro.carbs => c.macroCarbs,
        Macro.fat => c.macroFat,
        Macro.fiber => c.macroFiber,
      };
}

class Macros {
  const Macros(this.values);
  final Map<Macro, double> values;

  double operator [](Macro m) => values[m] ?? 0;

  factory Macros.fromJson(Map<String, dynamic>? j) =>
      Macros({for (final m in Macro.values) m: toDouble(j?[m.name])});
}

class LogEntry {
  const LogEntry({required this.id, required this.name, required this.amount, required this.unit, required this.macros});
  final String id;
  final String name;
  final double amount;
  final String unit;
  final Macros macros;

  factory LogEntry.fromJson(Map<String, dynamic> j) => LogEntry(
        id: j['id'] as String,
        name: j['name'] as String,
        amount: toDouble(j['amount']),
        unit: j['unit'] as String,
        macros: Macros.fromJson(j['macros'] as Map<String, dynamic>?),
      );
}

class MealGroup {
  const MealGroup(this.meal, this.totals, this.entries);
  final Meal meal;
  final Macros totals;
  final List<LogEntry> entries;
}

class Diary {
  const Diary({required this.consumed, required this.targets, required this.meals});
  final Macros consumed;
  final Macros targets;
  final List<MealGroup> meals;

  factory Diary.fromJson(Map<String, dynamic> j) => Diary(
        consumed: Macros.fromJson(j['consumed'] as Map<String, dynamic>?),
        targets: Macros.fromJson(j['targets'] as Map<String, dynamic>?),
        meals: [
          for (final g in j['meals'] as List)
            MealGroup(
              Meal.fromApi(g['meal'] as String),
              Macros.fromJson(g['totals'] as Map<String, dynamic>?),
              [for (final e in g['entries'] as List) LogEntry.fromJson(e as Map<String, dynamic>)],
            ),
        ],
      );
}

class Food {
  const Food({required this.id, required this.name, required this.unit, required this.portion, required this.macros});
  final String id;
  final String name;
  final String unit;
  final double portion;

  /// Macros por porción.
  final Macros macros;

  factory Food.fromJson(Map<String, dynamic> j) => Food(
        id: j['id'] as String,
        name: j['name'] as String,
        unit: j['unit'] as String,
        portion: toDouble(j['portion']),
        macros: Macros({for (final m in Macro.values) m: toDouble(j[m.name])}),
      );

  /// Macros para una cantidad dada (regla de tres sobre la porción).
  Macros forAmount(double amount) =>
      Macros({for (final m in Macro.values) m: portion == 0 ? 0 : macros[m] * amount / portion});
}

class BodyEntry {
  const BodyEntry({
    required this.id,
    required this.date,
    required this.weight,
    required this.bodyFat,
    required this.waist,
    required this.leanMass,
    required this.note,
  });

  final String id;
  final DateTime date;
  final double weight;
  final double? bodyFat;
  final double? waist;
  final double? leanMass;
  final String? note;

  factory BodyEntry.fromJson(Map<String, dynamic> j) => BodyEntry(
        id: j['id'] as String,
        date: Fmt.parseIso(j['date'] as String),
        weight: toDouble(j['weightKg']),
        bodyFat: toDoubleOrNull(j['bodyFatPct']),
        waist: toDoubleOrNull(j['waistCm']),
        leanMass: toDoubleOrNull(j['leanMassKg']),
        note: j['note'] as String?,
      );
}

class BodySummary {
  const BodySummary({required this.latest, required this.weightChange, required this.fatChange, required this.bmi, required this.history});
  final BodyEntry? latest;
  final double? weightChange;
  final double? fatChange;
  final double? bmi;
  final List<BodyEntry> history;

  factory BodySummary.fromJson(Map<String, dynamic> j) => BodySummary(
        latest: j['latest'] == null ? null : BodyEntry.fromJson(j['latest'] as Map<String, dynamic>),
        weightChange: toDoubleOrNull(j['weightChangeKg']),
        fatChange: toDoubleOrNull(j['bodyFatChangePct']),
        bmi: toDoubleOrNull(j['bmi']),
        history: [for (final b in j['history'] as List) BodyEntry.fromJson(b as Map<String, dynamic>)],
      );
}

final diaryProvider = FutureProvider.family<Diary, DateTime>((ref, day) async {
  requireUser(ref);
  return Diary.fromJson(await ref.read(apiClientProvider).get('/nutrition/diary?date=${Fmt.iso(day)}') as Map<String, dynamic>);
});

final bodyProvider = FutureProvider<BodySummary>((ref) async {
  requireUser(ref);
  return BodySummary.fromJson(await ref.read(apiClientProvider).get('/nutrition/body') as Map<String, dynamic>);
});

final foodSearchProvider = FutureProvider.family<List<Food>, String>((ref, query) async {
  requireUser(ref);
  final q = query.trim().isEmpty ? '' : '?q=${Uri.encodeQueryComponent(query.trim())}';
  final list = await ref.read(apiClientProvider).get('/nutrition/foods$q') as List;
  return list.map((e) => Food.fromJson(e as Map<String, dynamic>)).toList();
});

final nutritionActionsProvider = Provider<NutritionActions>(NutritionActions.new);

class NutritionActions {
  NutritionActions(this._ref);
  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  /// Con alimento de la lista: el servidor calcula los macros de la cantidad.
  Future<void> addFood(DateTime day, Meal meal, Food food, double amount) async {
    await _api.post('/nutrition/diary/entries', {'date': Fmt.iso(day), 'meal': meal.api, 'foodId': food.id, 'amount': amount});
    _ref.invalidate(diaryProvider(day));
  }

  /// Registro rápido: nombre y macros escritos a mano.
  Future<void> addQuick(DateTime day, Meal meal, String name, Map<Macro, double?> macros) async {
    await _api.post('/nutrition/diary/entries', {
      'date': Fmt.iso(day),
      'meal': meal.api,
      'name': name,
      for (final m in Macro.values) m.name: macros[m],
    });
    _ref.invalidate(diaryProvider(day));
  }

  Future<void> removeEntry(DateTime day, String id) async {
    await _api.delete('/nutrition/diary/entries/$id');
    _ref.invalidate(diaryProvider(day));
  }

  /// Un registro por día: si ya existe ese día, se reemplaza.
  Future<void> saveBody(DateTime date, double weight, double? bodyFat, double? waist, String note) async {
    await _api.put('/nutrition/body', {
      'date': Fmt.iso(date),
      'weightKg': weight,
      'bodyFatPct': bodyFat,
      'waistCm': waist,
      'note': note.isEmpty ? null : note,
    });
    _ref.invalidate(bodyProvider);
  }

  Future<void> removeBody(String id) async {
    await _api.delete('/nutrition/body/$id');
    _ref.invalidate(bodyProvider);
  }
}
