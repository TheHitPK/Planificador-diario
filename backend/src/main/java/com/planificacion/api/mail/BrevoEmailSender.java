package com.planificacion.api.mail;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

/**
 * Envío por la API HTTP de Brevo (https://developers.brevo.com/reference/sendtransacemail).
 * Se usa HTTP y no SMTP porque algunos hostings gratuitos bloquean los puertos SMTP.
 */
public class BrevoEmailSender implements EmailSender {

    private final RestClient http;
    private final Contact sender;

    public BrevoEmailSender(String apiKey, String fromEmail, String fromName) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.http = RestClient.builder()
                .baseUrl("https://api.brevo.com/v3")
                .defaultHeader("api-key", apiKey)
                .requestFactory(factory)
                .build();
        this.sender = new Contact(fromEmail, fromName);
    }

    record Contact(String email, String name) {
    }

    record SendRequest(Contact sender, List<Contact> to, String subject, String htmlContent, String textContent) {
    }

    @Override
    public void send(EmailMessage m) {
        http.post()
                .uri("/smtp/email")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SendRequest(sender, List.of(new Contact(m.to(), m.toName())), m.subject(), m.html(), m.text()))
                .retrieve()
                .toBodilessEntity();
    }
}
