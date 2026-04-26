package com.petadoption.controller;

import com.petadoption.config.MongoIdSequenceService;
import com.petadoption.entity.BreedIdentification;
import com.petadoption.repository.BreedIdentificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api/breed-identifications")
@CrossOrigin(origins = "*")
public class BreedIdentificationController {

    @Autowired
    private BreedIdentificationRepository repository;

    @Autowired
    private MongoIdSequenceService idSequenceService;

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    private static final String SUBDIR = "breed";

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll(@RequestParam(value = "requesterEmail", required = false) String requesterEmail) {
        List<BreedIdentification> list;
        if (requesterEmail != null && !requesterEmail.trim().isEmpty()) {
            list = repository.findAllByRequesterEmailOrderByIdDesc(requesterEmail.trim().toLowerCase());
        } else {
            list = repository.findAllByOrderByIdDesc();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (BreedIdentification b : list) {
            result.add(toMap(b));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable Long id) {
        return repository.findById(id)
            .map(b -> ResponseEntity.ok(toMap(b)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> create(
            @RequestPart(value = "guessedBreed", required = false) String guessedBreed,
            @RequestPart(value = "confidenceLevel", required = false) String confidenceLevel,
            @RequestPart(value = "petCategory", required = false) String petCategory,
            @RequestPart(value = "petSize", required = false) String petSize,
            @RequestPart(value = "coatColor", required = false) String coatColor,
            @RequestPart(value = "estimatedAge", required = false) String estimatedAge,
            @RequestPart(value = "additionalNotes", required = false) String additionalNotes,
            @RequestPart(value = "requesterName", required = false) String requesterName,
            @RequestPart(value = "requesterEmail", required = false) String requesterEmail,
            @RequestPart(value = "images", required = false) MultipartFile[] images) {
        try {
            Map<String, Object> validationError = validateSubmission(guessedBreed, confidenceLevel, petCategory, petSize, coatColor, estimatedAge, additionalNotes, requesterEmail, true, images);
            if (validationError != null) return ResponseEntity.badRequest().body(validationError);

            BreedIdentification b = new BreedIdentification();
            b.setId(idSequenceService.nextId("breed_identifications"));
            b.setGuessedBreed(clean(guessedBreed, 60));
            b.setConfidenceLevel(cleanOrDefault(confidenceLevel, "Medium", 20));
            b.setPetCategory(cleanOrDefault(petCategory, "Dog", 20));
            b.setPetSize(cleanOrDefault(petSize, "Medium", 20));
            b.setCoatColor(clean(coatColor, 60));
            b.setEstimatedAge(clean(estimatedAge, 40));
            b.setAdditionalNotes(clean(additionalNotes, 500));
            b.setRequesterName(clean(requesterName, 80));
            b.setRequesterEmail(clean(requesterEmail, 120) != null ? clean(requesterEmail, 120).toLowerCase() : null);
            b.setResponseStatus("PENDING");
            if (images != null && images.length > 0) {
                List<String> paths = saveImages(images);
                b.setImagePaths(String.join(",", paths));
            }
            b = repository.save(b);
            return ResponseEntity.ok(toMap(b));
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> err = new HashMap<>();
            err.put("message", e.getMessage() != null ? e.getMessage() : "Error");
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable Long id,
            @RequestPart(value = "guessedBreed", required = false) String guessedBreed,
            @RequestPart(value = "confidenceLevel", required = false) String confidenceLevel,
            @RequestPart(value = "petCategory", required = false) String petCategory,
            @RequestPart(value = "petSize", required = false) String petSize,
            @RequestPart(value = "coatColor", required = false) String coatColor,
            @RequestPart(value = "estimatedAge", required = false) String estimatedAge,
            @RequestPart(value = "additionalNotes", required = false) String additionalNotes,
            @RequestPart(value = "requesterName", required = false) String requesterName,
            @RequestPart(value = "requesterEmail", required = false) String requesterEmail,
            @RequestPart(value = "images", required = false) MultipartFile[] images) {
        return repository.findById(id)
            .map(b -> {
                try {
                    Map<String, Object> validationError = validateSubmission(guessedBreed, confidenceLevel, petCategory, petSize, coatColor, estimatedAge, additionalNotes, requesterEmail, false, images);
                    if (validationError != null) return ResponseEntity.badRequest().body(validationError);

                    b.setGuessedBreed(clean(guessedBreed, 60));
                    b.setConfidenceLevel(cleanOrDefault(confidenceLevel, "Medium", 20));
                    b.setPetCategory(cleanOrDefault(petCategory, "Dog", 20));
                    b.setPetSize(cleanOrDefault(petSize, "Medium", 20));
                    b.setCoatColor(clean(coatColor, 60));
                    b.setEstimatedAge(clean(estimatedAge, 40));
                    b.setAdditionalNotes(clean(additionalNotes, 500));
                    b.setRequesterName(clean(requesterName, 80));
                    if (clean(requesterEmail, 120) != null) {
                        b.setRequesterEmail(clean(requesterEmail, 120).toLowerCase());
                    }
                    if (images != null && images.length > 0) {
                        List<String> paths = saveImages(images);
                        b.setImagePaths(String.join(",", paths));
                    }
                    b = repository.save(b);
                    return ResponseEntity.ok(toMap(b));
                } catch (Exception e) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("message", e.getMessage());
                    return ResponseEntity.badRequest().body(err);
                }
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/response")
    public ResponseEntity<Map<String, Object>> submitResponse(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String response = clean(body.get("adminResponse"), 120);
        if (response == null || response.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Breed response is required"));
        }

        return repository.findById(id)
            .map(b -> {
                b.setAdminResponse(response);
                b.setResponseStatus("SUBMITTED");
                b = repository.save(b);
                return ResponseEntity.ok(toMap(b));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return repository.findById(id)
            .map(b -> {
                repository.delete(b);
                return ResponseEntity.ok().build();
            })
            .orElse(ResponseEntity.notFound().build());
    }

    private List<String> saveImages(MultipartFile[] files) throws IOException {
        Path dir = Paths.get(uploadDir, SUBDIR);
        if (!Files.exists(dir)) Files.createDirectories(dir);
        List<String> paths = new ArrayList<>();
        for (MultipartFile f : files) {
            if (f.isEmpty()) continue;
            String ext = f.getOriginalFilename() != null && f.getOriginalFilename().contains(".")
                ? f.getOriginalFilename().substring(f.getOriginalFilename().lastIndexOf(".")) : ".jpg";
            String filename = "breed_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path target = dir.resolve(filename);
            Files.copy(f.getInputStream(), target);
            paths.add("/uploads/" + SUBDIR + "/" + filename);
        }
        return paths;
    }

    private Map<String, Object> toMap(BreedIdentification b) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", b.getId());
        m.put("guessedBreed", b.getGuessedBreed());
        m.put("confidenceLevel", b.getConfidenceLevel());
        m.put("petCategory", b.getPetCategory());
        m.put("petSize", b.getPetSize());
        m.put("coatColor", b.getCoatColor());
        m.put("estimatedAge", b.getEstimatedAge());
        m.put("additionalNotes", b.getAdditionalNotes());
        m.put("requesterName", b.getRequesterName());
        m.put("requesterEmail", b.getRequesterEmail());
        m.put("adminResponse", b.getAdminResponse());
        m.put("responseStatus", b.getResponseStatus() == null ? "PENDING" : b.getResponseStatus());
        List<String> imgs = new ArrayList<>();
        if (b.getImagePaths() != null && !b.getImagePaths().trim().isEmpty()) {
            for (String s : b.getImagePaths().split(",")) {
                if (!s.trim().isEmpty()) imgs.add(s.trim());
            }
        }
        m.put("imagePaths", imgs);
        return m;
    }

    private Map<String, Object> validateSubmission(
            String guessedBreed,
            String confidenceLevel,
            String petCategory,
            String petSize,
            String coatColor,
            String estimatedAge,
            String additionalNotes,
            String requesterEmail,
            boolean requireImage,
            MultipartFile[] images) {
        Set<String> confidenceAllowed = Set.of("Very Low", "Low", "Medium", "High", "Very High");
        Set<String> categoryAllowed = Set.of("Dog", "Cat", "Other");
        Set<String> sizeAllowed = Set.of("Small", "Medium", "Large", "Unknown");

        if (requireImage && (images == null || images.length == 0)) {
            return Map.of("message", "At least one image is required");
        }
        if (confidenceLevel != null && !confidenceLevel.trim().isEmpty() && !confidenceAllowed.contains(confidenceLevel.trim())) {
            return Map.of("message", "Invalid confidence level");
        }
        if (petCategory != null && !petCategory.trim().isEmpty() && !categoryAllowed.contains(petCategory.trim())) {
            return Map.of("message", "Invalid pet category");
        }
        if (petSize != null && !petSize.trim().isEmpty() && !sizeAllowed.contains(petSize.trim())) {
            return Map.of("message", "Invalid pet size");
        }
        if (!validLen(guessedBreed, 60) || !validLen(coatColor, 60) || !validLen(estimatedAge, 40) || !validLen(additionalNotes, 500)) {
            return Map.of("message", "One or more fields exceed allowed length");
        }
        if (requesterEmail != null && !requesterEmail.trim().isEmpty()
                && !requesterEmail.trim().toLowerCase().matches("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$")) {
            return Map.of("message", "Invalid requester email");
        }
        if (images != null) {
            for (MultipartFile image : images) {
                if (image == null || image.isEmpty()) continue;
                if (image.getSize() > 10L * 1024 * 1024) return Map.of("message", "Each image must be 10MB or less");
                String original = image.getOriginalFilename() == null ? "" : image.getOriginalFilename().toLowerCase();
                if (!(original.endsWith(".jpg") || original.endsWith(".jpeg") || original.endsWith(".png")
                        || original.endsWith(".gif") || original.endsWith(".webp"))) {
                    return Map.of("message", "Only JPG, PNG, GIF, and WebP files are allowed");
                }
            }
        }
        return null;
    }

    private boolean validLen(String value, int maxLen) {
        return value == null || value.trim().length() <= maxLen;
    }

    private String clean(String value, int maxLen) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() > maxLen ? trimmed.substring(0, maxLen) : trimmed;
    }

    private String cleanOrDefault(String value, String defaultValue, int maxLen) {
        String cleaned = clean(value, maxLen);
        return cleaned == null ? defaultValue : cleaned;
    }
}
