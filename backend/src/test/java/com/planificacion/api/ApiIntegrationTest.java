package com.planificacion.api;

import com.jayway.jsonpath.JsonPath;
import com.planificacion.api.finance.BcvRateClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Recorre la API completa contra un Postgres real (Testcontainers).
 * Se salta automáticamente si Docker no está disponible.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class ApiIntegrationTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("America/Caracas"));

    @Autowired
    MockMvc mvc;

    /** No llamamos a la API real de tasas en los tests. */
    @MockitoBean
    BcvRateClient bcv;

    // ------------------------------------------------------------------ auth

    @Test
    void registroLoginYPerfil() throws Exception {
        String email = uniqueEmail();
        String token = register(email);

        call(HttpMethod.GET, "/api/users/me", token, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));

        // Sin token → 401
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
        // Token manipulado → 401
        call(HttpMethod.GET, "/api/users/me", token + "x", null).andExpect(status().isUnauthorized());
        // Email duplicado (sin importar mayúsculas) → 409
        call(HttpMethod.POST, "/api/auth/register", null, registerBody(email.toUpperCase()))
                .andExpect(status().isConflict());
        // Contraseña incorrecta → 401 con mensaje genérico
        call(HttpMethod.POST, "/api/auth/login", null, """
                {"email":"%s","password":"incorrecta"}""".formatted(email))
                .andExpect(status().isUnauthorized());
        // Datos inválidos → 400 con detalle por campo
        call(HttpMethod.POST, "/api/auth/register", null, """
                {"email":"no-es-email","password":"123","fullName":""}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email", notNullValue()))
                .andExpect(jsonPath("$.errors.password", notNullValue()));
    }

    @Test
    void refreshTokenRotaYDetectaReutilizacion() throws Exception {
        String email = uniqueEmail();
        String body = call(HttpMethod.POST, "/api/auth/register", null, registerBody(email))
                .andReturn().getResponse().getContentAsString();
        String refresh1 = JsonPath.read(body, "$.refreshToken");

        String rotated = call(HttpMethod.POST, "/api/auth/refresh", null, refreshBody(refresh1))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String refresh2 = JsonPath.read(rotated, "$.refreshToken");

        // Reutilizar el token viejo → 401 y se revocan todas las sesiones, incluida la nueva
        call(HttpMethod.POST, "/api/auth/refresh", null, refreshBody(refresh1)).andExpect(status().isUnauthorized());
        call(HttpMethod.POST, "/api/auth/refresh", null, refreshBody(refresh2)).andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------- pendientes

    @Test
    void pendientesCrudYAislamientoEntreUsuarios() throws Exception {
        String ana = register(uniqueEmail());
        String beto = register(uniqueEmail());

        String id = idOf(call(HttpMethod.POST, "/api/tasks", ana, """
                {"name":"Reparar licuadora","priority":"HIGH","deadline":"%s"}""".formatted(TODAY.plusDays(3)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.daysLeft").value(3)));

        // Beto no puede ver ni borrar el pendiente de Ana
        call(HttpMethod.GET, "/api/tasks/" + id, beto, null).andExpect(status().isNotFound());
        call(HttpMethod.DELETE, "/api/tasks/" + id, beto, null).andExpect(status().isNotFound());
        call(HttpMethod.GET, "/api/tasks", beto, null).andExpect(jsonPath("$", hasSize(0)));

        call(HttpMethod.PATCH, "/api/tasks/" + id + "/status", ana, """
                {"status":"COMPLETED"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedAt", notNullValue()));

        // Por defecto solo lista activas; completadas con filtro
        call(HttpMethod.GET, "/api/tasks", ana, null).andExpect(jsonPath("$", hasSize(0)));
        call(HttpMethod.GET, "/api/tasks?status=COMPLETED", ana, null).andExpect(jsonPath("$", hasSize(1)));

        call(HttpMethod.DELETE, "/api/tasks/" + id, ana, null).andExpect(status().isNoContent());
    }

    // --------------------------------------------------- disciplinas y planificación

    @Test
    void marcarDisciplinasYVerElSemaforo() throws Exception {
        String token = register(uniqueEmail());
        String leer = idOf(call(HttpMethod.POST, "/api/disciplines", token, """
                {"name":"Leer 30 min","icon":"📚"}""").andExpect(status().isCreated()));
        String gym = idOf(call(HttpMethod.POST, "/api/disciplines", token, """
                {"name":"Gym","icon":"🏋️"}""").andExpect(jsonPath("$.position").value(1)));

        call(HttpMethod.PUT, "/api/planning/%s/disciplines/%s".formatted(TODAY, leer), token, null)
                .andExpect(status().isNoContent());
        // Idempotente
        call(HttpMethod.PUT, "/api/planning/%s/disciplines/%s".formatted(TODAY, leer), token, null)
                .andExpect(status().isNoContent());

        call(HttpMethod.GET, "/api/planning?from=%s&to=%s".formatted(TODAY, TODAY), token, null)
                .andExpect(jsonPath("$.days[0].done").value(1))
                .andExpect(jsonPath("$.days[0].total").value(2))
                .andExpect(jsonPath("$.days[0].level").value("YELLOW"));

        call(HttpMethod.PUT, "/api/planning/%s/disciplines/%s".formatted(TODAY, gym), token, null);
        call(HttpMethod.GET, "/api/planning?from=%s&to=%s".formatted(TODAY, TODAY), token, null)
                .andExpect(jsonPath("$.summary.level").value("GREEN"));

        // Días futuros no se pueden marcar
        call(HttpMethod.PUT, "/api/planning/%s/disciplines/%s".formatted(TODAY.plusDays(1), leer), token, null)
                .andExpect(status().isUnprocessableContent());
    }

    // --------------------------------------------------------------- finanzas

    @Test
    void finanzasSaldosYCambiosDeDivisas() throws Exception {
        String token = register(uniqueEmail());
        call(HttpMethod.PUT, "/api/finance/rates/manual", token, """
                {"date":"%s","usd":855.66,"eur":972.65}""".formatted(TODAY)).andExpect(status().isOk());

        call(HttpMethod.POST, "/api/finance/movements", token, """
                {"kind":"INCOME","date":"%s","account":"ZELLE","amount":500,"incomeType":"SALARY"}"""
                .formatted(TODAY)).andExpect(status().isCreated());

        // Vendo $100 de Zelle y recibo Bs 85.000 por Pago Móvil
        String exchange = call(HttpMethod.POST, "/api/finance/exchanges", token, """
                {"date":"%s","reason":"CURRENCY_SALE","fromAccount":"ZELLE","fromAmount":100,
                 "toAccount":"PAGO_MOVIL","toAmount":85000}""".formatted(TODAY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.impliedRate").value(850.0))
                .andReturn().getResponse().getContentAsString();
        String outId = JsonPath.read(exchange, "$.out.id");

        call(HttpMethod.POST, "/api/finance/movements", token, """
                {"kind":"EXPENSE","date":"%s","account":"PAGO_MOVIL","amount":20000,
                 "expenseReason":"PURCHASE","expenseClass":"EXPENSE","category":"Comida"}"""
                .formatted(TODAY)).andExpect(status().isCreated());

        // Un cambio no se registra como salida normal
        call(HttpMethod.POST, "/api/finance/movements", token, """
                {"kind":"EXPENSE","date":"%s","account":"ZELLE","amount":5,"expenseReason":"EXCHANGE",
                 "expenseClass":"EXPENSE"}""".formatted(TODAY))
                .andExpect(status().isUnprocessableContent());

        call(HttpMethod.GET, "/api/finance/summary", token, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accounts[?(@.account=='ZELLE')].balance").value(hasItem(400.0)))
                .andExpect(jsonPath("$.accounts[?(@.account=='PAGO_MOVIL')].balance").value(hasItem(65000.0)))
                // Los cambios no cuentan como ingreso ni gasto
                .andExpect(jsonPath("$.month.income").value(500.0))
                .andExpect(jsonPath("$.month.expense").value(23.37))
                .andExpect(jsonPath("$.totals.usd").value(475.96));

        // Borrar un lado del cambio borra los dos
        call(HttpMethod.DELETE, "/api/finance/movements/" + outId, token, null).andExpect(status().isNoContent());
        call(HttpMethod.GET, "/api/finance/summary", token, null)
                .andExpect(jsonPath("$.accounts[?(@.account=='ZELLE')].balance").value(hasItem(500.0)))
                .andExpect(jsonPath("$.accounts[?(@.account=='PAGO_MOVIL')].balance").value(hasItem(-20000.0)));
    }

    @Test
    void actualizaTasaBcvDesdeElProveedor() throws Exception {
        String token = register(uniqueEmail());
        LocalDate day = TODAY.minusYears(1); // fecha aislada para no chocar con otros tests
        when(bcv.fetch()).thenReturn(new BcvRateClient.BcvRates(day, new BigDecimal("100.5"), new BigDecimal("110.25")));

        call(HttpMethod.POST, "/api/finance/rates/refresh", token, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("BCV"));
        call(HttpMethod.GET, "/api/finance/rates?date=" + day, token, null)
                .andExpect(jsonPath("$.usd").value(100.5))
                .andExpect(jsonPath("$.eur").value(110.25));
    }

    // --------------------------------------------------------------- nutrición

    @Test
    void diarioDeComidasYPlanNutricional() throws Exception {
        String token = register(uniqueEmail());

        String foods = call(HttpMethod.GET, "/api/nutrition/foods?q=arroz", token, null)
                .andExpect(jsonPath("$[0].global").value(true))
                .andReturn().getResponse().getContentAsString();
        String arrozId = JsonPath.read(foods, "$[0].id");

        call(HttpMethod.POST, "/api/nutrition/diary/entries", token, """
                {"date":"%s","meal":"LUNCH","foodId":"%s","amount":200}""".formatted(TODAY, arrozId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.macros.kcal").value(260.0));
        call(HttpMethod.POST, "/api/nutrition/diary/entries", token, """
                {"date":"%s","meal":"SNACK","name":"Empanada","protein":8,"carbs":30,"fat":12}""".formatted(TODAY))
                .andExpect(jsonPath("$.macros.kcal").value(260.0)); // 8·4 + 30·4 + 12·9

        call(HttpMethod.GET, "/api/nutrition/diary?date=" + TODAY, token, null)
                .andExpect(jsonPath("$.consumed.kcal").value(520.0))
                .andExpect(jsonPath("$.targets.kcal").value(2000))
                .andExpect(jsonPath("$.percent.kcal").value(26));

        // El catálogo global no se puede editar
        call(HttpMethod.DELETE, "/api/nutrition/foods/" + arrozId, token, null)
                .andExpect(status().isUnprocessableContent());

        // Sin perfil ni peso no hay plan
        call(HttpMethod.GET, "/api/nutrition/plan", token, null).andExpect(status().isUnprocessableContent());

        call(HttpMethod.PUT, "/api/nutrition/body", token, """
                {"date":"%s","weightKg":78.4,"bodyFatPct":18.6}""".formatted(TODAY))
                .andExpect(jsonPath("$.leanMassKg").value(63.8));
        call(HttpMethod.PUT, "/api/nutrition/profile", token, """
                {"sex":"MALE","birthDate":"%s","heightCm":176,"activityLevel":"MODERATE","goal":"RECOMPOSITION"}"""
                .formatted(TODAY.minusYears(27).minusDays(1)))
                .andExpect(jsonPath("$.complete").value(true));

        call(HttpMethod.POST, "/api/nutrition/plan/apply", token, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targets.kcal").value(2440))
                .andExpect(jsonPath("$.targets.protein").value(172));

        call(HttpMethod.GET, "/api/nutrition/body", token, null)
                .andExpect(jsonPath("$.bmi").value(25.3));
    }

    // ---------------------------------------------------------------- helpers

    private ResultActions call(HttpMethod method, String url, String token, String json) throws Exception {
        MockHttpServletRequestBuilder req = request(method, url);
        if (token != null) req.header("Authorization", "Bearer " + token);
        if (json != null) req.contentType(MediaType.APPLICATION_JSON).content(json);
        return mvc.perform(req);
    }

    private String register(String email) throws Exception {
        String body = call(HttpMethod.POST, "/api/auth/register", null, registerBody(email))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private static String idOf(ResultActions result) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.id");
    }

    private static String registerBody(String email) {
        return """
                {"email":"%s","password":"secreta123","fullName":"Prueba"}""".formatted(email);
    }

    private static String refreshBody(String token) {
        return """
                {"refreshToken":"%s"}""".formatted(token);
    }

    private static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@test.com";
    }
}
