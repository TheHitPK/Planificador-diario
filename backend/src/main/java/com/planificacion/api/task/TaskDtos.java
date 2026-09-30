package com.planificacion.api.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public final class TaskDtos {

    private TaskDtos() {
    }

    public record TaskRequest(
            @NotBlank @Size(max = 150) String name,
            @Size(max = 5000) String description,
            TaskStatus status,
            TaskPriority priority,
            @NotNull LocalDate deadline) {
    }

    public record StatusRequest(@NotNull TaskStatus status) {
    }

    /** {@code daysLeft} negativo = vencida. Null si ya está completada. */
    public record TaskResponse(UUID id, String name, String description, TaskStatus status, TaskPriority priority,
                               LocalDate deadline, Long daysLeft, boolean overdue, Instant completedAt,
                               Instant createdAt) {
        public static TaskResponse from(Task t, LocalDate today) {
            boolean done = t.getStatus() == TaskStatus.COMPLETED;
            Long daysLeft = done ? null : ChronoUnit.DAYS.between(today, t.getDeadline());
            return new TaskResponse(t.getId(), t.getName(), t.getDescription(), t.getStatus(), t.getPriority(),
                    t.getDeadline(), daysLeft, daysLeft != null && daysLeft < 0, t.getCompletedAt(),
                    t.getCreatedAt());
        }
    }
}
