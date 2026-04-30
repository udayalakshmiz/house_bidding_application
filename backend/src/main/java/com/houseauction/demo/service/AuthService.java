package com.houseauction.demo.service;

import com.houseauction.demo.dto.*;
import com.houseauction.demo.model.User;
import com.houseauction.demo.repository.UserRepository;
import com.houseauction.demo.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil, OtpService otpService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.otpService = otpService;
    }

    public String register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setVerified(false);
        userRepository.save(user);
        otpService.generateAndSendOtp(user);
        return "OTP sent to " + request.getEmail();
    }

    public AuthResponse verifyRegisterOtp(String email, String otp, HttpServletResponse response) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!otpService.validateOtp(user, otp)) {
            throw new RuntimeException("Invalid or expired OTP");
        }
        user.setVerified(true);
        otpService.clearOtp(user);
        return issueTokenAsCookie(user, response);
    }

    public String login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!user.isVerified()) throw new RuntimeException("Email not verified");
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }
        otpService.generateAndSendOtp(user);
        return "OTP sent to " + request.getEmail();
    }

    public AuthResponse verifyLoginOtp(String email, String otp, HttpServletResponse response) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!otpService.validateOtp(user, otp)) {
            throw new RuntimeException("Invalid or expired OTP");
        }
        otpService.clearOtp(user);
        return issueTokenAsCookie(user, response);
    }

    public String resendOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        otpService.generateAndSendOtp(user);
        return "OTP resent to " + email;
    }

    private AuthResponse issueTokenAsCookie(User user, HttpServletResponse response) {
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        
        // Keep cookie for backward compat (optional, can remove later)
        Cookie cookie = new Cookie("auth_token", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);      // change to true in production
        cookie.setPath("/");
        cookie.setMaxAge(86400);      // 24 hours
        response.addCookie(cookie);
        
        // Also return token in response body ← THIS IS THE FIX
        return new AuthResponse(token, user.getRole().name(), user.getName());
    }
}