import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config.dart';
import 'api_exception.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient();
  ref.onDispose(client.close);
  return client;
});

/// Cliente HTTP de la API.
/// - El access token (15 min) vive solo en memoria.
/// - El refresh token se guarda en el almacenamiento seguro del sistema (Keychain en iOS, Keystore en Android).
/// - Si una petición devuelve 401, se renueva la sesión una vez y se reintenta.
class ApiClient {
  ApiClient({http.Client? httpClient, FlutterSecureStorage? storage, String? baseUrl})
      : _http = httpClient ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage(),
        _baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  static const _refreshKey = 'pd.auth.refresh';
  static const _timeout = Duration(seconds: 20);

  final http.Client _http;
  final FlutterSecureStorage _storage;
  final String _baseUrl;

  String? _accessToken;
  Future<bool>? _refreshing;

  /// Se llama cuando la sesión no se puede renovar (el usuario debe volver a entrar).
  void Function()? onSessionExpired;

  Future<dynamic> get(String path) => _request('GET', path);
  Future<dynamic> post(String path, [Object? body]) => _request('POST', path, body);
  Future<dynamic> put(String path, [Object? body]) => _request('PUT', path, body);
  Future<dynamic> patch(String path, [Object? body]) => _request('PATCH', path, body);
  Future<dynamic> delete(String path) => _request('DELETE', path);

  /// Descarga un archivo generado por la API (p. ej. el informe en Excel).
  Future<Uint8List> download(String path) async {
    final res = await _authorized('GET', path);
    return res.bodyBytes;
  }

  // ------------------------------------------------------------------ sesión

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _request('POST', '/auth/login', {'email': email, 'password': password}) as Map<String, dynamic>;
    await _saveSession(res);
    return res['user'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> register(String email, String password, String fullName, String accountType) async {
    final res = await _request('POST', '/auth/register', {
      'email': email,
      'password': password,
      'fullName': fullName,
      'accountType': accountType,
    }) as Map<String, dynamic>;
    await _saveSession(res);
    return res['user'] as Map<String, dynamic>;
  }

  /// Recupera la sesión al abrir la app, si hay refresh token guardado.
  Future<Map<String, dynamic>?> restore() async {
    if (await _readRefresh() == null || !await refreshSession()) return null;
    return await get('/users/me') as Map<String, dynamic>;
  }

  Future<void> logout() async {
    final token = await _readRefresh();
    await _clearSession();
    if (token != null) {
      try {
        await _send('POST', '/auth/logout', {'refreshToken': token});
      } catch (_) {
        // Sin conexión: la sesión ya se borró en el teléfono.
      }
    }
  }

  /// Varias peticiones simultáneas comparten el mismo intento de renovación.
  Future<bool> refreshSession() {
    return _refreshing ??= () async {
      try {
        final token = await _readRefresh();
        if (token == null) return false;
        final res = await _send('POST', '/auth/refresh', {'refreshToken': token});
        if (res.statusCode != 200) {
          await _clearSession();
          return false;
        }
        await _saveSession(jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>);
        return true;
      } finally {
        _refreshing = null;
      }
    }();
  }

  void close() => _http.close();

  // ---------------------------------------------------------------- interno

  Future<dynamic> _request(String method, String path, [Object? body]) async {
    final res = await _authorized(method, path, body);
    if (res.statusCode == 204 || res.bodyBytes.isEmpty) return null;
    return jsonDecode(utf8.decode(res.bodyBytes));
  }

  Future<http.Response> _authorized(String method, String path, [Object? body]) async {
    final isAuth = path.startsWith('/auth/');
    var res = await _send(method, path, body);
    if (res.statusCode == 401 && !isAuth && await _readRefresh() != null && await refreshSession()) {
      res = await _send(method, path, body);
    }
    if (res.statusCode == 401 && !isAuth) {
      await _clearSession();
      onSessionExpired?.call();
      throw ApiException(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
    }
    if (res.statusCode >= 400) throw ApiException.fromResponse(res);
    return res;
  }

  Future<http.Response> _send(String method, String path, [Object? body]) async {
    final request = http.Request(method, Uri.parse('$_baseUrl$path'));
    if (_accessToken != null) request.headers['Authorization'] = 'Bearer $_accessToken';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    try {
      final streamed = await _http.send(request).timeout(_timeout);
      return await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw ApiException(0, 'El servidor tardó demasiado en responder.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(0, 'No se pudo conectar con el servidor. ¿Está encendido el backend?');
    }
  }

  Future<void> _saveSession(Map<String, dynamic> res) async {
    _accessToken = res['accessToken'] as String?;
    await _storage.write(key: _refreshKey, value: res['refreshToken'] as String?);
  }

  Future<void> _clearSession() async {
    _accessToken = null;
    await _storage.delete(key: _refreshKey);
  }

  Future<String?> _readRefresh() async {
    try {
      return await _storage.read(key: _refreshKey);
    } catch (_) {
      return null;
    }
  }
}
