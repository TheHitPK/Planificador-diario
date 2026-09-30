package com.planificacion.api.task;

import com.planificacion.api.common.error.NotFoundException;
import com.planificacion.api.task.TaskDtos.TaskRequest;
import com.planificacion.api.task.TaskDtos.TaskResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class TaskService {

    /** En progreso primero, luego pendientes, completadas al final; dentro, por plazo y prioridad. */
    private static final Comparator<Task> ORDER = Comparator
            .comparingInt((Task t) -> switch (t.getStatus()) {
                case IN_PROGRESS -> 0;
                case PENDING -> 1;
                case COMPLETED -> 2;
            })
            .thenComparing(Task::getDeadline)
            .thenComparing(Task::getPriority);

    private final TaskRepository repo;
    private final Clock clock;

    public TaskService(TaskRepository repo, Clock clock) {
        this.repo = repo;
        this.clock = clock;
    }

    /** Sin filtro devuelve las activas (pendientes + en progreso). */
    @Transactional(readOnly = true)
    public List<TaskResponse> list(UUID userId, Collection<TaskStatus> statuses) {
        Collection<TaskStatus> filter = statuses == null || statuses.isEmpty()
                ? EnumSet.of(TaskStatus.PENDING, TaskStatus.IN_PROGRESS)
                : statuses;
        LocalDate today = LocalDate.now(clock);
        return repo.findByUserIdAndStatusInOrderByDeadlineAsc(userId, filter).stream()
                .sorted(ORDER)
                .map(t -> TaskResponse.from(t, today))
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse get(UUID userId, UUID id) {
        return TaskResponse.from(load(userId, id), LocalDate.now(clock));
    }

    public TaskResponse create(UUID userId, TaskRequest req) {
        Task t = new Task(userId);
        apply(t, req);
        return TaskResponse.from(repo.save(t), LocalDate.now(clock));
    }

    public TaskResponse update(UUID userId, UUID id, TaskRequest req) {
        Task t = load(userId, id);
        apply(t, req);
        return TaskResponse.from(t, LocalDate.now(clock));
    }

    public TaskResponse changeStatus(UUID userId, UUID id, TaskStatus status) {
        Task t = load(userId, id);
        t.changeStatus(status, clock.instant());
        return TaskResponse.from(t, LocalDate.now(clock));
    }

    public void delete(UUID userId, UUID id) {
        repo.delete(load(userId, id));
    }

    private Task load(UUID userId, UUID id) {
        return repo.findByIdAndUserId(id, userId).orElseThrow(() -> new NotFoundException("Pendiente"));
    }

    private void apply(Task t, TaskRequest req) {
        t.setName(req.name().trim());
        t.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        t.setDeadline(req.deadline());
        if (req.priority() != null) t.setPriority(req.priority());
        if (req.status() != null) t.changeStatus(req.status(), clock.instant());
    }
}
