package com.houseauction.demo.repository;

import com.houseauction.demo.model.AuctionApplication;
import com.houseauction.demo.model.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AuctionApplicationRepository extends JpaRepository<AuctionApplication, Long> {

    // All applications for one auction (auctioneer view)
    List<AuctionApplication> findByAuctionId(Long auctionId);

    // All applications by one bidder
    List<AuctionApplication> findByBidderId(Long bidderId);

    // Did this bidder already apply for this auction?
    boolean existsByAuctionIdAndBidderId(Long auctionId, Long bidderId);

    // Bidder's application for a specific auction
    Optional<AuctionApplication> findByAuctionIdAndBidderId(Long auctionId, Long bidderId);

    // Count approved applications for a bidder (for history)
    long countByBidderIdAndStatus(Long bidderId, ApplicationStatus status);
}