package com.babygrow.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/baby")
public class AiProxyController {

    @Value("${ai.service.url:http://localhost:8001}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/records/extract")
    public ResponseEntity<Map> extractRecord(@RequestBody Map<String, Object> body) {
        String url = aiServiceUrl + "/api/baby/records/extract";
        return forwardPost(url, body);
    }

    @PostMapping("/recipes/recommend")
    public ResponseEntity<Map> recommendRecipes(@RequestBody Map<String, Object> body) {
        String url = aiServiceUrl + "/api/baby/recipes/recommend";
        return forwardPost(url, body);
    }

    private ResponseEntity<Map> forwardPost(String url, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                        "status", "error",
                        "error", "AI service unavailable: " + e.getMessage()
                    ));
        }
    }
}
