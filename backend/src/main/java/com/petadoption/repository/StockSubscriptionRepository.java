package com.petadoption.repository;

import com.petadoption.entity.StockSubscription;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface StockSubscriptionRepository extends MongoRepository<StockSubscription, Long> {
    List<StockSubscription> findBySellerItemId(Long sellerItemId);
    Optional<StockSubscription> findByUserIdAndSellerItemId(Long userId, Long sellerItemId);
}
