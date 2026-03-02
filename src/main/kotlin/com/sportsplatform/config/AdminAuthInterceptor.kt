package com.sportsplatform.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.sportsplatform.dto.ErrorDetail
import com.sportsplatform.dto.ErrorResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor
import java.util.*

// Admin API 認證攔截器
// 驗證 X-Admin-Token Header，保護所有 /api/admin/ 路徑
@Component
class AdminAuthInterceptor(
    private val objectMapper: ObjectMapper,
    @Value("\${admin.api-key}") private val adminApiKey: String
) : HandlerInterceptor {

    private val logger = LoggerFactory.getLogger(AdminAuthInterceptor::class.java)

    override fun preHandle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any
    ): Boolean {
        val token = request.getHeader("X-Admin-Token")

        if (token.isNullOrBlank() || token != adminApiKey) {
            logger.warn("Unauthorized admin access attempt: path=${request.requestURI}, hasToken=${!token.isNullOrBlank()}")
            writeUnauthorizedResponse(response)
            return false
        }

        return true
    }

    private fun writeUnauthorizedResponse(response: HttpServletResponse) {
        val traceId = UUID.randomUUID().toString().substring(0, 12)
        val errorResponse = ErrorResponse(
            error = ErrorDetail(
                code = "UNAUTHORIZED",
                message = "未提供有效的管理員 Token，請在 X-Admin-Token Header 中提供正確的 Token",
                traceId = traceId
            )
        )

        response.status = HttpStatus.UNAUTHORIZED.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.characterEncoding = "UTF-8"
        response.writer.write(objectMapper.writeValueAsString(errorResponse))
    }
}
