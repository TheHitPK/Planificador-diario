package com.planificacion.api.task;

import com.planificacion.api.common.web.CurrentUserId;
import com.planificacion.api.task.TaskDtos.StatusRequest;
import com.planificacion.api.task.TaskDtos.TaskRequest;
import com.planificacion.api.task.TaskDtos.TaskResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    /** {@code GET /api/tasks?status=COMPLETED&status=PENDING} — sin filtro: activas. */
    @GetMapping
    public List<TaskResponse> list(@CurrentUserId UUID userId,
                                   @RequestParam(name = "status", required = false) Set<TaskStatus> statuses) {
        return service.list(userId, statuses);
    }

    @GetMapping("/{id}")
    public TaskResponse get(@CurrentUserId UUID userId, @PathVariable UUID id) {
        return service.get(userId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@CurrentUserId UUID userId, @Valid @RequestBody TaskRequest req) {
        return service.create(userId, req);
    }

    @PutMapping("/{id}")
    public TaskResponse update(@CurrentUserId UUID userId, @PathVariable UUID id, @Valid @RequestBody TaskRequest req) {
        return service.update(userId, id, req);
    }

    @PatchMapping("/{id}/status")
    public TaskResponse changeStatus(@CurrentUserId UUID userId, @PathVariable UUID id,
                                     @Valid @RequestBody StatusRequest req) {
        return service.changeStatus(userId, id, req.status());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentUserId UUID userId, @PathVariable UUID id) {
        service.delete(userId, id);
    }
}
