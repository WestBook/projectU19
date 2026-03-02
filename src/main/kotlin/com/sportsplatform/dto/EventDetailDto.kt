package com.sportsplatform.dto

import com.fasterxml.jackson.annotation.JsonFormat
import java.math.BigDecimal
import java.time.Instant
import java.util.*

/**
 * 年齡限制 DTO
 * 對應 OpenAPI AgeRestriction schema
 */
data class AgeRestrictionDto(
    val minAge: Int,
    val maxAge: Int,
    val description: String?,
    val strictEnforcement: Boolean
)

/**
 * 賽事報名狀態
 * 對應 OpenAPI registrationStatus enum
 */
enum class RegistrationStatus {
    OPEN,
    CLOSED,
    FULL
}

/**
 * 賽事詳情 DTO
 * 對應 OpenAPI EventDetail schema
 */
data class EventDetailDto(
    val id: UUID,
    val name: String,
    val description: String?,
    val ageRestriction: AgeRestrictionDto,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val startTime: Instant,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val endTime: Instant?,
    val location: String,
    val address: String?,
    val capacity: Int,
    val registeredCount: Int,
    val registrationStatus: RegistrationStatus,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val registrationDeadline: Instant?,
    val fee: BigDecimal,
    val organizer: String?,
    val contactEmail: String?,
    val contactPhone: String?,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val createdAt: Instant,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val updatedAt: Instant
)

/**
 * 賽事詳情回應 DTO
 * 對應 OpenAPI EventDetailResponse schema
 */
data class EventDetailResponse(
    val success: Boolean = true,
    val data: EventDetailDto,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val timestamp: Instant = Instant.now()
)
