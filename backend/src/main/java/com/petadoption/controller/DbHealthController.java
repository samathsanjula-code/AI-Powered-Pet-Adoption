package com.petadoption.controller;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/health")
@CrossOrigin(origins = "*")
public class DbHealthController {

    private final MongoTemplate mongoTemplate;

    public DbHealthController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/db")
    public ResponseEntity<Map<String, Object>> db() {
        Map<String, Object> out = new HashMap<>();
        try {
            out.put("ok", true);
            out.put("dbName", mongoTemplate.getDb().getName());
            out.put("ping", mongoTemplate.executeCommand("{ ping: 1 }"));

            Set<String> collections = mongoTemplate.getDb().listCollectionNames().into(new java.util.HashSet<>());
            out.put("collections", collections);
            out.put("counts", getCollectionCounts());
            return ResponseEntity.ok(out);
        } catch (Exception e) {
            out.put("ok", false);
            out.put("error", e.getClass().getName());
            out.put("message", e.getMessage());
            return ResponseEntity.status(500).body(out);
        }
    }

    private Map<String, Long> getCollectionCounts() {
        List<String> names = Arrays.asList(
                "users", "Users",
                "pets", "Pets",
                "seller_items", "SellerItems", "sellerItems",
                "seller_orders", "SellerOrders", "sellerOrders",
                "adoption_applications", "AdoptionApplications", "adoptionApplications",
                "breed_identifications", "BreedIdentifications", "breedIdentifications",
                "counters", "Counters"
        );

        Map<String, Long> counts = new LinkedHashMap<>();
        for (String name : names) {
            if (mongoTemplate.collectionExists(name)) {
                counts.put(name, mongoTemplate.getCollection(name).countDocuments());
            }
        }
        return counts;
    }
}

