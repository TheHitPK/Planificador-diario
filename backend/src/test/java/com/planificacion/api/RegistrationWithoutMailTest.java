package com.planificacion.api;

import com.jayway.jsonpath.JsonPath;
import com.planificacion.api.mail.EmailSender;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Con el correo apagado (MAIL_ENABLED=false): registro sin verificación y sin recuperación por email. */
@SpringBootTest(properties = "app.mail.enabled=false")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class RegistrationWithoutMailTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    EmailSender mail;

    @Test
    void registroIniciaSesionDirectoYNoEnviaCorreos() throws Exception {
        String email = "user-" + UUID.randomUUID() + "@test.com";
        String body = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                        {"email":"%s","password":"secreta123","fullName":"Prueba"}""".formatted(email)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificationRequired").value(false))
                .andExpect(jsonPath("$.session.accessToken", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + JsonPath.read(body, "$.session.accessToken")))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                        {"email":"%s","password":"secreta123"}""".formatted(email)))
                .andExpect(status().isOk());

        // Sin correo no hay recuperación ni reenvío: se dice claramente en vez de fingir que se envió
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON).content("""
                        {"email":"%s"}""".formatted(email)))
                .andExpect(status().isServiceUnavailable());
        mvc.perform(post("/api/auth/resend-verification").contentType(MediaType.APPLICATION_JSON).content("""
                        {"email":"%s"}""".formatted(email)))
                .andExpect(status().isServiceUnavailable());

        Thread.sleep(300);
        verifyNoInteractions(mail);
    }
}
