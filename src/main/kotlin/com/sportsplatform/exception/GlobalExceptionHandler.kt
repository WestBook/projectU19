package com.sportsplatform.exception

import com.sportsplatform.dto.ErrorDetail
import com.sportsplatform.dto.ErrorFieldDetail
import com.sportsplatform.dto.ErrorResponse
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.util.*

@RestControllerAdvice
class GlobalExceptionHandler {

    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(
        ex: MethodArgumentNotValidException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = generateTraceId()

        val details = ex.bindingResult.fieldErrors.map {
            ErrorFieldDetail(
                field = it.field,
                reason = it.defaultMessage ?: "validation failed"
            )
        }

        logger.warn("Validation error [traceId: $traceId]: ${ex.message}")

        return ResponseEntity
            .badRequest()
            .body(
                ErrorResponse(
                    error = ErrorDetail(
                        code = "VALIDATION_ERROR",
                        message = "請求參數驗證失敗",
                        details = details,
                        traceId = traceId
                    )
                )
            )
    }

    @ExceptionHandler(ResourceNotFoundException::class)
    fun handleResourceNotFound(
        ex: ResourceNotFoundException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = generateTraceId()

        logger.info("Resource not found [traceId: $traceId]: ${ex.message}")

        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(
                ErrorResponse(
                    error = ErrorDetail(
                        code = ex.errorCode,
                        message = ex.message,
                        details = listOf(
                            ErrorFieldDetail(
                                field = ex.field,
                                reason = ex.reason
                            )
                        ),
                        traceId = traceId
                    )
                )
            )
    }

    @ExceptionHandler(BusinessLogicException::class)
    fun handleBusinessLogicException(
        ex: BusinessLogicException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = generateTraceId()

        logger.info("Business logic error [traceId: $traceId]: ${ex.message}")

        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(
                ErrorResponse(
                    error = ErrorDetail(
                        code = ex.errorCode,
                        message = ex.message,
                        details = ex.details,
                        traceId = traceId
                    )
                )
            )
    }

    @ExceptionHandler(ValidationException::class)
    fun handleValidationException(
        ex: ValidationException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = generateTraceId()

        logger.warn("Validation error [traceId: $traceId]: ${ex.message}")

        return ResponseEntity
            .badRequest()
            .body(
                ErrorResponse(
                    error = ErrorDetail(
                        code = "VALIDATION_ERROR",
                        message = ex.message,
                        details = ex.details,
                        traceId = traceId
                    )
                )
            )
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(
        ex: Exception,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = generateTraceId()

        logger.error("Internal server error [traceId: $traceId]", ex)

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(
                ErrorResponse(
                    error = ErrorDetail(
                        code = "INTERNAL_SERVER_ERROR",
                        message = "系統發生非預期錯誤，請稍後再試",
                        traceId = traceId
                    )
                )
            )
    }

    private fun generateTraceId(): String {
        return UUID.randomUUID().toString().substring(0, 12)
    }
}
