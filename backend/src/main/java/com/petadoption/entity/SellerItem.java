package com.petadoption.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "seller_items")
public class SellerItem {

    @Id
    private Long id;

    private String title;

    private String category; // "Pet Care" or "Food"

    private String description;

    private Double price;

    private String brand;

    private Integer quantityInStock;

    private String imagePaths;

    private String suitableFor; // e.g. "Dogs", "Cats", "All"

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public Integer getQuantityInStock() { return quantityInStock; }
    public void setQuantityInStock(Integer quantityInStock) { this.quantityInStock = quantityInStock; }
    public String getImagePaths() { return imagePaths; }
    public void setImagePaths(String imagePaths) { this.imagePaths = imagePaths; }
    public String getSuitableFor() { return suitableFor; }
    public void setSuitableFor(String suitableFor) { this.suitableFor = suitableFor; }
}
