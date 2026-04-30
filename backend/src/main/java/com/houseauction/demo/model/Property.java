package com.houseauction.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "properties")
public class Property {

    // ── Existing core fields ──────────────────────────────────────────────
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(length = 1000)
    private String description;

    private String location;
    private String address;

    @Column(nullable = true)
    private Double latitude;

    @Column(nullable = true)
    private Double longitude;

    private double startingPrice;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "document_url")
    private String documentUrl;

    private String rejectionReason;

    @Enumerated(EnumType.STRING)
    private PropertyStatus status = PropertyStatus.PENDING;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "auctioneer_id")
    private User auctioneer;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // ── 1. Basic ──────────────────────────────────────────────────────────
    private String propertyType;       // Apartment / House / Villa / Land / Commercial
    private String category;           // Sale / Rent / Auction
    private Double totalArea;
    private Double builtUpArea;

    // ── 2. Location ───────────────────────────────────────────────────────
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String pincode;
    private String landmark;

    // ── 3. Specs ──────────────────────────────────────────────────────────
    private Integer bedrooms;
    private Integer bathrooms;
    private Integer floors;
    private Integer floorNumber;
    private String  parking;           // Yes / No
    private String  furnishing;        // Furnished / Semi-Furnished / Unfurnished
    private Integer propertyAge;

    // ── 4. Pricing ────────────────────────────────────────────────────────
    private Double  expectedPrice;
    private Double  reservePrice;
    private Boolean negotiable;
    private String  auctionStartDate;
    private String  auctionEndDate;

    // ── 5. Extra files ────────────────────────────────────────────────────
    @Column(name = "image_urls", length = 2000)
    private String imageUrls;          // comma-separated multiple image URLs

    private String regCertUrl;
    private String legalDocUrl;

    // ── 6. Owner ──────────────────────────────────────────────────────────
    private String ownerName;
    private String ownerEmail;
    private String ownerPhone;
    private String ownerAltPhone;

    @Column(length = 500)
    private String ownerAddress;

    // ── 7. Amenities — stored as JSON string ──────────────────────────────
    @Column(length = 500)
    private String amenitiesJson;      // stored as JSON, mapped manually

    // ── 8. Status fields ──────────────────────────────────────────────────
    private String availabilityStatus; // Available / Sold / Pending
    private String propertyStatus;     // Ready to Move / Under Construction

    private String deletionReason;
    private String deletionProofUrl;  // uploaded file URL

    // ── Amenities helper (not a DB column) ───────────────────────────────
    @Transient
    private Map<String, Boolean> amenities;

    // ── Getters — existing ────────────────────────────────────────────────
    public String getDeletionReason() { return deletionReason; }
    public String getDeletionProofUrl() { return deletionProofUrl; }
    public Long getId()                  { return id; }
    public String getTitle()             { return title; }
    public String getDescription()       { return description; }
    public String getLocation()          { return location; }
    public String getAddress()           { return address; }
    public Double getLatitude()          { return latitude; }
    public Double getLongitude()         { return longitude; }
    public double getStartingPrice()     { return startingPrice; }
    public String getImageUrl()          { return imageUrl; }
    public String getDocumentUrl()       { return documentUrl; }
    public String getRejectionReason()   { return rejectionReason; }
    public PropertyStatus getStatus()    { return status; }
    public User getAuctioneer()          { return auctioneer; }
    public LocalDateTime getCreatedAt()  { return createdAt; }

    // ── Getters — new ─────────────────────────────────────────────────────
    public String getPropertyType()      { return propertyType; }
    public String getCategory()          { return category; }
    public Double getTotalArea()         { return totalArea; }
    public Double getBuiltUpArea()       { return builtUpArea; }
    public String getAddressLine1()      { return addressLine1; }
    public String getAddressLine2()      { return addressLine2; }
    public String getCity()              { return city; }
    public String getState()             { return state; }
    public String getPincode()           { return pincode; }
    public String getLandmark()          { return landmark; }
    public Integer getBedrooms()         { return bedrooms; }
    public Integer getBathrooms()        { return bathrooms; }
    public Integer getFloors()           { return floors; }
    public Integer getFloorNumber()      { return floorNumber; }
    public String getParking()           { return parking; }
    public String getFurnishing()        { return furnishing; }
    public Integer getPropertyAge()      { return propertyAge; }
    public Double getExpectedPrice()     { return expectedPrice; }
    public Double getReservePrice()      { return reservePrice; }
    public Boolean getNegotiable()       { return negotiable; }
    public String getAuctionStartDate()  { return auctionStartDate; }
    public String getAuctionEndDate()    { return auctionEndDate; }
    public String getImageUrls()         { return imageUrls; }
    public String getRegCertUrl()        { return regCertUrl; }
    public String getLegalDocUrl()       { return legalDocUrl; }
    public String getOwnerName()         { return ownerName; }
    public String getOwnerEmail()        { return ownerEmail; }
    public String getOwnerPhone()        { return ownerPhone; }
    public String getOwnerAltPhone()     { return ownerAltPhone; }
    public String getOwnerAddress()      { return ownerAddress; }
    public String getAmenitiesJson()     { return amenitiesJson; }
    public Map<String, Boolean> getAmenities() { return amenities; }
    public String getAvailabilityStatus(){ return availabilityStatus; }
    public String getPropertyStatus()    { return propertyStatus; }

    // ── Setters — existing ────────────────────────────────────────────────
    public void setDeletionReason(String v) { this.deletionReason = v; }
    public void setDeletionProofUrl(String v) { this.deletionProofUrl = v; }
    public void setId(Long id)                     { this.id = id; }
    public void setTitle(String v)                 { this.title = v; }
    public void setDescription(String v)           { this.description = v; }
    public void setLocation(String v)              { this.location = v; }
    public void setAddress(String v)               { this.address = v; }
    public void setLatitude(Double v)              { this.latitude = v; }
    public void setLongitude(Double v)             { this.longitude = v; }
    public void setStartingPrice(double v)         { this.startingPrice = v; }
    public void setImageUrl(String v)              { this.imageUrl = v; }
    public void setDocumentUrl(String v)           { this.documentUrl = v; }
    public void setRejectionReason(String v)       { this.rejectionReason = v; }
    public void setStatus(PropertyStatus v)        { this.status = v; }
    public void setAuctioneer(User v)              { this.auctioneer = v; }
    public void setCreatedAt(LocalDateTime v)      { this.createdAt = v; }

    // ── Setters — new ─────────────────────────────────────────────────────
    public void setPropertyType(String v)          { this.propertyType = v; }
    public void setCategory(String v)              { this.category = v; }
    public void setTotalArea(Double v)             { this.totalArea = v; }
    public void setBuiltUpArea(Double v)           { this.builtUpArea = v; }
    public void setAddressLine1(String v)          { this.addressLine1 = v; }
    public void setAddressLine2(String v)          { this.addressLine2 = v; }
    public void setCity(String v)                  { this.city = v; }
    public void setState(String v)                 { this.state = v; }
    public void setPincode(String v)               { this.pincode = v; }
    public void setLandmark(String v)              { this.landmark = v; }
    public void setBedrooms(Integer v)             { this.bedrooms = v; }
    public void setBathrooms(Integer v)            { this.bathrooms = v; }
    public void setFloors(Integer v)               { this.floors = v; }
    public void setFloorNumber(Integer v)          { this.floorNumber = v; }
    public void setParking(String v)               { this.parking = v; }
    public void setFurnishing(String v)            { this.furnishing = v; }
    public void setPropertyAge(Integer v)          { this.propertyAge = v; }
    public void setExpectedPrice(Double v)         { this.expectedPrice = v; }
    public void setReservePrice(Double v)          { this.reservePrice = v; }
    public void setNegotiable(Boolean v)           { this.negotiable = v; }
    public void setAuctionStartDate(String v)      { this.auctionStartDate = v; }
    public void setAuctionEndDate(String v)        { this.auctionEndDate = v; }
    public void setImageUrls(String v)             { this.imageUrls = v; }
    public void setRegCertUrl(String v)            { this.regCertUrl = v; }
    public void setLegalDocUrl(String v)           { this.legalDocUrl = v; }
    public void setOwnerName(String v)             { this.ownerName = v; }
    public void setOwnerEmail(String v)            { this.ownerEmail = v; }
    public void setOwnerPhone(String v)            { this.ownerPhone = v; }
    public void setOwnerAltPhone(String v)         { this.ownerAltPhone = v; }
    public void setOwnerAddress(String v)          { this.ownerAddress = v; }
    public void setAmenitiesJson(String v)         { this.amenitiesJson = v; }
    public void setAvailabilityStatus(String v)    { this.availabilityStatus = v; }
    public void setPropertyStatus(String v)        { this.propertyStatus = v; }

    // ── Amenities map setter — converts to JSON string for storage ────────
    public void setAmenities(Map<String, Boolean> amenities) {
        this.amenities = amenities;
        if (amenities != null) {
            // convert map to simple JSON string manually (no extra dependency)
            StringBuilder sb = new StringBuilder("{");
            amenities.forEach((k, v) -> {
                if (sb.length() > 1) sb.append(",");
                sb.append("\"").append(k).append("\":").append(v);
            });
            sb.append("}");
            this.amenitiesJson = sb.toString();
        }
    }
}