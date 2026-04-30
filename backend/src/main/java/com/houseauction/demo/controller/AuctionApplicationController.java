package com.houseauction.demo.controller;

import com.houseauction.demo.model.AuctionApplication;
import com.houseauction.demo.service.AuctionApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auction-applications")
public class AuctionApplicationController {

    private final AuctionApplicationService appService;

    public AuctionApplicationController(AuctionApplicationService appService) {
        this.appService = appService;
    }

    // ── POST /api/auction-applications/{auctionId}/apply ─────────────────
    @PostMapping("/{auctionId}/apply")
    public ResponseEntity<?> apply(
            @PathVariable Long auctionId,
            @RequestParam("aadhaarNumber")       String aadhaarNumber,
            @RequestParam("aadhaarImage")        MultipartFile aadhaarImage,
            @RequestParam("incomeProof")         MultipartFile incomeProof,
            @RequestParam("fullName")            String fullName,
            @RequestParam("phone")               String phone,
            @RequestParam("address")             String address,
            @RequestParam("occupation")          String occupation,
            @RequestParam("annualIncome")        double annualIncome,
            @RequestParam("pastBiddingHistory")  String pastBiddingHistory,
            @RequestParam(value = "pastHistoryDetails", required = false, defaultValue = "") String pastHistoryDetails,
            Principal principal) {
        try {
            AuctionApplication app = appService.apply(
                    auctionId, principal.getName(),
                    aadhaarNumber, aadhaarImage, incomeProof,
                    fullName, phone, address, occupation,
                    annualIncome, pastBiddingHistory, pastHistoryDetails
            );
            return ResponseEntity.ok(app);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── DELETE /api/auction-applications/{auctionId}/withdraw ─────────────
    // Bidder withdraws their application before the auction starts
    @DeleteMapping("/{auctionId}/withdraw")
    public ResponseEntity<?> withdraw(
            @PathVariable Long auctionId,
            Principal principal) {
        try {
            appService.withdraw(auctionId, principal.getName());
            return ResponseEntity.ok(Map.of("message", "Application withdrawn successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── GET /api/auction-applications/my ─────────────────────────────────
    @GetMapping("/my")
    public ResponseEntity<List<AuctionApplication>> getMyApplications(Principal principal) {
        return ResponseEntity.ok(appService.getMyApplications(principal.getName()));
    }

    // ── GET /api/auction-applications/my/{auctionId} ──────────────────────
    @GetMapping("/my/{auctionId}")
    public ResponseEntity<?> getMyApplicationForAuction(
            @PathVariable Long auctionId,
            Principal principal) {
        try {
            AuctionApplication app = appService.getMyApplicationForAuction(auctionId, principal.getName());
            if (app == null) {
                return ResponseEntity.ok().body(Map.of("status", "NOT_APPLIED"));
            }
            return ResponseEntity.ok(app);
        } catch (Exception e) {
            System.err.println("Error fetching application: " + e.getMessage());
            return ResponseEntity.ok().body(Map.of("status", "NOT_APPLIED"));
        }
    }

    // ── GET /api/auction-applications/auction/{auctionId} ─────────────────
    @GetMapping("/auction/{auctionId}")
    public ResponseEntity<?> getAuctionApplications(
            @PathVariable Long auctionId,
            Principal principal) {
        try {
            List<AuctionApplication> apps =
                    appService.getApplicationsForAuction(auctionId, principal.getName());
            return ResponseEntity.ok(apps);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── PUT /api/auction-applications/{applicationId}/approve ─────────────
    @PutMapping("/{applicationId}/approve")
    public ResponseEntity<?> approve(
            @PathVariable Long applicationId,
            Principal principal) {
        try {
            return ResponseEntity.ok(appService.approve(applicationId, principal.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── PUT /api/auction-applications/{applicationId}/reject ──────────────
    @PutMapping("/{applicationId}/reject")
    public ResponseEntity<?> reject(
            @PathVariable Long applicationId,
            @RequestBody Map<String, String> body,
            Principal principal) {
        try {
            String reason = body.getOrDefault("reason", "");
            return ResponseEntity.ok(appService.reject(applicationId, principal.getName(), reason));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}