package com.petadoption.repository;

import com.petadoption.entity.SellerItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SellerItemRepository extends MongoRepository<SellerItem, Long> {
    List<SellerItem> findAllByOrderByIdDesc();
}
