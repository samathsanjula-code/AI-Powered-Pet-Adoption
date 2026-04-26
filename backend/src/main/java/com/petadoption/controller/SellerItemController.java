package com.petadoption.controller;

import com.petadoption.config.MongoIdSequenceService;
import com.petadoption.entity.SellerItem;
import com.petadoption.repository.SellerItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api/seller-items")
@CrossOrigin(origins = "*")
public class SellerItemController {

    @Autowired
    private SellerItemRepository sellerItemRepository;

    @Autowired
    private MongoIdSequenceService idSequenceService;

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    private static final String SELLER_SUBDIR = "seller";

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<SellerItem> items = sellerItemRepository.findAllByOrderByIdDesc();
        List<Map<String, Object>> result = new ArrayList<>();
        for (SellerItem item : items) {
            result.add(toMap(item));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable Long id) {
        return sellerItemRepository.findById(id)
            .map(item -> ResponseEntity.ok(toMap(item)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @RequestParam("title") String title,
            @RequestParam("category") String category,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("price") Double price,
            @RequestParam(value = "brand", required = false) String brand,
            @RequestParam(value = "quantityInStock", required = false) Integer quantityInStock,
            @RequestParam(value = "suitableFor", required = false) String suitableFor,
            @RequestParam(value = "images", required = false) MultipartFile[] images) {
        try {
            SellerItem item = new SellerItem();
            item.setId(idSequenceService.nextId("seller_items"));
            item.setTitle(title);
            item.setCategory(category);
            item.setDescription(description);
            item.setPrice(price);
            item.setBrand(brand);
            item.setQuantityInStock(quantityInStock != null ? quantityInStock : 0);
            item.setSuitableFor(suitableFor);

            if (images != null && images.length > 0) {
                List<String> paths = saveImages(images);
                item.setImagePaths(String.join(",", paths));
            }

            item = sellerItemRepository.save(item);
            return ResponseEntity.ok(toMap(item));
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage() != null ? e.getMessage() : "Unknown error");
            return ResponseEntity.badRequest().body(err);
        }
    }

    @Autowired
    private com.petadoption.repository.StockSubscriptionRepository stockSubscriptionRepository;

    @Autowired
    private com.petadoption.repository.NotificationRepository notificationRepository;

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable Long id,
            @RequestParam("title") String title,
            @RequestParam("category") String category,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("price") Double price,
            @RequestParam(value = "brand", required = false) String brand,
            @RequestParam(value = "quantityInStock", required = false) Integer quantityInStock,
            @RequestParam(value = "suitableFor", required = false) String suitableFor,
            @RequestParam(value = "images", required = false) MultipartFile[] images) {
        return sellerItemRepository.findById(id)
            .map(item -> {
                try {
                    int oldStock = item.getQuantityInStock() != null ? item.getQuantityInStock() : 0;
                    int newStock = quantityInStock != null ? quantityInStock : 0;

                    item.setTitle(title);
                    item.setCategory(category);
                    item.setDescription(description);
                    item.setPrice(price);
                    item.setBrand(brand);
                    item.setQuantityInStock(newStock);
                    item.setSuitableFor(suitableFor);

                    if (images != null && images.length > 0) {
                        List<String> paths = saveImages(images);
                        item.setImagePaths(String.join(",", paths));
                    }

                    item = sellerItemRepository.save(item);

                    // Notify if restocked
                    if (oldStock <= 0 && newStock > 0) {
                        List<com.petadoption.entity.StockSubscription> subs = stockSubscriptionRepository.findBySellerItemId(item.getId());
                        for (com.petadoption.entity.StockSubscription sub : subs) {
                            Long nId = idSequenceService.nextId("notifications");
                            String msg = "Item back in stock: " + item.getTitle();
                            com.petadoption.entity.Notification n = new com.petadoption.entity.Notification(nId, sub.getUserId(), msg, "STOCK_ALERT", item.getId());
                            notificationRepository.save(n);
                            stockSubscriptionRepository.delete(sub); // Sub fulfilled
                        }
                    }

                    return ResponseEntity.ok(toMap(item));
                } catch (Exception e) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("success", false);
                    err.put("message", e.getMessage());
                    return ResponseEntity.badRequest().body(err);
                }
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/subscribe")
    public ResponseEntity<?> subscribe(@PathVariable Long id, @RequestBody Map<String, Long> payload) {
        Long userId = payload.get("userId");
        if (userId == null) return ResponseEntity.badRequest().build();

        return sellerItemRepository.findById(id).map(item -> {
            Optional<com.petadoption.entity.StockSubscription> existing = stockSubscriptionRepository.findByUserIdAndSellerItemId(userId, id);
            if (existing.isEmpty()) {
                com.petadoption.entity.StockSubscription sub = new com.petadoption.entity.StockSubscription();
                sub.setId(idSequenceService.nextId("stock_subscriptions"));
                sub.setUserId(userId);
                sub.setSellerItemId(id);
                sub.setItemTitle(item.getTitle());
                stockSubscriptionRepository.save(sub);
            }
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return sellerItemRepository.findById(id)
            .map(item -> {
                sellerItemRepository.delete(item);
                return ResponseEntity.ok().build();
            })
            .orElse(ResponseEntity.notFound().build());
    }

    private List<String> saveImages(MultipartFile[] files) throws IOException {
        Path dir = Paths.get(uploadDir, SELLER_SUBDIR);
        if (!Files.exists(dir)) Files.createDirectories(dir);

        List<String> paths = new ArrayList<>();
        for (MultipartFile f : files) {
            if (f.isEmpty()) continue;
            String ext = f.getOriginalFilename() != null && f.getOriginalFilename().contains(".")
                ? f.getOriginalFilename().substring(f.getOriginalFilename().lastIndexOf(".")) : ".jpg";
            String filename = "seller_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path target = dir.resolve(filename);
            Files.copy(f.getInputStream(), target);
            paths.add("/uploads/" + SELLER_SUBDIR + "/" + filename);
        }
        return paths;
    }

    private Map<String, Object> toMap(SellerItem item) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", item.getId());
        m.put("title", item.getTitle());
        m.put("category", item.getCategory());
        m.put("description", item.getDescription());
        m.put("price", item.getPrice());
        m.put("brand", item.getBrand());
        m.put("quantityInStock", item.getQuantityInStock() != null ? item.getQuantityInStock() : 0);
        m.put("suitableFor", item.getSuitableFor());
        List<String> imgs = new ArrayList<>();
        if (item.getImagePaths() != null && !item.getImagePaths().trim().isEmpty()) {
            for (String s : item.getImagePaths().split(",")) {
                if (!s.trim().isEmpty()) imgs.add(s.trim());
            }
        }
        m.put("imagePaths", imgs);
        return m;
    }
}
