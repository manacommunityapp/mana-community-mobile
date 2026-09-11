# Push Notifications — Spring Boot Integration Guide

The mobile app uses **Expo Push Notifications** (free, no Firebase setup needed for Expo Go testing).  
The Spring Boot backend needs to store device tokens and call the Expo Push API when events happen.

---

## 1. Database — store device tokens

```sql
CREATE TABLE push_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) NOT NULL UNIQUE,
  platform    VARCHAR(10) NOT NULL CHECK (platform IN ('ios','android')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
```

---

## 2. REST endpoints (mobile already calls these)

```java
// PushTokenController.java

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class PushTokenController {

    private final PushTokenRepository tokenRepo;

    // POST /api/users/push-token
    @PostMapping("/push-token")
    public ResponseEntity<Void> register(
        @RequestBody PushTokenRequest req,
        @AuthenticationPrincipal UserDetails principal
    ) {
        Long userId = userService.getByEmail(principal.getUsername()).getId();
        PushToken token = tokenRepo.findByToken(req.getToken())
            .orElse(new PushToken());
        token.setUserId(userId);
        token.setToken(req.getToken());
        token.setPlatform(req.getPlatform());
        token.setUpdatedAt(LocalDateTime.now());
        tokenRepo.save(token);
        return ResponseEntity.ok().build();
    }

    // DELETE /api/users/push-token
    @DeleteMapping("/push-token")
    public ResponseEntity<Void> remove(@RequestBody PushTokenRequest req) {
        tokenRepo.deleteByToken(req.getToken());
        return ResponseEntity.ok().build();
    }
}
```

---

## 3. Expo Push Service

```java
// ExpoPushService.java

@Service
@RequiredArgsConstructor
public class ExpoPushService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final RestTemplate restTemplate;
    private final PushTokenRepository tokenRepo;

    /**
     * Send a push notification to all devices belonging to a user.
     *
     * @param userId   target user
     * @param title    notification title
     * @param body     notification body text
     * @param data     extra data (type, conversationId, eventId, etc.)
     */
    public void sendToUser(Long userId, String title, String body, Map<String, Object> data) {
        List<String> tokens = tokenRepo.findTokensByUserId(userId);
        if (tokens.isEmpty()) return;

        List<Map<String, Object>> messages = tokens.stream().map(token -> {
            Map<String, Object> msg = new HashMap<>();
            msg.put("to",       token);
            msg.put("title",    title);
            msg.put("body",     body);
            msg.put("data",     data);
            msg.put("sound",    "default");
            msg.put("priority", "high");
            // Android channel (matches channels set up in mobile app)
            if (data.containsKey("type")) {
                String type = (String) data.get("type");
                if (type.contains("MESSAGE")) msg.put("channelId", "chat");
                else if (type.contains("EVENT")) msg.put("channelId", "events");
                else msg.put("channelId", "default");
            }
            return msg;
        }).collect(Collectors.toList());

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Accept", "application/json");
            headers.set("Accept-Encoding", "gzip, deflate");

            HttpEntity<List<Map<String, Object>>> request = new HttpEntity<>(messages, headers);
            restTemplate.postForObject(EXPO_PUSH_URL, request, String.class);
        } catch (Exception e) {
            log.error("Failed to send push notification to userId={}: {}", userId, e.getMessage());
        }
    }
}
```

---

## 4. Wire into your existing services

### New chat message → notify recipient
```java
// ChatService.java
@Autowired ExpoPushService pushService;

public ChatMessageDto sendMessage(Long conversationId, SendMessageDto dto, String senderEmail) {
    // ... existing save logic ...

    // Notify all participants except sender
    conversation.getParticipants().stream()
        .filter(p -> !p.getUserId().equals(senderId))
        .forEach(p -> pushService.sendToUser(
            p.getUserId(),
            sender.getName(),
            dto.getContent(),
            Map.of("type", "NEW_MESSAGE", "conversationId", conversationId)
        ));

    return saved;
}
```

### New event → notify community members
```java
// EventService.java
public EventDto createEvent(CreateEventRequest req, Long creatorId) {
    // ... existing save logic ...

    // Notify community (batch — don't spam, just announce)
    communityService.getMemberIds(req.getCommunityId()).forEach(memberId ->
        pushService.sendToUser(memberId,
            "New Event: " + req.getTitle(),
            req.getVenue() + " · " + formatDate(req.getStartAt()),
            Map.of("type", "NEW_EVENT", "eventId", savedEvent.getId())
        )
    );

    return savedEvent;
}
```

### New post → notify followers (optional)
```java
Map<String, Object> data = Map.of("type", "NEW_POST", "postId", savedPost.getId());
pushService.sendToUser(followerId, authorName + " posted", post.getContent().substring(0, 60), data);
```

---

## 5. Profile photo endpoint

```java
// UserController.java
@PutMapping("/users/me/profile-photo")
public ResponseEntity<Map<String, String>> uploadProfilePhoto(
    @RequestPart("file") MultipartFile file,
    @AuthenticationPrincipal UserDetails principal
) {
    String photoUrl = fileStorageService.upload(file, "profile-photos");
    userService.updateProfilePhoto(principal.getUsername(), photoUrl);
    return ResponseEntity.ok(Map.of("photoUrl", photoUrl));
}

// FileStorageService — upload to S3 or local /uploads
public String upload(MultipartFile file, String folder) {
    String key = folder + "/" + UUID.randomUUID() + getExtension(file);
    // s3Client.putObject(bucket, key, file.getInputStream(), metadata);
    return "https://your-cdn.com/" + key;
}
```

---

## 6. Notification types reference

The mobile app routes tap-navigation based on the `type` field in push data:

| `type` value         | Navigates to         |
|----------------------|----------------------|
| `NEW_MESSAGE`        | `/chat/{conversationId}` |
| `POST_LIKE`          | `/tabs/feed`         |
| `POST_COMMENT`       | `/tabs/feed`         |
| `NEW_EVENT`          | `/tabs/events`       |
| `EVENT_REMINDER`     | `/tabs/events`       |
| `SPORTS_MATCH`       | `/tabs/sports`       |
| `AUCTION_BID`        | `/auction`           |
| `NEW_POST`           | `/tabs/feed`         |
