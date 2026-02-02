package com.sportsplatform.dto

import com.fasterxml.jackson.annotation.JsonFormat
import java.time.Instant

/**
 * 統一錯誤回應格式
 * 對應 API 契約定義
 */
data class ErrorResponse(
    val success: Boolean = false,
    val error: ErrorDetail,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX", timezone = "Asia/Taipei")
    val timestamp: Instant = Instant.now()
)

data class ErrorDetail(
    val code: String,
    val message: String,
    val details: List<ErrorFieldDetail>? = null,
    val traceId: String
)

data class ErrorFieldDetail(
    val field: String,
    val reason: String
)
