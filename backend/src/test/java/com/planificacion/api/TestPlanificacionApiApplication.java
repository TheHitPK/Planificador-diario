package com.planificacion.api;

import org.springframework.boot.SpringApplication;

public class TestPlanificacionApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(PlanificacionApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
