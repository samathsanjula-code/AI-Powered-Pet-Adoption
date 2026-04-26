package com.petadoption.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "notifications")
public class Notification {

    @Id
    private Long id;
    private Long userId;
    private String message;
    private String type; // ORDER_STATUS, STOCK_ALERT
    private boolean isRead;
    private LocalDateTime createdAt;
    private Long relatedId; // orderId or itemId

    public Notification() {}

    public Notification(Long id, Long userId, String message, String type, Long relatedId) {
        this.id = id;
        this.userId = userId;
        this.message = message;
        this.type = type;
        this.relatedId = relatedId;
        this.isRead = false;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getRelatedId() { return relatedId; }
    public void setRelatedId(Long relatedId) { this.relatedId = relatedId; }
}
