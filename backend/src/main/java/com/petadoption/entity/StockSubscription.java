package com.petadoption.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "stock_subscriptions")
public class StockSubscription {

    @Id
    private Long id;
    private Long userId;
    private Long sellerItemId;
    private String itemTitle;

    public StockSubscription() {}

    public StockSubscription(Long id, Long userId, Long sellerItemId, String itemTitle) {
        this.id = id;
        this.userId = userId;
        this.sellerItemId = sellerItemId;
        this.itemTitle = itemTitle;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getSellerItemId() { return sellerItemId; }
    public void setSellerItemId(Long sellerItemId) { this.sellerItemId = sellerItemId; }
    public String getItemTitle() { return itemTitle; }
    public void setItemTitle(String itemTitle) { this.itemTitle = itemTitle; }
}
