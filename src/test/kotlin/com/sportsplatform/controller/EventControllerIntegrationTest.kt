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
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * EventController 整合測試
 * 使用 Testcontainers 啟動真實的 PostgreSQL 資料庫
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class EventControllerIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var eventRepository: EventRepository

    companion object {
        @Container
        @JvmStatic
        val postgresContainer = PostgreSQLContainer<Nothing>("postgres:14-alpine").apply {
            withDatabaseName("testdb")
            withUsername("test")
            withPassword("test")
        }

        @DynamicPropertySource
        @JvmStatic
        fun configureProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgresContainer::getJdbcUrl)
            registry.add("spring.datasource.username", postgresContainer::getUsername)
            registry.add("spring.datasource.password", postgresContainer::getPassword)
        }
    }

    @BeforeEach
    fun setUp() {
        // 清空資料庫
        eventRepository.deleteAll()

        // 插入測試資料
        val events = listOf(
            createEvent(
                name = "2026 春季兒童籃球營",
                ageMin = 8,
                ageMax = 12,
                startTime = parseDate("2026-03-15"),
                location = "台北市大安運動中心"
            ),
            createEvent(
                name = "兒童游泳體驗班",
                ageMin = 6,
                ageMax = 10,
                startTime = parseDate("2026-03-20"),
                location = "台北市信義運動中心"
            ),
            createEvent(
                name = "2026 兒童足球夏令營",
                ageMin = 9,
                ageMax = 14,
                startTime = parseDate("2026-04-10"),
                location = "新北市板橋體育場"
            ),
            createEvent(
                name = "兒童羽球初階班",
                ageMin = 7,
                ageMax = 13,
                startTime = parseDate("2026-04-25"),
                location = "桃園市立體育館"
            ),
            createEvent(
                name = "幼兒體操啟蒙課程",
                ageMin = 4,
                ageMax = 6,
                startTime = parseDate("2026-05-05"),
                location = "台中市體操訓練中心"
            )
        )

        eventRepository.saveAll(events)
    }

    @AfterEach
    fun tearDown() {
        eventRepository.deleteAll()
    }

    @Test
    fun `should return all events with default pagination`() {
        mockMvc.perform(
            get("/api/events")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray)
            .andExpect(jsonPath("$.data.length()").value(5))
            .andExpect(jsonPath("$.page.page").value(0))
            .andExpect(jsonPath("$.page.size").value(10))
            .andExpect(jsonPath("$.page.totalElements").value(5))
            .andExpect(jsonPath("$.page.totalPages").value(1))
            .andExpect(jsonPath("$.page.hasNext").value(false))
            .andExpect(jsonPath("$.page.hasPrevious").value(false))
            .andExpect(jsonPath("$.timestamp").exists())
    }

    @Test
    fun `should filter events by age`() {
        mockMvc.perform(
            get("/api/events")
                .param("age", "10")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.length()").value(3))
            .andExpect(jsonPath("$.data[0].name").value("2026 春季兒童籃球營"))
            .andExpect(jsonPath("$.data[1].name").value("兒童游泳體驗班"))
            .andExpect(jsonPath("$.data[2].name").value("兒童羽球初階班"))
    }

    @Test
    fun `should filter events by date range`() {
        mockMvc.perform(
            get("/api/events")
                .param("dateFrom", "2026-03-01")
                .param("dateTo", "2026-03-31")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.data[0].name").value("2026 春季兒童籃球營"))
            .andExpect(jsonPath("$.data[1].name").value("兒童游泳體驗班"))
    }

    @Test
    fun `should filter events by location`() {
        mockMvc.perform(
            get("/api/events")
                .param("location", "台北")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.data[0].name").value("2026 春季兒童籃球營"))
            .andExpect(jsonPath("$.data[1].name").value("兒童游泳體驗班"))
    }

    @Test
    fun `should support pagination`() {
        // 第一頁
        mockMvc.perform(
            get("/api/events")
                .param("page", "0")
                .param("size", "2")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.page.page").value(0))
            .andExpect(jsonPath("$.page.size").value(2))
            .andExpect(jsonPath("$.page.totalElements").value(5))
            .andExpect(jsonPath("$.page.totalPages").value(3))
            .andExpect(jsonPath("$.page.hasNext").value(true))
            .andExpect(jsonPath("$.page.hasPrevious").value(false))

        // 第二頁
        mockMvc.perform(
            get("/api/events")
                .param("page", "1")
                .param("size", "2")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.page.page").value(1))
            .andExpect(jsonPath("$.page.hasNext").value(true))
            .andExpect(jsonPath("$.page.hasPrevious").value(true))

        // 第三頁
        mockMvc.perform(
            get("/api/events")
                .param("page", "2")
                .param("size", "2")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.page.page").value(2))
            .andExpect(jsonPath("$.page.hasNext").value(false))
            .andExpect(jsonPath("$.page.hasPrevious").value(true))
    }

    @Test
    fun `should sort events by startTime ascending`() {
        mockMvc.perform(
            get("/api/events")
                .param("sort", "startTime,asc")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[0].name").value("2026 春季兒童籃球營"))
            .andExpect(jsonPath("$.data[4].name").value("幼兒體操啟蒙課程"))
    }

    @Test
    fun `should sort events by startTime descending`() {
        mockMvc.perform(
            get("/api/events")
                .param("sort", "startTime,desc")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[0].name").value("幼兒體操啟蒙課程"))
            .andExpect(jsonPath("$.data[4].name").value("2026 春季兒童籃球營"))
    }

    @Test
    fun `should support combined filters`() {
        mockMvc.perform(
            get("/api/events")
                .param("age", "10")
                .param("location", "台北")
                .param("dateFrom", "2026-03-01")
                .param("dateTo", "2026-03-31")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.length()").value(2))
    }

    @Test
    fun `should return 400 when age is invalid`() {
        mockMvc.perform(
            get("/api/events")
                .param("age", "20")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.message").value("年齡參數必須介於 1 到 18 之間"))
            .andExpect(jsonPath("$.error.details[0].field").value("age"))
            .andExpect(jsonPath("$.error.details[0].reason").value("must be between 1 and 18"))
            .andExpect(jsonPath("$.error.traceId").exists())
            .andExpect(jsonPath("$.timestamp").exists())
    }

    @Test
    fun `should return 400 when date range is invalid`() {
        mockMvc.perform(
            get("/api/events")
                .param("dateFrom", "2026-04-01")
                .param("dateTo", "2026-03-01")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.message").value("結束日期不可早於開始日期"))
            .andExpect(jsonPath("$.error.details[0].field").value("dateFrom"))
            .andExpect(jsonPath("$.error.details[1].field").value("dateTo"))
    }

    @Test
    fun `should return 400 when page is negative`() {
        mockMvc.perform(
            get("/api/events")
                .param("page", "-1")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `should return 400 when size is out of range`() {
        mockMvc.perform(
            get("/api/events")
                .param("size", "101")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `should return 400 when sort parameter is invalid`() {
        mockMvc.perform(
            get("/api/events")
                .param("sort", "name,asc")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `should return empty list when no events match filters`() {
        mockMvc.perform(
            get("/api/events")
                .param("location", "不存在的地點")
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray)
            .andExpect(jsonPath("$.data.length()").value(0))
            .andExpect(jsonPath("$.page.totalElements").value(0))
    }

    // Helper functions

    private fun createEvent(
        name: String,
        ageMin: Int,
        ageMax: Int,
        startTime: Instant,
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
            endTime = startTime.plusSeconds(3 * 3600), // 3 小時後
            registrationDeadline = startTime.minusSeconds(5 * 24 * 3600), // 5 天前
            location = location,
            address = "$location 地址",
            capacity = 30,
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
