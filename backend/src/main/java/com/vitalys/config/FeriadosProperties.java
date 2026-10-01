package com.vitalys.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuración del sincronizador de feriados (RF-38), poblada desde
 * {@code application*.properties}.
 */
@ConfigurationProperties(prefix = "vitalys.feriados")
public class FeriadosProperties {

    /**
     * Plantilla de la URL del dataset oficial. {@code {anio}} se reemplaza por el año a
     * sincronizar. Es configurable para poder apuntarla a un servidor local en los tests de
     * integración, sin salir a internet.
     */
    private String urlPlantilla =
            "https://www.argentina.gob.ar/sites/default/files/holidays-{anio}-es.json";

    /** Si el job programado corre. Se apaga en los tests y en entornos donde no haga falta. */
    private boolean habilitado = true;

    /**
     * Cron del job. Por defecto todos los días a las 03:00, en la zona de {@link #zona}: es una
     * hora sin tráfico, y deja margen para que un decreto publicado el día anterior esté
     * disponible antes de que alguien intente reservar.
     */
    private String cron = "0 0 3 * * *";

    /** Zona horaria en la que se interpreta {@link #cron}. */
    private String zona = "America/Argentina/Buenos_Aires";

    /**
     * Cuántos años sincronizar a partir del actual. Con 2 se cubre el año en curso y el
     * siguiente: en diciembre ya se puede reservar para enero, y esas fechas tienen que estar
     * cargadas.
     */
    private int aniosASincronizar = 2;

    /** Tiempo máximo de espera por la fuente oficial. */
    private int timeoutSegundos = 20;

    public String getUrlPlantilla() {
        return urlPlantilla;
    }

    public void setUrlPlantilla(String urlPlantilla) {
        this.urlPlantilla = urlPlantilla;
    }

    public boolean isHabilitado() {
        return habilitado;
    }

    public void setHabilitado(boolean habilitado) {
        this.habilitado = habilitado;
    }

    public String getCron() {
        return cron;
    }

    public void setCron(String cron) {
        this.cron = cron;
    }

    public String getZona() {
        return zona;
    }

    public void setZona(String zona) {
        this.zona = zona;
    }

    public int getAniosASincronizar() {
        return aniosASincronizar;
    }

    public void setAniosASincronizar(int aniosASincronizar) {
        this.aniosASincronizar = aniosASincronizar;
    }

    public int getTimeoutSegundos() {
        return timeoutSegundos;
    }

    public void setTimeoutSegundos(int timeoutSegundos) {
        this.timeoutSegundos = timeoutSegundos;
    }
}
