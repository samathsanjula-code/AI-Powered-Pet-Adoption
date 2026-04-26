package com.petadoption.repository;

import com.petadoption.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends MongoRepository<User, Long> {

    Optional<User> findByEmailAndPassword(String email, String password);
    Optional<User> findByEmail(String email);
    List<User> findByForgotPasswordRequestedTrue();
    List<User> findByRole(String role);
}
