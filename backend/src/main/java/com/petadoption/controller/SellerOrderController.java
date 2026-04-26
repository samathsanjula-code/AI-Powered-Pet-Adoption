package com.petadoption.controller;

import com.petadoption.config.MongoIdSequenceService;
import com.petadoption.entity.SellerItem;
import com.petadoption.entity.SellerOrder;
import com.petadoption.entity.SellerOrderItem;
import com.petadoption.repository.SellerItemRepository;
import com.petadoption.repository.SellerOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/seller-orders")
@CrossOrigin(origins = "*")
public class SellerOrderController {

    private static final Set<String> VALID_STATUSES = Set.of(
        "ORDER_CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"
    );

    @Autowired
    private SellerOrderRepository sellerOrderRepository;

    @Autowired
    private SellerItemRepository sellerItemRepository;

    @Autowired
    private MongoIdSequenceService idSequenceService;

    @Autowired
    private com.petadoption.repository.UserRepository userRepository;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrder(@RequestBody CreateOrderRequest request) {
        if (request.getUserId() == null || request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(error("User and cart items are required"));
        }
        if (request.getShippingAddress() == null || request.getShippingAddress().isBlank()) {
            return ResponseEntity.badRequest().body(error("Shipping address is required"));
        }

        List<SellerOrderItem> orderItems = new ArrayList<>();
        double total = 0;
        LocalDateTime now = LocalDateTime.now();

        for (OrderLine line : request.getItems()) {
            if (line.getSellerItemId() == null || line.getQuantity() == null || line.getQuantity() <= 0) {
                return ResponseEntity.badRequest().body(error("Invalid order line"));
            }

            Optional<SellerItem> sellerItemOpt = sellerItemRepository.findById(line.getSellerItemId());
            if (sellerItemOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(error("Item not found: " + line.getSellerItemId()));
            }

            SellerItem item = sellerItemOpt.get();
            int stock = item.getQuantityInStock() != null ? item.getQuantityInStock() : 0;
            if (stock < line.getQuantity()) {
                return ResponseEntity.badRequest().body(error("Not enough stock for: " + item.getTitle()));
            }

            SellerOrderItem oi = new SellerOrderItem();
            oi.setId(idSequenceService.nextId("seller_order_items"));
            oi.setSellerItemId(item.getId());
            oi.setItemTitle(item.getTitle());
            oi.setUnitPrice(item.getPrice());
            oi.setQuantity(line.getQuantity());
            oi.setLineTotal(item.getPrice() * line.getQuantity());
            total += oi.getLineTotal();
            orderItems.add(oi);

            item.setQuantityInStock(stock - line.getQuantity());
            sellerItemRepository.save(item);
        }

        SellerOrder order = new SellerOrder();
        order.setId(idSequenceService.nextId("seller_orders"));
        order.setUserId(request.getUserId());
        order.setUserName(request.getUserName() != null ? request.getUserName() : "Unknown");
        order.setUserEmail(request.getUserEmail() != null ? request.getUserEmail() : "");
        order.setShippingAddress(request.getShippingAddress());
        order.setContactPhone(request.getContactPhone());
        order.setNotes(request.getNotes());
        order.setStatus("ORDER_CONFIRMED");
        order.setTotalAmount(total);
        order.setCreatedAt(now);
        order.setUpdatedAt(now);
        order.setItems(orderItems);

        SellerOrder saved = sellerOrderRepository.save(order);

        // Notify Sellers and Admins
        try {
            List<com.petadoption.entity.User> admins = new ArrayList<>();
            admins.addAll(userRepository.findByRole("Admin"));
            admins.addAll(userRepository.findByRole("SellerAdmin"));
            
            for (com.petadoption.entity.User admin : admins) {
                Long nId = idSequenceService.nextId("notifications");
                String msg = "New order received: #" + saved.getId() + " from " + saved.getUserName();
                com.petadoption.entity.Notification n = new com.petadoption.entity.Notification(nId, admin.getId(), msg, "NEW_ORDER", saved.getId());
                notificationRepository.save(n);
            }
        } catch (Exception e) {}

        return ResponseEntity.ok(toOrderMap(saved));
    }

