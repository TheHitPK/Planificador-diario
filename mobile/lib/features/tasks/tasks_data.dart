import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../planning/planning_data.dart';

enum TaskStatus {
  pending('PENDING', 'Pendiente'),
  inProgress('IN_PROGRESS', 'En progreso'),
  completed('COMPLETED', 'Completada');

  const TaskStatus(this.api, this.label);
  final String api;
  final String label;

  static TaskStatus fromApi(String v) => values.firstWhere((s) => s.api == v, orElse: () => TaskStatus.pending);
}

enum TaskPriority {
  high('HIGH', 'Alta'),
  medium('MEDIUM', 'Media'),
  low('LOW', 'Baja');

  const TaskPriority(this.api, this.label);
  final String api;
  final String label;

  static TaskPriority fromApi(String v) => values.firstWhere((p) => p.api == v, orElse: () => TaskPriority.medium);

  /// (fondo, texto, franja) de la etiqueta de prioridad.
  (Color, Color, Color) tone(AppColors c) => switch (this) {
        TaskPriority.high => (c.badSoft, c.badInk, c.bad),
        TaskPriority.medium => (c.warnSoft, c.warnInk, c.warn),
        TaskPriority.low => (c.surface2, c.ink2, c.grid),
      };
}

class Task {
  const Task({
    required this.id,
    required this.name,
    required this.description,
    required this.status,
    required this.priority,
    required this.deadline,
  });

  final String id;
  final String name;
  final String description;
  final TaskStatus status;
  final TaskPriority priority;
  final DateTime deadline;

  bool get done => status == TaskStatus.completed;

  factory Task.fromJson(Map<String, dynamic> j) => Task(
        id: j['id'] as String,
        name: j['name'] as String,
        description: (j['description'] as String?) ?? '',
        status: TaskStatus.fromApi(j['status'] as String),
        priority: TaskPriority.fromApi(j['priority'] as String),
        deadline: Fmt.parseIso(j['deadline'] as String),
      );

  Task copyWith({TaskStatus? status}) =>
      Task(id: id, name: name, description: description, status: status ?? this.status, priority: priority, deadline: deadline);

  /// Texto y tono del plazo: vencida, vence hoy, quedan N días…
  (String, Color) deadlineInfo(AppColors c) {
    if (done) return ('Hecha', c.goodInk);
    final days = deadline.difference(Fmt.today()).inDays;
    if (days < 0) return ('Vencida hace ${-days} ${days == -1 ? 'día' : 'días'}', c.badInk);
    if (days == 0) return ('Vence hoy', c.warnInk);
    if (days <= 3) return ('Quedan $days ${days == 1 ? 'día' : 'días'}', c.warnInk);
    return ('Quedan $days días', c.ink2);
  }
}

final tasksProvider = AsyncNotifierProvider<TasksNotifier, List<Task>>(TasksNotifier.new);

class TasksNotifier extends AsyncNotifier<List<Task>> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<List<Task>> build() async {
    requireUser(ref);
    final list = await _api.get('/tasks?status=PENDING&status=IN_PROGRESS&status=COMPLETED') as List;
    return list.map((e) => Task.fromJson(e as Map<String, dynamic>)).toList();
  }

  Map<String, dynamic> _body(String name, String description, TaskStatus status, TaskPriority priority, DateTime deadline) => {
        'name': name,
        'description': description.isEmpty ? null : description,
        'status': status.api,
        'priority': priority.api,
        'deadline': Fmt.iso(deadline),
      };

  Future<void> create(String name, String description, TaskStatus status, TaskPriority priority, DateTime deadline) async {
    await _api.post('/tasks', _body(name, description, status, priority, deadline));
    ref.invalidateSelf();
  }

  Future<void> edit(String id, String name, String description, TaskStatus status, TaskPriority priority, DateTime deadline) async {
    await _api.put('/tasks/$id', _body(name, description, status, priority, deadline));
    ref.invalidateSelf();
  }

  /// Cambia el estado al instante y lo deshace si la API falla.
  Future<void> setStatus(String id, TaskStatus status) async {
    final current = state.value;
    if (current == null) return;
    state = AsyncData([for (final t in current) t.id == id ? t.copyWith(status: status) : t]);
    try {
      await _api.patch('/tasks/$id/status', {'status': status.api});
    } catch (e) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> remove(String id) async {
    await _api.delete('/tasks/$id');
    ref.invalidateSelf();
  }
}

/// Pendientes sin completar (para el contador de la navegación y del encabezado).
final openTasksCountProvider = Provider<int>((ref) {
  final tasks = ref.watch(tasksProvider).value ?? const [];
  return tasks.where((t) => !t.done).length;
});
