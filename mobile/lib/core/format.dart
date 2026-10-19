import 'package:intl/intl.dart';

/// Fechas y cifras en español, sin depender de la configuración regional del teléfono.
abstract final class Fmt {
  static const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  static const dayShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  static const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  static const monthShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  static final _money = NumberFormat.decimalPatternDigits(locale: 'es', decimalDigits: 2);
  static final _one = NumberFormat.decimalPatternDigits(locale: 'es', decimalDigits: 1);
  static final _int = NumberFormat.decimalPatternDigits(locale: 'es', decimalDigits: 0);

  /// Fecha sin hora (local).
  static DateTime today() {
    final n = DateTime.now();
    return DateTime(n.year, n.month, n.day);
  }

  static DateTime startOfWeek(DateTime d) => DateTime(d.year, d.month, d.day - (d.weekday - 1));

  static bool sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  /// 2026-10-05 (formato de la API).
  static String iso(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  static DateTime parseIso(String s) {
    final p = s.split('-').map(int.parse).toList();
    return DateTime(p[0], p[1], p[2]);
  }

  /// 05/10
  static String dm(DateTime d) => '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';

  /// Lunes, 5 de octubre
  static String longDate(DateTime d) => '${dayNames[d.weekday - 1]}, ${d.day} de ${monthNames[d.month - 1].toLowerCase()}';

  static String money(num v) => _money.format(v);
  static String usd(num v) => '\$ ${_money.format(v)}';
  static String bs(num v) => 'Bs ${_money.format(v)}';
  static String eur(num v) => '€ ${_money.format(v)}';
  static String one(num v) => _one.format(v);
  static String integer(num v) => _int.format(v);
  static String percent(double? ratio) => ratio == null ? '—' : '${(ratio * 100).round()}%';

  /// "12,5" o "12.5" → 12.5 (acepta coma decimal y separadores de miles).
  static double? parseAmount(String text) {
    var s = text.trim().replaceAll(' ', '');
    if (s.isEmpty) return null;
    if (s.contains(',')) s = s.replaceAll('.', '').replaceAll(',', '.');
    return double.tryParse(s);
  }

  static String greeting([DateTime? at]) {
    final h = (at ?? DateTime.now()).hour;
    if (h >= 5 && h < 12) return 'Buenos días';
    if (h >= 12 && h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }
}

/// Números que llegan de la API como número o texto (BigDecimal).
double toDouble(Object? v) => v == null ? 0 : (v is num ? v.toDouble() : double.tryParse('$v') ?? 0);
double? toDoubleOrNull(Object? v) => v == null ? null : toDouble(v);
