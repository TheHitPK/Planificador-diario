import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets.dart';
import '../auth/auth_controller.dart';

/// Avatar con las iniciales; abre la cuenta (exportar informe y cerrar sesión).
class ProfileButton extends ConsumerWidget {
  const ProfileButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    if (user == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: IconButton(
        tooltip: 'Tu cuenta',
        onPressed: () => showModalBottomSheet<void>(context: context, builder: (_) => const _AccountSheet()),
        icon: CircleAvatar(
          radius: 17,
          backgroundColor: Colors.white.withValues(alpha: 0.18),
          child: Text(user.initials, style: const TextStyle(color: AppColors.mist, fontWeight: FontWeight.w700, fontSize: 13)),
        ),
      ),
    );
  }
}

class _AccountSheet extends ConsumerStatefulWidget {
  const _AccountSheet();

  @override
  ConsumerState<_AccountSheet> createState() => _AccountSheetState();
}

class _AccountSheetState extends ConsumerState<_AccountSheet> {
  bool _exporting = false;

  /// Descarga el informe en Excel y abre el menú de compartir del sistema (guardar, enviar por correo…).
  Future<void> _exportExcel() async {
    setState(() => _exporting = true);
    try {
      final bytes = await ref.read(apiClientProvider).download('/export/excel');
      final name = 'planificacion-informe-${Fmt.iso(Fmt.today())}.xlsx';
      const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      final XFile file;
      if (kIsWeb) {
        file = XFile.fromData(bytes, name: name, mimeType: mime);
      } else {
        final path = '${(await getTemporaryDirectory()).path}/$name';
        await File(path).writeAsBytes(bytes);
        file = XFile(path, mimeType: mime);
      }
      await SharePlus.instance.share(ShareParams(files: [file], fileNameOverrides: [name], subject: 'Informe de Planificación diaria'));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    if (user == null) return const SizedBox.shrink();
    final c = context.colors;
    final text = Theme.of(context).textTheme;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: c.accent.withValues(alpha: 0.14),
                  child: Text(user.initials, style: TextStyle(color: c.accentText, fontWeight: FontWeight.w800)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.fullName, style: text.titleMedium),
                      Text(user.email, style: text.bodySmall?.copyWith(color: c.ink2)),
                      const SizedBox(height: 6),
                      Tag(
                        user.isBusiness ? 'Cuenta de empresa' : 'Cuenta personal',
                        background: c.accent.withValues(alpha: 0.12),
                        foreground: c.accentText,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.table_chart_outlined, color: c.accent),
              title: const Text('Exportar informe en Excel'),
              subtitle: const Text('Una hoja por módulo, con resumen y gráficos'),
              trailing: _exporting ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4)) : null,
              onTap: _exporting ? null : _exportExcel,
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.logout, color: c.badInk),
              title: Text('Cerrar sesión', style: TextStyle(color: c.badInk, fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.pop(context);
                ref.read(authProvider.notifier).logout();
              },
            ),
          ],
        ),
      ),
    );
  }
}
