package com.planificacion.api.export;

import com.planificacion.api.common.web.CurrentUserId;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ExcelExportService excel;
    private final Clock clock;

    public ExportController(ExcelExportService excel, Clock clock) {
        this.excel = excel;
        this.clock = clock;
    }

    /** Informe en Excel con todos los datos del usuario y gráficos. */
    @GetMapping("/excel")
    public ResponseEntity<byte[]> excel(@CurrentUserId UUID userId) {
        String filename = "planificacion-informe-" + LocalDate.now(clock) + ".xlsx";
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(excel.export(userId));
    }
}
