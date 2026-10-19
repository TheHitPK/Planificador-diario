import 'dart:convert';

import 'package:http/http.dart' as http;

/// Error de la API con un mensaje listo para mostrar.
class ApiException implements Exception {
  ApiException(this.status, this.message, {this.fieldErrors = const {}});

  /// 0 = no se pudo conectar.
  final int status;
  final String message;
  final Map<String, String> fieldErrors;

  /// Convierte una respuesta problem+json (RFC 9457) del backend.
  factory ApiException.fromResponse(http.Response res) {
    try {
      final body = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      final errors = (body['errors'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, '$v')) ?? {};
      final detail = body['detail'] as String?;
      final first = errors.entries.isEmpty ? null : errors.entries.first;
      final message = first != null ? '${detail ?? 'Datos inválidos'}: ${first.key} ${first.value}' : detail;
      return ApiException(res.statusCode, message ?? 'Error ${res.statusCode}', fieldErrors: errors);
    } catch (_) {
      return ApiException(res.statusCode, 'Error ${res.statusCode}');
    }
  }

  @override
  String toString() => message;
}

/// Mensaje para el usuario a partir de cualquier error.
String errorMessage(Object error) => error is ApiException ? error.message : 'Algo salió mal. Inténtalo de nuevo.';
