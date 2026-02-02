package com.sportsplatform.exception

import com.sportsplatform.dto.ErrorFieldDetail

/**
 * 資源不存在例外
 */
class ResourceNotFoundException(
    val errorCode: String = "RESOURCE_NOT_FOUND",
    override val message: String,
    val field: String,
    val reason: String
) : RuntimeException(message)

/**
 * 業務邏輯例外
 */
class BusinessLogicException(
    val errorCode: String,
    override val message: String,
    val details: List<ErrorFieldDetail>? = null
) : RuntimeException(message)

/**
 * 參數驗證例外
 */
class ValidationException(
    override val message: String,
    val details: List<ErrorFieldDetail>
) : RuntimeException(message)
