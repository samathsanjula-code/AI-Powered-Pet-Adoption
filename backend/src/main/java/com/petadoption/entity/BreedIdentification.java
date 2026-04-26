package com.petadoption.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "breed_identifications")
public class BreedIdentification {

    @Id
    private Long id;

    private String guessedBreed;

    private String confidenceLevel;

    private String petCategory;

    private String petSize;

    private String coatColor;

    private String estimatedAge;

    private String additionalNotes;

    private String imagePaths;

    private String requesterName;

    private String requesterEmail;

    private String adminResponse;

    private String responseStatus;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getGuessedBreed() { return guessedBreed; }
    public void setGuessedBreed(String guessedBreed) { this.guessedBreed = guessedBreed; }
    public String getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(String confidenceLevel) { this.confidenceLevel = confidenceLevel; }
    public String getPetCategory() { return petCategory; }
    public void setPetCategory(String petCategory) { this.petCategory = petCategory; }
    public String getPetSize() { return petSize; }
    public void setPetSize(String petSize) { this.petSize = petSize; }
    public String getCoatColor() { return coatColor; }
    public void setCoatColor(String coatColor) { this.coatColor = coatColor; }
    public String getEstimatedAge() { return estimatedAge; }
    public void setEstimatedAge(String estimatedAge) { this.estimatedAge = estimatedAge; }
    public String getAdditionalNotes() { return additionalNotes; }
    public void setAdditionalNotes(String additionalNotes) { this.additionalNotes = additionalNotes; }
    public String getImagePaths() { return imagePaths; }
    public void setImagePaths(String imagePaths) { this.imagePaths = imagePaths; }
    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }
    public String getRequesterEmail() { return requesterEmail; }
    public void setRequesterEmail(String requesterEmail) { this.requesterEmail = requesterEmail; }
    public String getAdminResponse() { return adminResponse; }
    public void setAdminResponse(String adminResponse) { this.adminResponse = adminResponse; }
    public String getResponseStatus() { return responseStatus; }
    public void setResponseStatus(String responseStatus) { this.responseStatus = responseStatus; }
}
