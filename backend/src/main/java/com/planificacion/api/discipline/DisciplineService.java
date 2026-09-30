package com.planificacion.api.discipline;

import com.planificacion.api.common.error.BusinessRuleException;
import com.planificacion.api.common.error.NotFoundException;
import com.planificacion.api.discipline.DisciplineDtos.DisciplineRequest;
import com.planificacion.api.discipline.DisciplineDtos.DisciplineResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class DisciplineService {

    private final DisciplineRepository repo;

    public DisciplineService(DisciplineRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<DisciplineResponse> list(UUID userId, boolean includeArchived) {
        List<Discipline> items = includeArchived
                ? repo.findByUserIdOrderByPositionAscCreatedAtAsc(userId)
                : repo.findByUserIdAndArchivedFalseOrderByPositionAscCreatedAtAsc(userId);
        return items.stream().map(DisciplineResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public DisciplineResponse get(UUID userId, UUID id) {
        return DisciplineResponse.from(load(userId, id));
    }

    public DisciplineResponse create(UUID userId, DisciplineRequest req) {
        Discipline d = new Discipline(userId);
        apply(d, req);
        d.setPosition(repo.nextPosition(userId));
        return DisciplineResponse.from(repo.save(d));
    }

    public DisciplineResponse update(UUID userId, UUID id, DisciplineRequest req) {
        Discipline d = load(userId, id);
        apply(d, req);
        return DisciplineResponse.from(d);
    }

    /** Borra la disciplina y todo su historial de días cumplidos (ON DELETE CASCADE). */
    public void delete(UUID userId, UUID id) {
        repo.delete(load(userId, id));
    }

    public List<DisciplineResponse> reorder(UUID userId, List<UUID> ids) {
        Map<UUID, Discipline> mine = repo.findByUserIdOrderByPositionAscCreatedAtAsc(userId).stream()
                .collect(Collectors.toMap(Discipline::getId, Function.identity()));
        if (ids.size() != mine.size() || !mine.keySet().equals(new HashSet<>(ids))) {
            throw new BusinessRuleException("La lista debe contener exactamente todas tus disciplinas");
        }
        for (int i = 0; i < ids.size(); i++) {
            mine.get(ids.get(i)).setPosition(i);
        }
        return ids.stream().map(mine::get).map(DisciplineResponse::from).toList();
    }

    /** Usado por la planificación para validar que la disciplina es del usuario. */
    @Transactional(readOnly = true)
    public Discipline load(UUID userId, UUID id) {
        return repo.findByIdAndUserId(id, userId).orElseThrow(() -> new NotFoundException("Disciplina"));
    }

    private static void apply(Discipline d, DisciplineRequest req) {
        d.setName(req.name().trim());
        d.setIcon(req.icon().trim());
        d.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        if (req.archived() != null) d.setArchived(req.archived());
    }
}
