package com.planificacion.api.task;

import com.planificacion.api.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Pendiente puntual con plazo (ej. "reparar la licuadora antes del viernes"). */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tasks")
public class Task extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Column(nullable = false)
    private LocalDate deadline;

    @Column(name = "completed_at")
    private Instant completedAt;

    public Task(UUID userId) {
        this.userId = userId;
    }

    /** Mantiene completedAt coherente con el estado (lo exige un CHECK en la BD). */
    public void changeStatus(TaskStatus newStatus, Instant now) {
        if (newStatus == status) return;
        this.status = newStatus;
        this.completedAt = newStatus == TaskStatus.COMPLETED ? now : null;
    }
}
