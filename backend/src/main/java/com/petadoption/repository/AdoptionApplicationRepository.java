package com.petadoption.repository;

import com.petadoption.entity.AdoptionApplication;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface AdoptionApplicationRepository extends MongoRepository<AdoptionApplication, Long> {
    List<AdoptionApplication> findAllByOrderByIdDesc();
    Optional<AdoptionApplication> findByApplicationId(String applicationId);
}
