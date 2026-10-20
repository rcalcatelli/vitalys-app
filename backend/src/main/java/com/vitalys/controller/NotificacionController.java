package com.vitalys.controller;

import com.vitalys.domain.Usuario;
import com.vitalys.dto.NotificacionFallidaResponse;
import com.vitalys.service.NotificacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/notificaciones")
@Tag(name = "Notificaciones", description = "Alerta de avisos por email que no llegaron (Módulo 3)")
@SecurityRequirement(name = "bearerAuth")
public class NotificacionController {

    private final NotificacionService service;

    public NotificacionController(NotificacionService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
            summary = "Notificaciones fallidas",
            description = "ADMIN. Con fallidas=true devuelve las DEFINITIVA (2 intentos) y las HUERFANA "
                    + "(en curso sin resolver). Sin el parámetro devuelve lo mismo: es el único listado.")
    public List<NotificacionFallidaResponse> listar(
            @AuthenticationPrincipal Usuario actor,
            @RequestParam(name = "fallidas", defaultValue = "true") boolean fallidas) {
        return service.listarFallidas(actor);
    }
}
