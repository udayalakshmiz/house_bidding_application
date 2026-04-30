package com.houseauction.demo.controller;

import com.houseauction.demo.service.PasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetController(PasswordResetService passwordResetService,
                                   PasswordEncoder passwordEncoder) {
        this.passwordResetService = passwordResetService;
        this.passwordEncoder = passwordEncoder;
    }

    // Frontend calls this when user submits forgot password form
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody Map<String, String> body) {
        passwordResetService.sendResetLink(body.get("email"));
        return ResponseEntity.ok("Reset link sent to your email");
    }

    // Frontend calls this when user submits new password
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody Map<String, String> body) {
        passwordResetService.resetPassword(
                body.get("token"),
                body.get("newPassword"),
                passwordEncoder
        );
        return ResponseEntity.ok("Password reset successful");
    }
}