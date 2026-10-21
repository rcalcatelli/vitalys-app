package com.vitalys.service.notificaciones;

/**
 * Evento que se publica DENTRO de la transacción que crea la fila {@code notificaciones}. El
 * despachador lo recibe recién después del commit: si la transacción se revierte, no sale ningún
 * email. El contenido viaja en el evento (no se persiste); si se pierde por un reinicio, la fila
 * queda como huérfana y el ADMIN la ve en la alerta.
 */
public record NotificacionPorEnviar(Long notificacionId, String asunto, String contenidoHtml) {}
