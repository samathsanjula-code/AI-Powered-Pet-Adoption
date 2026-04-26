package com.petadoption.controller;

import com.petadoption.config.MongoIdSequenceService;
import com.petadoption.entity.AiRecommendationHistory;
import com.petadoption.repository.AiRecommendationHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/ai-recommendation")
@CrossOrigin(origins = "*")
public class AiRecommendationHistoryController {

    @Autowired
    private AiRecommendationHistoryRepository historyRepository;

    @Autowired
    private MongoIdSequenceService idSequenceService;

    @PostMapping("/history")
    public ResponseEntity<Map<String, Object>> createHistory(@RequestBody HistoryRequest request) {
        if (request == null || request.getUserId() == null) {
            return ResponseEntity.badRequest().body(error("userId is required"));
        }

        AiRecommendationHistory history = new AiRecommendationHistory();
        history.setId(idSequenceService.nextId("ai_recommendation_history"));
        history.setUserId(request.getUserId());
        history.setUserEmail(request.getUserEmail());
        history.setPreferences(request.getPreferences() != null ? request.getPreferences() : new HashMap<>());
        history.setPetIds(request.getPetIds() != null ? request.getPetIds() : new ArrayList<>());
        history.setCreatedAt(new Date());

        AiRecommendationHistory saved = historyRepository.save(history);
        return ResponseEntity.ok(toResponse(saved));
    }

    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> getHistoryForUser(@RequestParam("userId") Long userId) {
        if (userId == null) {
            return ResponseEntity.badRequest().body(Collections.emptyList());
        }

        List<AiRecommendationHistory> list = historyRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Map<String, Object>> response = new ArrayList<>();
        for (AiRecommendationHistory h : list) {
            response.add(toResponse(h));
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history/all")
    public ResponseEntity<List<Map<String, Object>>> getAllHistory() {
        List<AiRecommendationHistory> list = historyRepository.findAll();
        list.sort((a, b) -> {
            Date ad = a.getCreatedAt();
            Date bd = b.getCreatedAt();
            long ams = ad != null ? ad.getTime() : 0L;
            long bms = bd != null ? bd.getTime() : 0L;
            return Long.compare(bms, ams);
        });

        List<Map<String, Object>> response = new ArrayList<>();
        for (AiRecommendationHistory h : list) {
            response.add(toResponse(h));
        }
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<Map<String, Object>> deleteHistory(@PathVariable("id") Long id) {
        if (id == null) return ResponseEntity.badRequest().body(error("id is required"));
        Optional<AiRecommendationHistory> existing = historyRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        historyRepository.delete(existing.get());
        return ResponseEntity.ok(Collections.singletonMap("deletedId", id));
    }

    @PutMapping("/history/{id}")
    public ResponseEntity<Map<String, Object>> updateHistory(@PathVariable("id") Long id, @RequestBody HistoryRequest request) {
        if (id == null) return ResponseEntity.badRequest().body(error("id is required"));
        Optional<AiRecommendationHistory> existing = historyRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();

        AiRecommendationHistory history = existing.get();
        if (request != null) {
            if (request.getUserId() != null) history.setUserId(request.getUserId());
            if (request.getUserEmail() != null) history.setUserEmail(request.getUserEmail());
            history.setPreferences(request.getPreferences() != null ? request.getPreferences() : new HashMap<>());
            history.setPetIds(request.getPetIds() != null ? request.getPetIds() : new ArrayList<>());
        } else {
            history.setPreferences(new HashMap<>());
            history.setPetIds(new ArrayList<>());
        }
        // Move updated searches to top by refreshing timestamp.
        history.setCreatedAt(new Date());

        AiRecommendationHistory saved = historyRepository.save(history);
        return ResponseEntity.ok(toResponse(saved));
    }

    private Map<String, Object> toResponse(AiRecommendationHistory saved) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", saved.getId());
        m.put("userId", saved.getUserId());
        m.put("userEmail", saved.getUserEmail());
        m.put("preferences", saved.getPreferences());
        m.put("petIds", saved.getPetIds());
        m.put("createdAt", saved.getCreatedAt() != null ? saved.getCreatedAt().getTime() : null);
        return m;
    }

    private Map<String, Object> error(String message) {
        Map<String, Object> map = new HashMap<>();
        map.put("success", false);
        map.put("message", message);
        return map;
    }

    public static class HistoryRequest {
        private Long userId;
        private String userEmail;
        private Map<String, Object> preferences;
        private List<Long> petIds;

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public String getUserEmail() {
            return userEmail;
        }

        public void setUserEmail(String userEmail) {
            this.userEmail = userEmail;
        }

        public Map<String, Object> getPreferences() {
            return preferences;
        }

        public void setPreferences(Map<String, Object> preferences) {
            this.preferences = preferences;
        }

        public List<Long> getPetIds() {
            return petIds;
        }

        public void setPetIds(List<Long> petIds) {
            this.petIds = petIds;
        }
    }
}

