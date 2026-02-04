-- =====================================================
-- V1: Create Events and Orders Tables
-- =====================================================
-- Description: 初始化資料庫 schema，建立賽事 (events) 和訂單 (orders) 表格
-- Author: Backend Team
-- Date: 2026-02-03
-- =====================================================

-- =====================================================
-- Events Table: 賽事資訊
-- =====================================================
CREATE TABLE events (
    -- 主鍵
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 基本資訊
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,

    -- 年齡限制
    age_min INTEGER NOT NULL CHECK (age_min >= 1 AND age_min <= 18),
    age_max INTEGER NOT NULL CHECK (age_max >= 1 AND age_max <= 18),
    age_restriction_note VARCHAR(200),
    strict_age_enforcement BOOLEAN NOT NULL DEFAULT true,

    -- 時間資訊
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,

    -- 地點資訊
    location VARCHAR(100) NOT NULL,
    address VARCHAR(200),

    -- 容量資訊
    capacity INTEGER NOT NULL CHECK (capacity > 0),

    -- 費用
    fee DECIMAL(10, 2) NOT NULL CHECK (fee >= 0),

    -- 主辦單位資訊
    organizer VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,

    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- 約束條件
    CONSTRAINT chk_age_range CHECK (age_min <= age_max),
    CONSTRAINT chk_time_range CHECK (start_time < end_time),
    CONSTRAINT chk_registration_before_event CHECK (registration_deadline < start_time)
);

-- 建立索引以優化查詢效能
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_location ON events(location);
CREATE INDEX idx_events_age_range ON events(age_min, age_max);
CREATE INDEX idx_events_registration_deadline ON events(registration_deadline);

-- 為 events 表格建立註解
COMMENT ON TABLE events IS '賽事資訊表';
COMMENT ON COLUMN events.id IS '賽事唯一識別碼';
COMMENT ON COLUMN events.name IS '賽事名稱';
COMMENT ON COLUMN events.description IS '賽事詳細說明';
COMMENT ON COLUMN events.age_min IS '最小參賽年齡';
COMMENT ON COLUMN events.age_max IS '最大參賽年齡';
COMMENT ON COLUMN events.age_restriction_note IS '年齡限制說明文字';
COMMENT ON COLUMN events.strict_age_enforcement IS '是否嚴格執行年齡限制';
COMMENT ON COLUMN events.capacity IS '最大參加人數';
COMMENT ON COLUMN events.fee IS '報名費用（新台幣）';

-- =====================================================
-- Orders Table: 報名訂單
-- =====================================================
CREATE TABLE orders (
    -- 主鍵
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 賽事關聯
    event_id UUID NOT NULL,

    -- 訂單狀態
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'COMPLETED')),

    -- 家長資訊
    parent_name VARCHAR(50) NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(10) NOT NULL,

    -- 小孩資訊
    child_name VARCHAR(50) NOT NULL,
    child_birth_date DATE NOT NULL,
    child_gender VARCHAR(10) CHECK (child_gender IN ('MALE', 'FEMALE', 'OTHER')),
    child_age_at_event INTEGER NOT NULL,

    -- 緊急聯絡人（可選）
    emergency_contact_name VARCHAR(50),
    emergency_contact_phone VARCHAR(10),
    emergency_contact_relationship VARCHAR(50),

    -- 備註
    notes TEXT,

    -- 費用與付款
    fee DECIMAL(10, 2) NOT NULL CHECK (fee >= 0),
    payment_deadline TIMESTAMP WITH TIME ZONE,

    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- 外鍵約束
    CONSTRAINT fk_orders_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 建立索引以優化查詢效能
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_parent_email ON orders(parent_email);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 為 orders 表格建立註解
COMMENT ON TABLE orders IS '報名訂單表';
COMMENT ON COLUMN orders.id IS '訂單唯一識別碼';
COMMENT ON COLUMN orders.event_id IS '關聯的賽事 ID';
COMMENT ON COLUMN orders.status IS '訂單狀態：PENDING(待付款), CONFIRMED(已確認), CANCELLED(已取消), REFUNDED(已退款), COMPLETED(已完成)';
COMMENT ON COLUMN orders.child_age_at_event IS '小孩於賽事當日的年齡';
COMMENT ON COLUMN orders.fee IS '報名費用';
COMMENT ON COLUMN orders.payment_deadline IS '付款期限';

-- =====================================================
-- Update Trigger: 自動更新 updated_at 欄位
-- =====================================================

-- 建立更新時間戳記的函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 events 表格建立觸發器
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 為 orders 表格建立觸發器
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
