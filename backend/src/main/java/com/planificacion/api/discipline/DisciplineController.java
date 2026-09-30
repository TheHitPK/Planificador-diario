package com.planificacion.api.discipline;

import com.planificacion.api.common.web.CurrentUserId;
import com.planificacion.api.discipline.DisciplineDtos.DisciplineRequest;
import com.planificacion.api.discipline.DisciplineDtos.DisciplineResponse;
import com.planificacion.api.discipline.DisciplineDtos.ReorderRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/disciplines")
public class DisciplineController {

    private final DisciplineService service;

    public DisciplineController(DisciplineService service) {
        this.service = service;
    }

    @GetMapping
    public List<DisciplineResponse> list(@CurrentUserId UUID userId,
                                         @RequestParam(defaultValue = "false") boolean includeArchived) {
        return service.list(userId, includeArchived);
    }

    @GetMapping("/{id}")
    public DisciplineResponse get(@CurrentUserId UUID userId, @PathVariable UUID id) {
        return service.get(userId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DisciplineResponse create(@CurrentUserId UUID userId, @Valid @RequestBody DisciplineRequest req) {
        return service.create(userId, req);
    }

    @PutMapping("/{id}")
    public DisciplineResponse update(@CurrentUserId UUID userId, @PathVariable UUID id,
                                     @Valid @RequestBody DisciplineRequest req) {
        return service.update(userId, id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentUserId UUID userId, @PathVariable UUID id) {
        service.delete(userId, id);
    }

    @PutMapping("/order")
    public List<DisciplineResponse> reorder(@CurrentUserId UUID userId, @Valid @RequestBody ReorderRequest req) {
        return service.reorder(userId, req.ids());
    }
}
