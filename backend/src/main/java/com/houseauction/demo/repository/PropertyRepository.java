package com.houseauction.demo.repository;

import com.houseauction.demo.model.Property;
import com.houseauction.demo.model.PropertyStatus;
import com.houseauction.demo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {

    List<Property> findByStatus(PropertyStatus status);

    List<Property> findByAuctioneer(User auctioneer);
}