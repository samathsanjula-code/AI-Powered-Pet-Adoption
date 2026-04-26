package com.petadoption.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "pets")
public class Pet {

    @Id
    private String mongoId;
    @Field("PetID")
    private Long petId;

    private String registrationType;

    private String category;
    @Field("PetType")
    private String petType;
    @Field("Breed")
    private String breed;
    @Field("AgeMonths")
    private Integer ageMonths;
    @Field("Color")
    private String color;
    @Field("Size")
    private String size;
    @Field("WeightKg")
    private Double weightKg;

    @Field("Vaccinated")
    private Integer vaccinated = 0;

    @Field("HealthCondition")
    private Integer healthCondition = 0;
    @Field("PreviousOwner")
    private Integer previousOwner = 0;
    @Field("AdoptionLikelihood")
    private Integer adoptionLikelihood = 0;
    @Field("TimeInShelterDays")
    private Integer timeInShelterDays = 0;
    @Field("AdoptionFee")
    private Double adoptionFee = 0.0;

    private String contactName;

    private String phoneNumber;

    private Long userId;

    private String imagePaths;
    private String imageLocation;

    public String getMongoId() { return mongoId; }
    public void setMongoId(String mongoId) { this.mongoId = mongoId; }
    public Long getId() { return petId; }
    public void setId(Long id) { this.petId = id; }
    public String getRegistrationType() { return registrationType; }
    public void setRegistrationType(String registrationType) { this.registrationType = registrationType; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getPetType() { return petType; }
    public void setPetType(String petType) { this.petType = petType; }
    public String getBreed() { return breed; }
    public void setBreed(String breed) { this.breed = breed; }
    public Integer getAgeMonths() { return ageMonths; }
    public void setAgeMonths(Integer ageMonths) { this.ageMonths = ageMonths; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    public Double getWeightKg() { return weightKg; }
    public void setWeightKg(Double weightKg) { this.weightKg = weightKg; }
    public Integer getVaccinated() { return vaccinated; }
    public void setVaccinated(Integer vaccinated) { this.vaccinated = vaccinated; }
    public Integer getHealthCondition() { return healthCondition; }
    public void setHealthCondition(Integer healthCondition) { this.healthCondition = healthCondition; }
    public Integer getPreviousOwner() { return previousOwner; }
    public void setPreviousOwner(Integer previousOwner) { this.previousOwner = previousOwner; }
    public Integer getAdoptionLikelihood() { return adoptionLikelihood; }
    public void setAdoptionLikelihood(Integer adoptionLikelihood) { this.adoptionLikelihood = adoptionLikelihood; }
    public Integer getTimeInShelterDays() { return timeInShelterDays; }
    public void setTimeInShelterDays(Integer timeInShelterDays) { this.timeInShelterDays = timeInShelterDays; }
    public Double getAdoptionFee() { return adoptionFee; }
    public void setAdoptionFee(Double adoptionFee) { this.adoptionFee = adoptionFee; }
    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getImagePaths() { return imagePaths; }
    public void setImagePaths(String imagePaths) { this.imagePaths = imagePaths; }
    public String getImageLocation() { return imageLocation; }
    public void setImageLocation(String imageLocation) { this.imageLocation = imageLocation; }
}
