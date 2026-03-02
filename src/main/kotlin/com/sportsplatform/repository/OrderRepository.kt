package com.sportsplatform.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

/**
 * Order Repository
 * 提供訂單相關資料查詢
 */
@Repository
interface OrderRepository : JpaRepository<com.sportsplatform.domain.Order, UUID> {

    /**
     * 計算特定賽事中狀態為 PENDING 或 CONFIRMED 的訂單數量
     * 用於計算 registeredCount（已報名人數）
     */
    @Query(
        "SELECT COUNT(o) FROM Order o WHERE o.eventId = :eventId AND o.status IN ('PENDING', 'CONFIRMED')"
    )
    fun countActiveOrdersByEventId(@Param("eventId") eventId: UUID): Int

    /**
     * 重複報名檢查：同一賽事 + 同一小孩（姓名 + 出生日期）+ 非 CANCELLED 狀態
     */
    fun existsByEventIdAndChildNameAndChildBirthDateAndStatusNot(
        eventId: UUID,
        childName: String,
        childBirthDate: LocalDate,
        status: String
    ): Boolean

    /**
     * 計算特定賽事指定狀態的訂單數量（Admin 統計用）
     */
    @Query(
        "SELECT COUNT(o) FROM Order o WHERE o.eventId = :eventId AND o.status = :status"
    )
    fun countByEventIdAndStatus(
        @Param("eventId") eventId: UUID,
        @Param("status") status: String
    ): Int

    /**
     * 計算特定賽事已確認或已完成訂單的總收入（Admin 統計用）
     */
    @Query(
        "SELECT COALESCE(SUM(o.fee), 0) FROM Order o WHERE o.eventId = :eventId AND o.status IN ('CONFIRMED', 'COMPLETED')"
    )
    fun sumConfirmedRevenueByEventId(@Param("eventId") eventId: UUID): BigDecimal

    /**
     * 計算特定賽事待付款訂單的預期收入（Admin 統計用）
     */
    @Query(
        "SELECT COALESCE(SUM(o.fee), 0) FROM Order o WHERE o.eventId = :eventId AND o.status = 'PENDING'"
    )
    fun sumPendingRevenueByEventId(@Param("eventId") eventId: UUID): BigDecimal

    /**
     * 計算特定賽事參賽兒童的平均年齡（Admin 統計用，僅計算有效訂單）
     */
    @Query(
        "SELECT AVG(CAST(o.childAgeAtEvent AS double)) FROM Order o WHERE o.eventId = :eventId AND o.status IN ('PENDING', 'CONFIRMED', 'COMPLETED')"
    )
    fun findAverageChildAgeByEventId(@Param("eventId") eventId: UUID): Double?
}
