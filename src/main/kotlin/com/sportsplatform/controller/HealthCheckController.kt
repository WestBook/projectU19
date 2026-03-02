package com.sportsplatform.controller

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

@RestController
@RequestMapping("/health")
class HealthCheckController(
    private val jdbcTemplate: JdbcTemplate
) {
    private val logger = LoggerFactory.getLogger(HealthCheckController::class.java)

    @GetMapping
    fun healthCheck(): ResponseEntity<Map<String, Any>> {
        val dbStatus = checkDatabase()
        val overall = if (dbStatus == "UP") "UP" else "DOWN"
        val httpStatus = if (overall == "UP") HttpStatus.OK else HttpStatus.SERVICE_UNAVAILABLE

        val body = mapOf(
            "status" to overall,
            "service" to "sports-event-platform",
            "timestamp" to Instant.now().toString(),
            "components" to mapOf(
                "database" to mapOf(
                    "status" to dbStatus
                )
            )
        )

        return ResponseEntity.status(httpStatus).body(body)
    }

    private fun checkDatabase(): String {
        return try {
            jdbcTemplate.queryForObject("SELECT 1", Int::class.java)
            "UP"
        } catch (ex: Exception) {
            logger.error("Database health check failed: {}", ex.message)
            "DOWN"
        }
    }
}
