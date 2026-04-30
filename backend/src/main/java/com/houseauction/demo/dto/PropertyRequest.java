package com.houseauction.demo.dto;

import java.util.List;
import java.util.Map;

public class PropertyRequest {

    // ── Existing ──────────────────────────────────────────────────────────
    private Long id;
    private String title;
    private String description;
    private String location;
    private String address;
    private Double latitude;
    private Double longitude;
    private double startingPrice;

    // ── Basic ─────────────────────────────────────────────────────────────
    private String propertyType;       // Apartment / House / Villa / Land / Commercial
    private String category;           // Sale / Rent / Auction
    private Double totalArea;
    private Double builtUpArea;

    // ── Location ──────────────────────────────────────────────────────────
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String pincode;
    private String landmark;

    // ── Specs ─────────────────────────────────────────────────────────────
    private Integer bedrooms;
    private Integer bathrooms;
    private Integer floors;
    private Integer floorNumber;
    private String  parking;           // Yes / No
    private String  furnishing;        // Furnished / Semi / Unfurnished
    private Integer propertyAge;

    // ── Pricing ───────────────────────────────────────────────────────────
    private Double  expectedPrice;
    private Double  reservePrice;
    private Boolean negotiable;
    private String  auctionStartDate;
    private String  auctionEndDate;

    // ── Owner ─────────────────────────────────────────────────────────────
    private String ownerName;
    private String ownerEmail;
    private String ownerPhone;
    private String ownerAltPhone;
    private String ownerAddress;

    // ── Amenities ─────────────────────────────────────────────────────────
    private Map<String, Boolean> amenities;

    // ── Status ────────────────────────────────────────────────────────────
    private String availabilityStatus; // Available / Sold / Pending
    private String propertyStatus;     // Ready to Move / Under Construction

    // ── Getters & Setters ─────────────────────────────────────────────────
    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public String getTitle()                     { return title; }
    public void setTitle(String v)               { this.title = v; }

    public String getDescription()               { return description; }
    public void setDescription(String v)         { this.description = v; }

    public String getLocation()                  { return location; }
    public void setLocation(String v)            { this.location = v; }

    public String getAddress()                   { return address; }
    public void setAddress(String v)             { this.address = v; }

    public Double getLatitude()                  { return latitude; }
    public void setLatitude(Double v)            { this.latitude = v; }

    public Double getLongitude()                 { return longitude; }
    public void setLongitude(Double v)           { this.longitude = v; }

    public double getStartingPrice()             { return startingPrice; }
    public void setStartingPrice(double v)       { this.startingPrice = v; }

    public String getPropertyType()              { return propertyType; }
    public void setPropertyType(String v)        { this.propertyType = v; }

    public String getCategory()                  { return category; }
    public void setCategory(String v)            { this.category = v; }

    public Double getTotalArea()                 { return totalArea; }
    public void setTotalArea(Double v)           { this.totalArea = v; }

    public Double getBuiltUpArea()               { return builtUpArea; }
    public void setBuiltUpArea(Double v)         { this.builtUpArea = v; }

    public String getAddressLine1()              { return addressLine1; }
    public void setAddressLine1(String v)        { this.addressLine1 = v; }

    public String getAddressLine2()              { return addressLine2; }
    public void setAddressLine2(String v)        { this.addressLine2 = v; }

    public String getCity()                      { return city; }
    public void setCity(String v)                { this.city = v; }

    public String getState()                     { return state; }
    public void setState(String v)               { this.state = v; }

    public String getPincode()                   { return pincode; }
    public void setPincode(String v)             { this.pincode = v; }

    public String getLandmark()                  { return landmark; }
    public void setLandmark(String v)            { this.landmark = v; }

    public Integer getBedrooms()                 { return bedrooms; }
    public void setBedrooms(Integer v)           { this.bedrooms = v; }

    public Integer getBathrooms()                { return bathrooms; }
    public void setBathrooms(Integer v)          { this.bathrooms = v; }

    public Integer getFloors()                   { return floors; }
    public void setFloors(Integer v)             { this.floors = v; }

    public Integer getFloorNumber()              { return floorNumber; }
    public void setFloorNumber(Integer v)        { this.floorNumber = v; }

    public String getParking()                   { return parking; }
    public void setParking(String v)             { this.parking = v; }

    public String getFurnishing()                { return furnishing; }
    public void setFurnishing(String v)          { this.furnishing = v; }

    public Integer getPropertyAge()              { return propertyAge; }
    public void setPropertyAge(Integer v)        { this.propertyAge = v; }

    public Double getExpectedPrice()             { return expectedPrice; }
    public void setExpectedPrice(Double v)       { this.expectedPrice = v; }

    public Double getReservePrice()              { return reservePrice; }
    public void setReservePrice(Double v)        { this.reservePrice = v; }

    public Boolean getNegotiable()               { return negotiable; }
    public void setNegotiable(Boolean v)         { this.negotiable = v; }

    public String getAuctionStartDate()          { return auctionStartDate; }
    public void setAuctionStartDate(String v)    { this.auctionStartDate = v; }

    public String getAuctionEndDate()            { return auctionEndDate; }
    public void setAuctionEndDate(String v)      { this.auctionEndDate = v; }

    public String getOwnerName()                 { return ownerName; }
    public void setOwnerName(String v)           { this.ownerName = v; }

    public String getOwnerEmail()                { return ownerEmail; }
    public void setOwnerEmail(String v)          { this.ownerEmail = v; }

    public String getOwnerPhone()                { return ownerPhone; }
    public void setOwnerPhone(String v)          { this.ownerPhone = v; }

    public String getOwnerAltPhone()             { return ownerAltPhone; }
    public void setOwnerAltPhone(String v)       { this.ownerAltPhone = v; }

    public String getOwnerAddress()              { return ownerAddress; }
    public void setOwnerAddress(String v)        { this.ownerAddress = v; }

    public Map<String, Boolean> getAmenities()          { return amenities; }
    public void setAmenities(Map<String, Boolean> v)    { this.amenities = v; }

    public String getAvailabilityStatus()        { return availabilityStatus; }
    public void setAvailabilityStatus(String v)  { this.availabilityStatus = v; }

    public String getPropertyStatus()            { return propertyStatus; }
    public void setPropertyStatus(String v)      { this.propertyStatus = v; }
}