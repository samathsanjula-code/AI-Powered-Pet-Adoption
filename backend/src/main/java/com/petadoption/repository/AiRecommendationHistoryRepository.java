package com.petadoption.repository;

import com.petadoption.entity.AiRecommendationHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AiRecommendationHistoryRepository extends MongoRepository<AiRecommendationHistory, Long> {
    List<AiRecommendationHistory> findByUserIdOrderByCreatedAtDesc(Long userId);
}

