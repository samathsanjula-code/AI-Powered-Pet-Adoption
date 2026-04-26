package com.petadoption.controller;

import com.petadoption.config.MongoIdSequenceService;
import com.petadoption.entity.User;
import com.petadoption.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class LoginController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MongoIdSequenceService idSequenceService;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private com.petadoption.service.JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(createError("Email and password required"));
        }

        String email = request.getEmail().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User u = userOpt.get();
            if (!passwordEncoder.matches(request.getPassword(), u.getPassword())) {
                return ResponseEntity.status(401).body(createError("Invalid email or password"));
            }
            if (!u.isActive()) {
                return ResponseEntity.status(403).body(createError("Your account is deactivated. Please contact admin."));
            }

            String token = jwtService.generateToken(u.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("token", token);

            // මෙන්න මෙතනට තමයි අපි අලුත් fields ටික එකතු කරන්නේ
            // එතකොට තමයි Frontend එකේ localStorage එකට මේ data ටික වැටෙන්නේ
            response.put("user", Map.of(
                    "id", u.getId(),
                    "email", u.getEmail(),
                    "name", u.getName() != null ? u.getName() : "",
                    "role", u.getRole() != null ? u.getRole() : "",
                    "active", u.isActive(),
                    "phoneNumber", u.getPhoneNumber() != null ? u.getPhoneNumber() : "",
                    "addressLine1", u.getAddressLine1() != null ? u.getAddressLine1() : "",
                    "addressLine2", u.getAddressLine2() != null ? u.getAddressLine2() : "",
                    "city", u.getCity() != null ? u.getCity() : "",
                    "profileImage", u.getProfileImage() != null ? u.getProfileImage() : ""
            ));

            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(401).body(createError("Invalid email or password"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(createError("Invalid request"));
        }

        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null;
        String password = request.getPassword();
        String name = request.getName() != null ? request.getName().trim() : null;

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(createError("Email and password required"));
        }

        if (name == null || name.isEmpty()) {
            return ResponseEntity.badRequest().body(createError("Name is required"));
        }

        String passwordError = validatePassword(password);
        if (passwordError != null) {
            return ResponseEntity.badRequest().body(createError(passwordError));
        }

        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(createError("Email already registered"));
        }

        User user = new User();
        user.setId(idSequenceService.nextId("users"));
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setName(name);
        user.setRole(request.getRole() != null ? request.getRole() : "Adopter");

        // Register වෙද්දී අනිත් fields ටික හිස්ව (null) තියෙනවා.
        // පස්සේ Profile Page එකෙන් තමයි ඒවා update කරන්නේ.

        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Account created");
        return ResponseEntity.ok(response);
    }

    private static String validatePassword(String password) {
        if (password == null) return "Password is required";
        if (password.length() < 6) return "Password must be at least 6 characters";
        if (!password.matches(".*[A-Z].*")) return "Password must include at least 1 capital letter";
        if (!password.matches(".*[0-9].*")) return "Password must include at least 1 number";
        if (!password.matches(".*[^A-Za-z0-9].*")) return "Password must include at least 1 symbol";
        return null;
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> requestForgotPassword(@RequestBody ForgotPasswordRequest request) {
        if (request.getEmail() == null || request.getRequestedPassword() == null) {
            return ResponseEntity.badRequest().body(createError("Email and new password required"));
        }

        String email = request.getEmail().trim().toLowerCase();
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isEmpty()) {
            return ResponseEntity.status(404).body(createError("No account found with this email"));
        }

        User user = existingUser.get();
        user.setForgotPasswordRequested(true);
        user.setRequestedPassword(passwordEncoder.encode(request.getRequestedPassword()));
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Password reset request submitted. Admin approval is required.");
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> createError(String message) {
        Map<String, Object> map = new HashMap<>();
        map.put("success", false);
        map.put("message", message);
        return map;
    }

    // Inner classes (No changes needed here)
    public static class LoginRequest {
        private String email;
        private String password;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class RegisterRequest {
        private String email;
        private String password;
        private String name;
        private String role;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    public static class ForgotPasswordRequest {
        private String email;
        private String requestedPassword;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getRequestedPassword() { return requestedPassword; }
        public void setRequestedPassword(String requestedPassword) { this.requestedPassword = requestedPassword; }
    }
}