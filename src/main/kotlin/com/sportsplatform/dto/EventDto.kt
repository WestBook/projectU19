package com.sportsplatform.dto

import com.fasterxml.jackson.annotation.JsonFormat
import java.time.Instant
import java.util.*

/**
 * 賽事列表項目回應 DTO
 * 對應 OpenAPI Event schema
 */
data class EventDto(
    val id: UUID,
    val name: String,
    val ageMin: Int,
    val ageMax: Int,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val startTime: Instant,
    val location: String
)

/**
 * 分頁資訊 DTO
 * 對應 OpenAPI PageInfo schema
 */
data class PageInfo(
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val hasNext: Boolean,
    val hasPrevious: Boolean
)

/**
 * 賽事列表分頁回應 DTO
 * 對應 OpenAPI EventPageResponse schema
 */
data class EventPageResponse(
    val success: Boolean = true,
    val data: List<EventDto>,
    val page: PageInfo,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val timestamp: Instant = Instant.now()
)
