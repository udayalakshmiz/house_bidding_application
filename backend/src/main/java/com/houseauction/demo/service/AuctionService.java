package com.houseauction.demo.service;

import com.houseauction.demo.dto.AuctionRequest;
import com.houseauction.demo.model.*;
import com.houseauction.demo.repository.AuctionRepository;
import com.houseauction.demo.repository.PropertyRepository;
import com.houseauction.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuctionService {

    private final AuctionRepository auctionRepo;
    private final PropertyRepository propertyRepo;
    private final UserRepository userRepo;

    public AuctionService(AuctionRepository auctionRepo,
                          PropertyRepository propertyRepo,
                          UserRepository userRepo) {
        this.auctionRepo  = auctionRepo;
        this.propertyRepo = propertyRepo;
        this.userRepo     = userRepo;
    }

    // ── Auctioneer: create auction for an approved property ───────────────
    public Auction createAuction(AuctionRequest req, String auctioneerEmail) {

        User auctioneer = userRepo.findByEmail(auctioneerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Property property = propertyRepo.findById(req.getPropertyId())
                .orElseThrow(() -> new RuntimeException("Property not found"));

        if (property.getStatus() != PropertyStatus.APPROVED) {
            throw new RuntimeException(
                    "Only APPROVED properties can be auctioned. " +
                            "This property is: " + property.getStatus());
        }

        if (!property.getAuctioneer().getEmail().equals(auctioneerEmail)) {
            throw new RuntimeException("You can only create auctions for your own properties.");
        }

        // ✅ REPLACE WITH THIS
        boolean activeAuctionExists = auctionRepo.existsByPropertyIdAndStatusIn(
                req.getPropertyId(),
                List.of(AuctionStatus.SCHEDULED, AuctionStatus.LIVE)
        );

        if (activeAuctionExists) {
            throw new RuntimeException("An active auction already exists for this property.");
        }

        LocalDateTime startTime = LocalDateTime.parse(req.getStartTime());
        LocalDateTime endTime   = LocalDateTime.parse(req.getEndTime());

        if (!endTime.isAfter(startTime)) {
            throw new RuntimeException("End time must be after start time.");
        }

        Auction auction = new Auction();
        auction.setProperty(property);
        auction.setAuctioneer(auctioneer);
        auction.setStartTime(startTime);
        auction.setEndTime(endTime);
        auction.setStartingBid(req.getStartingBid());
        auction.setCurrentBid(req.getStartingBid());
        auction.setMinIncrement(req.getMinIncrement() > 0 ? req.getMinIncrement() : 10000);
        auction.setStatus(AuctionStatus.SCHEDULED);

        return auctionRepo.save(auction);
    }

    // ── Get all SCHEDULED + LIVE auctions (public) ────────────────────────
    public List<Auction> getActiveAuctions() {
        return auctionRepo.findByStatusIn(
                List.of(AuctionStatus.SCHEDULED, AuctionStatus.LIVE));
    }

    // ── Get all auctions (admin) ──────────────────────────────────────────
    public List<Auction> getAllAuctions() {
        return auctionRepo.findAll();
    }

    // ── Get my auctions (auctioneer) ──────────────────────────────────────
    public List<Auction> getMyAuctions(String email) {
        User auctioneer = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return auctionRepo.findByAuctioneer(auctioneer);
    }

    // ── Get single auction ────────────────────────────────────────────────
    public Auction getById(Long id) {
        return auctionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Auction not found: " + id));
    }

    // ── Auctioneer: cancel auction (only before start time) ───────────────
    public Auction cancel(Long id, String email) {
        Auction auction = getById(id);

        if (!auction.getAuctioneer().getEmail().equals(email)) {
            throw new RuntimeException("Not authorized to cancel this auction.");
        }
        if (auction.getStatus() == AuctionStatus.COMPLETED) {
            throw new RuntimeException("Cannot cancel a completed auction.");
        }
        // Only allow cancellation before the auction has started
        if (auction.getStartTime() != null && LocalDateTime.now().isAfter(auction.getStartTime())) {
            throw new RuntimeException("Cannot cancel an auction that has already started.");
        }

        auction.setStatus(AuctionStatus.CANCELLED);
        return auctionRepo.save(auction);
    }
}