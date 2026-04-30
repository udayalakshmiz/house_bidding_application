package com.houseauction.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bids")
public class Bid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "auction_id", nullable = false)
    private Auction auction;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "bidder_id", nullable = false)
    private User bidder;

    private double amount;

    private LocalDateTime placedAt = LocalDateTime.now();

    // ── Getters ──────────────────────────────────────────────────────────
    public Long getId()               { return id; }
    public Auction getAuction()       { return auction; }
    public User getBidder()           { return bidder; }
    public double getAmount()         { return amount; }
    public LocalDateTime getPlacedAt(){ return placedAt; }

    // ── Setters ──────────────────────────────────────────────────────────
    public void setId(Long id)                      { this.id = id; }
    public void setAuction(Auction auction)         { this.auction = auction; }
    public void setBidder(User bidder)              { this.bidder = bidder; }
    public void setAmount(double amount)            { this.amount = amount; }
    public void setPlacedAt(LocalDateTime placedAt) { this.placedAt = placedAt; }
}
