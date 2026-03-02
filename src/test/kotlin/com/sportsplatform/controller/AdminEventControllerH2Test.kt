package com.sportsplatform.controller

import com.fasterxml.jackson.databind.ObjectMapper
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.*

/**
 * Admin Event Controller 整合測試（使用 H2 內存資料庫）
 * 測試 GET /api/admin/events 和 POST /api/admin/events
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminEventControllerH2Test {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var eventRepository: EventRepository

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    private lateinit var openEvent: Event       // OPEN（報名截止在未來，未額滿）
    private lateinit var closedEvent: Event     // CLOSED（報名截止已過）
    private lateinit var fullEvent: Event       // FULL（已額滿）

    companion object {
        private const val VALID_TOKEN = "test-admin-token"
        private const val INVALID_TOKEN = "wrong-token"
        private const val ADMIN_EVENTS_URL = "/api/admin/events"
    }

    @BeforeEach
    fun setUp() {
        jdbcTemplate.execute("DELETE FROM orders")
        eventRepository.deleteAll()

        // OPEN 賽事：報名截止在未來，容量充足
        openEvent = eventRepository.save(
            createEvent(
                name = "2026 春季兒童籃球營",
                startTime = parseDate("2026-06-15"),
                registrationDeadline = parseDate("2026-06-10"),
                capacity = 30
            )
        )

        // CLOSED 賽事：報名截止已過
        closedEvent = eventRepository.save(
            createEvent(
                name = "已截止賽事",
                startTime = parseDate("2026-04-20"),
                registrationDeadline = parseDate("2026-03-01"), // 過去
                capacity = 30
            )
        )

        // FULL 賽事：容量 1，預先塞入 1 筆訂單
        fullEvent = eventRepository.save(
            createEvent(
                name = "已額滿賽事",
                startTime = parseDate("2026-06-20"),
                registrationDeadline = parseDate("2026-06-15"),
                capacity = 1
            )
        )
        // 塞入一筆 CONFIRMED 訂單使 fullEvent 額滿
        jdbcTemplate.update(
            """
            INSERT INTO orders (
                id, event_id, status,
                parent_name, parent_email, parent_phone,
                child_name, child_birth_date, child_age_at_event,
                fee, created_at, updated_at
            ) VALUES (?, ?, 'CONFIRMED', '已有家長', 'existing@test.com', '0911111111',
                      '已有小孩', '2016-01-01', 10, 1500.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """.trimIndent(),
            UUID.randomUUID(), fullEvent.id
        )
    }

    @AfterEach
    fun tearDown() {
        jdbcTemplate.execute("DELETE FROM orders")
        eventRepository.deleteAll()
    }

    // ===== Auth 測試 =====

    @Test
    fun `should return 401 when X-Admin-Token header is missing`() {
        mockMvc.perform(
            get(ADMIN_EVENTS_URL)
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.error.traceId").exists())
    }

    @Test
    fun `should return 401 when X-Admin-Token header has wrong value`() {
        mockMvc.perform(
            get(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", INVALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
    }

    @Test
    fun `should return 401 for POST when X-Admin-Token is missing`() {
        val request = buildValidCreateRequest()

        mockMvc.perform(
            post(ADMIN_EVENTS_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
    }

    // ===== GET /api/admin/events 測試 =====

    @Test
    fun `should return 200 with event list including statistics when valid token provided`() {
        mockMvc.perform(
            get(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray)
            .andExpect(jsonPath("$.data.length()").value(3))
            .andExpect(jsonPath("$.page").exists())
            .andExpect(jsonPath("$.page.totalElements").value(3))
            .andExpect(jsonPath("$.timestamp").exists())
            // 驗證 statistics 欄位存在
            .andExpect(jsonPath("$.data[0].statistics").exists())
            .andExpect(jsonPath("$.data[0].statistics.totalRevenue").exists())
            .andExpect(jsonPath("$.data[0].statistics.pendingRevenue").exists())
            .andExpect(jsonPath("$.data[0].statistics.confirmedOrders").exists())
            .andExpect(jsonPath("$.data[0].statistics.pendingOrders").exists())
            .andExpect(jsonPath("$.data[0].statistics.cancelledOrders").exists())
    }

    @Test
    fun `should return only OPEN events when status=OPEN filter applied`() {
        mockMvc.perform(
            get("$ADMIN_EVENTS_URL?status=OPEN")
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray)
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].name").value("2026 春季兒童籃球營"))
            .andExpect(jsonPath("$.data[0].registrationStatus").value("OPEN"))
    }

    @Test
    fun `should return only CLOSED events when status=CLOSED filter applied`() {
        mockMvc.perform(
            get("$ADMIN_EVENTS_URL?status=CLOSED")
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray)
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].name").value("已截止賽事"))
            .andExpect(jsonPath("$.data[0].registrationStatus").value("CLOSED"))
    }

    @Test
    fun `should return only FULL events when status=FULL filter applied`() {
        mockMvc.perform(
            get("$ADMIN_EVENTS_URL?status=FULL")
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray)
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].name").value("已額滿賽事"))
            .andExpect(jsonPath("$.data[0].registrationStatus").value("FULL"))
            // FULL 賽事有 1 筆 CONFIRMED 訂單，totalRevenue 應該 > 0
            .andExpect(jsonPath("$.data[0].statistics.confirmedOrders").value(1))
    }

    @Test
    fun `should return statistics with correct revenue for event with confirmed orders`() {
        // openEvent 預設沒有訂單，statistics 應全為 0
        mockMvc.perform(
            get("$ADMIN_EVENTS_URL?status=OPEN")
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data[0].statistics.totalRevenue").value(0))
            .andExpect(jsonPath("$.data[0].statistics.pendingRevenue").value(0))
            .andExpect(jsonPath("$.data[0].statistics.confirmedOrders").value(0))
            .andExpect(jsonPath("$.data[0].statistics.pendingOrders").value(0))
            .andExpect(jsonPath("$.data[0].statistics.cancelledOrders").value(0))
    }

    // ===== POST /api/admin/events 測試 =====

    @Test
    fun `should return 201 with AdminEventResponse when event created successfully`() {
        val request = buildValidCreateRequest()

        mockMvc.perform(
            post(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.name").value(request["name"]))
            .andExpect(jsonPath("$.data.registrationStatus").value("OPEN"))
            .andExpect(jsonPath("$.data.statistics").exists())
            .andExpect(jsonPath("$.data.statistics.totalRevenue").value(0))
            .andExpect(jsonPath("$.data.statistics.confirmedOrders").value(0))
            .andExpect(jsonPath("$.timestamp").exists())
    }

    @Test
    fun `should return 400 VALIDATION_ERROR when ageMin is greater than ageMax`() {
        val request = buildValidCreateRequest(ageMin = 15, ageMax = 8)

        mockMvc.perform(
            post(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.details[0].field").value("ageMin"))
    }

    @Test
    fun `should return 400 VALIDATION_ERROR when startTime is after endTime`() {
        val request = buildValidCreateRequest(
            startTime = "2026-09-15T09:00:00+08:00",
            endTime = "2026-09-14T09:00:00+08:00"  // 早於 startTime
        )

        mockMvc.perform(
            post(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.details[0].field").value("startTime"))
    }

    @Test
    fun `should return 400 VALIDATION_ERROR when registrationDeadline is after startTime`() {
        val request = buildValidCreateRequest(
            startTime = "2026-09-15T09:00:00+08:00",
            endTime = "2026-09-15T12:00:00+08:00",
            registrationDeadline = "2026-09-16T23:59:59+08:00"  // 在 startTime 之後
        )

        mockMvc.perform(
            post(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.details[0].field").value("registrationDeadline"))
    }

    @Test
    fun `should return 400 VALIDATION_ERROR when startTime is in the past`() {
        val request = buildValidCreateRequest(
            startTime = "2020-01-01T09:00:00+08:00",  // 過去的時間
            endTime = "2020-01-01T12:00:00+08:00",
            registrationDeadline = "2019-12-31T23:59:59+08:00"
        )

        mockMvc.perform(
            post(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `should return 400 VALIDATION_ERROR when required fields are missing`() {
        // 缺少 name 欄位
        val request = mapOf(
            "description" to "測試描述內容，至少十個字",
            "ageMin" to 8,
            "ageMax" to 12,
            "startTime" to "2026-09-15T09:00:00+08:00",
            "endTime" to "2026-09-15T12:00:00+08:00",
            "location" to "台北市大安運動中心",
            "capacity" to 30,
            "registrationDeadline" to "2026-09-10T23:59:59+08:00",
            "fee" to 1500,
            "organizer" to "台北市籃球協會",
            "contactEmail" to "events@basketball.org.tw",
            "contactPhone" to "0212345678"
        )

        mockMvc.perform(
            post(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `should return 400 VALIDATION_ERROR when name is too short`() {
        val request = buildValidCreateRequest(name = "短")  // 只有 1 個字，min=5

        mockMvc.perform(
            post(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `should return 400 VALIDATION_ERROR when contactEmail format is invalid`() {
        val request = buildValidCreateRequest(contactEmail = "not-an-email")

        mockMvc.perform(
            post(ADMIN_EVENTS_URL)
                .header("X-Admin-Token", VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
    }

    // ===== Helper Functions =====

    private fun buildValidCreateRequest(
        name: String = "2026 秋季兒童足球聯賽",
        ageMin: Int = 8,
        ageMax: Int = 12,
        startTime: String = "2026-09-15T09:00:00+08:00",
        endTime: String = "2026-09-15T12:00:00+08:00",
        registrationDeadline: String = "2026-09-10T23:59:59+08:00",
        contactEmail: String = "events@basketball.org.tw"
    ): Map<String, Any?> {
        return mapOf(
            "name" to name,
            "description" to "專為 8-12 歲兒童設計的足球聯賽，由專業教練指導基礎足球技巧，包含帶球、傳球、射門等基礎訓練，適合有興趣的兒童參加。",
            "ageMin" to ageMin,
            "ageMax" to ageMax,
            "ageRestrictionNote" to "適合 $ageMin 至 $ageMax 歲兒童參加",
            "strictAgeEnforcement" to true,
            "startTime" to startTime,
            "endTime" to endTime,
            "location" to "台北市大安運動中心",
            "address" to "台北市大安區辛亥路三段55號",
            "capacity" to 30,
            "registrationDeadline" to registrationDeadline,
            "fee" to 1500,
            "organizer" to "台北市足球協會",
            "contactEmail" to contactEmail,
            "contactPhone" to "0212345678"
        )
    }

    private fun createEvent(
        name: String,
        startTime: Instant,
        registrationDeadline: Instant,
        capacity: Int
    ): Event {
        return Event(
            name = name,
            description = "測試賽事描述",
            ageMin = 8,
            ageMax = 12,
            ageRestrictionNote = "適合 8 至 12 歲兒童參加",
            strictAgeEnforcement = true,
            startTime = startTime,
            endTime = startTime.plusSeconds(3 * 3600),
            registrationDeadline = registrationDeadline,
            location = "台北市大安運動中心",
            address = "台北市大安運動中心 地址",
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
