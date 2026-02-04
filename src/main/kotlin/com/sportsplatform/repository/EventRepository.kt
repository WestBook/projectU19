package com.sportsplatform.repository

import com.sportsplatform.domain.Event
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Event Repository
 * 支援 JpaSpecificationExecutor 以實現動態查詢
 */
@Repository
interface EventRepository : JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event>
