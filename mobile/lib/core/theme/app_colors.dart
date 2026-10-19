import 'package:flutter/material.dart';

/// Paleta de la app (la misma que la web): verde azulado de marca con acentos de amanecer.
/// Se lee con `context.colors` y cambia sola entre tema claro y oscuro.
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.page,
    required this.surface,
    required this.surface2,
    required this.field,
    required this.ink,
    required this.ink2,
    required this.muted,
    required this.grid,
    required this.line,
    required this.accent,
    required this.accentText,
    required this.accentInk,
    required this.brandFrom,
    required this.brandTo,
    required this.good,
    required this.warn,
    required this.bad,
    required this.goodSoft,
    required this.warnSoft,
    required this.badSoft,
    required this.goodInk,
    required this.warnInk,
    required this.badInk,
    required this.flowIn,
    required this.flowOut,
    required this.macroKcal,
    required this.macroProtein,
    required this.macroCarbs,
    required this.macroFat,
    required this.macroFiber,
  });

  final Color page, surface, surface2, field, ink, ink2, muted, grid, line;
  final Color accent, accentText, accentInk, brandFrom, brandTo;
  final Color good, warn, bad, goodSoft, warnSoft, badSoft, goodInk, warnInk, badInk;
  final Color flowIn, flowOut;
  final Color macroKcal, macroProtein, macroCarbs, macroFat, macroFiber;

  // Primitivos de la paleta
  static const tide950 = Color(0xFF05272B);
  static const tide900 = Color(0xFF0A4648);
  static const tide500 = Color(0xFF11796F);
  static const dawn200 = Color(0xFFFFE9B0);
  static const dawn400 = Color(0xFFFBBF5A);
  static const coral500 = Color(0xFFF97360);
  static const dusk950 = Color(0xFF082C36);
  static const dusk800 = Color(0xFF0D5A5C);
  static const dusk400 = Color(0xFFB9683C);
  static const night950 = Color(0xFF060B1F);
  static const night900 = Color(0xFF101B42);
  static const night800 = Color(0xFF17425C);
  static const mist = Color(0xFFF2FBF9);

  static const light = AppColors(
    page: Color(0xFFF2F6F5),
    surface: Color(0xFFFFFFFF),
    surface2: Color(0xFFE9F0EE),
    field: Color(0xFFF0F4F3),
    ink: Color(0xFF0B1B1C),
    ink2: Color(0xFF445957),
    muted: Color(0xFF5F716E),
    grid: Color(0xFFDDE7E4),
    line: Color(0x1A0B1B1C),
    accent: Color(0xFF0F766E),
    accentText: Color(0xFF0B5C56),
    accentInk: Color(0xFFFFFFFF),
    brandFrom: Color(0xFF0B5C56),
    brandTo: Color(0xFF0F8176),
    good: Color(0xFF17A34A),
    warn: Color(0xFFF5A524),
    bad: Color(0xFFE5484D),
    goodSoft: Color(0x2117A34A),
    warnSoft: Color(0x33F5A524),
    badSoft: Color(0x1FE5484D),
    goodInk: Color(0xFF0B6B2E),
    warnInk: Color(0xFF7A4D00),
    badInk: Color(0xFFB4232A),
    flowIn: Color(0xFF0F8176),
    flowOut: Color(0xFFF2743A),
    macroKcal: Color(0xFFEB6834),
    macroProtein: Color(0xFF008300),
    macroCarbs: Color(0xFF1BAF7A),
    macroFat: Color(0xFFE87BA4),
    macroFiber: Color(0xFF4A3AA7),
  );

  static const dark = AppColors(
    page: Color(0xFF071214),
    surface: Color(0xFF0E1C1F),
    surface2: Color(0xFF16292D),
    field: Color(0xFF132427),
    ink: Color(0xFFECF5F3),
    ink2: Color(0xFFA9BDBA),
    muted: Color(0xFF8AA09C),
    grid: Color(0xFF1C3236),
    line: Color(0x1AECF5F3),
    accent: Color(0xFF2DD4BF),
    accentText: Color(0xFF5EEAD4),
    accentInk: Color(0xFF04201D),
    brandFrom: Color(0xFF2DD4BF),
    brandTo: Color(0xFF5EEAD4),
    good: Color(0xFF17A34A),
    warn: Color(0xFFF5A524),
    bad: Color(0xFFE5484D),
    goodSoft: Color(0x2E22C55E),
    warnSoft: Color(0x2EF5A524),
    badSoft: Color(0x33E5484D),
    goodInk: Color(0xFF4ADE80),
    warnInk: Color(0xFFFBBF24),
    badInk: Color(0xFFFF8589),
    flowIn: Color(0xFF2DD4BF),
    flowOut: Color(0xFFFB8A6B),
    macroKcal: Color(0xFFD95926),
    macroProtein: Color(0xFF0CA30C),
    macroCarbs: Color(0xFF199E70),
    macroFat: Color(0xFFD55181),
    macroFiber: Color(0xFF9085E9),
  );

  LinearGradient get brandGradient =>
      LinearGradient(colors: [brandFrom, brandTo], begin: Alignment.topLeft, end: Alignment.bottomRight);

  @override
  AppColors copyWith() => this;

  @override
  AppColors lerp(covariant AppColors? other, double t) => t < 0.5 || other == null ? this : other;
}

extension AppColorsContext on BuildContext {
  AppColors get colors => Theme.of(this).extension<AppColors>()!;
}
