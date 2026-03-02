package com.sportsplatform.service

import com.sportsplatform.domain.Event
import com.sportsplatform.dto.AgeRestrictionDto
import com.sportsplatform.dto.AdminEventDetailDto
import com.sportsplatform.dto.AdminEventPageResponse
import com.sportsplatform.dto.AdminEventResponse
import com.sportsplatform.dto.CreateEventRequest
import com.sportsplatform.dto.ErrorFieldDetail
import com.sportsplatform.dto.EventStatisticsDto
import com.sportsplatform.dto.PageInfo
import com.sportsplatform.dto.RegistrationStatus
import com.sportsplatform.exception.ValidationException
import com.sportsplatform.repository.EventRepository
import com.sportsplatform.repository.EventSpecifications
import com.sportsplatform.repository.OrderRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.util.*

/**
 * Admin Event Service
 * 處理管理員賽事相關業務邏輯
 */
@Service
class AdminEventService(
    private val eventRepository: EventRepository,
    private val orderRepository: OrderRepository
) {

    private val logger = LoggerFactory.getLogger(AdminEventService::class.java)

    /**
     * 管理員查詢賽事列表
     * 支援依 status、dateFrom、dateTo 過濾，以及分頁與排序
     */
    fun getAdminEvents(
        status: String?,
        dateFrom: LocalDate?,
        dateTo: LocalDate?,
        page: Int,
        size: Int,
        sort: String
    ): AdminEventPageResponse {
        // 建立日期查詢條件
        val spec = Specification.where(EventSpecifications.startTimeFrom(dateFrom))
            .and(EventSpecifications.startTimeTo(dateTo))

        // 解析排序參數
        val sortObj = parseAdminSort(sort)

        // 建立分頁請求（先取所有符合日期條件的資料，status 在記憶體過濾）
        // 因為 status 是動態計算的（依據 registeredCount），無法在 DB 層過濾
        val pageRequest = PageRequest.of(page, size, sortObj)
        val eventPage = eventRepository.findAll(spec, pageRequest)

        // 將每個 event 轉換為包含統計資訊的 AdminEventDetailDto
        val allDetailDtos = eventPage.content.map { event ->
            val registeredCount = orderRepository.countActiveOrdersByEventId(event.id!!)
            val registrationStatus = calculateRegistrationStatus(registeredCount, event.capacity, event.registrationDeadline)
            val statistics = buildStatistics(event.id)
            event.toAdminDetailDto(registeredCount, registrationStatus, statistics)
        }

        // 依 status 過濾（記憶體層）
        val filteredDtos = if (status != null) {
            val targetStatus = RegistrationStatus.valueOf(status)
            allDetailDtos.filter { it.registrationStatus == targetStatus }
        } else {
            allDetailDtos
        }

        val pageInfo = PageInfo(
            page = eventPage.number,
            size = eventPage.size,
            totalElements = if (status != null) filteredDtos.size.toLong() else eventPage.totalElements,
            totalPages = if (status != null) {
                if (filteredDtos.isEmpty()) 0 else 1
            } else eventPage.totalPages,
            hasNext = if (status != null) false else eventPage.hasNext(),
            hasPrevious = if (status != null) false else eventPage.hasPrevious()
        )

        return AdminEventPageResponse(
            data = filteredDtos,
            page = pageInfo
        )
    }

    /**
     * 管理員建立新賽事
     * 包含業務邏輯驗證：時間順序、年齡範圍、未來開始時間
     */
    @Transactional
    fun createEvent(request: CreateEventRequest): AdminEventResponse {
        // 業務邏輯驗證
        validateCreateEventRequest(request)

        val now = Instant.now()
        val event = Event(
            name = request.name,
            description = request.description,
            ageMin = request.ageMin,
            ageMax = request.ageMax,
            ageRestrictionNote = request.ageRestrictionNote,
            strictAgeEnforcement = request.strictAgeEnforcement,
            startTime = request.startTime,
            endTime = request.endTime,
            registrationDeadline = request.registrationDeadline,
            location = request.location,
            address = request.address,
            capacity = request.capacity,
            fee = request.fee,
            organizer = request.organizer,
            contactEmail = request.contactEmail,
            contactPhone = request.contactPhone,
            createdAt = now,
            updatedAt = now
        )

        val saved = eventRepository.save(event)
        logger.info("Admin created new event: id=${saved.id}, name=${saved.name}")

        val registrationStatus = calculateRegistrationStatus(0, saved.capacity, saved.registrationDeadline)
        val statistics = buildStatistics(saved.id!!)

        return AdminEventResponse(
            data = saved.toAdminDetailDto(0, registrationStatus, statistics)
        )
    }

    /**
     * 業務邏輯驗證
     */
    private fun validateCreateEventRequest(request: CreateEventRequest) {
        val errors = mutableListOf<ErrorFieldDetail>()

        // ageMin <= ageMax
        if (request.ageMin > request.ageMax) {
            errors.add(ErrorFieldDetail(field = "ageMin", reason = "ageMin 不可大於 ageMax"))
        }

        // startTime < endTime
        if (!request.startTime.isBefore(request.endTime)) {
            errors.add(ErrorFieldDetail(field = "startTime", reason = "startTime 必須早於 endTime"))
        }

        // registrationDeadline < startTime
        if (!request.registrationDeadline.isBefore(request.startTime)) {
            errors.add(ErrorFieldDetail(field = "registrationDeadline", reason = "registrationDeadline 必須早於 startTime"))
        }

        // startTime 必須在未來
        if (!request.startTime.isAfter(Instant.now())) {
            errors.add(ErrorFieldDetail(field = "startTime", reason = "startTime 必須是未來的時間"))
        }

        if (errors.isNotEmpty()) {
            throw ValidationException("請求參數驗證失敗", errors)
        }
    }

    /**
     * 計算報名狀態
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
     * 從訂單資料計算賽事統計
     */
    private fun buildStatistics(eventId: UUID): EventStatisticsDto {
        val confirmedOrders = orderRepository.countByEventIdAndStatus(eventId, "CONFIRMED")
        val pendingOrders = orderRepository.countByEventIdAndStatus(eventId, "PENDING")
        val cancelledOrders = orderRepository.countByEventIdAndStatus(eventId, "CANCELLED")
        val totalRevenue = orderRepository.sumConfirmedRevenueByEventId(eventId)
        val pendingRevenue = orderRepository.sumPendingRevenueByEventId(eventId)
        val averageChildAge = orderRepository.findAverageChildAgeByEventId(eventId)

        return EventStatisticsDto(
            totalRevenue = totalRevenue,
            pendingRevenue = pendingRevenue,
            confirmedOrders = confirmedOrders,
            pendingOrders = pendingOrders,
            cancelledOrders = cancelledOrders,
            averageChildAge = averageChildAge
        )
    }

    /**
     * 解析 Admin 排序參數
     * 支援格式：createdAt,desc / createdAt,asc / startTime,asc / startTime,desc
     */
    private fun parseAdminSort(sortParam: String): Sort {
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
            Sort.by(Sort.Direction.DESC, "createdAt")
        }
    }

    /**
     * Event Entity 轉換為 AdminEventDetailDto
     */
    private fun Event.toAdminDetailDto(
        registeredCount: Int,
        registrationStatus: RegistrationStatus,
        statistics: EventStatisticsDto
    ): AdminEventDetailDto {
        return AdminEventDetailDto(
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
            updatedAt = this.updatedAt,
            statistics = statistics
        )
    }
}
