package com.sportsplatform.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.util.*

/**
 * 賽事 Domain Entity
 * 對應 events 資料表
 */
@Entity
@Table(name = "events")
data class Event(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "name", nullable = false, length = 100)
    val name: String,

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    val description: String,

    @Column(name = "age_min", nullable = false)
    val ageMin: Int,

    @Column(name = "age_max", nullable = false)
    val ageMax: Int,

    @Column(name = "age_restriction_note", length = 200)
    val ageRestrictionNote: String? = null,

    @Column(name = "strict_age_enforcement", nullable = false)
    val strictAgeEnforcement: Boolean = true,

    @Column(name = "start_time", nullable = false)
    val startTime: Instant,

    @Column(name = "end_time", nullable = false)
    val endTime: Instant,

    @Column(name = "registration_deadline", nullable = false)
    val registrationDeadline: Instant,

    @Column(name = "location", nullable = false, length = 100)
    val location: String,

    @Column(name = "address", length = 200)
    val address: String? = null,

    @Column(name = "capacity", nullable = false)
    val capacity: Int,

    @Column(name = "fee", nullable = false, precision = 10, scale = 2)
    val fee: BigDecimal,

    @Column(name = "organizer", nullable = false, length = 100)
    val organizer: String,

    @Column(name = "contact_email", nullable = false)
    val contactEmail: String,

    @Column(name = "contact_phone", nullable = false, length = 20)
    val contactPhone: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)
