package com.petadoption.entity;
public class SellerOrderItem {

    private Long id;

    private Long sellerItemId;
    private String itemTitle;
    private Double unitPrice;
    private Integer quantity;
    private Double lineTotal;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSellerItemId() { return sellerItemId; }
    public void setSellerItemId(Long sellerItemId) { this.sellerItemId = sellerItemId; }
    public String getItemTitle() { return itemTitle; }
    public void setItemTitle(String itemTitle) { this.itemTitle = itemTitle; }
    public Double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Double unitPrice) { this.unitPrice = unitPrice; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public Double getLineTotal() { return lineTotal; }
    public void setLineTotal(Double lineTotal) { this.lineTotal = lineTotal; }
}