    @GetMapping("/my/{userId}")
    public ResponseEntity<List<Map<String, Object>>> getMyOrders(@PathVariable Long userId) {
        List<SellerOrder> orders = sellerOrderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (SellerOrder order : orders) {
            result.add(toOrderMap(order));
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelMyOrder(@PathVariable Long orderId, @RequestBody CancelOrderRequest request) {
        Optional<SellerOrder> orderOpt = sellerOrderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        SellerOrder order = orderOpt.get();

        if (!Objects.equals(order.getUserId(), request.getUserId())) {
            return ResponseEntity.status(403).body(error("You can only cancel your own orders"));
        }

        if ("SHIPPED".equals(order.getStatus()) || "DELIVERED".equals(order.getStatus()) || "CANCELLED".equals(order.getStatus())) {
            return ResponseEntity.badRequest().body(error("Order cannot be cancelled in current status"));
        }

        order.setStatus("CANCELLED");
        order.setCancellationReason(request.getReason() != null ? request.getReason() : "Cancelled by customer");
        restoreStock(order);
        order.setUpdatedAt(LocalDateTime.now());
        SellerOrder saved = sellerOrderRepository.save(order);

        // Create notification
        try {
            Long nId = idSequenceService.nextId("notifications");
            String msg = "You have cancelled order #" + order.getId();
            com.petadoption.entity.Notification n = new com.petadoption.entity.Notification(nId, order.getUserId(), msg, "ORDER_STATUS", order.getId());
            notificationRepository.save(n);
        } catch (Exception e) {}

        return ResponseEntity.ok(toOrderMap(saved));
    }

    @GetMapping("/admin")
    public ResponseEntity<List<Map<String, Object>>> getAllOrdersForAdmin() {
        List<SellerOrder> orders = sellerOrderRepository.findAllByOrderByCreatedAtDesc();
        List<Map<String, Object>> result = new ArrayList<>();
        for (SellerOrder order : orders) {
            result.add(toOrderMap(order));
        }
        return ResponseEntity.ok(result);
    }

    @Autowired
    private com.petadoption.repository.NotificationRepository notificationRepository;

    @PutMapping("/{orderId}/status")
    public ResponseEntity<Map<String, Object>> updateOrderStatus(@PathVariable Long orderId, @RequestBody UpdateStatusRequest request) {
        if (request.getStatus() == null || !VALID_STATUSES.contains(request.getStatus())) {
            return ResponseEntity.badRequest().body(error("Invalid status"));
        }

        Optional<SellerOrder> orderOpt = sellerOrderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SellerOrder order = orderOpt.get();
        String previous = order.getStatus();

        if ("DELIVERED".equals(previous) || "CANCELLED".equals(previous)) {
            return ResponseEntity.badRequest().body(error("Finalized order status cannot be changed"));
        }

        if ("CANCELLED".equals(request.getStatus())) {
            restoreStock(order);
            order.setCancellationReason("Cancelled by admin");
        }

        order.setStatus(request.getStatus());
        order.setUpdatedAt(LocalDateTime.now());
        SellerOrder saved = sellerOrderRepository.save(order);

        // Create notification
        try {
            Long nId = idSequenceService.nextId("notifications");
            String msg = "Your order #" + order.getId() + " is now " + request.getStatus();
            com.petadoption.entity.Notification n = new com.petadoption.entity.Notification(nId, order.getUserId(), msg, "ORDER_STATUS", order.getId());
            notificationRepository.save(n);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(toOrderMap(saved));
    }

    private void restoreStock(SellerOrder order) {
        for (SellerOrderItem oi : order.getItems()) {
            sellerItemRepository.findById(oi.getSellerItemId()).ifPresent(item -> {
                int stock = item.getQuantityInStock() != null ? item.getQuantityInStock() : 0;
                item.setQuantityInStock(stock + oi.getQuantity());
                sellerItemRepository.save(item);
            });
        }
    }

    private Map<String, Object> toOrderMap(SellerOrder order) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", order.getId());
        map.put("userId", order.getUserId());
        map.put("userName", order.getUserName());
        map.put("userEmail", order.getUserEmail());
        map.put("shippingAddress", order.getShippingAddress());
        map.put("contactPhone", order.getContactPhone());
        map.put("status", order.getStatus());
        map.put("totalAmount", order.getTotalAmount());
        map.put("notes", order.getNotes());
        map.put("cancellationReason", order.getCancellationReason());
        map.put("createdAt", order.getCreatedAt());
        map.put("updatedAt", order.getUpdatedAt());

        List<Map<String, Object>> lines = new ArrayList<>();
        for (SellerOrderItem oi : order.getItems()) {
            Map<String, Object> line = new HashMap<>();
            line.put("id", oi.getId());
            line.put("sellerItemId", oi.getSellerItemId());
            line.put("itemTitle", oi.getItemTitle());
            line.put("unitPrice", oi.getUnitPrice());
            line.put("quantity", oi.getQuantity());
            line.put("lineTotal", oi.getLineTotal());
            lines.add(line);
        }
        map.put("items", lines);
        return map;
    }

    private Map<String, Object> error(String message) {
        Map<String, Object> map = new HashMap<>();
        map.put("success", false);
        map.put("message", message);
        return map;
    }

    public static class CreateOrderRequest {
        private Long userId;
        private String userName;
        private String userEmail;
        private String shippingAddress;
        private String contactPhone;
        private String notes;
        private List<OrderLine> items;

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getUserName() { return userName; }
        public void setUserName(String userName) { this.userName = userName; }
        public String getUserEmail() { return userEmail; }
        public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
        public String getShippingAddress() { return shippingAddress; }
        public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
        public String getContactPhone() { return contactPhone; }
        public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
        public List<OrderLine> getItems() { return items; }
        public void setItems(List<OrderLine> items) { this.items = items; }
    }

    public static class OrderLine {
        private Long sellerItemId;
        private Integer quantity;

        public Long getSellerItemId() { return sellerItemId; }
        public void setSellerItemId(Long sellerItemId) { this.sellerItemId = sellerItemId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }

    public static class CancelOrderRequest {
        private Long userId;
        private String reason;

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class UpdateStatusRequest {
        private String status;

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
