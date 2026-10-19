import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// Radios compartidos: controles, tarjetas y encabezado.
abstract final class Radii {
  static const control = 12.0;
  static const card = 20.0;
  static const hero = 28.0;
}

abstract final class AppTheme {
  static ThemeData light() => _build(AppColors.light, Brightness.light);
  static ThemeData dark() => _build(AppColors.dark, Brightness.dark);

  /// Títulos en Plus Jakarta Sans, texto en Inter (como en la web).
  static TextStyle display(TextStyle? base) => GoogleFonts.plusJakartaSans(textStyle: base);

  static TextStyle _heading(TextStyle? base, FontWeight weight) =>
      GoogleFonts.plusJakartaSans(textStyle: base, fontWeight: weight, letterSpacing: -0.3);

  static ThemeData _build(AppColors c, Brightness brightness) {
    final scheme = ColorScheme(
      brightness: brightness,
      primary: c.accent,
      onPrimary: c.accentInk,
      secondary: c.brandTo,
      onSecondary: c.accentInk,
      error: c.bad,
      onError: Colors.white,
      surface: c.surface,
      onSurface: c.ink,
      onSurfaceVariant: c.ink2,
      surfaceContainerLowest: c.page,
      surfaceContainerLow: c.surface,
      surfaceContainer: c.surface,
      surfaceContainerHigh: c.surface2,
      surfaceContainerHighest: c.surface2,
      outline: c.muted,
      outlineVariant: c.grid,
    );

    final base = ThemeData(useMaterial3: true, colorScheme: scheme, brightness: brightness);
    // Se usa la familia de Inter sobre el TextTheme de Flutter (los TextTheme de google_fonts 9 son de otro paquete).
    final TextTheme body = base.textTheme.apply(fontFamily: GoogleFonts.inter().fontFamily, bodyColor: c.ink, displayColor: c.ink);
    final TextTheme textTheme = body.copyWith(
      displaySmall: _heading(body.displaySmall, FontWeight.w800),
      headlineMedium: _heading(body.headlineMedium, FontWeight.w800),
      headlineSmall: _heading(body.headlineSmall, FontWeight.w800),
      titleLarge: _heading(body.titleLarge, FontWeight.w700),
      titleMedium: _heading(body.titleMedium, FontWeight.w700),
    );

    OutlineInputBorder border(Color color, [double width = 1]) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.control),
          borderSide: BorderSide(color: color, width: width),
        );

    return base.copyWith(
      scaffoldBackgroundColor: c.page,
      textTheme: textTheme,
      extensions: [c],
      appBarTheme: AppBarTheme(backgroundColor: c.page, foregroundColor: c.ink, elevation: 0, scrolledUnderElevation: 0),
      cardTheme: CardThemeData(
        color: c.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.card), side: BorderSide(color: c.line)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.field,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: border(c.line),
        enabledBorder: border(c.line),
        focusedBorder: border(c.accent, 2),
        errorBorder: border(c.bad),
        labelStyle: TextStyle(color: c.ink2),
        hintStyle: TextStyle(color: c.muted),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 50),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.control)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 44),
          side: BorderSide(color: c.line),
          foregroundColor: c.ink,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.control)),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: c.surface,
        selectedColor: c.accent,
        side: BorderSide(color: c.line),
        shape: const StadiumBorder(),
        labelStyle: TextStyle(color: c.ink2, fontWeight: FontWeight.w500),
        secondaryLabelStyle: TextStyle(color: c.accentInk, fontWeight: FontWeight.w600),
        checkmarkColor: c.accentInk,
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          backgroundColor: c.surface2,
          selectedBackgroundColor: c.surface,
          selectedForegroundColor: c.accentText,
          foregroundColor: c.ink2,
          side: BorderSide(color: c.line),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: c.surface,
        indicatorColor: c.accent.withValues(alpha: 0.14),
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (s) => TextStyle(
            fontSize: 12,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
            color: s.contains(WidgetState.selected) ? c.accentText : c.ink2,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (s) => IconThemeData(color: s.contains(WidgetState.selected) ? c.accent : c.ink2),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.hero))),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: c.accent,
        foregroundColor: c.accentInk,
        extendedTextStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      dividerTheme: DividerThemeData(color: c.grid, space: 1),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: c.accent),
    );
  }
}
