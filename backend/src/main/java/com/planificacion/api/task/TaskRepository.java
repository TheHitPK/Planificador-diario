package com.planificacion.api.task;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByUserIdAndStatusInOrderByDeadlineAsc(UUID userId, Collection<TaskStatus> statuses);

    Optional<Task> findByIdAndUserId(UUID id, UUID userId);
}
