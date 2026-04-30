package com.houseauction.demo.repository;

import com.houseauction.demo.model.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {

    // Get all bids for an auction, newest first
    List<Bid> findByAuctionIdOrderByPlacedAtDesc(Long auctionId);
}
