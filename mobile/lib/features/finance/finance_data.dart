import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../planning/planning_data.dart';

enum Account {
  zelle('ZELLE', 'Zelle', '🏦', usd: true),
  cashUsd('CASH_USD', 'Efectivo \$', '💵', usd: true),
  usdt('USDT', 'USDT', '💠', usd: true),
  cashVes('CASH_VES', 'Efectivo Bs', '💴', usd: false),
  bankTransfer('BANK_TRANSFER', 'Transferencia', '🔁', usd: false),
  pagoMovil('PAGO_MOVIL', 'Pago Móvil', '📱', usd: false);

  const Account(this.api, this.label, this.icon, {required this.usd});
  final String api;
  final String label;
  final String icon;

  /// Cuenta en dólares (USDT cuenta como dólar 1:1); si no, en bolívares.
  final bool usd;

  static Account fromApi(String v) => values.firstWhere((a) => a.api == v);

  String format(double amount) => this == Account.usdt ? '${Fmt.money(amount)} USDT' : (usd ? Fmt.usd(amount) : Fmt.bs(amount));
}

enum IncomeType {
  salary('SALARY', 'Sueldo / Salario'),
  sale('SALE', 'Venta'),
  service('SERVICE', 'Servicio / Trabajo'),
  exchange('EXCHANGE', 'Cambio de divisas'),
  gift('GIFT', 'Regalo'),
  loan('LOAN', 'Préstamo recibido'),
  refund('REFUND', 'Reembolso / Devolución'),
  other('OTHER', 'Otro');

  const IncomeType(this.api, this.label);
  final String api;
  final String label;

  static IncomeType? fromApi(String? v) => v == null ? null : values.firstWhere((t) => t.api == v);
}

enum ExpenseReason {
  purchase('PURCHASE', 'Compra'),
  payment('PAYMENT', 'Pago (servicio, deuda…)'),
  currencySale('CURRENCY_SALE', 'Venta de divisas'),
  exchange('EXCHANGE', 'Cambio entre cuentas'),
  other('OTHER', 'Otro');

  const ExpenseReason(this.api, this.label);
  final String api;
  final String label;

  static ExpenseReason? fromApi(String? v) => v == null ? null : values.firstWhere((r) => r.api == v);
}

enum ExpenseClass {
  expense('EXPENSE', 'Gasto', 'Consumo personal o del día a día (comida, transporte, ocio…).'),
  cost('COST', 'Costo', 'Dinero invertido para producir o vender algo (insumos, materiales, mercancía…).');

  const ExpenseClass(this.api, this.label, this.hint);
  final String api;
  final String label;
  final String hint;

  static ExpenseClass? fromApi(String? v) => v == null ? null : values.firstWhere((c) => c.api == v);
}

const expenseCategories = [
  'Comida', 'Transporte', 'Servicios', 'Salud', 'Hogar', 'Ropa', 'Entretenimiento', 'Educación',
  'Insumos / Materiales', 'Mercancía', 'Deudas', 'Otro',
];

class Movement {
  const Movement({
    required this.id,
    required this.income,
    required this.date,
    required this.account,
    required this.amount,
    required this.description,
    required this.incomeType,
    required this.reason,
    required this.expenseClass,
    required this.category,
    required this.usdtRate,
    required this.transfer,
    required this.usdValue,
    required this.bsValue,
  });

  final String id;
  final bool income;
  final DateTime date;
  final Account account;
  final double amount;
  final String description;
  final IncomeType? incomeType;
  final ExpenseReason? reason;
  final ExpenseClass? expenseClass;
  final String? category;
  final double? usdtRate;

  /// Parte de un cambio de divisas: no cuenta como ingreso ni gasto (y no se edita aquí).
  final bool transfer;
  final double usdValue;
  final double bsValue;

  String get title => description.isNotEmpty
      ? description
      : income
          ? (incomeType?.label ?? 'Entrada')
          : (category ?? reason?.label ?? 'Salida');

  factory Movement.fromJson(Map<String, dynamic> j) => Movement(
        id: j['id'] as String,
        income: j['kind'] == 'INCOME',
        date: Fmt.parseIso(j['date'] as String),
        account: Account.fromApi(j['account'] as String),
        amount: toDouble(j['amount']),
        description: (j['description'] as String?) ?? '',
        incomeType: IncomeType.fromApi(j['incomeType'] as String?),
        reason: ExpenseReason.fromApi(j['expenseReason'] as String?),
        expenseClass: ExpenseClass.fromApi(j['expenseClass'] as String?),
        category: j['category'] as String?,
        usdtRate: toDoubleOrNull(j['usdtRate']),
        transfer: j['transfer'] as bool? ?? false,
        usdValue: toDouble(j['usdValue']),
        bsValue: toDouble(j['bsValue']),
      );
}

class Rates {
  const Rates({required this.date, required this.usd, required this.eur, required this.official});
  final DateTime date;
  final double usd;
  final double eur;
  final bool official;

  static Rates? fromJson(Map<String, dynamic>? j) => j == null
      ? null
      : Rates(
          date: Fmt.parseIso(j['date'] as String),
          usd: toDouble(j['usd']),
          eur: toDouble(j['eur']),
          official: j['source'] == 'BCV',
        );
}

