package com.planificacion.api.discipline;

import com.planificacion.api.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Hábito que se quiere cumplir cada día (leer, gym, beber agua…). */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "disciplines")
public class Discipline extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 16)
    private String icon;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean archived;

    public Discipline(UUID userId) {
        this.userId = userId;
    }
}
