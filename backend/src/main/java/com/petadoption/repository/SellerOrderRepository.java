package com.petadoption.repository;

import com.petadoption.entity.SellerOrder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SellerOrderRepository extends MongoRepository<SellerOrder, Long> {
    List<SellerOrder> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<SellerOrder> findAllByOrderByCreatedAtDesc();
}
