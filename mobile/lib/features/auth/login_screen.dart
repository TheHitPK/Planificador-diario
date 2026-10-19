import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';
import 'auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, this.notice});
  final String? notice;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  bool _register = false;
  bool _showPassword = false;
  bool _busy = false;
  AccountType _type = AccountType.personal;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final auth = ref.read(authProvider.notifier);
    try {
      if (_register) {
        await auth.register(_email.text.trim(), _password.text, _name.text.trim(), _type);
      } else {
        await auth.login(_email.text.trim(), _password.text);
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final text = Theme.of(context).textTheme;
    final isBusiness = _type == AccountType.business;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _Header()),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            sliver: SliverToBoxAdapter(
              child: AutofillGroup(
                child: Form(
                  key: _form,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        layoutBuilder: (current, previous) =>
                            Stack(alignment: Alignment.topLeft, children: [...previous, ?current]),
                        child: Column(
                          key: ValueKey(_register),
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_register ? 'Crea tu cuenta' : 'Inicia sesión', style: text.headlineSmall),
                            const SizedBox(height: 4),
                            Text(
                              _register ? 'Empieza a planificar tu día en un minuto.' : 'Continúa donde lo dejaste.',
                              style: text.bodyMedium?.copyWith(color: c.ink2),
                            ),
                          ],
                        ),
                      ),
                      if (widget.notice != null) ...[
                        const SizedBox(height: 12),
                        Text(widget.notice!, style: TextStyle(color: c.warnInk, fontWeight: FontWeight.w600)),
                      ],
                      const SizedBox(height: 20),
                      if (_register) ...[
                        Text('Tipo de cuenta', style: text.labelLarge?.copyWith(color: c.ink2)),
                        const SizedBox(height: 8),
                        SegmentedButton<AccountType>(
                          showSelectedIcon: false,
                          segments: const [
                            ButtonSegment(value: AccountType.personal, label: Text('Personal'), icon: Icon(Icons.person_outline)),
                            ButtonSegment(value: AccountType.business, label: Text('Empresa'), icon: Icon(Icons.apartment_outlined)),
                          ],
                          selected: {_type},
                          onSelectionChanged: (s) => setState(() => _type = s.first),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          isBusiness
                              ? 'Para gestionar las actividades diarias del negocio: plan, disciplinas y pendientes.'
                              : 'Incluye plan, disciplinas, pendientes, finanzas y nutrición.',
                          style: text.bodySmall?.copyWith(color: c.ink2),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _name,
                          decoration: InputDecoration(labelText: isBusiness ? 'Nombre de la empresa' : 'Nombre'),
                          textCapitalization: TextCapitalization.words,
                          autofillHints: [isBusiness ? AutofillHints.organizationName : AutofillHints.name],
                          textInputAction: TextInputAction.next,
                          validator: (v) => (v ?? '').trim().isEmpty ? 'Escribe el nombre.' : null,
                        ),
                        const SizedBox(height: 14),
                      ],
                      TextFormField(
                        controller: _email,
                        decoration: const InputDecoration(labelText: 'Email'),
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        textInputAction: TextInputAction.next,
                        validator: (v) => (v ?? '').contains('@') ? null : 'Escribe un email válido.',
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _password,
                        obscureText: !_showPassword,
                        decoration: InputDecoration(
                          labelText: 'Contraseña',
                          helperText: _register ? 'Mínimo 8 caracteres.' : null,
                          suffixIcon: IconButton(
                            tooltip: _showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña',
                            icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                            onPressed: () => setState(() => _showPassword = !_showPassword),
                          ),
                        ),
                        autofillHints: [_register ? AutofillHints.newPassword : AutofillHints.password],
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _submit(),
                        validator: (v) {
                          if ((v ?? '').isEmpty) return 'Escribe la contraseña.';
                          if (_register && v!.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
                          return null;
                        },
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(_error!, style: TextStyle(color: c.badInk, fontWeight: FontWeight.w600)),
                      ],
                      const SizedBox(height: 20),
                      SubmitButton(label: _register ? 'Crear cuenta' : 'Entrar', busy: _busy, onPressed: _submit),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => setState(() {
                          _register = !_register;
                          _error = null;
                        }),
                        child: Text(_register ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final top = MediaQuery.paddingOf(context).top;
    return Container(
      padding: EdgeInsets.fromLTRB(24, top + 28, 24, 28),
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(Radii.hero)),
        gradient: LinearGradient(
          colors: [AppColors.tide950, AppColors.tide900, AppColors.tide500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: -30,
            top: -30,
            child: Container(
              width: 110,
              height: 110,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(colors: [AppColors.dawn200, AppColors.dawn400, AppColors.coral500], center: Alignment(-0.3, -0.4)),
                boxShadow: [BoxShadow(color: Color(0x73FBBF5A), blurRadius: 50, spreadRadius: 8)],
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AppLogo(size: 44),
              const SizedBox(height: 18),
              Text(
                'Tu día, en orden.\nTu progreso, a la vista.',
                style: text.headlineMedium?.copyWith(color: AppColors.mist, height: 1.15),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Marca de la app: un check sobre un sol naciente.
class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.size = 32});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.28),
        gradient: const LinearGradient(colors: [Color(0xFF0B5C56), Color(0xFF14A08F)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        boxShadow: const [BoxShadow(color: Color(0x660F766E), blurRadius: 14, offset: Offset(0, 6))],
      ),
      child: Stack(
        children: [
          Positioned(
            right: size * 0.14,
            top: size * 0.14,
            child: Container(
              width: size * 0.28,
              height: size * 0.28,
              decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.dawn400),
            ),
          ),
          Center(child: Icon(Icons.check_rounded, color: Colors.white, size: size * 0.62)),
        ],
      ),
    );
  }
}
