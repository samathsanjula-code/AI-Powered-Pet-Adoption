package com.petadoption.controller;

import com.petadoption.config.MongoIdSequenceService;
import com.petadoption.entity.AdoptionApplication;
import com.petadoption.repository.AdoptionApplicationRepository;
import com.petadoption.repository.PetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/adoption-applications")
@CrossOrigin(origins = "*")
public class AdoptionApplicationController {

    @Autowired
    private AdoptionApplicationRepository applicationRepository;
    @Autowired
    private PetRepository petRepository;

    @Autowired
    private MongoIdSequenceService idSequenceService;

    private static String generateApplicationId() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = String.valueOf(System.currentTimeMillis() % 10000);
        return "APP-" + date + "-" + suffix;
    }

    @GetMapping("/preview-id")
    public ResponseEntity<Map<String, String>> getPreviewId() {
        return ResponseEntity.ok(Map.of("applicationId", generateApplicationId()));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<AdoptionApplication> apps = applicationRepository.findAllByOrderByIdDesc();
        List<Map<String, Object>> result = new ArrayList<>();
        for (AdoptionApplication a : apps) {
            Map<String, Object> m = toMap(a);
            petRepository.findByPetId(a.getPetId()).ifPresent(pet -> {
                m.put("petName", pet.getPetType() != null ? pet.getPetType() : pet.getCategory());
                m.put("petCategory", pet.getPetType() != null ? pet.getPetType() : pet.getCategory());
                m.put("petBreed", pet.getBreed());
            });
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable Long id) {
        return applicationRepository.findById(id)
            .map(a -> {
                Map<String, Object> m = toMap(a);
                petRepository.findByPetId(a.getPetId()).ifPresent(pet -> {
                    List<String> imgs = new ArrayList<>();
                    if (pet.getImagePaths() != null && !pet.getImagePaths().trim().isEmpty()) {
                        for (String s : pet.getImagePaths().split(",")) {
                            if (!s.trim().isEmpty()) imgs.add(s.trim());
                        }
                    }
                    m.put("pet", Map.of(
                        "id", pet.getId(),
                        "petName", pet.getPetType() != null ? pet.getPetType() : (pet.getCategory() != null ? pet.getCategory() : ""),
                        "category", pet.getPetType() != null ? pet.getPetType() : pet.getCategory(),
                        "breed", pet.getBreed() != null ? pet.getBreed() : "",
                        "imagePaths", imgs,
                        "imageLocation", pet.getImageLocation() != null ? pet.getImageLocation() : ""
                    ));
                });
                return ResponseEntity.ok(m);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        try {
            String applicationId = generateApplicationId();
            AdoptionApplication app = new AdoptionApplication();
            app.setId(idSequenceService.nextId("adoption_applications"));
            app.setApplicationId(applicationId);
            app.setPetId(Long.valueOf(body.get("petId").toString()));
            app.setApplicantName((String) body.get("applicantName"));
            app.setApplicantEmail((String) body.get("applicantEmail"));
            String phone = body.get("applicantPhone") != null ? body.get("applicantPhone").toString().trim() : "";
            if (!phone.isEmpty() && !phone.matches("^\\d{10}$")) {
                Map<String, Object> err = new HashMap<>();
                err.put("success", false);
                err.put("message", "Phone number must be exactly 10 digits");
                return ResponseEntity.badRequest().body(err);
            }
            app.setApplicantPhone(phone);
            app.setMessage(body.get("message") != null ? body.get("message").toString() : "");
            app.setStatus("PENDING");
            if (body.get("userId") != null) {
                app.setUserId(Long.valueOf(body.get("userId").toString()));
            }
            app = applicationRepository.save(app);

            Map<String, Object> m = toMap(app);
            petRepository.findByPetId(app.getPetId()).ifPresent(pet -> {
                m.put("petName", pet.getPetType() != null ? pet.getPetType() : pet.getCategory());
                m.put("petCategory", pet.getPetType() != null ? pet.getPetType() : pet.getCategory());
            });
            return ResponseEntity.ok(m);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || (!status.equals("APPROVED") && !status.equals("REJECTED"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid status"));
        }
        return applicationRepository.findById(id)
            .map(app -> {
                app.setStatus(status);
                app = applicationRepository.save(app);
                if ("APPROVED".equals(status)) {
                    petRepository.findByPetId(app.getPetId()).ifPresent(pet -> {
                        pet.setAdoptionLikelihood(1);
                        petRepository.save(pet);
                    });
                }
                Map<String, Object> m = toMap(app);
                petRepository.findByPetId(app.getPetId()).ifPresent(pet -> {
                    m.put("petName", pet.getPetType() != null ? pet.getPetType() : pet.getCategory());
                    m.put("petCategory", pet.getPetType() != null ? pet.getPetType() : pet.getCategory());
                });
                return ResponseEntity.ok(m);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> toMap(AdoptionApplication a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.getId());
        m.put("applicationId", a.getApplicationId());
        m.put("petId", a.getPetId());
        m.put("applicantName", a.getApplicantName());
        m.put("applicantEmail", a.getApplicantEmail());
        m.put("applicantPhone", a.getApplicantPhone());
        m.put("message", a.getMessage());
        m.put("status", a.getStatus());
        m.put("userId", a.getUserId());
        return m;
    }
}
