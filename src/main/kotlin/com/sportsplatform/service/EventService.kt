package com.sportsplatform.service

import com.sportsplatform.domain.Event
import com.sportsplatform.dto.AgeRestrictionDto
import com.sportsplatform.dto.EventDetailDto
import com.sportsplatform.dto.EventDetailResponse
import com.sportsplatform.dto.EventDto
import com.sportsplatform.dto.EventPageResponse
import com.sportsplatform.dto.PageInfo
import com.sportsplatform.dto.RegistrationStatus
import com.sportsplatform.exception.ResourceNotFoundException
import com.sportsplatform.repository.EventRepository
import com.sportsplatform.repository.EventSpecifications
import com.sportsplatform.repository.OrderRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.LocalDate
import java.util.*

/**
 * Event Service
 * 處理賽事查詢業務邏輯
 */
@Service
class EventService(
    private val eventRepository: EventRepository,
    private val orderRepository: OrderRepository
) {

    /**
     * 查詢賽事列表，支援過濾、分頁與排序
     *
     * @param age 參賽者年齡（選填）
     * @param dateFrom 賽事開始日期區間起點（選填）
     * @param dateTo 賽事開始日期區間終點（選填）
     * @param location 地點模糊查詢（選填）
     * @param page 頁碼（從 0 開始）
     * @param size 每頁筆數
     * @param sort 排序方式
     * @return EventPageResponse
     */
    fun getEvents(
        age: Int?,
        dateFrom: LocalDate?,
        dateTo: LocalDate?,
        location: String?,
        page: Int,
        size: Int,
        sort: String
    ): EventPageResponse {
        // 建立查詢條件
        val spec = Specification.where(EventSpecifications.hasAge(age))
            .and(EventSpecifications.startTimeFrom(dateFrom))
            .and(EventSpecifications.startTimeTo(dateTo))
            .and(EventSpecifications.hasLocation(location))

        // 解析排序參數
        val sortObj = parseSort(sort)

        // 建立分頁請求
        val pageRequest = PageRequest.of(page, size, sortObj)

        // 執行查詢
        val eventPage: Page<Event> = eventRepository.findAll(spec, pageRequest)

        // 轉換為 DTO
        val eventDtos = eventPage.content.map { it.toDto() }

        // 建立分頁資訊
        val pageInfo = PageInfo(
            page = eventPage.number,
            size = eventPage.size,
            totalElements = eventPage.totalElements,
            totalPages = eventPage.totalPages,
            hasNext = eventPage.hasNext(),
            hasPrevious = eventPage.hasPrevious()
        )

        return EventPageResponse(
            data = eventDtos,
            page = pageInfo
        )
    }

    /**
     * 解析排序參數
     * 支援格式：startTime,asc 或 startTime,desc
     */
    private fun parseSort(sortParam: String): Sort {
        val parts = sortParam.split(",")
        return if (parts.size == 2) {
            val property = parts[0]
            val direction = if (parts[1].equals("desc", ignoreCase = true)) {
                Sort.Direction.DESC
            } else {
                Sort.Direction.ASC
            }
            Sort.by(direction, property)
        } else {
            // 預設排序：startTime 升序
            Sort.by(Sort.Direction.ASC, "startTime")
        }
    }

    /**
     * 依 ID 取得賽事詳情
     *
     * @param id 賽事 UUID
     * @return EventDetailResponse
     * @throws ResourceNotFoundException 當賽事不存在時
     */
    fun getEventById(id: UUID): EventDetailResponse {
        val event = eventRepository.findById(id).orElseThrow {
            ResourceNotFoundException(
                message = "賽事不存在：$id",
                field = "id",
                reason = "Event with id '$id' not found"
            )
        }

        val registeredCount = orderRepository.countActiveOrdersByEventId(id)

        val registrationStatus = calculateRegistrationStatus(
            registeredCount = registeredCount,
            capacity = event.capacity,
            registrationDeadline = event.registrationDeadline
        )

        return EventDetailResponse(
            data = event.toDetailDto(registeredCount, registrationStatus)
        )
    }

    /**
     * 計算報名狀態
     * - FULL：registeredCount >= capacity
     * - CLOSED：now > registrationDeadline
     * - OPEN：其他情況
     */
    private fun calculateRegistrationStatus(
        registeredCount: Int,
        capacity: Int,
        registrationDeadline: Instant
    ): RegistrationStatus {
        return when {
            registeredCount >= capacity -> RegistrationStatus.FULL
            Instant.now().isAfter(registrationDeadline) -> RegistrationStatus.CLOSED
            else -> RegistrationStatus.OPEN
        }
    }

    /**
     * Event Entity 轉換為 EventDto
     */
    private fun Event.toDto(): EventDto {
        return EventDto(
            id = this.id!!,
            name = this.name,
            ageMin = this.ageMin,
            ageMax = this.ageMax,
            startTime = this.startTime,
            location = this.location
        )
    }

    /**
     * Event Entity 轉換為 EventDetailDto
     */
    private fun Event.toDetailDto(registeredCount: Int, registrationStatus: RegistrationStatus): EventDetailDto {
        return EventDetailDto(
            id = this.id!!,
            name = this.name,
            description = this.description,
            ageRestriction = AgeRestrictionDto(
                minAge = this.ageMin,
                maxAge = this.ageMax,
                description = this.ageRestrictionNote,
                strictEnforcement = this.strictAgeEnforcement
            ),
            startTime = this.startTime,
            endTime = this.endTime,
            location = this.location,
            address = this.address,
            capacity = this.capacity,
            registeredCount = registeredCount,
            registrationStatus = registrationStatus,
            registrationDeadline = this.registrationDeadline,
            fee = this.fee,
            organizer = this.organizer,
            contactEmail = this.contactEmail,
            contactPhone = this.contactPhone,
            createdAt = this.createdAt,
            updatedAt = this.updatedAt
        )
    }
}
