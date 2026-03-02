package com.sportsplatform.controller

import com.sportsplatform.dto.ErrorFieldDetail
import com.sportsplatform.dto.EventDetailResponse
import com.sportsplatform.dto.EventPageResponse
import com.sportsplatform.exception.ValidationException
import com.sportsplatform.service.EventService
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.util.*

/**
 * Event Controller
 * 處理賽事相關 API 請求
 */
@RestController
@RequestMapping("/api/events")
class EventController(
    private val eventService: EventService
) {

    /**
     * GET /api/events/{id}
     * 依 ID 取得賽事詳情
     */
    @GetMapping("/{id}")
    fun getEventById(@PathVariable id: UUID): EventDetailResponse {
        return eventService.getEventById(id)
    }

    /**
     * GET /api/events
     * 查詢賽事列表，支援過濾、分頁與排序
     */
    @GetMapping
    fun getEvents(
        @RequestParam(required = false) age: Int?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) dateFrom: LocalDate?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) dateTo: LocalDate?,
        @RequestParam(required = false) location: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
        @RequestParam(defaultValue = "startTime,asc") sort: String
    ): EventPageResponse {
        // 參數驗證
        validateParameters(age, dateFrom, dateTo, page, size, sort)

        // 呼叫 Service
        return eventService.getEvents(
            age = age,
            dateFrom = dateFrom,
            dateTo = dateTo,
            location = location,
            page = page,
            size = size,
            sort = sort
        )
    }

    /**
     * 驗證請求參數
     */
    private fun validateParameters(
        age: Int?,
        dateFrom: LocalDate?,
        dateTo: LocalDate?,
        page: Int,
        size: Int,
        sort: String
    ) {
        val errors = mutableListOf<ErrorFieldDetail>()

        // 驗證 age
        if (age != null && (age < 1 || age > 18)) {
            errors.add(
                ErrorFieldDetail(
                    field = "age",
                    reason = "must be between 1 and 18"
                )
            )
        }

        // 驗證日期區間
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            errors.add(
                ErrorFieldDetail(
                    field = "dateFrom",
                    reason = "dateFrom must be before or equal to dateTo"
                )
            )
            errors.add(
                ErrorFieldDetail(
                    field = "dateTo",
                    reason = "dateTo must be after or equal to dateFrom"
                )
            )
        }

        // 驗證 page
        if (page < 0) {
            errors.add(
                ErrorFieldDetail(
                    field = "page",
                    reason = "must be greater than or equal to 0"
                )
            )
        }

        // 驗證 size
        if (size < 1 || size > 100) {
            errors.add(
                ErrorFieldDetail(
                    field = "size",
                    reason = "must be between 1 and 100"
                )
            )
        }

        // 驗證 sort
        val validSorts = setOf("startTime,asc", "startTime,desc")
        if (!validSorts.contains(sort)) {
            errors.add(
                ErrorFieldDetail(
                    field = "sort",
                    reason = "must be one of: startTime,asc, startTime,desc"
                )
            )
        }

        // 如果有錯誤，拋出 ValidationException
        if (errors.isNotEmpty()) {
            val message = when {
                errors.any { it.field == "age" } -> "年齡參數必須介於 1 到 18 之間"
                errors.any { it.field == "dateFrom" || it.field == "dateTo" } -> "結束日期不可早於開始日期"
                else -> "請求參數驗證失敗"
            }
            throw ValidationException(message, errors)
        }
    }
}
