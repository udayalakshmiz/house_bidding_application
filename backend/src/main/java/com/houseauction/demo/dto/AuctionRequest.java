package com.houseauction.demo.dto;

public class AuctionRequest {

    private Long propertyId;
    private String startTime;      // ISO string from frontend datetime-local
    private String endTime;
    private double startingBid;
    private double minIncrement;   // default 10000 if not provided

    // ── Getters ──────────────────────────────────────────────────────────
    public Long getPropertyId()       { return propertyId; }
    public String getStartTime()      { return startTime; }
    public String getEndTime()        { return endTime; }
    public double getStartingBid()    { return startingBid; }
    public double getMinIncrement()   { return minIncrement; }

    // ── Setters ──────────────────────────────────────────────────────────
    public void setPropertyId(Long propertyId)       { this.propertyId = propertyId; }
    public void setStartTime(String startTime)        { this.startTime = startTime; }
    public void setEndTime(String endTime)            { this.endTime = endTime; }
    public void setStartingBid(double startingBid)   { this.startingBid = startingBid; }
    public void setMinIncrement(double minIncrement) { this.minIncrement = minIncrement; }
}