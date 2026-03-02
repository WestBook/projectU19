package com.sportsplatform.controller

import com.sportsplatform.dto.AdminEventPageResponse
import com.sportsplatform.dto.AdminEventResponse
import com.sportsplatform.dto.CreateEventRequest
import com.sportsplatform.service.AdminEventService
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

/**
 * Admin Event Controller
 * 處理管理員賽事相關 API 請求
 * 所有路徑均受 AdminAuthInterceptor 保護（需提供有效 X-Admin-Token）
 */
@RestController
@RequestMapping("/api/admin/events")
class AdminEventController(
    private val adminEventService: AdminEventService
) {

    /**
     * GET /api/admin/events
     * 管理員查詢賽事列表，支援 status 過濾、日期區間、分頁與排序
     */
    @GetMapping
    fun getAdminEvents(
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) dateFrom: LocalDate?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) dateTo: LocalDate?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(defaultValue = "createdAt,desc") sort: String
    ): AdminEventPageResponse {
        return adminEventService.getAdminEvents(
            status = status,
            dateFrom = dateFrom,
            dateTo = dateTo,
            page = page,
            size = size,
            sort = sort
        )
    }

    /**
     * POST /api/admin/events
     * 管理員建立新賽事
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createEvent(
        @Valid @RequestBody request: CreateEventRequest
    ): AdminEventResponse {
        return adminEventService.createEvent(request)
    }
}
