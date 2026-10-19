import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/hero_app_bar.dart';
import '../../shared/widgets.dart';
import '../home/profile_button.dart';
import 'tasks_data.dart';

enum _Filter {
  active('Activas'),
  pending('Pendientes'),
  inProgress('En progreso'),
  completed('Completadas'),
  all('Todas');

  const _Filter(this.label);
  final String label;

  bool matches(Task t) => switch (this) {
        _Filter.active => !t.done,
        _Filter.pending => t.status == TaskStatus.pending,
        _Filter.inProgress => t.status == TaskStatus.inProgress,
        _Filter.completed => t.done,
        _Filter.all => true,
      };
}

enum _View { list, cards }

const _viewKey = 'pd.tasks.view';
const _statusOrder = {TaskStatus.inProgress: 0, TaskStatus.pending: 1, TaskStatus.completed: 2};
const _priorityOrder = {TaskPriority.high: 0, TaskPriority.medium: 1, TaskPriority.low: 2};

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  _Filter _filter = _Filter.active;
  _View _view = _View.list;

  @override
  void initState() {
    super.initState();
    // La vista elegida (lista o tarjetas) se recuerda en el teléfono.
    SharedPreferences.getInstance().then((p) {
      if (mounted && p.getString(_viewKey) == 'cards') setState(() => _view = _View.cards);
    });
  }

  void _setView(_View v) {
    setState(() => _view = v);
    SharedPreferences.getInstance().then((p) => p.setString(_viewKey, v.name));
  }

  @override
  Widget build(BuildContext context) {
    final tasks = ref.watch(tasksProvider);
    final c = context.colors;

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => openTaskForm(context),
        icon: const Icon(Icons.add),
        label: const Text('Nuevo pendiente'),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(tasksProvider.future),
        edgeOffset: 120,
        child: CustomScrollView(
          slivers: [
            const HeroAppBar(
              title: 'Pendientes',
              subtitle: 'Tus tareas, con prioridad y fecha límite.',
              actions: [ProfileButton()],
            ),
            AsyncSliver<List<Task>>(
              value: tasks,
              onRetry: () => ref.invalidate(tasksProvider),
              builder: (all) {
                final visible = all.where(_filter.matches).toList()
                  ..sort((a, b) {
                    final s = _statusOrder[a.status]!.compareTo(_statusOrder[b.status]!);
                    if (s != 0) return s;
                    final d = a.deadline.compareTo(b.deadline);
                    return d != 0 ? d : _priorityOrder[a.priority]!.compareTo(_priorityOrder[b.priority]!);
                  });
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  sliver: SliverMainAxisGroup(
                    slivers: [
                      SliverToBoxAdapter(
                        child: Row(
                          children: [
                            Expanded(child: Text('${visible.length} ${visible.length == 1 ? 'pendiente' : 'pendientes'}', style: TextStyle(color: c.ink2))),
                            SegmentedButton<_View>(
                             showSelectedIcon: false,
                              segments: const [
                                ButtonSegment(value: _View.list, icon: Icon(Icons.view_agenda_outlined), tooltip: 'Lista'),
                                ButtonSegment(value: _View.cards, icon: Icon(Icons.grid_view_rounded), tooltip: 'Tarjetas'),
                              ],
                              selected: {_view},
                              onSelectionChanged: (s) => _setView(s.first),
                            ),
                          ],
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: SizedBox(
                          height: 56,
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            children: [
                              for (final f in _Filter.values)
                                Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: ChoiceChip(
                                    label: Text('${f.label} ${all.where(f.matches).length}'),
                                    selected: _filter == f,
                                    showCheckmark: false,
                                    onSelected: (_) => setState(() => _filter = f),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      if (visible.isEmpty)
                        const SliverToBoxAdapter(
                          child: EmptyState(icon: Icons.task_alt_rounded, title: 'No hay pendientes en este filtro'),
                        )
                      else if (_view == _View.cards)
                        SliverGrid.builder(
                          itemCount: visible.length,
                          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 420,
                            mainAxisExtent: 196,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                          ),
                          itemBuilder: (context, i) => _Appear(index: i, child: _TaskCard(task: visible[i])),
                        )
                      else
                        SliverList.separated(
                          itemCount: visible.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (context, i) => _Appear(index: i, child: _TaskRow(task: visible[i])),
                        ),
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

/// Entrada escalonada de cada elemento (se omite si el sistema pide reducir movimiento).
class _Appear extends StatelessWidget {
  const _Appear({required this.index, required this.child});
  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 350 + 40 * index.clamp(0, 6)),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) => Opacity(opacity: t, child: Transform.translate(offset: Offset(0, 12 * (1 - t)), child: child)),
      child: child,
    );
  }
}

class _TaskRow extends ConsumerWidget {
  const _TaskRow({required this.task});
  final Task task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final (deadline, tone) = task.deadlineInfo(c);
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      onTap: () => openTaskForm(context, task),
      child: Row(
        children: [
          _StatusCheck(task: task),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _TaskName(task: task),
                if (task.description.isNotEmpty)
                  Text(task.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: c.ink2, fontSize: 13)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _PriorityTag(priority: task.priority),
                    _Deadline(text: '${Fmt.dm(task.deadline)} · $deadline', color: tone),
                  ],
                ),
              ],
            ),
          ),
          _StatusMenu(task: task),
        ],
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.task});
  final Task task;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (deadline, tone) = task.deadlineInfo(c);
    final (_, _, edge) = task.priority.tone(c);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => openTaskForm(context, task),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Franja superior con el color de la prioridad (la etiqueta lo dice también con texto).
            Container(height: 4, color: edge),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 8, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _PriorityTag(priority: task.priority),
                        const Spacer(),
                        _Deadline(text: '${Fmt.dm(task.deadline)} · $deadline', color: tone),
                        const SizedBox(width: 6),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _TaskName(task: task, size: 16),
                    if (task.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(task.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: c.ink2, fontSize: 13)),
                    ],
                    const Spacer(),
                    Divider(color: c.grid),
                    Row(
                      children: [
                        _StatusCheck(task: task),
                        const SizedBox(width: 10),
                        Expanded(child: Text(task.status.label, style: TextStyle(color: c.ink2, fontWeight: FontWeight.w600))),
                        _StatusMenu(task: task),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskName extends StatelessWidget {
  const _TaskName({required this.task, this.size = 15});
  final Task task;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Text(
      task.name,
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontWeight: FontWeight.w700,
        fontSize: size,
        color: task.done ? c.muted : c.ink,
        decoration: task.done ? TextDecoration.lineThrough : null,
      ),
    );
  }
}

class _PriorityTag extends StatelessWidget {
  const _PriorityTag({required this.priority});
  final TaskPriority priority;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, _) = priority.tone(context.colors);
    return Tag('Prioridad ${priority.label.toLowerCase()}', background: bg, foreground: fg);
  }
}

