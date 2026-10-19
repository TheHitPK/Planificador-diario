import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../disciplines/disciplines_screen.dart';
import '../finance/finance_screen.dart';
import '../nutrition/nutrition_screen.dart';
import '../planning/planning_screen.dart';
import '../tasks/tasks_data.dart';
import '../tasks/tasks_screen.dart';

enum _Module { plan, disciplines, tasks, finance, nutrition }

/// Navegación principal. Una cuenta de empresa solo tiene plan, disciplinas y pendientes.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.user});
  final AppUser user;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  _Module _current = _Module.plan;

  List<_Module> get _modules => widget.user.isBusiness
      ? const [_Module.plan, _Module.disciplines, _Module.tasks]
      : _Module.values;

  @override
  Widget build(BuildContext context) {
    final modules = _modules;
    final open = ref.watch(openTasksCountProvider);
    final index = modules.indexOf(_current).clamp(0, modules.length - 1);

    Widget screen(_Module m) => switch (m) {
          _Module.plan => PlanningScreen(onAddDisciplines: () => setState(() => _current = _Module.disciplines)),
          _Module.disciplines => const DisciplinesScreen(),
          _Module.tasks => const TasksScreen(),
          _Module.finance => const FinanceScreen(),
          _Module.nutrition => const NutritionScreen(),
        };

    return Scaffold(
      // IndexedStack conserva el scroll y el estado de cada módulo al cambiar de pestaña.
      body: IndexedStack(index: index, children: [for (final m in modules) screen(m)]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => _current = modules[i]),
        destinations: [
          for (final m in modules)
            switch (m) {
              _Module.plan => const NavigationDestination(
                  icon: Icon(Icons.event_available_outlined),
                  selectedIcon: Icon(Icons.event_available),
                  label: 'Plan',
                ),
              _Module.disciplines => const NavigationDestination(
                  icon: Icon(Icons.track_changes_outlined),
                  selectedIcon: Icon(Icons.track_changes),
                  label: 'Disciplinas',
                ),
              _Module.tasks => NavigationDestination(
                  icon: Badge(isLabelVisible: open > 0, label: Text('$open'), child: const Icon(Icons.checklist_outlined)),
                  selectedIcon: Badge(isLabelVisible: open > 0, label: Text('$open'), child: const Icon(Icons.checklist)),
                  label: 'Pendientes',
                ),
              _Module.finance => const NavigationDestination(
                  icon: Icon(Icons.account_balance_wallet_outlined),
                  selectedIcon: Icon(Icons.account_balance_wallet),
                  label: 'Finanzas',
                ),
              _Module.nutrition => const NavigationDestination(
                  icon: Icon(Icons.restaurant_outlined),
                  selectedIcon: Icon(Icons.restaurant),
                  label: 'Nutrición',
                ),
            },
        ],
      ),
    );
  }
}
