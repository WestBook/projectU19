package com.sportsplatform.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

@RestController
@RequestMapping("/api/health")
class HealthCheckController {

    @GetMapping
    fun healthCheck(): Map<String, Any> {
        return mapOf(
            "status" to "OK",
            "service" to "Sports Event Platform API",
            "timestamp" to Instant.now().toString()
        )
    }
}
