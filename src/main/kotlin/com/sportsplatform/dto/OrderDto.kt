package com.sportsplatform.dto

import com.fasterxml.jackson.annotation.JsonFormat
import jakarta.validation.Valid
import jakarta.validation.constraints.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.*

// ===== Request DTOs =====

/**
 * 家長資訊
 */
data class ParentInfo(
    @field:NotBlank(message = "家長姓名不可為空")
    @field:Size(min = 2, max = 50, message = "家長姓名長度須介於 2 到 50 字元之間")
    val name: String,

    @field:NotBlank(message = "電子郵件不可為空")
    @field:Email(message = "電子郵件格式不正確")
    val email: String,

    @field:NotBlank(message = "聯絡電話不可為空")
    @field:Pattern(
        regexp = "^09\\d{8}$",
        message = "電話格式不正確，請使用台灣手機號碼格式（09 開頭共 10 碼）"
    )
    val phone: String
)

/**
 * 小孩資訊
 */
data class ChildInfo(
    @field:NotBlank(message = "小孩姓名不可為空")
    @field:Size(min = 2, max = 50, message = "小孩姓名長度須介於 2 到 50 字元之間")
    val name: String,

    @field:NotNull(message = "出生日期不可為空")
    val birthDate: LocalDate,

    val gender: String? = null
)

/**
 * 緊急聯絡人
 */
data class EmergencyContact(
    @field:NotBlank(message = "緊急聯絡人姓名不可為空")
    @field:Size(min = 2, max = 50, message = "緊急聯絡人姓名長度須介於 2 到 50 字元之間")
    val name: String,

    @field:NotBlank(message = "緊急聯絡人電話不可為空")
    @field:Pattern(
        regexp = "^09\\d{8}$",
        message = "緊急聯絡人電話格式不正確，請使用台灣手機號碼格式（09 開頭共 10 碼）"
    )
    val phone: String,

    @field:Size(max = 50, message = "關係說明長度不可超過 50 字元")
    val relationship: String? = null
)

/**
 * 建立訂單請求 DTO
 * 對應 OpenAPI CreateOrderRequest schema
 */
data class CreateOrderRequest(
    @field:NotNull(message = "賽事 ID 不可為空")
    val eventId: UUID,

    @field:NotNull(message = "家長資訊不可為空")
    @field:Valid
    val parent: ParentInfo,

    @field:NotNull(message = "小孩資訊不可為空")
    @field:Valid
    val child: ChildInfo,

    @field:Valid
    val emergencyContact: EmergencyContact? = null,

    @field:Size(max = 500, message = "備註長度不可超過 500 字元")
    val notes: String? = null
)

// ===== Response DTOs =====

/**
 * 警告訊息 DTO
 * 用於彈性年齡驗證時的 AGE_BOUNDARY_WARNING
 */
data class OrderWarning(
    val code: String,
    val message: String
)

/**
 * 訂單資料 DTO
 * 對應 OpenAPI Order schema
 */
data class OrderDto(
    val id: UUID,
    val eventId: UUID,
    val eventName: String,
    val status: String,
    val parent: ParentInfo,
    val child: ChildInfo,
    val childAgeAtEvent: Int,
    val emergencyContact: EmergencyContact? = null,
    val notes: String? = null,
    val fee: BigDecimal,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val paymentDeadline: Instant? = null,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val createdAt: Instant,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val updatedAt: Instant,
    val warnings: List<OrderWarning>? = null
)

/**
 * 建立訂單回應 DTO
 * 對應 OpenAPI OrderResponse schema
 */
data class OrderResponse(
    val success: Boolean = true,
    val data: OrderDto,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val timestamp: Instant = Instant.now()
)
