package com.sportsplatform.dto

import com.fasterxml.jackson.annotation.JsonFormat
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.Instant
import java.util.*

/**
 * 建立賽事請求 DTO
 * 對應 OpenAPI CreateEventRequest schema
 */
data class CreateEventRequest(
    @field:NotBlank(message = "賽事名稱不可為空")
    @field:Size(min = 5, max = 100, message = "賽事名稱長度必須介於 5 到 100 之間")
    val name: String,

    @field:NotBlank(message = "賽事說明不可為空")
    @field:Size(min = 10, max = 2000, message = "賽事說明長度必須介於 10 到 2000 之間")
    val description: String,

    @field:Min(value = 1, message = "最小年齡必須介於 1 到 18 之間")
    @field:Max(value = 18, message = "最小年齡必須介於 1 到 18 之間")
    val ageMin: Int,

    @field:Min(value = 1, message = "最大年齡必須介於 1 到 18 之間")
    @field:Max(value = 18, message = "最大年齡必須介於 1 到 18 之間")
    val ageMax: Int,

    val ageRestrictionNote: String? = null,

    val strictAgeEnforcement: Boolean = true,

    @field:NotNull(message = "賽事開始時間不可為空")
    val startTime: Instant,

    @field:NotNull(message = "賽事結束時間不可為空")
    val endTime: Instant,

    @field:NotBlank(message = "賽事地點不可為空")
    @field:Size(min = 3, max = 100, message = "賽事地點長度必須介於 3 到 100 之間")
    val location: String,

    val address: String? = null,

    @field:Min(value = 1, message = "容量必須介於 1 到 1000 之間")
    @field:Max(value = 1000, message = "容量必須介於 1 到 1000 之間")
    val capacity: Int,

    @field:NotNull(message = "報名截止時間不可為空")
    val registrationDeadline: Instant,

    @field:DecimalMin(value = "0", message = "費用不可為負數")
    val fee: BigDecimal,

    @field:NotBlank(message = "主辦單位不可為空")
    @field:Size(min = 2, max = 100, message = "主辦單位長度必須介於 2 到 100 之間")
    val organizer: String,

    @field:Email(message = "聯絡信箱格式不正確")
    val contactEmail: String,

    @field:NotBlank(message = "聯絡電話不可為空")
    val contactPhone: String
)

/**
 * 賽事統計資訊 DTO
 * 對應 OpenAPI EventStatistics schema
 */
data class EventStatisticsDto(
    val totalRevenue: BigDecimal,
    val pendingRevenue: BigDecimal,
    val confirmedOrders: Int,
    val pendingOrders: Int,
    val cancelledOrders: Int,
    val averageChildAge: Double?
)

/**
 * 管理員視角的賽事詳情 DTO
 * 對應 OpenAPI AdminEventDetail schema（allOf EventDetail + statistics）
 */
data class AdminEventDetailDto(
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
    val updatedAt: Instant,
    val statistics: EventStatisticsDto
)

/**
 * 管理員單一賽事回應 DTO
 * 對應 OpenAPI AdminEventResponse schema
 */
data class AdminEventResponse(
    val success: Boolean = true,
    val data: AdminEventDetailDto,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val timestamp: Instant = Instant.now()
)

/**
 * 管理員賽事列表分頁回應 DTO
 * 對應 OpenAPI AdminEventPageResponse schema
 */
data class AdminEventPageResponse(
    val success: Boolean = true,
    val data: List<AdminEventDetailDto>,
    val page: PageInfo,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val timestamp: Instant = Instant.now()
)
