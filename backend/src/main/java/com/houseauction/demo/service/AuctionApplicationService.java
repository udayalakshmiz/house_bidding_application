package com.houseauction.demo.service;

import com.houseauction.demo.model.*;
import com.houseauction.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuctionApplicationService {

    private final AuctionApplicationRepository appRepo;
    private final AuctionRepository            auctionRepo;
    private final UserRepository               userRepo;
    private final EmailService                 emailService;

    private static final String INCOME_DIR = "uploads/income_proofs/";
    private static final String UPLOAD_DIR = "uploads/aadhaar/";

    public AuctionApplicationService(AuctionApplicationRepository appRepo,
                                     AuctionRepository auctionRepo,
                                     UserRepository userRepo,
                                     EmailService emailService) {
        this.appRepo      = appRepo;
        this.auctionRepo  = auctionRepo;
        this.userRepo     = userRepo;
        this.emailService = emailService;
    }

    public AuctionApplication apply(Long auctionId,
                                    String bidderEmail,
                                    String aadhaarNumber,
                                    MultipartFile aadhaarImage,
                                    MultipartFile incomeProof,
                                    String fullName,
                                    String phone,
                                    String address,
                                    String occupation,
                                    double annualIncome,
                                    String pastBiddingHistory,
                                    String pastHistoryDetails) throws IOException {

        User bidder = userRepo.findByEmail(bidderEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Auction auction = auctionRepo.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        if (auction.getStatus() == AuctionStatus.CANCELLED ||
                auction.getStatus() == AuctionStatus.COMPLETED) {
            throw new RuntimeException("This auction is no longer accepting applications.");
        }

        if (appRepo.existsByAuctionIdAndBidderId(auctionId, bidder.getId())) {
            throw new RuntimeException("You have already applied for this auction.");
        }

        String aadhaarPath = saveFile(aadhaarImage, UPLOAD_DIR);
        String incomePath  = saveFile(incomeProof, INCOME_DIR);

        boolean verified = verifyAadhaar(aadhaarNumber, aadhaarImage);

        AuctionApplication app = new AuctionApplication();
        app.setAuction(auction);
        app.setBidder(bidder);
        app.setAadhaarNumber(aadhaarNumber);
        app.setAadhaarImagePath(aadhaarPath);
        app.setIncomeProofPath(incomePath);
        app.setAadhaarVerified(verified);
        app.setFullName(fullName);
        app.setPhone(phone);
        app.setAddress(address);
        app.setOccupation(occupation);
        app.setAnnualIncome(annualIncome);
        app.setPastBiddingHistory(pastBiddingHistory);
        app.setPastHistoryDetails(pastHistoryDetails);

        AuctionApplication saved = appRepo.save(app);

        try {
            emailService.notifyAuctioneerNewApplication(saved);
        } catch (Exception e) {
            System.err.println("[Email] notifyAuctioneerNewApplication failed: " + e.getMessage());
        }

        return saved;
    }

    // ── Bidder: withdraw/cancel their application ─────────────────────────
    // Allowed only before the auction's start time
    public void withdraw(Long auctionId, String bidderEmail) {
        User bidder = userRepo.findByEmail(bidderEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AuctionApplication app = appRepo
                .findByAuctionIdAndBidderId(auctionId, bidder.getId())
                .orElseThrow(() -> new RuntimeException("No application found for this auction."));

        Auction auction = app.getAuction();

        // Block withdrawal if auction has already started
        if (auction.getStartTime() != null &&
                LocalDateTime.now().isAfter(auction.getStartTime())) {
            throw new RuntimeException("Cannot withdraw after the auction has started.");
        }

        appRepo.delete(app);
    }

    private String saveFile(MultipartFile file, String directory) throws IOException {
        if (file == null || file.isEmpty()) return null;
        Path dir = Paths.get(directory);
        if (!Files.exists(dir)) Files.createDirectories(dir);
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path dest = dir.resolve(filename);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        return dest.toString();
    }

    private boolean verifyAadhaar(String aadhaarNumber, MultipartFile image) {
        if (aadhaarNumber == null || !aadhaarNumber.matches("\\d{12}")) return false;
        return image != null && !image.isEmpty();
    }

    private String saveAadhaarImage(MultipartFile file) throws IOException {
        Path dir = Paths.get(UPLOAD_DIR);
        if (!Files.exists(dir)) Files.createDirectories(dir);
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path dest = dir.resolve(filename);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        return dest.toString();
    }

    // ── Get all applicants for an auction ─────────────────────────────────
    public List<AuctionApplication> getApplicationsForAuction(Long auctionId, String callerEmail) {
        Auction auction = auctionRepo.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        User caller = userRepo.findByEmail(callerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isAdmin = caller.getRole() == Role.ADMIN;
        boolean isOwner = auction.getAuctioneer().getEmail().equals(callerEmail);

        if (!isAdmin && !isOwner) {
            throw new RuntimeException("Not authorized to view these applications.");
        }

        return appRepo.findByAuctionId(auctionId);
    }

    // ── Auctioneer: approve bidder ────────────────────────────────────────
    public AuctionApplication approve(Long applicationId, String callerEmail) {
        AuctionApplication app = getAndAuthorize(applicationId, callerEmail);
        app.setStatus(ApplicationStatus.APPROVED);
        app.setReviewedAt(LocalDateTime.now());

        AuctionApplication saved = appRepo.save(app);

        try {
            emailService.notifyBidderApproved(saved);
        } catch (Exception e) {
            System.err.println("[Email] notifyBidderApproved failed: " + e.getMessage());
        }

        return saved;
    }

    // ── Auctioneer: reject bidder ─────────────────────────────────────────
    public AuctionApplication reject(Long applicationId, String callerEmail, String reason) {
        AuctionApplication app = getAndAuthorize(applicationId, callerEmail);
        app.setStatus(ApplicationStatus.REJECTED);
        app.setRejectionReason(reason);
        app.setReviewedAt(LocalDateTime.now());

        AuctionApplication saved = appRepo.save(app);

        try {
            emailService.notifyBidderRejected(saved);
        } catch (Exception e) {
            System.err.println("[Email] notifyBidderRejected failed: " + e.getMessage());
        }

        return saved;
    }

    // ── Bidder: get all their applications ────────────────────────────────
    public List<AuctionApplication> getMyApplications(String email) {
        User bidder = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return appRepo.findByBidderId(bidder.getId());
    }

    // ── Bidder: get their application for a specific auction ──────────────
    public AuctionApplication getMyApplicationForAuction(Long auctionId, String email) {
        User bidder = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return appRepo.findByAuctionIdAndBidderId(auctionId, bidder.getId())
                .orElse(null);
    }

    // ── Helper: load application, allow auctioneer owner OR admin ─────────
    private AuctionApplication getAndAuthorize(Long applicationId, String callerEmail) {
        AuctionApplication app = appRepo.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        User caller = userRepo.findByEmail(callerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isAdmin = caller.getRole() == Role.ADMIN;
        boolean isOwner = app.getAuction().getAuctioneer().getEmail().equals(callerEmail);

        if (!isAdmin && !isOwner) {
            throw new RuntimeException("Not authorized.");
        }
        return app;
    }
}