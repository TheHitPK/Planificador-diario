package com.planificacion.api;

import com.jayway.jsonpath.JsonPath;
import com.planificacion.api.finance.BcvRateClient;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
    void cuentaDeEmpresaSoloTienePlanificacionYPendientes() throws Exception {
        // Sin indicar el tipo, la cuenta es personal y ve todos los módulos
        String personal = register(uniqueEmail());
        call(HttpMethod.GET, "/api/users/me", personal, null).andExpect(jsonPath("$.accountType").value("PERSONAL"));
        call(HttpMethod.GET, "/api/finance/summary", personal, null).andExpect(status().isOk());

        String body = call(HttpMethod.POST, "/api/auth/register", null, """
                {"email":"%s","password":"secreta123","fullName":"Acme C.A.","accountType":"BUSINESS"}"""
                .formatted(uniqueEmail()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.accountType").value("BUSINESS"))
                .andReturn().getResponse().getContentAsString();
        String empresa = JsonPath.read(body, "$.accessToken");

        call(HttpMethod.GET, "/api/disciplines", empresa, null).andExpect(status().isOk());
        call(HttpMethod.GET, "/api/tasks", empresa, null).andExpect(status().isOk());
        call(HttpMethod.GET, "/api/finance/summary", empresa, null).andExpect(status().isForbidden());
        call(HttpMethod.GET, "/api/nutrition/profile", empresa, null).andExpect(status().isForbidden());

        // Tipo desconocido → 400
        call(HttpMethod.POST, "/api/auth/register", null, """
                {"email":"%s","password":"secreta123","fullName":"X","accountType":"OTRO"}""".formatted(uniqueEmail()))
                .andExpect(status().isBadRequest());
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

    // -------------------------------------------------------------- importación

    @Test
    void importaElRespaldoDelFrontend() throws Exception {
        String token = register(uniqueEmail());
        String yesterday = TODAY.minusDays(1).toString();
        String backup = """
                {"app":"planificacion-diaria","version":3,"exportedAt":"2026-09-30T12:00:00Z","startISO":"%1$s",
                 "activities":[{"id":"a1","icon":"📚","name":"Leer 30 min","description":""},
                               {"id":"a2","icon":"💧","name":"Beber agua","description":"2 L"}],
                 "checks":{"%1$s":["a1","a2","borrada"],"2999-01-01":["a1"]},
                 "tasks":[{"id":"t1","name":"Reparar licuadora","description":"","status":"completada",
                           "priority":"alta","deadline":"%1$s"}],
                 "finance":{"rates":null,"rateHistory":{},"movements":[
                   {"id":"m1","kind":"entrada","date":"%1$s","account":"zelle","amount":500,"description":"Sueldo",
                    "incomeType":"sueldo","rateUsd":855.66,"rateEur":972.65},
                   {"id":"m2","kind":"salida","date":"%1$s","account":"zelle","amount":100,"description":"Venta",
                    "reason":"venta_divisas","rateUsd":855.66,"rateEur":972.65,"linkId":"L1"},
                   {"id":"m3","kind":"entrada","date":"%1$s","account":"pagomovil","amount":85000,"description":"Venta",
                    "incomeType":"cambio","rateUsd":855.66,"rateEur":972.65,"linkId":"L1"}]},
                 "nutrition":{
                   "foods":[{"id":"f-arroz","name":"Arroz blanco cocido","per":100,"unit":"g","kcal":130,
                             "protein":2.7,"carbs":28.2,"fat":0.3,"fiber":0.4},
                            {"id":"x1","name":"Cachapa","per":1,"unit":"unidad","kcal":300,"protein":8,"carbs":45,
                             "fat":9,"fiber":3}],
                   "log":[{"id":"e1","date":"%1$s","meal":"almuerzo","name":"Arroz blanco cocido","amount":200,
                           "unit":"g","foodId":"f-arroz","kcal":260,"protein":5.4,"carbs":56.4,"fat":0.6,"fiber":0.8}],
                   "body":[{"id":"b1","date":"%1$s","weight":78.4,"bodyFat":18.6}],
                   "profile":{"sex":"hombre","age":27,"height":176,"activity":"moderado","goal":"recomposicion"},
                   "targets":{"kcal":2440,"protein":172,"carbs":285,"fat":68,"fiber":34}}}
                """.formatted(yesterday);

        call(HttpMethod.POST, "/api/import/legacy", token, backup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disciplines").value(2))
                .andExpect(jsonPath("$.checks").value(2))      // ignora la disciplina borrada y el día futuro
                .andExpect(jsonPath("$.movements").value(3))
                .andExpect(jsonPath("$.foods").value(1))       // el arroz se enlaza al catálogo global
                .andExpect(jsonPath("$.profile").value(true));

        call(HttpMethod.GET, "/api/finance/summary", token, null)
                .andExpect(jsonPath("$.accounts[?(@.account=='ZELLE')].balance").value(hasItem(400.0)))
                .andExpect(jsonPath("$.month.income").value(TODAY.minusDays(1).getMonth() == TODAY.getMonth() ? 500.0 : 0.0));
        call(HttpMethod.GET, "/api/tasks?status=COMPLETED", token, null).andExpect(jsonPath("$", hasSize(1)));
        call(HttpMethod.GET, "/api/nutrition/profile", token, null)
                .andExpect(jsonPath("$.targets.kcal").value(2440))
                .andExpect(jsonPath("$.age").value(27));

        // Segunda importación: la cuenta ya tiene datos → 409
        call(HttpMethod.POST, "/api/import/legacy", token, backup).andExpect(status().isConflict());
    }

    // ---------------------------------------------------------------- informe

    @Test
    void informeExcelTraeUnaHojaPorModuloYGraficos() throws Exception {
        String token = register(uniqueEmail());
        String leer = idOf(call(HttpMethod.POST, "/api/disciplines", token, """
                {"name":"Leer 30 min","icon":"📚"}""").andExpect(status().isCreated()));
        idOf(call(HttpMethod.POST, "/api/disciplines", token, """
                {"name":"Gym","icon":"🏋️"}""").andExpect(status().isCreated()));
        call(HttpMethod.PUT, "/api/planning/%s/disciplines/%s".formatted(TODAY, leer), token, null)
                .andExpect(status().isNoContent());
        call(HttpMethod.POST, "/api/tasks", token, """
                {"name":"Reparar licuadora","priority":"HIGH","deadline":"%s"}""".formatted(TODAY.plusDays(3)))
                .andExpect(status().isCreated());
        call(HttpMethod.PUT, "/api/finance/rates/manual", token, """
                {"date":"%s","usd":180.5,"eur":211.3}""".formatted(TODAY)).andExpect(status().isOk());
        call(HttpMethod.POST, "/api/finance/movements", token, """
                {"kind":"INCOME","date":"%s","account":"ZELLE","amount":500,"incomeType":"SALARY"}"""
                .formatted(TODAY)).andExpect(status().isCreated());
        call(HttpMethod.POST, "/api/finance/movements", token, """
                {"kind":"EXPENSE","date":"%s","account":"PAGO_MOVIL","amount":3610,"expenseReason":"PURCHASE",
                 "expenseClass":"EXPENSE","category":"Comida","description":"Mercado"}"""
                .formatted(TODAY)).andExpect(status().isCreated());
        call(HttpMethod.POST, "/api/nutrition/diary/entries", token, """
                {"date":"%s","meal":"LUNCH","name":"Pollo con arroz","kcal":720,"protein":58,"carbs":80,"fat":16,"fiber":5}"""
                .formatted(TODAY)).andExpect(status().isCreated());
        call(HttpMethod.PUT, "/api/nutrition/body", token, """
                {"date":"%s","weightKg":78.4,"bodyFatPct":18}""".formatted(TODAY.minusDays(7))).andExpect(status().isOk());
        call(HttpMethod.PUT, "/api/nutrition/body", token, """
                {"date":"%s","weightKg":77.9,"bodyFatPct":17.6}""".formatted(TODAY)).andExpect(status().isOk());

        byte[] xlsx = call(HttpMethod.GET, "/api/export/excel", token, null)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        // Se deja en target/ para poder abrirlo a mano
        Files.write(Path.of("target", "informe-prueba.xlsx"), xlsx);

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsx))) {
            assertThat(sheetNames(wb)).containsExactly("Resumen", "Planificación", "Disciplinas", "Pendientes",
                    "Movimientos", "Nutrición", "Diario de comidas", "Cuerpo");
            assertThat(wb.getSheet("Resumen").getDrawingPatriarch().getCharts()).hasSize(4);
            assertThat(wb.getSheet("Nutrición").getDrawingPatriarch().getCharts()).hasSize(1);
            assertThat(wb.getSheet("Cuerpo").getDrawingPatriarch().getCharts()).hasSize(2);
            // Hoy se cumplió 1 de 2 disciplinas
            assertThat(wb.getSheet("Planificación").getRow(1).getCell(4).getNumericCellValue()).isEqualTo(1);
            assertThat(wb.getSheet("Movimientos").getLastRowNum()).isEqualTo(2);
        }

        // Una empresa no lleva hojas de finanzas ni de nutrición
        String body = call(HttpMethod.POST, "/api/auth/register", null, """
                {"email":"%s","password":"secreta123","fullName":"Acme C.A.","accountType":"BUSINESS"}"""
                .formatted(uniqueEmail())).andReturn().getResponse().getContentAsString();
        byte[] business = call(HttpMethod.GET, "/api/export/excel", JsonPath.read(body, "$.accessToken"), null)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(business))) {
            assertThat(sheetNames(wb)).containsExactly("Resumen", "Planificación", "Disciplinas", "Pendientes");
        }
    }

    private static List<String> sheetNames(XSSFWorkbook wb) {
        List<String> names = new ArrayList<>();
        wb.forEach(sheet -> names.add(sheet.getSheetName()));
        return names;
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
