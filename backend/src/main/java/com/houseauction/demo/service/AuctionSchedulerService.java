package com.houseauction.demo.service;

import com.houseauction.demo.dto.BidMessage;
import com.houseauction.demo.model.Auction;
import com.houseauction.demo.model.AuctionStatus;
import com.houseauction.demo.repository.AuctionRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuctionSchedulerService {

    private final AuctionRepository    auctionRepo;
    private final SimpMessagingTemplate broker;
    private final EmailService          emailService;

    public AuctionSchedulerService(AuctionRepository auctionRepo,
                                   SimpMessagingTemplate broker,
                                   EmailService emailService) {
        this.auctionRepo  = auctionRepo;
        this.broker       = broker;
        this.emailService = emailService;
    }

    /**
     * Runs every 30 seconds.
     * SCHEDULED → LIVE      : when startTime has passed
     * LIVE      → COMPLETED : when endTime has passed
     *                         → picks winner, fires emails, broadcasts AUCTION_END
     */
    @Scheduled(fixedDelay = 30_000)
    public void updateAuctionStatuses() {
        LocalDateTime now = LocalDateTime.now();

        // ── Activate auctions whose startTime has arrived ─────────────────
        List<Auction> toStart = auctionRepo
                .findByStatusAndStartTimeBefore(AuctionStatus.SCHEDULED, now);

        for (Auction a : toStart) {
            a.setStatus(AuctionStatus.LIVE);
            if (a.getCurrentBid() == 0) {
                a.setCurrentBid(a.getStartingBid());
            }
            auctionRepo.save(a);
            System.out.println("✅ Auction " + a.getId() + " is now LIVE");
        }

        // ── Complete auctions whose endTime has passed ────────────────────
        List<Auction> toEnd = auctionRepo
                .findByStatusAndEndTimeBefore(AuctionStatus.LIVE, now);

        for (Auction a : toEnd) {
            a.setStatus(AuctionStatus.COMPLETED);
            auctionRepo.save(a);
            System.out.println("🏁 Auction " + a.getId() + " COMPLETED" +
                    (a.getWinner() != null
                            ? " | Winner: " + a.getWinner().getEmail()
                            : " | No bids placed"));

            // ── 1. Broadcast AUCTION_END to all clients in the live room ──
            broadcastAuctionEnd(a);

            // ── 2. Fire winner email (if someone bid) ─────────────────────
            try {
                if (a.getWinner() != null) {
                    emailService.notifyAuctionWinner(a);
                }
                emailService.notifyAuctioneerAuctionClosed(a);
            } catch (Exception e) {
                System.err.println("⚠️  Email failed for auction " + a.getId()
                        + ": " + e.getMessage());
            }
        }
    }

    private void broadcastAuctionEnd(Auction a) {
        String topic = "/topic/auction/" + a.getId();

        BidMessage msg = new BidMessage();
        msg.setType("AUCTION_END");
        msg.setAuctionId(a.getId());
        msg.setNewCurrentBid(a.getCurrentBid());
        msg.setRemainingSeconds(0);

        if (a.getWinner() != null) {
            msg.setBidderId(a.getWinner().getId());
            msg.setBidderName(a.getWinner().getName());
            msg.setMessage(
                    "🏆 Auction closed! Winner: " + a.getWinner().getName() +
                            " with a bid of ₹" + String.format("%,.0f", a.getCurrentBid())
            );
        } else {
            msg.setMessage("🏁 Auction closed. No bids were placed.");
        }

        broker.convertAndSend(topic, msg);
        System.out.println("📡 AUCTION_END broadcast sent for auction " + a.getId());
    }
}