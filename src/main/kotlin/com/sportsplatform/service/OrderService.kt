package com.sportsplatform.service

import com.sportsplatform.domain.Order
import com.sportsplatform.dto.*
import com.sportsplatform.exception.BusinessLogicException
import com.sportsplatform.exception.ResourceNotFoundException
import com.sportsplatform.exception.ValidationException
import com.sportsplatform.repository.EventRepository
import com.sportsplatform.repository.OrderRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.*

/**
 * Order Service
 * 處理訂單建立業務邏輯，包含完整的驗證流程
 */
@Service
class OrderService(
    private val orderRepository: OrderRepository,
    private val eventRepository: EventRepository
) {

    private val logger = LoggerFactory.getLogger(OrderService::class.java)
    private val taipeiZone = ZoneId.of("Asia/Taipei")

    /**
     * 建立報名訂單
     *
     * 驗證流程（依序執行，任一失敗即停止）：
     * 1. 欄位格式驗證（由 @Valid 在 Controller 層處理）
     * 2. child.birthDate 必須是過去日期
     * 3. 賽事存在性
     * 4. 報名未截止
     * 5. 名額未滿
     * 6. 年齡驗證（嚴格/彈性模式）
     * 7. 重複報名檢查
     *
     * @param request 建立訂單請求
     * @return OrderResponse
     */
    @Transactional
    fun createOrder(request: CreateOrderRequest): OrderResponse {
        // 步驟 2：出生日期合理性驗證
        validateBirthDate(request.child.birthDate)

        // 步驟 3：賽事存在性驗證
        val event = eventRepository.findById(request.eventId).orElseThrow {
            ResourceNotFoundException(
                message = "找不到指定的賽事",
                field = "eventId",
                reason = "event with the specified ID does not exist"
            )
        }

        // 步驟 4：報名截止時間驗證
        val now = Instant.now()
        if (now.isAfter(event.registrationDeadline) || now == event.registrationDeadline) {
            val deadlineStr = event.registrationDeadline
                .atZone(taipeiZone)
                .toString()
                .replace("[Asia/Taipei]", "")
            throw BusinessLogicException(
                errorCode = "REGISTRATION_CLOSED",
                message = "賽事報名已截止",
                details = listOf(
                    ErrorFieldDetail(
                        field = "eventId",
                        reason = "registration deadline was $deadlineStr"
                    )
                )
            )
        }

        // 步驟 5：名額容量驗證（使用 synchronized 防止競爭條件）
        synchronized(this) {
            val registeredCount = orderRepository.countActiveOrdersByEventId(event.id!!)
            if (registeredCount >= event.capacity) {
                throw BusinessLogicException(
                    errorCode = "EVENT_FULL",
                    message = "賽事名額已滿，無法報名",
                    details = listOf(
                        ErrorFieldDetail(
                            field = "eventId",
                            reason = "event has reached maximum capacity ($registeredCount/${event.capacity})"
                        )
                    )
                )
            }
        }

        // 步驟 6：年齡驗證
        val eventDate = event.startTime.atZone(taipeiZone).toLocalDate()
        val childAgeAtEvent = Period.between(request.child.birthDate, eventDate).years

        val warnings = mutableListOf<OrderWarning>()
        val ageInRange = childAgeAtEvent in event.ageMin..event.ageMax

        if (!ageInRange) {
            if (event.strictAgeEnforcement) {
                // 嚴格模式：拒絕報名
                val reason = if (childAgeAtEvent < event.ageMin) {
                    "child age ($childAgeAtEvent) is below minimum age requirement (${event.ageMin})"
                } else {
                    "child age ($childAgeAtEvent) exceeds maximum age limit (${event.ageMax})"
                }
                throw BusinessLogicException(
                    errorCode = "AGE_NOT_ELIGIBLE",
                    message = "小孩年齡不符合賽事年齡限制",
                    details = listOf(
                        ErrorFieldDetail(
                            field = "child.birthDate",
                            reason = reason
                        )
                    )
                )
            } else {
                // 彈性模式：允許但加入警告
                warnings.add(
                    OrderWarning(
                        code = "AGE_BOUNDARY_WARNING",
                        message = "小孩年齡（${childAgeAtEvent}歲）超出賽事建議年齡範圍（${event.ageMin}-${event.ageMax}歲），" +
                            "已依主辦單位彈性規定允許報名，請確認參加意願"
                    )
                )
            }
        }

        // 步驟 7：重複報名驗證
        val isDuplicate = orderRepository.existsByEventIdAndChildNameAndChildBirthDateAndStatusNot(
            eventId = event.id!!,
            childName = request.child.name,
            childBirthDate = request.child.birthDate,
            status = "CANCELLED"
        )
        if (isDuplicate) {
            throw BusinessLogicException(
                errorCode = "DUPLICATE_REGISTRATION",
                message = "此小孩已報名該賽事",
                details = listOf(
                    ErrorFieldDetail(
                        field = "child",
                        reason = "child (${request.child.name}, ${request.child.birthDate}) has already registered for this event"
                    )
                )
            )
        }

        // 計算付款期限
        val paymentDeadline = minOf(
            event.registrationDeadline,
            now.plus(72, ChronoUnit.HOURS)
        )

        // 建立訂單
        val order = Order(
            eventId = event.id!!,
            status = "PENDING",
            parentName = request.parent.name,
            parentEmail = request.parent.email,
            parentPhone = request.parent.phone,
            childName = request.child.name,
            childBirthDate = request.child.birthDate,
            childGender = request.child.gender,
            childAgeAtEvent = childAgeAtEvent,
            emergencyContactName = request.emergencyContact?.name,
            emergencyContactPhone = request.emergencyContact?.phone,
            emergencyContactRelationship = request.emergencyContact?.relationship,
            notes = request.notes,
            fee = event.fee,
            paymentDeadline = paymentDeadline
        )

        val savedOrder = orderRepository.save(order)

        logger.info(
            "Order created successfully: orderId=${savedOrder.id}, eventId=${event.id}, " +
                "childName=${request.child.name}, childAgeAtEvent=$childAgeAtEvent"
        )

        return OrderResponse(
            data = savedOrder.toDto(
                eventName = event.name,
                warnings = warnings.ifEmpty { null }
            )
        )
    }

    /**
     * 驗證出生日期必須是過去日期
     */
    private fun validateBirthDate(birthDate: LocalDate) {
        val today = LocalDate.now(taipeiZone)
        if (!birthDate.isBefore(today)) {
            throw ValidationException(
                message = "出生日期不可為未來日期",
                details = listOf(
                    ErrorFieldDetail(
                        field = "child.birthDate",
                        reason = "birthDate must be in the past, got: $birthDate"
                    )
                )
            )
        }
    }

    /**
     * Order Entity 轉換為 OrderDto
     */
    private fun Order.toDto(eventName: String, warnings: List<OrderWarning>?): OrderDto {
        return OrderDto(
            id = this.id!!,
            eventId = this.eventId,
            eventName = eventName,
            status = this.status,
            parent = ParentInfo(
                name = this.parentName,
                email = this.parentEmail,
                phone = this.parentPhone
            ),
            child = ChildInfo(
                name = this.childName,
                birthDate = this.childBirthDate,
                gender = this.childGender
            ),
            childAgeAtEvent = this.childAgeAtEvent,
            emergencyContact = if (this.emergencyContactName != null && this.emergencyContactPhone != null) {
                EmergencyContact(
                    name = this.emergencyContactName,
                    phone = this.emergencyContactPhone,
                    relationship = this.emergencyContactRelationship
                )
            } else null,
            notes = this.notes,
            fee = this.fee,
            paymentDeadline = this.paymentDeadline,
            createdAt = this.createdAt,
            updatedAt = this.updatedAt,
            warnings = warnings
        )
    }
}
