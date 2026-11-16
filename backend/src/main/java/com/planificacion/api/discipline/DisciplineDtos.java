package com.planificacion.api.discipline;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public final class DisciplineDtos {

    private DisciplineDtos() {
    }

    public record DisciplineRequest(
            @NotBlank @Size(max = 80) String name,
            @NotBlank @Size(max = 16) String icon,
            @Size(max = 500) String description,
            Boolean archived) {
    }

    /** Nuevo orden: lista completa de ids en el orden deseado. */
    public record ReorderRequest(@NotEmpty List<UUID> ids) {
    }

    public record DisciplineResponse(UUID id, String name, String icon, String description, int position,
                                     boolean archived) {
        public static DisciplineResponse from(Discipline d) {
            return new DisciplineResponse(d.getId(), d.getName(), d.getIcon(), d.getDescription(), d.getPosition(),
                    d.isArchived());
        }
    }
}