class _Deadline extends StatelessWidget {
  const _Deadline({required this.text, required this.color});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.event_outlined, size: 14, color: color),
          const SizedBox(width: 4),
          Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12.5)),
        ],
      );
}

/// Círculo para completar (o reabrir) el pendiente con un toque.
class _StatusCheck extends ConsumerWidget {
  const _StatusCheck({required this.task});
  final Task task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    return IconButton(
      tooltip: task.done ? 'Marcar como pendiente' : 'Marcar como completada',
      onPressed: () async {
        try {
          await ref.read(tasksProvider.notifier).setStatus(task.id, task.done ? TaskStatus.pending : TaskStatus.completed);
        } catch (e) {
          if (context.mounted) showError(context, e);
        }
      },
      icon: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        transitionBuilder: (child, a) => ScaleTransition(scale: a, child: child),
        child: Icon(
          task.done ? Icons.check_circle_rounded : (task.status == TaskStatus.inProgress ? Icons.timelapse_rounded : Icons.radio_button_unchecked),
          key: ValueKey(task.status),
          color: task.done ? c.good : (task.status == TaskStatus.inProgress ? c.accent : c.muted),
          size: 28,
        ),
      ),
    );
  }
}

class _StatusMenu extends ConsumerWidget {
  const _StatusMenu({required this.task});
  final Task task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<Object>(
      tooltip: 'Más opciones',
      icon: const Icon(Icons.more_vert),
      onSelected: (v) async {
        try {
          if (v is TaskStatus) {
            await ref.read(tasksProvider.notifier).setStatus(task.id, v);
          } else if (v == 'delete') {
            final ok = await confirmAction(context, title: 'Eliminar "${task.name}"', message: 'Esta acción no se puede deshacer.');
            if (ok) await ref.read(tasksProvider.notifier).remove(task.id);
          }
        } catch (e) {
          if (context.mounted) showError(context, e);
        }
      },
      itemBuilder: (_) => [
        for (final s in TaskStatus.values)
          CheckedPopupMenuItem(value: s, checked: task.status == s, child: Text(s.label)),
        const PopupMenuDivider(),
        const PopupMenuItem(value: 'delete', child: Text('Eliminar')),
      ],
    );
  }
}

