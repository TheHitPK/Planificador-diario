import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets.dart';
import 'finance_data.dart';

/// Formulario de entrada o salida. Los cambios de divisas se registran desde la web.
void openMovementForm(BuildContext context, [Movement? editing]) {
  showFormSheet<void>(
    context,
    title: editing == null ? 'Registrar movimiento' : 'Editar movimiento',
    builder: (_) => _MovementForm(editing: editing),
  );
}

class _MovementForm extends ConsumerStatefulWidget {
  const _MovementForm({this.editing});
  final Movement? editing;

  @override
  ConsumerState<_MovementForm> createState() => _MovementFormState();
}

class _MovementFormState extends ConsumerState<_MovementForm> {
  final _form = GlobalKey<FormState>();
  late bool _income = widget.editing?.income ?? false;
  late DateTime _date = widget.editing?.date ?? Fmt.today();
  late bool _usd = widget.editing?.account.usd ?? true;
  late Account _account = widget.editing?.account ?? Account.zelle;
  late final _amount = TextEditingController(text: widget.editing == null ? '' : Fmt.money(widget.editing!.amount));
  late final _description = TextEditingController(text: widget.editing?.description);
  late final _usdtRate = TextEditingController(
    text: widget.editing?.usdtRate == null ? '' : Fmt.money(widget.editing!.usdtRate!),
  );
  late IncomeType _incomeType = widget.editing?.incomeType ?? IncomeType.salary;
  late ExpenseReason _reason = widget.editing?.reason ?? ExpenseReason.purchase;
  late ExpenseClass _class = widget.editing?.expenseClass ?? ExpenseClass.expense;
  late String _category = widget.editing?.category ?? expenseCategories.first;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _description.dispose();
    _usdtRate.dispose();
    super.dispose();
  }

  void _setCurrency(bool usd) => setState(() {
        _usd = usd;
        _account = Account.values.firstWhere((a) => a.usd == usd);
      });

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    final draft = MovementDraft(
      income: _income,
      date: _date,
      account: _account,
      amount: readAmount(_amount)!,
      description: _description.text.trim(),
      incomeType: _incomeType,
      reason: _reason,
      expenseClass: _class,
      category: _category,
      usdtRate: readAmount(_usdtRate),
    );
    try {
      await ref.read(financeActionsProvider).save(draft, id: widget.editing?.id);
      if (mounted) {
        Navigator.pop(context);
        showMessage(context, widget.editing == null ? (_income ? 'Entrada registrada.' : 'Salida registrada.') : 'Cambios guardados.');
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
    final editing = widget.editing != null;

    return Form(
      key: _form,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SegmentedButton<bool>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: true, label: Text('Entrada'), icon: Icon(Icons.south_west)),
              ButtonSegment(value: false, label: Text('Salida'), icon: Icon(Icons.north_east)),
            ],
            selected: {_income},
            // Una entrada no se convierte en salida (ni al revés): se borra y se registra de nuevo.
            onSelectionChanged: editing ? null : (s) => setState(() => _income = s.first),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _date,
                firstDate: DateTime(2020),
                lastDate: Fmt.today(),
              );
              if (picked != null) setState(() => _date = picked);
            },
            icon: const Icon(Icons.event_outlined),
            label: Text('Fecha: ${Fmt.longDate(_date)}'),
          ),
          const SizedBox(height: 16),
          Text('Moneda', style: label),
          const SizedBox(height: 8),
          SegmentedButton<bool>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: true, label: Text('\$ Dólares')),
              ButtonSegment(value: false, label: Text('Bs Bolívares')),
            ],
            selected: {_usd},
            onSelectionChanged: (s) => _setCurrency(s.first),
          ),
          const SizedBox(height: 12),
          Text(_income ? 'Entra a' : 'Sale de', style: label),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final a in Account.values.where((a) => a.usd == _usd))
                ChoiceChip(
                  label: Text('${a.icon} ${a.label}'),
                  selected: _account == a,
                  showCheckmark: false,
                  onSelected: (_) => setState(() => _account = a),
                ),
            ],
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            decoration: InputDecoration(
              labelText: 'Monto ${_account == Account.usdt ? '(USDT)' : _usd ? '(\$)' : '(Bs)'}',
              hintText: '0,00',
            ),
            validator: (v) => (Fmt.parseAmount(v ?? '') ?? 0) > 0 ? null : 'Escribe un monto mayor que 0.',
          ),
          if (_account == Account.usdt) ...[
            const SizedBox(height: 14),
            TextFormField(
              controller: _usdtRate,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Tasa de compra (Bs por USDT)',
                helperText: 'Opcional. Si la dejas vacía se usa tu promedio.',
              ),
            ),
          ],
          const SizedBox(height: 14),
          if (_income)
            DropdownButtonFormField<IncomeType>(
              initialValue: _incomeType,
              decoration: const InputDecoration(labelText: 'Tipo de entrada'),
              items: [
                for (final t in IncomeType.values.where((t) => t != IncomeType.exchange))
                  DropdownMenuItem(value: t, child: Text(t.label)),
              ],
              onChanged: (v) => setState(() => _incomeType = v!),
            )
          else ...[
            DropdownButtonFormField<ExpenseReason>(
              initialValue: _reason,
              decoration: const InputDecoration(labelText: 'Motivo'),
              items: [
                for (final r in ExpenseReason.values.where((r) => r != ExpenseReason.currencySale && r != ExpenseReason.exchange))
                  DropdownMenuItem(value: r, child: Text(r.label)),
              ],
              onChanged: (v) => setState(() => _reason = v!),
            ),
            const SizedBox(height: 14),
            Text('Clasificación', style: label),
            const SizedBox(height: 8),
            SegmentedButton<ExpenseClass>(
              showSelectedIcon: false,
              segments: [for (final e in ExpenseClass.values) ButtonSegment(value: e, label: Text(e.label))],
              selected: {_class},
              onSelectionChanged: (s) => setState(() => _class = s.first),
            ),
            const SizedBox(height: 6),
            Text(_class.hint, style: TextStyle(color: c.ink2, fontSize: 12.5)),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: expenseCategories.contains(_category) ? _category : expenseCategories.last,
              decoration: const InputDecoration(labelText: 'Categoría'),
              items: [for (final cat in expenseCategories) DropdownMenuItem(value: cat, child: Text(cat))],
              onChanged: (v) => setState(() => _category = v!),
            ),
          ],
          const SizedBox(height: 14),
          TextFormField(
            controller: _description,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: 'Descripción (opcional)',
              hintText: _income ? 'Ej. Pago quincena' : 'Ej. Mercado de la semana',
            ),
          ),
          const SizedBox(height: 8),
          Text('Se usa la tasa BCV del día elegido.', style: TextStyle(color: c.ink2, fontSize: 12.5)),
          const SizedBox(height: 18),
          SubmitButton(
            label: editing ? 'Guardar cambios' : (_income ? 'Registrar entrada' : 'Registrar salida'),
            busy: _busy,
            onPressed: _save,
          ),
        ],
      ),
    );
  }
}
