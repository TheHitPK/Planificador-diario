import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../shared/hero_app_bar.dart';
import '../../shared/widgets.dart';
import '../home/profile_button.dart';
import '../planning/planning_data.dart';

const _icons = ['📚', '💧', '🏋️', '🛡️', '⏰', '🏃', '🧘', '🥗', '😴', '💻', '✍️', '🎸', '🙏', '🧹', '💰', '🚭', '📵', '🦷', '☀️', '🧠'];

class DisciplinesScreen extends ConsumerWidget {
  const DisciplinesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final disciplines = ref.watch(disciplinesProvider);
    final c = context.colors;

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Nueva disciplina'),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(disciplinesProvider.future),
        edgeOffset: 120,
        child: CustomScrollView(
          slivers: [
            const HeroAppBar(
              title: 'Mis disciplinas',
              subtitle: 'Los hábitos que quieres sostener cada día.',
              actions: [ProfileButton()],
            ),
            AsyncSliver<List<Discipline>>(
              value: disciplines,
              onRetry: () => ref.invalidate(disciplinesProvider),
              builder: (list) {
                if (list.isEmpty) {
                  return const SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icon: Icons.track_changes_rounded,
                      title: 'Todavía no hay disciplinas',
                      message: 'Toca "Nueva disciplina" para agregar la primera.',
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  sliver: SliverMainAxisGroup(
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 10, left: 4),
                          child: Text(
                            'Mantén pulsada una disciplina para cambiar su orden.',
                            style: TextStyle(color: c.ink2, fontSize: 13),
                          ),
                        ),
                      ),
                      SliverReorderableList(
                        itemCount: list.length,
                        onReorderItem: (from, to) async {
                          try {
                            await ref.read(disciplinesProvider.notifier).reorder(from, to);
                          } catch (e) {
                            if (context.mounted) showError(context, e);
                          }
                        },
                        proxyDecorator: (child, _, _) => Material(color: Colors.transparent, elevation: 6, shadowColor: Colors.black26, child: child),
                        itemBuilder: (context, i) {
                          final d = list[i];
                          return ReorderableDelayedDragStartListener(
                            key: ValueKey(d.id),
                            index: i,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _DisciplineTile(discipline: d, onTap: () => _openForm(context, ref, d)),
                            ),
                          );
                        },
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

  void _openForm(BuildContext context, WidgetRef ref, [Discipline? editing]) {
    showFormSheet<void>(
      context,
      title: editing == null ? 'Nueva disciplina' : 'Editar disciplina',
      builder: (_) => _DisciplineForm(editing: editing),
    );
  }
}

class _DisciplineTile extends StatelessWidget {
  const _DisciplineTile({required this.discipline, required this.onTap});
  final Discipline discipline;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(14)),
            child: Text(discipline.icon, style: const TextStyle(fontSize: 24)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(discipline.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                if (discipline.description.isNotEmpty)
                  Text(discipline.description, style: TextStyle(color: c.ink2, fontSize: 13)),
              ],
            ),
          ),
          Icon(Icons.drag_indicator, color: c.muted),
        ],
      ),
    );
  }
}

class _DisciplineForm extends ConsumerStatefulWidget {
  const _DisciplineForm({this.editing});
  final Discipline? editing;

  @override
  ConsumerState<_DisciplineForm> createState() => _DisciplineFormState();
}

class _DisciplineFormState extends ConsumerState<_DisciplineForm> {
  late final _name = TextEditingController(text: widget.editing?.name);
  late final _description = TextEditingController(text: widget.editing?.description);
  late String _icon = widget.editing?.icon ?? _icons.first;
  final _form = GlobalKey<FormState>();
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    final notifier = ref.read(disciplinesProvider.notifier);
    try {
      final editing = widget.editing;
      if (editing == null) {
        await notifier.create(_name.text.trim(), _icon, _description.text.trim());
      } else {
        await notifier.edit(editing.id, _name.text.trim(), _icon, _description.text.trim());
      }
      if (mounted) {
        Navigator.pop(context);
        showMessage(context, editing == null ? 'Disciplina agregada.' : 'Cambios guardados.');
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final d = widget.editing!;
    final ok = await confirmAction(context,
        title: 'Eliminar "${d.name}"', message: 'Dejará de aparecer en la planificación y en las estadísticas.');
    if (!ok || !mounted) return;
    try {
      await ref.read(disciplinesProvider.notifier).remove(d.id);
      if (mounted) {
        Navigator.pop(context);
        showMessage(context, 'Disciplina eliminada.');
      }
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Form(
      key: _form,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Icono', style: TextStyle(color: c.ink2, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final ic in _icons)
                InkWell(
                  onTap: () => setState(() => _icon = ic),
                  borderRadius: BorderRadius.circular(12),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: _icon == ic ? c.accent.withValues(alpha: 0.12) : c.surface2,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _icon == ic ? c.accent : Colors.transparent, width: 2),
                    ),
                    child: Text(ic, style: const TextStyle(fontSize: 22)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Nombre', hintText: 'Ej. Meditar 10 min'),
            textCapitalization: TextCapitalization.sentences,
            validator: (v) => (v ?? '').trim().isEmpty ? 'Escribe el nombre.' : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _description,
            decoration: const InputDecoration(labelText: 'Descripción (opcional)'),
            textCapitalization: TextCapitalization.sentences,
            maxLines: 3,
            minLines: 2,
          ),
          const SizedBox(height: 20),
          SubmitButton(label: widget.editing == null ? 'Agregar' : 'Guardar cambios', busy: _busy, onPressed: _save),
          if (widget.editing != null) ...[
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _busy ? null : _delete,
              style: TextButton.styleFrom(foregroundColor: c.badInk),
              icon: const Icon(Icons.delete_outline),
              label: const Text('Eliminar disciplina'),
            ),
          ],
        ],
      ),
    );
  }
}
