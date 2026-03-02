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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.*

/**
 * POST /api/orders 整合測試（使用 H2 內存資料庫）
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderControllerH2Test {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var eventRepository: EventRepository

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    private lateinit var openEvent: Event          // OPEN, strictAgeEnforcement=true, ageMin=8, ageMax=12
    private lateinit var closedEvent: Event        // 已截止
    private lateinit var fullEvent: Event          // 已額滿
    private lateinit var nonStrictEvent: Event     // OPEN, strictAgeEnforcement=false, ageMin=8, ageMax=12

    @BeforeEach
    fun setUp() {
        jdbcTemplate.execute("DELETE FROM orders")
        eventRepository.deleteAll()

        // 標準 OPEN 賽事，嚴格年齡，容量 30
        openEvent = eventRepository.save(
            createEvent(
                name = "2026 春季兒童籃球營",
                ageMin = 8,
                ageMax = 12,
                startTime = parseDate("2026-06-15"),
                registrationDeadline = parseDate("2026-06-10"),
                capacity = 30,
                strictAgeEnforcement = true
            )
        )

        // 報名截止賽事（deadline 已過）
        closedEvent = eventRepository.save(
            createEvent(
                name = "已截止賽事",
                ageMin = 8,
                ageMax = 12,
                startTime = parseDate("2026-04-20"),
                registrationDeadline = parseDate("2026-03-01"), // 過去
                capacity = 30,
                strictAgeEnforcement = true
            )
        )

        // 已額滿賽事（容量 1，預先塞入 1 筆訂單）
        fullEvent = eventRepository.save(
            createEvent(
                name = "已額滿賽事",
                ageMin = 8,
                ageMax = 12,
                startTime = parseDate("2026-06-20"),
                registrationDeadline = parseDate("2026-06-15"),
                capacity = 1,
                strictAgeEnforcement = true
            )
        )
        // 塞入一筆訂單使其額滿
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

        // 彈性年齡驗證賽事
        nonStrictEvent = eventRepository.save(
            createEvent(
                name = "彈性年齡賽事",
                ageMin = 8,
                ageMax = 12,
                startTime = parseDate("2026-06-15"),
                registrationDeadline = parseDate("2026-06-10"),
                capacity = 30,
                strictAgeEnforcement = false
            )
        )
    }

    @AfterEach
    fun tearDown() {
        jdbcTemplate.execute("DELETE FROM orders")
        eventRepository.deleteAll()
    }

    // ===== 成功案例 =====

    @Test
    fun `should return 201 with complete fields when order is created successfully`() {
        val request = mapOf(
            "eventId" to openEvent.id.toString(),
            "parent" to mapOf(
                "name" to "王小明",
                "email" to "parent@example.com",
                "phone" to "0912345678"
            ),
            "child" to mapOf(
                "name" to "王小華",
                "birthDate" to "2016-05-15",
                "gender" to "MALE"
            ),
            "emergencyContact" to mapOf(
                "name" to "王大明",
                "phone" to "0987654321",
                "relationship" to "父親"
            ),
            "notes" to "小孩對花生過敏"
        )

        // event.startTime=2026-06-15, birthDate=2016-05-15 → age=10（已過五月生日）
        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.eventId").value(openEvent.id.toString()))
            .andExpect(jsonPath("$.data.eventName").value("2026 春季兒童籃球營"))
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andExpect(jsonPath("$.data.parent.name").value("王小明"))
            .andExpect(jsonPath("$.data.parent.email").value("parent@example.com"))
            .andExpect(jsonPath("$.data.parent.phone").value("0912345678"))
            .andExpect(jsonPath("$.data.child.name").value("王小華"))
            .andExpect(jsonPath("$.data.child.birthDate").value("2016-05-15"))
            .andExpect(jsonPath("$.data.child.gender").value("MALE"))
            .andExpect(jsonPath("$.data.childAgeAtEvent").value(10))
            .andExpect(jsonPath("$.data.emergencyContact.name").value("王大明"))
            .andExpect(jsonPath("$.data.emergencyContact.phone").value("0987654321"))
            .andExpect(jsonPath("$.data.emergencyContact.relationship").value("父親"))
            .andExpect(jsonPath("$.data.notes").value("小孩對花生過敏"))
            .andExpect(jsonPath("$.data.fee").value(1500.0))
            .andExpect(jsonPath("$.data.paymentDeadline").exists())
            .andExpect(jsonPath("$.data.createdAt").exists())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.timestamp").exists())
    }

    @Test
    fun `should return 201 with minimal fields when optional fields are omitted`() {
        val request = mapOf(
            "eventId" to openEvent.id.toString(),
            "parent" to mapOf(
                "name" to "李美麗",
                "email" to "li@example.com",
                "phone" to "0923456789"
            ),
            "child" to mapOf(
                "name" to "李小安",
                "birthDate" to "2015-03-10"
            )
        )

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andExpect(jsonPath("$.data.child.name").value("李小安"))
            .andExpect(jsonPath("$.data.emergencyContact").doesNotExist())
            .andExpect(jsonPath("$.data.notes").doesNotExist())
    }

    @Test
    fun `should return 201 with warnings when strictAgeEnforcement is false and age is out of range`() {
        // nonStrictEvent: ageMin=8, ageMax=12, startTime=2026-06-15
        // birthDate=2012-01-01 → age=14（超出上限12）
        val request = mapOf(
            "eventId" to nonStrictEvent.id.toString(),
            "parent" to mapOf(
                "name" to "陳大文",
                "email" to "chen@example.com",
                "phone" to "0933112233"
            ),
            "child" to mapOf(
                "name" to "陳小強",
                "birthDate" to "2012-01-01",
                "gender" to "MALE"
            )
        )

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andExpect(jsonPath("$.data.warnings").isArray)
            .andExpect(jsonPath("$.data.warnings[0].code").value("AGE_BOUNDARY_WARNING"))
            .andExpect(jsonPath("$.data.warnings[0].message").exists())
    }

    // ===== 失敗案例 400 =====

    @Test
    fun `should return 400 when parent phone format is invalid`() {
        val request = mapOf(
            "eventId" to openEvent.id.toString(),
            "parent" to mapOf(
                "name" to "王小明",
                "email" to "parent@example.com",
                "phone" to "02-12345678"  // 市話格式，不接受
            ),
            "child" to mapOf(
                "name" to "王小華",
                "birthDate" to "2016-05-15"
            )
        )

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.traceId").exists())
    }

    @Test
    fun `should return 400 when child birthDate is in the future`() {
        val request = mapOf(
            "eventId" to openEvent.id.toString(),
            "parent" to mapOf(
                "name" to "王小明",
                "email" to "parent@example.com",
                "phone" to "0912345678"
            ),
            "child" to mapOf(
                "name" to "王未來",
                "birthDate" to "2028-06-01"  // 未來日期
            )
        )

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.details[0].field").value("child.birthDate"))
    }

    @Test
    fun `should return 400 when parent email format is invalid`() {
        val request = mapOf(
            "eventId" to openEvent.id.toString(),
            "parent" to mapOf(
                "name" to "王小明",
                "email" to "invalid-email-format",
                "phone" to "0912345678"
            ),
            "child" to mapOf(
                "name" to "王小華",
                "birthDate" to "2016-05-15"
            )
        )

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.traceId").exists())
    }

    // ===== 失敗案例 409 =====

    @Test
    fun `should return 409 AGE_NOT_ELIGIBLE when strictAgeEnforcement is true and age is out of range`() {
        // openEvent: ageMin=8, ageMax=12, startTime=2026-06-15, strictAgeEnforcement=true
        // birthDate=2020-01-01 → age=6（低於 ageMin=8）
        val request = mapOf(
            "eventId" to openEvent.id.toString(),
            "parent" to mapOf(
                "name" to "王小明",
                "email" to "parent@example.com",
                "phone" to "0912345678"
            ),
            "child" to mapOf(
                "name" to "王小兒",
                "birthDate" to "2020-01-01"
            )
        )

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("AGE_NOT_ELIGIBLE"))
            .andExpect(jsonPath("$.error.details[0].field").value("child.birthDate"))
    }

    @Test
    fun `should return 409 EVENT_FULL when event has no remaining capacity`() {
        // fullEvent: capacity=1, already has 1 CONFIRMED order
        val request = mapOf(
            "eventId" to fullEvent.id.toString(),
            "parent" to mapOf(
                "name" to "新家長",
                "email" to "new@example.com",
                "phone" to "0922222222"
            ),
            "child" to mapOf(
                "name" to "新小孩",
                "birthDate" to "2016-05-15"
            )
        )

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("EVENT_FULL"))
    }

    @Test
    fun `should return 409 REGISTRATION_CLOSED when registration deadline has passed`() {
        val request = mapOf(
            "eventId" to closedEvent.id.toString(),
            "parent" to mapOf(
                "name" to "王小明",
                "email" to "parent@example.com",
                "phone" to "0912345678"
            ),
            "child" to mapOf(
                "name" to "王小華",
                "birthDate" to "2016-05-15"
            )
        )

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("REGISTRATION_CLOSED"))
    }

    @Test
    fun `should return 409 DUPLICATE_REGISTRATION when same child registers again`() {
        val request = mapOf(
            "eventId" to openEvent.id.toString(),
            "parent" to mapOf(
                "name" to "王小明",
                "email" to "parent@example.com",
                "phone" to "0912345678"
            ),
            "child" to mapOf(
                "name" to "重複小孩",
                "birthDate" to "2016-05-15"
            )
        )

        // 第一次報名
        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)

        // 第二次報名（重複）
        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("DUPLICATE_REGISTRATION"))
    }

    // ===== 失敗案例 404 =====

    @Test
    fun `should return 404 RESOURCE_NOT_FOUND when eventId does not exist`() {
        val request = mapOf(
            "eventId" to UUID.randomUUID().toString(),
            "parent" to mapOf(
                "name" to "王小明",
                "email" to "parent@example.com",
                "phone" to "0912345678"
            ),
            "child" to mapOf(
                "name" to "王小華",
                "birthDate" to "2016-05-15"
            )
        )

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"))
            .andExpect(jsonPath("$.error.traceId").exists())
    }

    // ===== Helper Functions =====

    private fun createEvent(
        name: String,
        ageMin: Int,
        ageMax: Int,
        startTime: Instant,
        registrationDeadline: Instant,
        capacity: Int,
        strictAgeEnforcement: Boolean
    ): Event {
        return Event(
            name = name,
            description = "測試賽事描述",
            ageMin = ageMin,
            ageMax = ageMax,
            ageRestrictionNote = "適合 $ageMin 至 $ageMax 歲兒童參加",
            strictAgeEnforcement = strictAgeEnforcement,
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
