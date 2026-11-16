package com.planificacion.api.finance;

import com.planificacion.api.config.AppProperties;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;

/**
 * Tasas oficiales BCV vía ve.dolarapi.com (API pública, no oficial del BCV).
 * Aislado en su propia clase para poder simularlo en tests y cambiar de proveedor.
 */
@Component
public class BcvRateClient {

    private final RestClient http;

    public BcvRateClient(AppProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.http = RestClient.builder().baseUrl(props.rates().baseUrl()).requestFactory(factory).build();
    }

    public record BcvRates(LocalDate date, BigDecimal usd, BigDecimal eur) {
    }

    /** Respuesta de la API: { "promedio": 855.66, "fechaActualizacion": "2026-09-25T00:00:00-04:00", ... } */
    record ApiRate(BigDecimal promedio, String fechaActualizacion) {
    }

    public BcvRates fetch() {
        ApiRate usd = get("/v1/dolares/oficial");
        ApiRate eur = get("/v1/euros/oficial");
        // La fecha viene en hora de Venezuela: los 10 primeros caracteres son la fecha local.
        LocalDate date = LocalDate.parse(usd.fechaActualizacion().substring(0, 10));
        return new BcvRates(date, usd.promedio(), eur.promedio());
    }

    private ApiRate get(String path) {
        ApiRate rate = http.get().uri(path).retrieve().body(ApiRate.class);
        if (rate == null || rate.promedio() == null || rate.promedio().signum() <= 0 || rate.fechaActualizacion() == null) {
            throw new IllegalStateException("Respuesta de tasa inválida en " + path);
        }
        return rate;
    }
}
