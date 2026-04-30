package com.houseauction.demo.model;

public enum ApplicationStatus {
    PENDING,    // submitted, awaiting auctioneer decision
    APPROVED,   // auctioneer approved — bidder can participate
    REJECTED    // auctioneer rejected
}