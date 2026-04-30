package com.houseauction.demo.repository;

import com.houseauction.demo.model.Auction;
import com.houseauction.demo.model.AuctionStatus;
import com.houseauction.demo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
public interface AuctionRepository extends JpaRepository<Auction, Long> {
    List<Auction> findByStatusAndStartTimeBefore(AuctionStatus status, LocalDateTime time);
    List<Auction> findByStatusAndEndTimeBefore(AuctionStatus status, LocalDateTime time);
    List<Auction> findByStatus(AuctionStatus status);

    List<Auction> findByAuctioneer(User auctioneer);

    List<Auction> findByStatusIn(List<AuctionStatus> statuses);

    boolean existsByPropertyId(Long propertyId);

    // Find auctions for a property by status
    List<Auction> findByPropertyIdAndStatus(Long propertyId, AuctionStatus status);

    // Delete all auctions for a property (only called after validation)
    @Modifying
    @Transactional
    void deleteByPropertyId(Long propertyId);
    Optional<Auction> findByPropertyId(Long propertyId);
    boolean existsByPropertyIdAndStatusIn(
            Long propertyId,
            List<AuctionStatus> statuses
    );
}