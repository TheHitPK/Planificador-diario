import 'package:flutter_test/flutter_test.dart';
import 'package:planificacion_diaria/core/format.dart';
import 'package:planificacion_diaria/features/auth/auth_controller.dart';
import 'package:planificacion_diaria/features/planning/planning_data.dart';
import 'package:planificacion_diaria/shared/widgets.dart';

void main() {
  group('Fmt.parseAmount', () {
    test('acepta coma decimal y separadores de miles', () {
      expect(Fmt.parseAmount('12,5'), 12.5);
      expect(Fmt.parseAmount('1.115,00'), 1115);
      expect(Fmt.parseAmount('78.4'), 78.4);
      expect(Fmt.parseAmount('  '), isNull);
      expect(Fmt.parseAmount('abc'), isNull);
    });
  });

  test('fechas en formato de la API', () {
    final d = DateTime(2026, 10, 5);
    expect(Fmt.iso(d), '2026-10-05');
    expect(Fmt.parseIso('2026-10-05'), d);
    expect(Fmt.startOfWeek(DateTime(2026, 10, 8)), d); // jueves → lunes
    expect(Fmt.longDate(d), 'Lunes, 5 de octubre');
  });

  test('semáforo: verde todo, amarillo desde 40 %, rojo por debajo', () {
    expect(Level.fromRatio(1), Level.green);
    expect(Level.fromRatio(0.4), Level.yellow);
    expect(Level.fromRatio(0.39), Level.red);
    expect(Level.fromRatio(null), Level.none);
  });

  test('marcar una disciplina recalcula el día', () {
    final day = PlanningDay(date: DateTime(2026, 10, 5), completed: const {'a'}, done: 1, total: 2, level: Level.yellow);
    final both = day.toggled('b');
    expect(both.done, 2);
    expect(both.level, Level.green);
    expect(both.toggled('a').completed, {'b'});
  });

  test('a una empresa se la saluda con el nombre completo', () {
    AppUser user(String name, AccountType type) => AppUser(id: '1', email: 'x@y.z', fullName: name, accountType: type);
    expect(user('David Álvarez', AccountType.personal).greetName, 'David');
    expect(user('Panadería La Espiga', AccountType.business).greetName, 'Panadería La Espiga');
    expect(user('David Álvarez', AccountType.personal).initials, 'DÁ');
  });
}