class AccountBalance {
  const AccountBalance(this.account, this.balance, this.usdValue, this.bsValue);
  final Account account;
  final double balance;
  final double? usdValue;
  final double? bsValue;
}

class MonthPoint {
  const MonthPoint(this.month, this.income, this.expense);
  final DateTime month;
  final double income;
  final double expense;
}

class FinanceSummary {
  const FinanceSummary({
    required this.rates,
    required this.accounts,
    required this.totalUsd,
    required this.totalBs,
    required this.totalEur,
    required this.usdtAverage,
    required this.income,
    required this.expense,
    required this.expenses,
    required this.costs,
    required this.byCategory,
    required this.lastSixMonths,
  });

  final Rates? rates;
  final List<AccountBalance> accounts;
  final double? totalUsd, totalBs, totalEur;
  final double? usdtAverage;
  final double income, expense, expenses, costs;
  final List<(String, double)> byCategory;
  final List<MonthPoint> lastSixMonths;

  factory FinanceSummary.fromJson(Map<String, dynamic> j) {
    final totals = j['totals'] as Map<String, dynamic>?;
    final month = j['month'] as Map<String, dynamic>;
    DateTime ym(String s) {
      final p = s.split('-').map(int.parse).toList();
      return DateTime(p[0], p[1]);
    }

    return FinanceSummary(
      rates: Rates.fromJson(j['rates'] as Map<String, dynamic>?),
      accounts: [
        for (final a in j['accounts'] as List)
          AccountBalance(
            Account.fromApi(a['account'] as String),
            toDouble(a['balance']),
            toDoubleOrNull(a['usdValue']),
            toDoubleOrNull(a['bsValue']),
          ),
      ],
      totalUsd: toDoubleOrNull(totals?['usd']),
      totalBs: toDoubleOrNull(totals?['bs']),
      totalEur: toDoubleOrNull(totals?['eur']),
      usdtAverage: toDoubleOrNull(j['usdtAverageRate']),
      income: toDouble(month['income']),
      expense: toDouble(month['expense']),
      expenses: toDouble(month['expenses']),
      costs: toDouble(month['costs']),
      byCategory: [for (final c in month['byCategory'] as List) (c['category'] as String, toDouble(c['usd']))],
      lastSixMonths: [
        for (final p in j['lastSixMonths'] as List) MonthPoint(ym(p['month'] as String), toDouble(p['income']), toDouble(p['expense'])),
      ],
    );
  }
}

String monthKey(DateTime m) => '${m.year}-${m.month.toString().padLeft(2, '0')}';

final financeSummaryProvider = FutureProvider<FinanceSummary>((ref) async {
  requireUser(ref);
  return FinanceSummary.fromJson(await ref.read(apiClientProvider).get('/finance/summary') as Map<String, dynamic>);
});

/// Movimientos de un mes ("2026-10").
final movementsProvider = FutureProvider.family<List<Movement>, String>((ref, month) async {
  requireUser(ref);
  final list = await ref.read(apiClientProvider).get('/finance/movements?month=$month') as List;
  return list.map((e) => Movement.fromJson(e as Map<String, dynamic>)).toList();
});

/// Datos de un movimiento nuevo o editado.
class MovementDraft {
  const MovementDraft({
    required this.income,
    required this.date,
    required this.account,
    required this.amount,
    required this.description,
    this.incomeType,
    this.reason,
    this.expenseClass,
    this.category,
    this.usdtRate,
  });

  final bool income;
  final DateTime date;
  final Account account;
  final double amount;
  final String description;
  final IncomeType? incomeType;
  final ExpenseReason? reason;
  final ExpenseClass? expenseClass;
  final String? category;
  final double? usdtRate;

  /// Sin tasas: el servidor usa la tasa BCV de ese día.
  Map<String, dynamic> toJson() => {
        'kind': income ? 'INCOME' : 'EXPENSE',
        'date': Fmt.iso(date),
        'account': account.api,
        'amount': amount,
        'description': description.isEmpty ? null : description,
        'incomeType': income ? incomeType?.api : null,
        'expenseReason': income ? null : reason?.api,
        'expenseClass': income ? null : expenseClass?.api,
        'category': income ? null : category,
        'usdtRate': account == Account.usdt ? usdtRate : null,
      };
}

final financeActionsProvider = Provider<FinanceActions>(FinanceActions.new);

class FinanceActions {
  FinanceActions(this._ref);
  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  Future<void> save(MovementDraft draft, {String? id}) async {
    id == null ? await _api.post('/finance/movements', draft.toJson()) : await _api.put('/finance/movements/$id', draft.toJson());
    _changed();
  }

  Future<void> delete(String id) async {
    await _api.delete('/finance/movements/$id');
    _changed();
  }

  /// Pide al servidor la tasa BCV del día.
  Future<void> refreshRates() async {
    await _api.post('/finance/rates/refresh');
    _ref.invalidate(financeSummaryProvider);
  }

  void _changed() {
    _ref.invalidate(financeSummaryProvider);
    _ref.invalidate(movementsProvider);
  }
}
