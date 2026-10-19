import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets.dart';
import 'nutrition_data.dart';

/// Agregar una comida al diario: de la lista de alimentos o con registro rápido.
void openEntryForm(BuildContext context, DateTime day, {Meal? meal}) {
  showFormSheet<void>(context, title: 'Agregar comida', builder: (_) => _EntryForm(day: day, meal: meal ?? Meal.forNow()));
}

/// Nuevo registro de peso y composición corporal.
void openBodyForm(BuildContext context) {
  showFormSheet<void>(context, title: 'Nuevo registro', builder: (_) => const _BodyForm());
}

enum _Mode { list, quick }

class _EntryForm extends ConsumerStatefulWidget {
  const _EntryForm({required this.day, required this.meal});
  final DateTime day;
  final Meal meal;

  @override
  ConsumerState<_EntryForm> createState() => _EntryFormState();
}

class _EntryFormState extends ConsumerState<_EntryForm> {
  late Meal _meal = widget.meal;
  _Mode _mode = _Mode.list;
  String _query = '';
  Timer? _debounce;
  Food? _food;
  final _amount = TextEditingController();
  final _name = TextEditingController();
  final _macroFields = {for (final m in Macro.values) m: TextEditingController()};
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _amount.dispose();
    _name.dispose();
    for (final c in _macroFields.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _pick(Food f) => setState(() {
        _food = f;
        _amount.text = Fmt.one(f.portion);
        _error = null;
      });

  Future<void> _save() async {
    final actions = ref.read(nutritionActionsProvider);
    setState(() => _error = null);
    if (_mode == _Mode.list) {
      final amount = readAmount(_amount) ?? 0;
      if (_food == null) return setState(() => _error = 'Elige un alimento de la lista.');
      if (amount <= 0) return setState(() => _error = 'Escribe la cantidad.');
    } else {
      final kcal = readAmount(_macroFields[Macro.kcal]!) ?? 0;
      final hasMacros = [Macro.protein, Macro.carbs, Macro.fat].any((m) => (readAmount(_macroFields[m]!) ?? 0) > 0);
      if (_name.text.trim().isEmpty) return setState(() => _error = 'Escribe qué comiste.');
      if (kcal <= 0 && !hasMacros) return setState(() => _error = 'Escribe las calorías o los macros.');
    }
    setState(() => _busy = true);
    try {
      if (_mode == _Mode.list) {
        await actions.addFood(widget.day, _meal, _food!, readAmount(_amount)!);
      } else {
        await actions.addQuick(widget.day, _meal, _name.text.trim(), {for (final m in Macro.values) m: readAmount(_macroFields[m]!)});
      }
      if (mounted) {
        Navigator.pop(context);
        showMessage(context, 'Agregado a ${_meal.label.toLowerCase()}.');
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Comida', style: label),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final m in Meal.values)
              ChoiceChip(label: Text('${m.icon} ${m.label}'), selected: _meal == m, showCheckmark: false, onSelected: (_) => setState(() => _meal = m)),
          ],
        ),
        const SizedBox(height: 16),
        SegmentedButton<_Mode>(
          showSelectedIcon: false,
          segments: const [
            ButtonSegment(value: _Mode.list, label: Text('De mi lista')),
            ButtonSegment(value: _Mode.quick, label: Text('Registro rápido')),
          ],
          selected: {_mode},
          onSelectionChanged: (s) => setState(() {
            _mode = s.first;
            _error = null;
          }),
        ),
        const SizedBox(height: 16),
        if (_mode == _Mode.list) ..._listMode(c) else ..._quickMode(),
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(_error!, style: TextStyle(color: c.badInk, fontWeight: FontWeight.w600)),
        ],
        const SizedBox(height: 18),
        SubmitButton(label: 'Agregar a ${_meal.label.toLowerCase()}', busy: _busy, onPressed: _save),
      ],
    );
  }

  List<Widget> _listMode(AppColors c) {
    final results = ref.watch(foodSearchProvider(_query));
    final food = _food;
    final preview = food?.forAmount(readAmount(_amount) ?? 0);
    return [
      TextField(
        decoration: const InputDecoration(labelText: 'Buscar alimento', hintText: 'Ej. pollo, arepa, avena…', prefixIcon: Icon(Icons.search)),
        onChanged: (v) {
          // Espera a que termines de escribir antes de buscar.
          _debounce?.cancel();
          _debounce = Timer(const Duration(milliseconds: 300), () => setState(() => _query = v));
        },
      ),
      const SizedBox(height: 10),
      Container(
        constraints: const BoxConstraints(maxHeight: 220),
        decoration: BoxDecoration(border: Border.all(color: c.line), borderRadius: BorderRadius.circular(14)),
        child: results.when(
          loading: () => const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator())),
          error: (e, _) => Padding(padding: const EdgeInsets.all(16), child: Text('No se pudo buscar: $e')),
          data: (list) => list.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('No hay coincidencias. Agrega el alimento desde la web o usa el registro rápido.', style: TextStyle(color: c.ink2)),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final f = list[i];
                    final selected = _food?.id == f.id;
                    return ListTile(
                      dense: true,
                      selected: selected,
                      selectedTileColor: c.accent.withValues(alpha: 0.12),
                      title: Text(f.name),
                      subtitle: Text('${Fmt.integer(f.macros[Macro.kcal])} kcal / ${Fmt.one(f.portion)} ${unitLabel(f.unit)}'),
                      trailing: selected ? Icon(Icons.check_circle, color: c.accent) : null,
                      onTap: () => _pick(f),
                    );
                  },
                ),
        ),
      ),
      if (food != null) ...[
        const SizedBox(height: 14),
        TextField(
          controller: _amount,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          decoration: InputDecoration(labelText: 'Cantidad de "${food.name}" (${unitLabel(food.unit)})'),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 6),
        if (preview != null)
          Text(
            '${Fmt.integer(preview[Macro.kcal])} kcal · P ${Fmt.one(preview[Macro.protein])} g · C ${Fmt.one(preview[Macro.carbs])} g · G ${Fmt.one(preview[Macro.fat])} g',
            style: TextStyle(color: c.ink2, fontSize: 13),
          ),
      ],
    ];
  }

  List<Widget> _quickMode() {
    Widget field(Macro m) => Expanded(
          child: TextField(
            controller: _macroFields[m],
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: m == Macro.kcal ? 'Calorías' : '${m.label} (g)'),
          ),
        );
    return [
      TextField(
        controller: _name,
        textCapitalization: TextCapitalization.sentences,
        decoration: const InputDecoration(labelText: '¿Qué comiste?', hintText: 'Ej. Empanada de queso'),
      ),
      const SizedBox(height: 12),
      Row(children: [field(Macro.protein), const SizedBox(width: 10), field(Macro.carbs), const SizedBox(width: 10), field(Macro.fat)]),
      const SizedBox(height: 12),
      Row(children: [field(Macro.kcal), const SizedBox(width: 10), field(Macro.fiber)]),
      const SizedBox(height: 6),
      Text('Si dejas las calorías vacías se calculan de los macros (4 · 4 · 9).', style: TextStyle(color: context.colors.ink2, fontSize: 12.5)),
    ];
  }
}

