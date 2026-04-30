package com.houseauction.demo.controller;

import com.houseauction.demo.dto.*;
import com.houseauction.demo.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/verify-register")
    public ResponseEntity<AuthResponse> verifyRegister(@RequestParam String email,
                                                       @RequestParam String otp,
                                                       HttpServletResponse response) {
        return ResponseEntity.ok(authService.verifyRegisterOtp(email, otp, response));
    }

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/verify-login")
    public ResponseEntity<AuthResponse> verifyLogin(@RequestParam String email,
                                                    @RequestParam String otp,
                                                    HttpServletResponse response) {
        return ResponseEntity.ok(authService.verifyLoginOtp(email, otp, response));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<String> resendOtp(@RequestParam String email) {
        return ResponseEntity.ok(authService.resendOtp(email));
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("auth_token", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok("Logged out");
    }
}