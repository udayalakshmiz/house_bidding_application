package com.houseauction.demo.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {

    private final String uploadDir = "uploads/";

    public String store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;

        String originalName = file.getOriginalFilename();
        if (originalName == null) throw new RuntimeException("Invalid file");

        String ext = originalName
                .substring(originalName.lastIndexOf("."))
                .toLowerCase();

        // only allow images and pdf
        if (!ext.matches("\\.(jpg|jpeg|png|pdf)")) {
            throw new RuntimeException("Only jpg, jpeg, png, pdf files are allowed");
        }

        String filename = UUID.randomUUID() + ext;
        Path dirPath = Paths.get(uploadDir);
        Files.createDirectories(dirPath);                    // create /uploads/ if missing
        Files.write(dirPath.resolve(filename), file.getBytes());

        return "/uploads/" + filename;
    }
}