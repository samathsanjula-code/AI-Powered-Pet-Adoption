package com.petadoption.config;

import com.petadoption.entity.User;
import com.petadoption.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MongoIdSequenceService idSequenceService;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        System.out.println("DataLoader: Starting data initialization...");
        try {
            // Admin account
            User adminUser = userRepository.findByEmail("admin@petmatch.com").orElse(new User());
            if (adminUser.getId() == null) adminUser.setId(idSequenceService.nextId("users"));
            adminUser.setEmail("admin@petmatch.com");
            adminUser.setPassword(passwordEncoder.encode("Admin@123"));
            adminUser.setName("Admin User");
            adminUser.setRole("Admin");
            adminUser.setActive(true);
            userRepository.save(adminUser);

            // Seller Admin
            User sellerAdmin = userRepository.findByEmail("admin@seller.com").orElse(new User());
            if (sellerAdmin.getId() == null) sellerAdmin.setId(idSequenceService.nextId("users"));
            sellerAdmin.setEmail("admin@seller.com");
            sellerAdmin.setPassword(passwordEncoder.encode("Seller@123"));
            sellerAdmin.setName("Seller Admin");
            sellerAdmin.setRole("SellerAdmin");
            sellerAdmin.setActive(true);
            userRepository.save(sellerAdmin);

            // Adoption Admin
            User adoptionAdmin = userRepository.findByEmail("admin@adoption.com").orElse(new User());
            if (adoptionAdmin.getId() == null) adoptionAdmin.setId(idSequenceService.nextId("users"));
            adoptionAdmin.setEmail("admin@adoption.com");
            adoptionAdmin.setPassword(passwordEncoder.encode("Adoption@123"));
            adoptionAdmin.setName("Adoption Admin");
            adoptionAdmin.setRole("AdoptionAdmin");
            adoptionAdmin.setActive(true);
            userRepository.save(adoptionAdmin);

            // Pet Admin
            User petAdmin = userRepository.findByEmail("petadmin@petmatch.com").orElse(new User());
            if (petAdmin.getId() == null) petAdmin.setId(idSequenceService.nextId("users"));
            petAdmin.setEmail("petadmin@petmatch.com");
            petAdmin.setPassword(passwordEncoder.encode("PetAdmin@123"));
            petAdmin.setName("Pet Registration Admin");
            petAdmin.setRole("PetAdmin");
            petAdmin.setActive(true);
            userRepository.save(petAdmin);

            System.out.println("DataLoader: Default admin accounts have been reset/initialized.");

            // Mass migration: Hash any remaining plain-text passwords
            userRepository.findAll().forEach(u -> {
                try {
                    if (u.getPassword() != null && !u.getPassword().startsWith("$2a$")) {
                        u.setPassword(passwordEncoder.encode(u.getPassword()));
                        userRepository.save(u);
                        System.out.println("DataLoader: Migrated password for user: " + u.getEmail());
                    }
                } catch (Exception e) {
                    System.err.println("DataLoader: Failed to migrate user " + u.getEmail() + ": " + e.getMessage());
                }
            });
            System.out.println("DataLoader: Data initialization completed successfully.");
        } catch (Exception e) {
            System.err.println("DataLoader: CRITICAL ERROR during initialization: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
