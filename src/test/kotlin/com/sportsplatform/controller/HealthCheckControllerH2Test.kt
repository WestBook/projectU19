package com.sportsplatform.controller

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthCheckControllerH2Test {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `GET health returns 200 with status UP when DB is reachable`() {
        mockMvc.perform(
            get("/health").contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.service").value("sports-event-platform"))
            .andExpect(jsonPath("$.timestamp").exists())
            .andExpect(jsonPath("$.components.database.status").value("UP"))
    }
}
