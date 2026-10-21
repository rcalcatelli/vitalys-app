package com.vitalys.service.notificaciones;

/**
 * Puerto de salida para enviar un email. El dominio no sabe qué proveedor hay detrás: Brevo en
 * producción, un log en dev y en tests.
 */
public interface NotificadorEmail {

    /**
     * @throws EnvioEmailException si el proveedor no pudo aceptar el email. Cualquier otra falla
     *     (red, timeout) también debe llegar envuelta en esta excepción.
     */
    void enviar(String destino, String asunto, String contenidoHtml);
}
