package com.sportsplatform.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.*

/**
 * 訂單 Domain Entity
 * 對應 orders 資料表
 */
@Entity
@Table(name = "orders")
data class Order(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "event_id", nullable = false)
    val eventId: UUID,

    @Column(name = "status", nullable = false, length = 20)
    val status: String,

    @Column(name = "parent_name", nullable = false, length = 50)
    val parentName: String,

    @Column(name = "parent_email", nullable = false)
    val parentEmail: String,

    @Column(name = "parent_phone", nullable = false, length = 10)
    val parentPhone: String,

    @Column(name = "child_name", nullable = false, length = 50)
    val childName: String,

    @Column(name = "child_birth_date", nullable = false)
    val childBirthDate: LocalDate,

    @Column(name = "child_gender", length = 10)
    val childGender: String? = null,

    @Column(name = "child_age_at_event", nullable = false)
    val childAgeAtEvent: Int,

    @Column(name = "emergency_contact_name", length = 50)
    val emergencyContactName: String? = null,

    @Column(name = "emergency_contact_phone", length = 10)
    val emergencyContactPhone: String? = null,

    @Column(name = "emergency_contact_relationship", length = 50)
    val emergencyContactRelationship: String? = null,

    @Column(name = "notes", columnDefinition = "TEXT")
    val notes: String? = null,

    @Column(name = "fee", nullable = false, precision = 10, scale = 2)
    val fee: BigDecimal,

    @Column(name = "payment_deadline")
    val paymentDeadline: Instant? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)
