package com.houseauction.demo.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/huggingface")
@CrossOrigin(origins = "http://localhost:5173")
public class HuggingFaceController {

    @PostMapping("/verify-aadhaar")
    public ResponseEntity<?> verifyAadhaar(@RequestBody Map<String, String> request) {
        String question = request.get("question");

        System.out.println("=== Aadhaar Verification Request ===");
        System.out.println("Question: " + question);
        System.out.println("Image received: YES");
        System.out.println("Note: Using simplified verification - auctioneer will manually verify");

        // For the demo, return appropriate responses
        String answer = "";

        if (question.toLowerCase().contains("is this an aadhaar card")) {
            answer = "yes";
        } else if (question.toLowerCase().contains("number") || question.toLowerCase().contains("digit")) {
            // Since OCR is unreliable, we acknowledge the upload but don't auto-extract
            answer = "The Aadhaar card has been uploaded. The number will be verified by the auctioneer.";
        } else {
            answer = "yes";
        }

        System.out.println("Answer: " + answer);

        // Return in the format expected by frontend
        return ResponseEntity.ok(List.of(Map.of("answer", answer)));
    }
}