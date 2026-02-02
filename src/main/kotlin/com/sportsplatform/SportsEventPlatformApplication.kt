package com.sportsplatform

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class SportsEventPlatformApplication

fun main(args: Array<String>) {
    runApplication<SportsEventPlatformApplication>(*args)
}
