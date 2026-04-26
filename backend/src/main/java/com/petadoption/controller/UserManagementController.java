package com.petadoption.controller;

import com.petadoption.entity.User;
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

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserManagementController {

    @Autowired
    private UserRepository userRepository;

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    private static final String PROFILE_SUBDIR = "profiles";

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(this::toUserResponse)
                .toList();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/forgot-password-requests")
    public ResponseEntity<List<Map<String, Object>>> getForgotPasswordRequests() {
        List<Map<String, Object>> requests = userRepository.findByForgotPasswordRequestedTrue().stream()
                .map(this::toUserResponse)
                .toList();
        return ResponseEntity.ok(requests);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateUserDetails(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        Optional<User> existingUser = userRepository.findById(id);
        if (existingUser.isEmpty()) {
            return ResponseEntity.status(404).body(error("User not found"));
        }

        User user = existingUser.get();
        if (request.getName() != null) user.setName(request.getName());
        if (request.getEmail() != null) {
            Optional<User> withEmail = userRepository.findByEmail(request.getEmail());
            if (withEmail.isPresent() && !withEmail.get().getId().equals(id)) {
                return ResponseEntity.badRequest().body(error("Email already in use"));
            }
            user.setEmail(request.getEmail());
        }
        if (request.getRole() != null) user.setRole(request.getRole());

        User saved = userRepository.save(user);
        return ResponseEntity.ok(toUserResponse(saved));
    }

    @PutMapping("/{id}/active")
    public ResponseEntity<Map<String, Object>> toggleUserActive(@PathVariable Long id, @RequestBody ToggleActiveRequest request) {
        Optional<User> existingUser = userRepository.findById(id);
        if (existingUser.isEmpty()) {
            return ResponseEntity.status(404).body(error("User not found"));
        }

        User user = existingUser.get();
        user.setActive(request.isActive());
        User saved = userRepository.save(user);
        return ResponseEntity.ok(toUserResponse(saved));
    }

    // --- Profile Update Logic with Remove Image Support ---
    @PutMapping(value = "/{id}/profile", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @PathVariable Long id,
            @RequestPart(value = "name", required = false) String name,
            @RequestPart(value = "phoneNumber", required = false) String phoneNumber,
            @RequestPart(value = "addressLine1", required = false) String addressLine1,
            @RequestPart(value = "addressLine2", required = false) String addressLine2,
            @RequestPart(value = "city", required = false) String city,
            @RequestPart(value = "image", required = false) MultipartFile image,
            HttpServletRequest request) { // Request parameter එක ගන්න HttpServletRequest එකතු කළා

        return userRepository.findById(id).map(user -> {
            try {
                if (name != null) user.setName(name);
                if (phoneNumber != null) user.setPhoneNumber(phoneNumber);
                if (addressLine1 != null) user.setAddressLine1(addressLine1);
                if (addressLine2 != null) user.setAddressLine2(addressLine2);
                if (city != null) user.setCity(city);

                // Image එකක් ආවොත් save කරනවා
                if (image != null && !image.isEmpty()) {
                    String path = saveProfileImage(image);
                    user.setProfileImage(path);
                }
                // Image එකක් නැතිව, "removeImage" flag එක true කියලා එව්වොත් image එක අයින් කරනවා
                else if (Boolean.parseBoolean(request.getParameter("removeImage"))) {
                    user.setProfileImage(null);
                }

                User saved = userRepository.save(user);
                return ResponseEntity.ok(toUserResponse(saved));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(error("Error updating profile: " + e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/approve-forgot-password")
    public ResponseEntity<Map<String, Object>> approveForgotPassword(@PathVariable Long id) {
        Optional<User> existingUser = userRepository.findById(id);
        if (existingUser.isEmpty()) {
            return ResponseEntity.status(404).body(error("User not found"));
        }

        User user = existingUser.get();
        if (!user.isForgotPasswordRequested() || user.getRequestedPassword() == null || user.getRequestedPassword().isBlank()) {
            return ResponseEntity.badRequest().body(error("No valid password request to approve"));
        }

        user.setPassword(user.getRequestedPassword());
        user.setRequestedPassword(null);
        user.setForgotPasswordRequested(false);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(toUserResponse(saved));
    }

    @PostMapping("/{id}/reject-forgot-password")
    public ResponseEntity<Map<String, Object>> rejectForgotPassword(@PathVariable Long id) {
        Optional<User> existingUser = userRepository.findById(id);
        if (existingUser.isEmpty()) {
            return ResponseEntity.status(404).body(error("User not found"));
        }

        User user = existingUser.get();
        user.setRequestedPassword(null);
        user.setForgotPasswordRequested(false);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(toUserResponse(saved));
    }

    private String saveProfileImage(MultipartFile file) throws IOException {
        Path dir = Paths.get(uploadDir, PROFILE_SUBDIR);
        if (!Files.exists(dir)) Files.createDirectories(dir);

        String ext = file.getOriginalFilename().contains(".")
                ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf(".")) : ".jpg";
        String filename = "user_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;

        Path target = dir.resolve(filename);
        Files.copy(file.getInputStream(), target);
        return "/uploads/" + PROFILE_SUBDIR + "/" + filename;
    }

    private Map<String, Object> toUserResponse(User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole());
        response.put("active", user.isActive());
        response.put("forgotPasswordRequested", user.isForgotPasswordRequested());

        response.put("phoneNumber", user.getPhoneNumber());
        response.put("addressLine1", user.getAddressLine1());
        response.put("addressLine2", user.getAddressLine2());
        response.put("city", user.getCity());
        response.put("profileImage", user.getProfileImage());
        return response;
    }

    private Map<String, Object> error(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }

    public static class UpdateUserRequest {
        private String name;
        private String email;
        private String role;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    public static class ToggleActiveRequest {
        private boolean active;
        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
    }
}