package com.houseauction.demo.service;

import com.houseauction.demo.model.User;
import com.houseauction.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class OtpService {

    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    @Value("${app.otp-expiry-minutes}")
    private int otpExpiryMinutes;

    public OtpService(UserRepository userRepository, JavaMailSender mailSender) {
        this.userRepository = userRepository;
        this.mailSender = mailSender;
    }

    public void generateAndSendOtp(User user) {
        String otp = String.valueOf((int)(Math.random() * 900000) + 100000);
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        userRepository.save(user);
        sendOtpEmail(user.getEmail(), otp);
    }

    public boolean validateOtp(User user, String enteredOtp) {
        if (user.getOtp() == null) return false;
        if (LocalDateTime.now().isAfter(user.getOtpExpiry())) return false;
        return user.getOtp().equals(enteredOtp);
    }

    public void clearOtp(User user) {
        user.setOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);
    }

    private void sendOtpEmail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("House Auction - Your OTP");
        message.setText("Your OTP is: " + otp + "\n\nValid for " + otpExpiryMinutes + " minutes.\nDo not share this with anyone.");
        mailSender.send(message);
    }
}