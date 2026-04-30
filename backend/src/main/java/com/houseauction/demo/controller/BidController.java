package com.houseauction.demo.controller;

import com.houseauction.demo.dto.BidMessage;
import com.houseauction.demo.model.Auction;
import com.houseauction.demo.model.AuctionStatus;
import com.houseauction.demo.model.Bid;
import com.houseauction.demo.model.User;
import com.houseauction.demo.repository.AuctionRepository;
import com.houseauction.demo.repository.BidRepository;
import com.houseauction.demo.repository.UserRepository;
import com.houseauction.demo.security.JwtUtil;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Controller
public class BidController {

    private final AuctionRepository     auctionRepo;
    private final UserRepository        userRepo;
    private final BidRepository         bidRepo;
    private final SimpMessagingTemplate broker;
    private final JwtUtil               jwtUtil;

    public BidController(AuctionRepository auctionRepo,
                         UserRepository userRepo,
                         BidRepository bidRepo,
                         SimpMessagingTemplate broker,
                         JwtUtil jwtUtil) {
        this.auctionRepo = auctionRepo;
        this.userRepo    = userRepo;
        this.bidRepo     = bidRepo;
        this.broker      = broker;
        this.jwtUtil     = jwtUtil;
    }

    @MessageMapping("/bid")
    public void handleBid(
            @Payload BidMessage incoming,
            @Header(value = "Authorization", required = false) String authHeader) {

        String topic = "/topic/auction/" + incoming.getAuctionId();

        // ── 1. Extract token ──────────────────────────────────────────────
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        if (token == null || !jwtUtil.isTokenValid(token)) {
            sendError(topic, "Unauthorised. Please log in again.");
            return;
        }

        String email = jwtUtil.extractEmail(token);

        // ── 2. Load auction ───────────────────────────────────────────────
        Auction auction = auctionRepo.findById(incoming.getAuctionId()).orElse(null);
        if (auction == null) { sendError(topic, "Auction not found."); return; }

        // ── 3. Check auction is LIVE ──────────────────────────────────────
        if (auction.getStatus() != AuctionStatus.LIVE) {
            sendError(topic, "Auction is not live."); return;
        }

        // ── 4. Check end time ─────────────────────────────────────────────
        if (LocalDateTime.now().isAfter(auction.getEndTime())) {
            sendError(topic, "Auction has already ended."); return;
        }

        // ── 5. Validate bid amount ────────────────────────────────────────
        double minAllowed = auction.getCurrentBid() + auction.getMinIncrement();
        if (incoming.getAmount() < minAllowed) {
            sendError(topic, "Bid too low. Minimum bid is ₹" +
                    String.format("%,.0f", minAllowed));
            return;
        }

        // ── 6. Load bidder ────────────────────────────────────────────────
        User bidder = userRepo.findByEmail(email).orElse(null);
        if (bidder == null) { sendError(topic, "User not found."); return; }

        // ── 7. Save bid to DB (persists history) ──────────────────────────
        Bid bid = new Bid();
        bid.setAuction(auction);
        bid.setBidder(bidder);
        bid.setAmount(incoming.getAmount());
        bid.setPlacedAt(LocalDateTime.now());
        bidRepo.save(bid);

        // ── 8. Update auction — current bid + winner + smart timer ────────
        auction.setCurrentBid(incoming.getAmount());
        auction.setWinner(bidder);

        long secsLeft = ChronoUnit.SECONDS.between(LocalDateTime.now(), auction.getEndTime());
        if (secsLeft < 60) {
            auction.setEndTime(auction.getEndTime().plusMinutes(2));
        }
        auctionRepo.save(auction);

        // ── 9. Broadcast to all clients ───────────────────────────────────
        BidMessage out = new BidMessage();
        out.setType("BID");
        out.setAuctionId(auction.getId());
        out.setAmount(incoming.getAmount());
        out.setNewCurrentBid(auction.getCurrentBid());
        out.setBidderId(bidder.getId());
        out.setBidderName(bidder.getName());
        out.setTimestamp(LocalDateTime.now());
        out.setRemainingSeconds(
                ChronoUnit.SECONDS.between(LocalDateTime.now(), auction.getEndTime()));

        broker.convertAndSend(topic, out);
    }

    private void sendError(String topic, String msg) {
        BidMessage err = new BidMessage();
        err.setType("ERROR");
        err.setMessage(msg);
        broker.convertAndSend(topic, err);
    }
}