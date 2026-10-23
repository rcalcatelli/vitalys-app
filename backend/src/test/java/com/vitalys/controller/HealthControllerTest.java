package com.vitalys.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class HealthControllerTest {

    @Test
    void informaElCommitCortoQueExponeRender() {
        HealthController controller = new HealthController("d68c9c4a1b2c3d4e5f6");

        assertThat(controller.health()).containsEntry("status", "UP").containsEntry("version", "d68c9c4");
    }

    @Test
    void sinVariableDeRenderLaVersionEsLocal() {
        HealthController controller = new HealthController("local");

        assertThat(controller.health()).containsEntry("status", "UP").containsEntry("version", "local");
    }
}
