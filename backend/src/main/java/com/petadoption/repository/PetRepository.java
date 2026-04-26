package com.petadoption.repository;

import com.petadoption.entity.Pet;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PetRepository extends MongoRepository<Pet, String> {
    List<Pet> findAllByOrderByPetIdDesc();
    Optional<Pet> findByPetId(Long petId);
    List<Pet> findByUserId(Long userId);
}
