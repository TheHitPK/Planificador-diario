package com.planificacion.api.planning;

import com.planificacion.api.common.BaseEntity;
import com.planificacion.api.discipline.Discipline;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** "Cumplí esta disciplina este día". Si no existe la fila, no se cumplió. */
@Getter
@NoArgsConstructor
@Entity
@Table(name = "discipline_checks")
public class DisciplineCheck extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "discipline_id", nullable = false, updatable = false)
    private Discipline discipline;

    @Column(name = "check_date", nullable = false, updatable = false)
    private LocalDate date;

    public DisciplineCheck(Discipline discipline, LocalDate date) {
        this.discipline = discipline;
        this.date = date;
    }
}
