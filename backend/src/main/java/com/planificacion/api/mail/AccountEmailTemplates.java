package com.planificacion.api.mail;

import org.springframework.web.util.HtmlUtils;

import java.time.Duration;

/** Correos de la cuenta, en HTML sencillo (con estilos en línea, que es lo que soportan los clientes de correo) y texto plano. */
public final class AccountEmailTemplates {

    private static final String APP = "Planificación diaria";

    private AccountEmailTemplates() {
    }

    public static EmailMessage verifyEmail(String to, String name, String link, Duration ttl) {
        return build(to, name,
                "Confirma tu correo · " + APP,
                "Confirma tu correo",
                "Gracias por registrarte. Para activar tu cuenta, confirma que este correo es tuyo.",
                "Confirmar correo",
                link,
                "El enlace vence en " + describe(ttl) + ". Si no creaste una cuenta, ignora este mensaje.");
    }

    public static EmailMessage resetPassword(String to, String name, String link, Duration ttl) {
        return build(to, name,
                "Restablece tu contraseña · " + APP,
                "Restablece tu contraseña",
                "Recibimos una solicitud para cambiar la contraseña de tu cuenta.",
                "Elegir nueva contraseña",
                link,
                "El enlace vence en " + describe(ttl) + " y solo se puede usar una vez. "
                        + "Si no lo pediste tú, ignora este mensaje: tu contraseña no cambiará.");
    }

    private static EmailMessage build(String to, String name, String subject, String title, String intro,
                                      String action, String link, String footer) {
        String greeting = "Hola, " + name + ":";
        String text = """
                %s

                %s

                %s:
                %s

                %s
                """.formatted(greeting, intro, action, link, footer);

        String html = """
                <!doctype html>
                <html lang="es">
                <body style="margin:0;padding:24px;background:#f2f5f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#13282a">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                    <tr><td align="center">
                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
                        <tr><td>
                          <p style="margin:0 0 20px;font-size:14px;font-weight:700;color:#0f6b6e">%s</p>
                          <h1 style="margin:0 0 16px;font-size:22px">%s</h1>
                          <p style="margin:0 0 8px;font-size:15px;line-height:1.5">%s</p>
                          <p style="margin:0 0 24px;font-size:15px;line-height:1.5">%s</p>
                          <a href="%s" style="display:inline-block;background:#0f6b6e;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">%s</a>
                          <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#55696b">%s</p>
                          <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#55696b;word-break:break-all">
                            Si el botón no funciona, copia este enlace en tu navegador:<br>%s
                          </p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(APP, esc(title), esc(greeting), esc(intro), esc(link), esc(action), esc(footer), esc(link));

        return new EmailMessage(to, name, subject, html, text);
    }

    private static String esc(String s) {
        return HtmlUtils.htmlEscape(s);
    }

    private static String describe(Duration ttl) {
        long hours = ttl.toHours();
        if (hours >= 1 && ttl.equals(Duration.ofHours(hours))) return hours == 1 ? "1 hora" : hours + " horas";
        long minutes = ttl.toMinutes();
        return minutes == 1 ? "1 minuto" : minutes + " minutos";
    }
}
