package com.houseauction.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auctions")
public class Auction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // which approved property this auction is for
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "property_id")
    private Property property;

    // who created this auction
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "auctioneer_id")
    private User auctioneer;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private double startingBid;
    private double currentBid;
    private double minIncrement;   // minimum raise per bid e.g. 10000

    @Enumerated(EnumType.STRING)
    private AuctionStatus status;  // SCHEDULED, LIVE, COMPLETED, CANCELLED

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "winner_id")
    private User winner;           // set when auction ends

    private LocalDateTime createdAt = LocalDateTime.now();

    // ── Getters ──────────────────────────────────────────────────────────
    public Long getId()                   { return id; }
    public Property getProperty()         { return property; }
    public User getAuctioneer()           { return auctioneer; }
    public LocalDateTime getStartTime()   { return startTime; }
    public LocalDateTime getEndTime()     { return endTime; }
    public double getStartingBid()        { return startingBid; }
    public double getCurrentBid()         { return currentBid; }
    public double getMinIncrement()       { return minIncrement; }
    public AuctionStatus getStatus()      { return status; }
    public User getWinner()               { return winner; }
    public LocalDateTime getCreatedAt()   { return createdAt; }

    // ── Setters ──────────────────────────────────────────────────────────
    public void setId(Long id)                        { this.id = id; }
    public void setProperty(Property property)        { this.property = property; }
    public void setAuctioneer(User auctioneer)        { this.auctioneer = auctioneer; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public void setEndTime(LocalDateTime endTime)     { this.endTime = endTime; }
    public void setStartingBid(double startingBid)    { this.startingBid = startingBid; }
    public void setCurrentBid(double currentBid)      { this.currentBid = currentBid; }
    public void setMinIncrement(double minIncrement)  { this.minIncrement = minIncrement; }
    public void setStatus(AuctionStatus status)       { this.status = status; }
    public void setWinner(User winner)                { this.winner = winner; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}