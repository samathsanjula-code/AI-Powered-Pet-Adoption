package com.petadoption.repository;

import com.petadoption.entity.BreedIdentification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BreedIdentificationRepository extends MongoRepository<BreedIdentification, Long> {
    List<BreedIdentification> findAllByOrderByIdDesc();
    List<BreedIdentification> findAllByRequesterEmailOrderByIdDesc(String requesterEmail);
}
