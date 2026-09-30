package com.planificacion.api.importer;

import com.planificacion.api.common.web.CurrentUserId;
import com.planificacion.api.importer.LegacyImportService.ImportResult;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/import")
public class LegacyImportController {

    private final LegacyImportService service;

    public LegacyImportController(LegacyImportService service) {
        this.service = service;
    }

    /** Recibe el respaldo JSON del frontend (el mismo que descarga "Exportar") y lo carga en tu cuenta. */
    @PostMapping("/legacy")
    public ImportResult importLegacy(@CurrentUserId UUID userId, @Valid @RequestBody LegacyBackup backup) {
        return service.importBackup(userId, backup);
    }
}
