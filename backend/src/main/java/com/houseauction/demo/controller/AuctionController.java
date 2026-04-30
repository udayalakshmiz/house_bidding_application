package com.houseauction.demo.controller;

import com.houseauction.demo.model.Auction;
import com.houseauction.demo.model.Bid;
import com.houseauction.demo.dto.AuctionRequest;
import com.houseauction.demo.repository.BidRepository;
import com.houseauction.demo.service.AuctionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/auctions")
public class AuctionController {

    private final AuctionService auctionService;
    private final BidRepository  bidRepo;

    public AuctionController(AuctionService auctionService, BidRepository bidRepo) {
        this.auctionService = auctionService;
        this.bidRepo        = bidRepo;
    }

    // ── POST /api/auctions — create auction (AUCTIONEER) ─────────────────
    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody AuctionRequest req,
            Principal principal) {
        try {
            Auction created = auctionService.createAuction(req, principal.getName());
            return ResponseEntity.ok(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── GET /api/auctions — all active auctions (public) ─────────────────
    @GetMapping
    public ResponseEntity<List<Auction>> getActive() {
        return ResponseEntity.ok(auctionService.getActiveAuctions());
    }

    // ── GET /api/auctions/all — all auctions (admin) ──────────────────────
    @GetMapping("/all")
    public ResponseEntity<List<Auction>> getAll() {
        return ResponseEntity.ok(auctionService.getAllAuctions());
    }

    // ── GET /api/auctions/my — my auctions (auctioneer) ──────────────────
    @GetMapping("/my")
    public ResponseEntity<List<Auction>> getMyAuctions(Principal principal) {
        return ResponseEntity.ok(auctionService.getMyAuctions(principal.getName()));
    }

    // ── GET /api/auctions/{id} ────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Auction> getById(@PathVariable Long id) {
        return ResponseEntity.ok(auctionService.getById(id));
    }

    // ── GET /api/auctions/{id}/room-state ─────────────────────────────────
    // Returns auction + full bid history so room re-entry shows previous bids
    @GetMapping("/{id}/room-state")
    public ResponseEntity<?> getRoomState(
            @PathVariable Long id,
            Principal principal) {
        try {
            Auction auction = auctionService.getById(id);

            // Load bid history from DB, newest first (last 100 bids)
            List<Bid> bids = bidRepo.findByAuctionIdOrderByPlacedAtDesc(id);
            List<Map<String, Object>> bidList = bids.stream()
                .limit(100)
                .map(b -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("bidderName", b.getBidder().getName());
                    m.put("bidderId",   b.getBidder().getId());
                    m.put("amount",     b.getAmount());
                    m.put("timestamp",  b.getPlacedAt().toString());
                    return m;
                })
                .toList();

            Map<String, Object> response = new HashMap<>();
            response.put("auction",    auction);
            response.put("bidHistory", bidList);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── PUT /api/auctions/{id}/cancel ─────────────────────────────────────
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(
            @PathVariable Long id,
            Principal principal) {
        try {
            return ResponseEntity.ok(auctionService.cancel(id, principal.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}