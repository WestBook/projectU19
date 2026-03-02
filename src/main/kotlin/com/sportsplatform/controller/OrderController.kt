package com.sportsplatform.controller

import com.sportsplatform.dto.CreateOrderRequest
import com.sportsplatform.dto.OrderResponse
import com.sportsplatform.service.OrderService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

/**
 * Order Controller
 * 處理訂單相關 API 請求
 */
@RestController
@RequestMapping("/api/orders")
class OrderController(
    private val orderService: OrderService
) {

    /**
     * POST /api/orders
     * 建立報名訂單
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createOrder(@RequestBody @Valid request: CreateOrderRequest): OrderResponse {
        return orderService.createOrder(request)
    }
}
