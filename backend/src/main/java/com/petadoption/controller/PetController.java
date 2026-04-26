package com.petadoption.controller;

import com.petadoption.config.MongoIdSequenceService;
import com.petadoption.entity.Pet;
import com.petadoption.entity.User;
import com.petadoption.repository.PetRepository;
import com.petadoption.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/pets")
@CrossOrigin(origins = "*")
public class PetController {

    @Autowired
    private PetRepository petRepository;
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MongoIdSequenceService idSequenceService;

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    private static final Pattern SL_PHONE = Pattern.compile("^07\\d{8}$");

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllPets() {
        List<Pet> pets = petRepository.findAllByOrderByPetIdDesc();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Pet p : pets) {
            if (Integer.valueOf(1).equals(p.getAdoptionLikelihood())) {
                continue;
            }
            Map<String, Object> m = toMap(p);
            m.put("userName", getUserName(p.getUserId()));
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Map<String, Object>>> getPetsByUser(@PathVariable Long userId) {
        List<Pet> pets = petRepository.findByUserId(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Pet p : pets) {
            Map<String, Object> m = toMap(p);
            m.put("userName", getUserName(p.getUserId()));
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getPet(@PathVariable Long id) {
        return petRepository.findByPetId(id)
            .map(p -> {
                Map<String, Object> m = toMap(p);
                m.put("userName", getUserName(p.getUserId()));
                return ResponseEntity.ok(m);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> createPet(
            @RequestPart("registrationType") String registrationType,
            @RequestPart("petType") String petType,
            @RequestPart("breed") String breed,
            @RequestPart("ageYears") String ageYearsStr,
            @RequestPart("ageMonths") String ageMonthsStr,
            @RequestPart("color") String color,
            @RequestPart("size") String size,
            @RequestPart("weightKg") String weightKgStr,
            @RequestPart("vaccinated") String vaccinatedStr,
            @RequestPart("healthCondition") String healthCondition,
            @RequestPart("previousOwner") String previousOwnerStr,
            @RequestPart("contactName") String contactName,
            @RequestPart("phoneNumber") String phoneNumber,
            @RequestPart("userId") String userIdStr,
            @RequestPart(value = "imageLocation", required = false) String imageLocation,
            @RequestPart(value = "images", required = false) MultipartFile[] images) {

        try {
            String pn = phoneNumber != null ? phoneNumber.trim() : "";
            if (!SL_PHONE.matcher(pn).matches()) {
                throw new IllegalArgumentException("Phone number must be like 0712345678");
            }

            Integer years = parseNonNegativeInt(ageYearsStr, "ageYears");
            Integer months = parseNonNegativeInt(ageMonthsStr, "ageMonths");
            Integer totalMonths = years * 12 + months;
            if (totalMonths <= 0) {
                throw new IllegalArgumentException("Age must be greater than 0 months");
            }

            Double weightKg = parsePositiveDouble(weightKgStr, "weightKg");

            Integer vaccinated = toFlag(vaccinatedStr);
            Integer previousOwner = toFlag(previousOwnerStr);
            Integer healthCode = toHealthCode(healthCondition);
            Long userId = userIdStr != null && !userIdStr.trim().isEmpty() ? Long.parseLong(userIdStr.trim()) : null;

            Pet pet = new Pet();
            pet.setId(nextPetId());
            pet.setRegistrationType(registrationType);
            pet.setPetType(requireNonBlank(petType, "petType"));
            pet.setCategory(requireNonBlank(petType, "petType"));
            pet.setBreed(requireNonBlank(breed, "breed"));
            pet.setAgeMonths(totalMonths);
            pet.setColor(requireNonBlank(color, "color"));
            pet.setSize(requireNonBlank(size, "size"));
            pet.setWeightKg(weightKg);
            pet.setVaccinated(vaccinated);
            pet.setHealthCondition(healthCode);
            pet.setPreviousOwner(previousOwner);
            pet.setAdoptionLikelihood(0);
            pet.setContactName(requireNonBlank(contactName, "contactName"));
            pet.setPhoneNumber(pn);
            pet.setUserId(userId);
            if (imageLocation != null && !imageLocation.trim().isEmpty()) {
                pet.setImageLocation(imageLocation.trim());
            }

            if (images != null && images.length > 0) {
                List<String> paths = saveImages(images);
                pet.setImagePaths(String.join(",", paths));
            }

            pet = petRepository.save(pet);
            Map<String, Object> m = toMap(pet);
            m.put("userName", getUserName(pet.getUserId()));
            return ResponseEntity.ok(m);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> err = new HashMap<>();
            String msg = e.getMessage();
            if (msg == null) msg = "Unknown error";
            err.put("success", false);
            err.put("message", msg);
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> updatePet(
            @PathVariable Long id,
            @RequestPart("registrationType") String registrationType,
            @RequestPart("petType") String petType,
            @RequestPart("breed") String breed,
            @RequestPart("ageYears") String ageYearsStr,
            @RequestPart("ageMonths") String ageMonthsStr,
            @RequestPart("color") String color,
            @RequestPart("size") String size,
            @RequestPart("weightKg") String weightKgStr,
            @RequestPart("vaccinated") String vaccinatedStr,
            @RequestPart("healthCondition") String healthCondition,
            @RequestPart("previousOwner") String previousOwnerStr,
            @RequestPart("contactName") String contactName,
            @RequestPart("phoneNumber") String phoneNumber,
            @RequestPart(value = "imageLocation", required = false) String imageLocation,
            @RequestPart(value = "images", required = false) MultipartFile[] images) {

        return petRepository.findByPetId(id)
            .map(pet -> {
                try {
                    String pn = phoneNumber != null ? phoneNumber.trim() : "";
                    if (!SL_PHONE.matcher(pn).matches()) {
                        throw new IllegalArgumentException("Phone number must be like 0712345678");
                    }

                    Integer years = parseNonNegativeInt(ageYearsStr, "ageYears");
                    Integer months = parseNonNegativeInt(ageMonthsStr, "ageMonths");
                    Integer totalMonths = years * 12 + months;
                    if (totalMonths <= 0) {
                        throw new IllegalArgumentException("Age must be greater than 0 months");
                    }

                    Double weightKg = parsePositiveDouble(weightKgStr, "weightKg");

                    Integer vaccinated = toFlag(vaccinatedStr);
                    Integer previousOwner = toFlag(previousOwnerStr);
                    Integer healthCode = toHealthCode(healthCondition);

                    pet.setRegistrationType(registrationType);
                    pet.setPetType(requireNonBlank(petType, "petType"));
                    pet.setCategory(requireNonBlank(petType, "petType"));
                    pet.setBreed(requireNonBlank(breed, "breed"));
                    pet.setAgeMonths(totalMonths);
                    pet.setColor(requireNonBlank(color, "color"));
                    pet.setSize(requireNonBlank(size, "size"));
                    pet.setWeightKg(weightKg);
                    pet.setVaccinated(vaccinated);
                    pet.setHealthCondition(healthCode);
                    pet.setPreviousOwner(previousOwner);
                    pet.setContactName(requireNonBlank(contactName, "contactName"));
                    pet.setPhoneNumber(pn);

                    if (imageLocation != null && !imageLocation.trim().isEmpty()) {
                        pet.setImageLocation(imageLocation.trim());
                    } else {
                        pet.setImageLocation(null);
                    }

                    if (images != null && images.length > 0) {
                        List<String> paths = saveImages(images);
                        pet.setImagePaths(String.join(",", paths));
                    }

                    pet = petRepository.save(pet);
                    Map<String, Object> m = toMap(pet);
                    m.put("userName", getUserName(pet.getUserId()));
                    return ResponseEntity.ok(m);
                } catch (Exception e) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("success", false);
                    err.put("message", e.getMessage());
                    return ResponseEntity.badRequest().body(err);
                }
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePet(@PathVariable Long id) {
        return petRepository.findByPetId(id)
            .map(pet -> {
                petRepository.delete(pet);
                return ResponseEntity.ok().build();
            })
            .orElse(ResponseEntity.notFound().build());
    }

    private List<String> saveImages(MultipartFile[] files) throws IOException {
        Path dir = Paths.get(uploadDir);
        if (!Files.exists(dir)) Files.createDirectories(dir);

        List<String> paths = new ArrayList<>();
        for (MultipartFile f : files) {
            if (f.isEmpty()) continue;
            String ext = f.getOriginalFilename() != null && f.getOriginalFilename().contains(".")
                ? f.getOriginalFilename().substring(f.getOriginalFilename().lastIndexOf(".")) : ".jpg";
            String filename = "pet_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path target = dir.resolve(filename);
            Files.copy(f.getInputStream(), target);
            paths.add("/uploads/" + filename);
        }
        return paths;
    }

    private String getUserName(Long userId) {
        if (userId == null) return "";
        return userRepository.findById(userId).map(User::getName).orElse("");
    }

    private Map<String, Object> toMap(Pet p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("PetID", p.getId());
        m.put("registrationType", p.getRegistrationType());
        String petType = p.getPetType();
        if ((petType == null || petType.trim().isEmpty()) && p.getCategory() != null) {
            petType = p.getCategory();
        }
        m.put("petType", petType);
        m.put("PetType", petType);
        m.put("breed", p.getBreed());
        m.put("Breed", p.getBreed());
        m.put("ageMonths", p.getAgeMonths());
        m.put("AgeMonths", p.getAgeMonths());
        m.put("color", p.getColor());
        m.put("Color", p.getColor());
        m.put("size", p.getSize());
        m.put("Size", p.getSize());
        m.put("weightKg", p.getWeightKg());
        m.put("WeightKg", p.getWeightKg());
        m.put("vaccinated", p.getVaccinated());
        m.put("Vaccinated", p.getVaccinated());
        m.put("healthCondition", p.getHealthCondition());
        m.put("HealthCondition", p.getHealthCondition());
        m.put("previousOwner", p.getPreviousOwner());
        m.put("PreviousOwner", p.getPreviousOwner());
        m.put("adoptionLikelihood", p.getAdoptionLikelihood() == null ? 0 : p.getAdoptionLikelihood());
        m.put("AdoptionLikelihood", p.getAdoptionLikelihood() == null ? 0 : p.getAdoptionLikelihood());
        m.put("timeInShelterDays", p.getTimeInShelterDays() == null ? 0 : p.getTimeInShelterDays());
        m.put("TimeInShelterDays", p.getTimeInShelterDays() == null ? 0 : p.getTimeInShelterDays());
        m.put("adoptionFee", p.getAdoptionFee() == null ? 0 : p.getAdoptionFee());
        m.put("AdoptionFee", p.getAdoptionFee() == null ? 0 : p.getAdoptionFee());
        m.put("contactName", p.getContactName());
        m.put("phoneNumber", p.getPhoneNumber());
        m.put("userId", p.getUserId());
        List<String> imgs = new ArrayList<>();
        if (p.getImagePaths() != null && !p.getImagePaths().trim().isEmpty()) {
            for (String s : p.getImagePaths().split(",")) {
                if (!s.trim().isEmpty()) imgs.add(s.trim());
            }
        }
        m.put("imagePaths", imgs);
        m.put("imageLocation", p.getImageLocation());
        return m;
    }

    private static String safeTrim(String s) {
        return s == null ? "" : s.trim();
    }

    private static String requireNonBlank(String s, String field) {
        String v = s == null ? "" : s.trim();
        if (v.isEmpty()) throw new IllegalArgumentException(field + " is required");
        return v;
    }

    private static Integer parseNonNegativeInt(String s, String field) {
        try {
            int v = Integer.parseInt(requireNonBlank(s, field));
            if (v < 0) throw new IllegalArgumentException(field + " must be 0 or greater");
            return v;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(field + " must be a whole number");
        }
    }

    private static Double parsePositiveDouble(String s, String field) {
        try {
            double v = Double.parseDouble(requireNonBlank(s, field));
            if (v <= 0) throw new IllegalArgumentException(field + " must be greater than 0");
            return v;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(field + " must be a number");
        }
    }

    private Long nextPetId() {
        long id = idSequenceService.nextId("pets");
        // Pet registrations should start from 2507 (newest-first UI uses id ordering).
        // If the sequence is still below 2507, keep advancing until we hit it.
        while (id < 2507) {
            id = idSequenceService.nextId("pets");
        }
        return id;
    }

    private static Integer toFlag(String value) {
        String v = safeTrim(value);
        if ("yes".equalsIgnoreCase(v) || "true".equalsIgnoreCase(v) || "1".equals(v)) return 1;
        return 0;
    }

    private static Integer toHealthCode(String healthCondition) {
        String h = requireNonBlank(healthCondition, "healthCondition");
        return "Healthy & Active".equalsIgnoreCase(h) ? 1 : 0;
    }
}
