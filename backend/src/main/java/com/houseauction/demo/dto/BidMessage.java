package com.houseauction.demo.dto;

import java.time.LocalDateTime;

public class BidMessage {

    // ── Inbound (bidder → server) ─────────────────────────────────────────
    private Long   auctionId;
    private double amount;

    // ── Outbound (server → all clients) ──────────────────────────────────
    private Long          bidderId;
    private String        bidderName;
    private double        newCurrentBid;
    private LocalDateTime timestamp;
    private String        type;   // "BID" | "ERROR" | "AUCTION_END" | "TIMER_UPDATE"
    private String        message;
    private long          remainingSeconds;

    // ── Getters & Setters ─────────────────────────────────────────────────
    public Long getId()                          { return auctionId; }
    public Long getAuctionId()                   { return auctionId; }
    public void setAuctionId(Long auctionId)     { this.auctionId = auctionId; }
    public double getAmount()                    { return amount; }
    public void setAmount(double amount)         { this.amount = amount; }
    public Long getBidderId()                    { return bidderId; }
    public void setBidderId(Long bidderId)       { this.bidderId = bidderId; }
    public String getBidderName()                { return bidderName; }
    public void setBidderName(String n)          { this.bidderName = n; }
    public double getNewCurrentBid()             { return newCurrentBid; }
    public void setNewCurrentBid(double v)       { this.newCurrentBid = v; }
    public LocalDateTime getTimestamp()          { return timestamp; }
    public void setTimestamp(LocalDateTime t)    { this.timestamp = t; }
    public String getType()                      { return type; }
    public void setType(String type)             { this.type = type; }
    public String getMessage()                   { return message; }
    public void setMessage(String message)       { this.message = message; }
    public long getRemainingSeconds()            { return remainingSeconds; }
    public void setRemainingSeconds(long s)      { this.remainingSeconds = s; }
}