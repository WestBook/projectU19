package com.sportsplatform.controller

import com.sportsplatform.domain.Event
import com.sportsplatform.repository.EventRepository
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.*

/**
 * GET /api/events/{id} 整合測試（使用 H2 內存資料庫）
 * 此測試不需要 Docker，適合在無 Docker 環境中執行
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EventGetByIdH2Test {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var eventRepository: EventRepository

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    private lateinit var openEvent: Event
    private lateinit var closedEvent: Event

    @BeforeEach
    fun setUp() {
        // 清空 orders 先，再清空 events（FK 約束）
        jdbcTemplate.execute("DELETE FROM orders")
        eventRepository.deleteAll()

        // 報名截止日期為未來 → registrationStatus = OPEN
        openEvent = eventRepository.save(
            createEvent(
                name = "2026 春季兒童籃球營",
                ageMin = 8,
                ageMax = 12,
                startTime = parseDate("2026-04-15"),
                registrationDeadline = parseDate("2026-04-10"), // 未來，OPEN
                capacity = 30,
                location = "台北市大安運動中心"
            )
        )

        // 報名截止日期已過 → registrationStatus = CLOSED
        closedEvent = eventRepository.save(
            createEvent(
                name = "已截止賽事",
                ageMin = 6,
                ageMax = 10,
                startTime = parseDate("2026-03-20"),
                registrationDeadline = parseDate("2026-03-01"), // 過去，CLOSED
                capacity = 30,
                location = "台北市信義運動中心"
            )
        )
    }

    @AfterEach
    fun tearDown() {
        jdbcTemplate.execute("DELETE FROM orders")
        eventRepository.deleteAll()
    }

    @Test
    fun `should return 200 with full event detail when event exists`() {
        mockMvc.perform(
            get("/api/events/${openEvent.id}")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(openEvent.id.toString()))
            .andExpect(jsonPath("$.data.name").value("2026 春季兒童籃球營"))
            .andExpect(jsonPath("$.data.description").value("測試賽事描述"))
            .andExpect(jsonPath("$.data.ageRestriction.minAge").value(8))
            .andExpect(jsonPath("$.data.ageRestriction.maxAge").value(12))
            .andExpect(jsonPath("$.data.ageRestriction.strictEnforcement").value(true))
            .andExpect(jsonPath("$.data.startTime").exists())
            .andExpect(jsonPath("$.data.endTime").exists())
            .andExpect(jsonPath("$.data.location").value("台北市大安運動中心"))
            .andExpect(jsonPath("$.data.address").value("台北市大安運動中心 地址"))
            .andExpect(jsonPath("$.data.capacity").value(30))
            .andExpect(jsonPath("$.data.registeredCount").value(0))
            .andExpect(jsonPath("$.data.registrationStatus").value("OPEN"))
            .andExpect(jsonPath("$.data.registrationDeadline").exists())
            .andExpect(jsonPath("$.data.fee").value(1500.00))
            .andExpect(jsonPath("$.data.organizer").value("測試主辦單位"))
            .andExpect(jsonPath("$.data.contactEmail").value("test@example.com"))
            .andExpect(jsonPath("$.data.contactPhone").value("02-1234-5678"))
            .andExpect(jsonPath("$.data.createdAt").exists())
            .andExpect(jsonPath("$.data.updatedAt").exists())
            .andExpect(jsonPath("$.timestamp").exists())
    }

    @Test
    fun `should return 404 with RESOURCE_NOT_FOUND when event does not exist`() {
        val nonExistentId = UUID.randomUUID()

        mockMvc.perform(
            get("/api/events/$nonExistentId")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"))
            .andExpect(jsonPath("$.error.message").exists())
            .andExpect(jsonPath("$.error.traceId").exists())
            .andExpect(jsonPath("$.timestamp").exists())
    }

    @Test
    fun `should return 400 with INVALID_PARAMETER when id is not a valid UUID`() {
        mockMvc.perform(
            get("/api/events/not-a-valid-uuid")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("INVALID_PARAMETER"))
            .andExpect(jsonPath("$.error.message").exists())
            .andExpect(jsonPath("$.error.traceId").exists())
            .andExpect(jsonPath("$.timestamp").exists())
    }

    @Test
    fun `should return registrationStatus CLOSED when registrationDeadline has passed`() {
        mockMvc.perform(
            get("/api/events/${closedEvent.id}")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.registrationStatus").value("CLOSED"))
    }

    @Test
    fun `should return registrationStatus FULL when all capacity is taken`() {
        // 建立一個容量為 1 的賽事
        val fullEvent = eventRepository.save(
            createEvent(
                name = "已額滿賽事",
                ageMin = 8,
                ageMax = 12,
                startTime = parseDate("2026-04-20"),
                registrationDeadline = parseDate("2026-04-15"),
                capacity = 1,
                location = "台北市體育館"
            )
        )

        // 插入一筆 CONFIRMED 訂單使 registeredCount = 1 = capacity → FULL
        val orderId = UUID.randomUUID()
        jdbcTemplate.update(
            """
            INSERT INTO orders (
                id, event_id, status,
                parent_name, parent_email, parent_phone,
                child_name, child_birth_date, child_age_at_event,
                fee, created_at, updated_at
            ) VALUES (?, ?, 'CONFIRMED', '測試家長', 'parent@test.com', '0912345678',
                      '測試小孩', '2016-01-01', 10, 1500.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """.trimIndent(),
            orderId, fullEvent.id
        )

        mockMvc.perform(
            get("/api/events/${fullEvent.id}")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.registrationStatus").value("FULL"))
            .andExpect(jsonPath("$.data.registeredCount").value(1))
            .andExpect(jsonPath("$.data.capacity").value(1))
    }

    // Helper functions

    private fun createEvent(
        name: String,
        ageMin: Int,
        ageMax: Int,
        startTime: Instant,
        registrationDeadline: Instant,
        capacity: Int,
        location: String
    ): Event {
        return Event(
            name = name,
            description = "測試賽事描述",
            ageMin = ageMin,
            ageMax = ageMax,
            ageRestrictionNote = "適合 $ageMin 至 $ageMax 歲兒童參加",
            strictAgeEnforcement = true,
            startTime = startTime,
            endTime = startTime.plusSeconds(3 * 3600),
            registrationDeadline = registrationDeadline,
            location = location,
            address = "$location 地址",
            capacity = capacity,
            fee = BigDecimal("1500.00"),
            organizer = "測試主辦單位",
            contactEmail = "test@example.com",
            contactPhone = "02-1234-5678"
        )
    }

    private fun parseDate(date: String): Instant {
        return LocalDate.parse(date)
            .atStartOfDay(ZoneId.of("Asia/Taipei"))
            .toInstant()
    }
}
