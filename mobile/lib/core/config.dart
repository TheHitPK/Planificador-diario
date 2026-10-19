import 'package:flutter/foundation.dart';

/// Configuración de la app.
///
/// La URL de la API se cambia al compilar: `flutter run --dart-define=API_URL=http://192.168.1.50:8080/api`
/// (hace falta en un teléfono físico: usa la IP del PC en la red local).
abstract final class AppConfig {
  static const _apiFromEnv = String.fromEnvironment('API_URL');

  static String get apiBaseUrl {
    if (_apiFromEnv.isNotEmpty) return _apiFromEnv;
    // El emulador de Android ve el PC en 10.0.2.2; el simulador de iOS y la web, en localhost.
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:8080/api';
    return 'http://localhost:8080/api';
  }
}