/// Formulario para crear o editar un pendiente.
void openTaskForm(BuildContext context, [Task? editing]) {
  showFormSheet<void>(
    context,
    title: editing == null ? 'Nuevo pendiente' : 'Editar pendiente',
    builder: (_) => _TaskForm(editing: editing),
  );
}

class _TaskForm extends ConsumerStatefulWidget {
  const _TaskForm({this.editing});
  final Task? editing;

  @override
  ConsumerState<_TaskForm> createState() => _TaskFormState();
}

class _TaskFormState extends ConsumerState<_TaskForm> {
  late final _name = TextEditingController(text: widget.editing?.name);
  late final _description = TextEditingController(text: widget.editing?.description);
  late TaskStatus _status = widget.editing?.status ?? TaskStatus.pending;
  late TaskPriority _priority = widget.editing?.priority ?? TaskPriority.medium;
  late DateTime _deadline = widget.editing?.deadline ?? Fmt.today();
  final _form = GlobalKey<FormState>();
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _deadline,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
      helpText: 'Fecha límite',
    );
    if (picked != null) setState(() => _deadline = picked);
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    final notifier = ref.read(tasksProvider.notifier);
    final editing = widget.editing;
    try {
      if (editing == null) {
        await notifier.create(_name.text.trim(), _description.text.trim(), _status, _priority, _deadline);
      } else {
        await notifier.edit(editing.id, _name.text.trim(), _description.text.trim(), _status, _priority, _deadline);
      }
      if (mounted) {
        Navigator.pop(context);
        showMessage(context, editing == null ? 'Pendiente agregado.' : 'Cambios guardados.');
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final label = TextStyle(color: c.ink2, fontWeight: FontWeight.w600);
    return Form(
      key: _form,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Nombre de la actividad', hintText: 'Ej. Reparar la licuadora'),
            textCapitalization: TextCapitalization.sentences,
            validator: (v) => (v ?? '').trim().isEmpty ? 'Escribe el nombre.' : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _description,
            decoration: const InputDecoration(labelText: 'Descripción (opcional)'),
            textCapitalization: TextCapitalization.sentences,
            minLines: 2,
            maxLines: 4,
          ),
          const SizedBox(height: 16),
          Text('Prioridad', style: label),
          const SizedBox(height: 8),
          SegmentedButton<TaskPriority>(
            showSelectedIcon: false,
            segments: [for (final p in TaskPriority.values) ButtonSegment(value: p, label: Text(p.label))],
            selected: {_priority},
            onSelectionChanged: (s) => setState(() => _priority = s.first),
          ),
          const SizedBox(height: 16),
          Text('Estado', style: label),
          const SizedBox(height: 8),
          SegmentedButton<TaskStatus>(
            showSelectedIcon: false,
            segments: [for (final s in TaskStatus.values) ButtonSegment(value: s, label: Text(s.label))],
            selected: {_status},
            onSelectionChanged: (s) => setState(() => _status = s.first),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.event_outlined),
            label: Text('Fecha límite: ${Fmt.longDate(_deadline)}'),
          ),
          const SizedBox(height: 20),
          SubmitButton(label: widget.editing == null ? 'Agregar' : 'Guardar cambios', busy: _busy, onPressed: _save),
        ],
      ),
    );
  }
}