class _BodyForm extends ConsumerStatefulWidget {
  const _BodyForm();

  @override
  ConsumerState<_BodyForm> createState() => _BodyFormState();
}

class _BodyFormState extends ConsumerState<_BodyForm> {
  final _form = GlobalKey<FormState>();
  DateTime _date = Fmt.today();
  final _weight = TextEditingController();
  final _fat = TextEditingController();
  final _waist = TextEditingController();
  final _note = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _weight.dispose();
    _fat.dispose();
    _waist.dispose();
    _note.dispose();
    super.dispose();
  }

  String? _range(String? v, double min, double max, String message, {bool optional = true}) {
    final n = Fmt.parseAmount(v ?? '');
    if (n == null) return optional ? null : message;
    return n > min && n < max ? null : message;
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref.read(nutritionActionsProvider).saveBody(_date, readAmount(_weight)!, readAmount(_fat), readAmount(_waist), _note.text.trim());
      if (mounted) {
        Navigator.pop(context);
        showMessage(context, 'Registro guardado.');
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
    const decimal = TextInputType.numberWithOptions(decimal: true);
    return Form(
      key: _form,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OutlinedButton.icon(
            onPressed: () async {
              final picked = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2020), lastDate: Fmt.today());
              if (picked != null) setState(() => _date = picked);
            },
            icon: const Icon(Icons.event_outlined),
            label: Text('Fecha: ${Fmt.longDate(_date)}'),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _weight,
            keyboardType: decimal,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            decoration: const InputDecoration(labelText: 'Peso (kg)', hintText: 'Ej. 78,4'),
            validator: (v) => _range(v, 20, 400, 'Escribe un peso válido en kg.', optional: false),
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextFormField(
                  controller: _fat,
                  keyboardType: decimal,
                  decoration: const InputDecoration(labelText: '% de grasa', hintText: 'Opcional'),
                  validator: (v) => _range(v, 2, 70, 'Entre 2 y 70.'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextFormField(
                  controller: _waist,
                  keyboardType: decimal,
                  decoration: const InputDecoration(labelText: 'Cintura (cm)', hintText: 'Opcional'),
                  validator: (v) => _range(v, 30, 250, 'En centímetros.'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _note,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(labelText: 'Nota (opcional)', hintText: 'Ej. En ayunas, báscula del gym'),
          ),
          const SizedBox(height: 8),
          Text(
            'Consejo: pésate en ayunas, a la misma hora y en la misma báscula. Si ya hay un registro ese día, se reemplaza.',
            style: TextStyle(color: c.ink2, fontSize: 12.5),
          ),
          const SizedBox(height: 18),
          SubmitButton(label: 'Guardar registro', busy: _busy, onPressed: _save),
        ],
      ),
    );
  }
}
