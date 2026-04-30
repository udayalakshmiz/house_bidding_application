package com.houseauction.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auction_applications")
public class AuctionApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "auction_id")
    private Auction auction;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "bidder_id")
    private User bidder;

    private String aadhaarNumber;
    private String aadhaarImagePath;
    private String incomeProofPath; // ← ADDED THIS FIELD
    private boolean aadhaarVerified;

    private String fullName;
    private String phone;
    private String address;
    private String occupation;
    private double annualIncome;

    private String pastBiddingHistory;
    private String pastHistoryDetails;

    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;

    private String rejectionReason;
    private LocalDateTime appliedAt;
    private LocalDateTime reviewedAt;

    @PrePersist
    public void prePersist() {
        this.appliedAt = LocalDateTime.now();
        this.status = ApplicationStatus.PENDING;
    }

    // ── Getters & Setters ─────────────────────────────────────────────────
    public Long getId()                          { return id; }
    public Auction getAuction()                  { return auction; }
    public void setAuction(Auction auction)      { this.auction = auction; }
    public User getBidder()                      { return bidder; }
    public void setBidder(User bidder)           { this.bidder = bidder; }
    public String getAadhaarNumber()             { return aadhaarNumber; }
    public void setAadhaarNumber(String n)       { this.aadhaarNumber = n; }
    public String getAadhaarImagePath()          { return aadhaarImagePath; }
    public void setAadhaarImagePath(String p)    { this.aadhaarImagePath = p; }
    public String getIncomeProofPath()           { return incomeProofPath; } // ← ADDED
    public void setIncomeProofPath(String p)     { this.incomeProofPath = p; } // ← ADDED
    public boolean isAadhaarVerified()           { return aadhaarVerified; }
    public void setAadhaarVerified(boolean v)    { this.aadhaarVerified = v; }
    public String getFullName()                  { return fullName; }
    public void setFullName(String n)            { this.fullName = n; }
    public String getPhone()                     { return phone; }
    public void setPhone(String p)               { this.phone = p; }
    public String getAddress()                   { return address; }
    public void setAddress(String a)             { this.address = a; }
    public String getOccupation()                { return occupation; }
    public void setOccupation(String o)          { this.occupation = o; }
    public double getAnnualIncome()              { return annualIncome; }
    public void setAnnualIncome(double i)        { this.annualIncome = i; }
    public String getPastBiddingHistory()        { return pastBiddingHistory; }
    public void setPastBiddingHistory(String h)  { this.pastBiddingHistory = h; }
    public String getPastHistoryDetails()        { return pastHistoryDetails; }
    public void setPastHistoryDetails(String d)  { this.pastHistoryDetails = d; }
    public ApplicationStatus getStatus()         { return status; }
    public void setStatus(ApplicationStatus s)   { this.status = s; }
    public String getRejectionReason()           { return rejectionReason; }
    public void setRejectionReason(String r)     { this.rejectionReason = r; }
    public LocalDateTime getAppliedAt()          { return appliedAt; }
    public void setAppliedAt(LocalDateTime t)    { this.appliedAt = t; }
    public LocalDateTime getReviewedAt()         { return reviewedAt; }
    public void setReviewedAt(LocalDateTime t)   { this.reviewedAt = t; }
}