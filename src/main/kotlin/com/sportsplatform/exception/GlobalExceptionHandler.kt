package com.sportsplatform.exception

import com.sportsplatform.config.TRACE_ID_KEY
import com.sportsplatform.dto.ErrorDetail
import com.sportsplatform.dto.ErrorFieldDetail
import com.sportsplatform.dto.ErrorResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.resource.NoResourceFoundException
import java.util.UUID

@RestControllerAdvice
class GlobalExceptionHandler {

    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    // ─── 工具 ───────────────────────────────────────────────

    private fun traceId(): String =
        MDC.get(TRACE_ID_KEY) ?: UUID.randomUUID().toString().replace("-", "").substring(0, 12)

    private fun requestInfo(request: HttpServletRequest) =
        "${request.method} ${request.requestURI}"

    // ─── 400：Bean Validation（@Valid on request body）──────

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleMethodArgumentNotValid(
        ex: MethodArgumentNotValidException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        val details = ex.bindingResult.fieldErrors.map {
            ErrorFieldDetail(field = it.field, reason = it.defaultMessage ?: "validation failed")
        }
        logger.warn("[{}] [traceId:{}] Validation failed – fields: {}",
            requestInfo(request), traceId, details.map { it.field })
        return badRequest(traceId, "請求參數驗證失敗", details)
    }

    // ─── 400：@Validated on path/query param ────────────────

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(
        ex: ConstraintViolationException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        val details = ex.constraintViolations.map {
            ErrorFieldDetail(
                field = it.propertyPath.toString().substringAfterLast('.'),
                reason = it.message
            )
        }
        logger.warn("[{}] [traceId:{}] Constraint violation – {}",
            requestInfo(request), traceId, ex.message)
        return badRequest(traceId, "請求參數驗證失敗", details)
    }

    // ─── 400：JSON 解析失敗（格式錯誤 / 缺少 body）──────────

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleHttpMessageNotReadable(
        ex: HttpMessageNotReadableException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        logger.warn("[{}] [traceId:{}] Request body not readable – {}",
            requestInfo(request), traceId, ex.message)
        return badRequest(traceId, "請求格式錯誤或缺少必要欄位")
    }

    // ─── 400：Path variable 型別不符（例如非 UUID 字串）─────

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleMethodArgumentTypeMismatch(
        ex: MethodArgumentTypeMismatchException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        logger.warn("[{}] [traceId:{}] Type mismatch – param '{}' value '{}'",
            requestInfo(request), traceId, ex.name, ex.value)
        // 注意：此處使用 INVALID_PARAMETER，不能用 badRequest() helper（那個固定回傳 VALIDATION_ERROR）
        return ResponseEntity.badRequest().body(ErrorResponse(error = ErrorDetail(
            code = "INVALID_PARAMETER",
            message = "請求參數格式錯誤",
            details = listOf(ErrorFieldDetail(
                field = ex.name,
                reason = "Invalid value '${ex.value}' for parameter '${ex.name}': expected ${ex.requiredType?.simpleName}"
            )),
            traceId = traceId
        )))
    }

    // ─── 400：業務層主動拋出的驗證例外 ───────────────────────

    @ExceptionHandler(ValidationException::class)
    fun handleValidationException(
        ex: ValidationException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        logger.warn("[{}] [traceId:{}] Business validation – {}",
            requestInfo(request), traceId, ex.message)
        return badRequest(traceId, ex.message, ex.details)
    }

    // ─── 404：資源不存在 ─────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException::class)
    fun handleResourceNotFound(
        ex: ResourceNotFoundException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        logger.info("[{}] [traceId:{}] Resource not found – {}",
            requestInfo(request), traceId, ex.message)
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = ErrorDetail(
                code = ex.errorCode,
                message = ex.message,
                details = listOf(ErrorFieldDetail(field = ex.field, reason = ex.reason)),
                traceId = traceId
            )))
    }

    // ─── 404：路由不存在（Spring Boot 3.x）──────────────────

    @ExceptionHandler(NoResourceFoundException::class)
    fun handleNoResourceFound(
        ex: NoResourceFoundException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        logger.info("[{}] [traceId:{}] No route found", requestInfo(request), traceId)
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = ErrorDetail(
                code = "RESOURCE_NOT_FOUND",
                message = "請求的路徑不存在",
                traceId = traceId
            )))
    }

    // ─── 405：HTTP Method 不支援 ─────────────────────────────

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun handleMethodNotSupported(
        ex: HttpRequestMethodNotSupportedException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        logger.warn("[{}] [traceId:{}] Method not supported – allowed: {}",
            requestInfo(request), traceId, ex.supportedHttpMethods)
        return ResponseEntity
            .status(HttpStatus.METHOD_NOT_ALLOWED)
            .body(ErrorResponse(error = ErrorDetail(
                code = "METHOD_NOT_ALLOWED",
                message = "不支援的 HTTP 方法：${ex.method}，允許的方法：${ex.supportedMethods?.joinToString()}",
                traceId = traceId
            )))
    }

    // ─── 409：業務邏輯衝突（名額滿、年齡不符等）─────────────

    @ExceptionHandler(BusinessLogicException::class)
    fun handleBusinessLogicException(
        ex: BusinessLogicException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        logger.info("[{}] [traceId:{}] Business logic conflict – [{}] {}",
            requestInfo(request), traceId, ex.errorCode, ex.message)
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ErrorDetail(
                code = ex.errorCode,
                message = ex.message,
                details = ex.details,
                traceId = traceId
            )))
    }

    // ─── 500：未預期例外（最後兜底）─────────────────────────

    @ExceptionHandler(Exception::class)
    fun handleGenericException(
        ex: Exception,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = traceId()
        logger.error("[{}] [traceId:{}] Unexpected error – {}",
            requestInfo(request), traceId, ex.message, ex)
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse(error = ErrorDetail(
                code = "INTERNAL_SERVER_ERROR",
                message = "系統發生非預期錯誤，請稍後再試",
                traceId = traceId
            )))
    }

    // ─── 共用 helper ─────────────────────────────────────────

    private fun badRequest(
        traceId: String,
        message: String,
        details: List<ErrorFieldDetail>? = null
    ) = ResponseEntity
        .badRequest()
        .body(ErrorResponse(error = ErrorDetail(
            code = "VALIDATION_ERROR",
            message = message,
            details = details,
            traceId = traceId
        )))
}
