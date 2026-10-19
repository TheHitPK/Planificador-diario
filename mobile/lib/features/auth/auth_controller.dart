import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';

/// Una cuenta de empresa solo usa planificación, disciplinas y pendientes.
enum AccountType {
  personal('PERSONAL'),
  business('BUSINESS');

  const AccountType(this.api);
  final String api;

  static AccountType fromApi(String? v) => v == 'BUSINESS' ? AccountType.business : AccountType.personal;
}

class AppUser {
  const AppUser({required this.id, required this.email, required this.fullName, required this.accountType});

  final String id;
  final String email;
  final String fullName;
  final AccountType accountType;

  bool get isBusiness => accountType == AccountType.business;

  /// A una persona se la saluda por su primer nombre; a una empresa, por el nombre completo.
  String get greetName => isBusiness ? fullName.trim() : fullName.trim().split(RegExp(r'\s+')).first;

  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return (parts.first[0] + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
  }

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as String,
        email: j['email'] as String,
        fullName: j['fullName'] as String,
        accountType: AccountType.fromApi(j['accountType'] as String?),
      );
}

sealed class AuthState {
  const AuthState();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthAnon extends AuthState {
  const AuthAnon([this.reason]);
  final String? reason;
}

class AuthAuthed extends AuthState {
  const AuthAuthed(this.user);
  final AppUser user;
}

final authProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);

/// Usuario con sesión iniciada. Los datos de cada módulo dependen de él: al cambiar de usuario se recargan.
final currentUserProvider = Provider<AppUser?>((ref) {
  final state = ref.watch(authProvider);
  return state is AuthAuthed ? state.user : null;
});

class AuthController extends Notifier<AuthState> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  AuthState build() {
    _api.onSessionExpired = () => state = const AuthAnon('Tu sesión expiró. Inicia sesión de nuevo.');
    Future.microtask(_restore);
    return const AuthLoading();
  }

  Future<void> _restore() async {
    try {
      final user = await _api.restore();
      state = user == null ? const AuthAnon() : AuthAuthed(AppUser.fromJson(user));
    } catch (_) {
      state = const AuthAnon();
    }
  }

  Future<void> login(String email, String password) async {
    state = AuthAuthed(AppUser.fromJson(await _api.login(email, password)));
  }

  Future<void> register(String email, String password, String fullName, AccountType type) async {
    state = AuthAuthed(AppUser.fromJson(await _api.register(email, password, fullName, type.api)));
  }

  Future<void> logout() async {
    await _api.logout();
    state = const AuthAnon();
  }
}
