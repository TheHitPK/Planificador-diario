import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_shell.dart';

class PlanificacionApp extends StatelessWidget {
  const PlanificacionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Planificación diaria',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      locale: const Locale('es'),
      supportedLocales: const [Locale('es')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const _AuthGate(),
    );
  }
}

/// Pantalla según la sesión: cargando, acceso o la app.
class _AuthGate extends ConsumerWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(authProvider);
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: switch (state) {
        AuthLoading() => const Scaffold(key: ValueKey('loading'), body: Center(child: AppLogo(size: 64))),
        AuthAnon(:final reason) => LoginScreen(key: const ValueKey('login'), notice: reason),
        // key: al cambiar de usuario se descarta todo el estado del anterior.
        AuthAuthed(:final user) => HomeShell(key: ValueKey(user.id), user: user),
      },
    );
  }
}
