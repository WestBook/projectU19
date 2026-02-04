package com.sportsplatform.repository

import com.sportsplatform.domain.Event
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Predicate
import jakarta.persistence.criteria.Root
import org.springframework.data.jpa.domain.Specification
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Event 查詢規格定義
 * 使用 JPA Criteria API 實現動態查詢條件
 */
object EventSpecifications {

    /**
     * 依年齡篩選賽事
     * 查詢條件：age_min <= age AND age_max >= age
     */
    fun hasAge(age: Int?): Specification<Event> {
        return Specification { root: Root<Event>, _: CriteriaQuery<*>, cb: CriteriaBuilder ->
            if (age == null) {
                null
            } else {
                cb.and(
                    cb.lessThanOrEqualTo(root.get("ageMin"), age),
                    cb.greaterThanOrEqualTo(root.get("ageMax"), age)
                )
            }
        }
    }

    /**
     * 依賽事開始日期篩選（起始日期）
     * 查詢條件：start_time >= dateFrom
     */
    fun startTimeFrom(dateFrom: LocalDate?): Specification<Event> {
        return Specification { root: Root<Event>, _: CriteriaQuery<*>, cb: CriteriaBuilder ->
            if (dateFrom == null) {
                null
            } else {
                val instant = dateFrom.atStartOfDay(ZoneId.of("Asia/Taipei")).toInstant()
                cb.greaterThanOrEqualTo(root.get("startTime"), instant)
            }
        }
    }

    /**
     * 依賽事開始日期篩選（結束日期）
     * 查詢條件：start_time < dateTo + 1 day (即當天結束前)
     */
    fun startTimeTo(dateTo: LocalDate?): Specification<Event> {
        return Specification { root: Root<Event>, _: CriteriaQuery<*>, cb: CriteriaBuilder ->
            if (dateTo == null) {
                null
            } else {
                // 包含 dateTo 當天的所有時間，所以要加一天
                val instant = dateTo.plusDays(1).atStartOfDay(ZoneId.of("Asia/Taipei")).toInstant()
                cb.lessThan(root.get("startTime"), instant)
            }
        }
    }

    /**
     * 依地點模糊比對篩選
     * 查詢條件：location LIKE '%location%'
     */
    fun hasLocation(location: String?): Specification<Event> {
        return Specification { root: Root<Event>, _: CriteriaQuery<*>, cb: CriteriaBuilder ->
            if (location.isNullOrBlank()) {
                null
            } else {
                cb.like(root.get("location"), "%$location%")
            }
        }
    }
}
