package com.houseauction.demo.service;

import com.houseauction.demo.model.AuctionApplication;
import com.houseauction.demo.model.Property;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import com.houseauction.demo.model.Auction;
@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.admin-email}")
    private String adminEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ── Email to ADMIN when auctioneer uploads ───────────────────────────
    public void notifyAdminNewProperty(Property p) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(adminEmail);
        msg.setSubject("New Property Submitted: " + p.getTitle());
        msg.setText(
                "A new property has been submitted for review.\n\n" +
                        "Title       : " + p.getTitle() + "\n" +
                        "Location    : " + p.getLocation() + "\n" +
                        "Price       : ₹" + p.getStartingPrice() + "\n" +
                        "Submitted by: " + p.getAuctioneer().getEmail() + "\n\n" +
                        "Please log in to the admin dashboard to approve or reject it."
        );
        mailSender.send(msg);
    }

    // ── Email to AUCTIONEER when admin approves ──────────────────────────
    public void notifyAuctioneerApproved(Property p) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(p.getAuctioneer().getEmail());
        msg.setSubject("✅ Property Approved: " + p.getTitle());
        msg.setText(
                "Congratulations! Your property has been approved.\n\n" +
                        "Title   : " + p.getTitle() + "\n" +
                        "Location: " + p.getLocation() + "\n" +
                        "Price   : ₹" + p.getStartingPrice() + "\n\n" +
                        "It is now live and visible to bidders."
        );
        mailSender.send(msg);
    }

    // ── Email to AUCTIONEER when admin rejects ───────────────────────────
    public void notifyAuctioneerRejected(Property p) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(p.getAuctioneer().getEmail());
        msg.setSubject("❌ Property Rejected: " + p.getTitle());
        msg.setText(
                "Unfortunately, your property submission was rejected.\n\n" +
                        "Title          : " + p.getTitle() + "\n" +
                        "Location       : " + p.getLocation() + "\n" +
                        "Rejection Reason: " + p.getRejectionReason() + "\n\n" +
                        "Please update your listing and resubmit."
        );
        mailSender.send(msg);
    }

    // ── Email to AUCTIONEER when a bidder applies for their auction ──────
    public void notifyAuctioneerNewApplication(AuctionApplication app) {
        String auctioneerEmail  = app.getAuction().getAuctioneer().getEmail();
        String propertyTitle    = app.getAuction().getProperty().getTitle();
        String propertyLocation = app.getAuction().getProperty().getLocation();
        String bidderName       = app.getFullName();
        String bidderEmail      = app.getBidder().getEmail();
        String bidderPhone      = app.getPhone();


        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(auctioneerEmail);
        msg.setSubject("New Bid Application: " + propertyTitle);
        msg.setText(
                "A bidder has applied to participate in your auction.\n\n" +
                        "-- Auction Details --\n" +
                        "Property    : " + propertyTitle + "\n" +
                        "Location    : " + propertyLocation + "\n\n" +
                        "-- Applicant Details --\n" +
                        "Name        : " + bidderName + "\n" +
                        "Email       : " + bidderEmail + "\n" +
                        "Phone       : " + bidderPhone + "\n" +
                        "Aadhaar     : Verified\n\n" +
                        "Please log in to your auctioneer dashboard to review and approve or reject this application.\n\n" +
                        "-- House Auction Platform"
        );
        mailSender.send(msg);
    }

    // ── Email to BIDDER when auctioneer approves their application ───────
    public void notifyBidderApproved(AuctionApplication app) {
        String bidderEmail      = app.getBidder().getEmail();
        String bidderName       = app.getFullName();
        String propertyTitle    = app.getAuction().getProperty().getTitle();
        String propertyLocation = app.getAuction().getProperty().getLocation();
        String startingPrice    = "Rs." + app.getAuction().getProperty().getStartingPrice();

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(bidderEmail);
        msg.setSubject("Application Approved - You Can Now Bid on " + propertyTitle);
        msg.setText(
                "Dear " + bidderName + ",\n\n" +
                        "Great news! Your application to bid has been approved.\n\n" +
                        "-- Auction Details --\n" +
                        "Property      : " + propertyTitle + "\n" +
                        "Location      : " + propertyLocation + "\n" +
                        "Starting Price: " + startingPrice + "\n\n" +
                        "You are now eligible to place bids when the auction goes live.\n" +
                        "Log in to your bidder dashboard to stay updated on the auction schedule.\n\n" +
                        "Best of luck!\n" +
                        "-- House Auction Platform"
        );
        mailSender.send(msg);
    }

    // ── Email to BIDDER when auctioneer rejects their application ────────
    public void notifyBidderRejected(AuctionApplication app) {
        String bidderEmail      = app.getBidder().getEmail();
        String bidderName       = app.getFullName();
        String propertyTitle    = app.getAuction().getProperty().getTitle();
        String propertyLocation = app.getAuction().getProperty().getLocation();
        String rejectionReason  = app.getRejectionReason() != null
                ? app.getRejectionReason()
                : "No specific reason provided.";

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(bidderEmail);
        msg.setSubject("Application Rejected - " + propertyTitle);
        msg.setText(
                "Dear " + bidderName + ",\n\n" +
                        "Unfortunately, your application to bid on the following auction has been rejected.\n\n" +
                        "-- Auction Details --\n" +
                        "Property         : " + propertyTitle + "\n" +
                        "Location         : " + propertyLocation + "\n\n" +
                        "-- Rejection Details --\n" +
                        "Reason           : " + rejectionReason + "\n\n" +
                        "If you believe this is a mistake, please contact the auctioneer or our support team.\n\n" +
                        "-- House Auction Platform"
        );
        mailSender.send(msg);
    }
    // ── Email to WINNER when auction closes ──────────────────────────
    public void notifyAuctionWinner(Auction auction) {
        if (auction.getWinner() == null) return;

        String winnerEmail    = auction.getWinner().getEmail();
        String winnerName     = auction.getWinner().getName();
        String propertyTitle  = auction.getProperty().getTitle();
        String propertyLocation = auction.getProperty().getLocation();
        String winningBid     = "₹" + String.format("%,.0f", auction.getCurrentBid());
        String auctioneerEmail = auction.getAuctioneer().getEmail();

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(winnerEmail);
        msg.setSubject("🏆 Congratulations! You Won: " + propertyTitle);
        msg.setText(
                "Dear " + winnerName + ",\n\n" +
                        "Congratulations! You have won the auction for the following property.\n\n" +
                        "-- Auction Details --\n" +
                        "Property      : " + propertyTitle + "\n" +
                        "Location      : " + propertyLocation + "\n" +
                        "Winning Bid   : " + winningBid + "\n\n" +
                        "-- Next Steps --\n" +
                        "The auctioneer will contact you shortly to complete the purchase process.\n" +
                        "Auctioneer    : " + auctioneerEmail + "\n\n" +
                        "Please log in to your bidder dashboard to view your auction result.\n\n" +
                        "-- House Auction Platform"
        );
        mailSender.send(msg);
    }

    // ── Email to AUCTIONEER when their auction closes ─────────────────
    public void notifyAuctioneerAuctionClosed(Auction auction) {
        String auctioneerEmail = auction.getAuctioneer().getEmail();
        String propertyTitle   = auction.getProperty().getTitle();
        boolean hasWinner      = auction.getWinner() != null;
        String winnerInfo      = hasWinner
                ? auction.getWinner().getName() + " (" + auction.getWinner().getEmail() + ")"
                : "No bids were placed";
        String finalBid        = hasWinner
                ? "₹" + String.format("%,.0f", auction.getCurrentBid())
                : "N/A";

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(auctioneerEmail);
        msg.setSubject("🏁 Auction Closed: " + propertyTitle);
        msg.setText(
                "Your auction has officially closed.\n\n" +
                        "-- Auction Summary --\n" +
                        "Property      : " + propertyTitle + "\n" +
                        "Location      : " + auction.getProperty().getLocation() + "\n" +
                        "Final Bid     : " + finalBid + "\n\n" +
                        "-- Winner --\n" +
                        "Winner        : " + winnerInfo + "\n\n" +
                        (hasWinner
                                ? "Please reach out to the winner to proceed with the sale.\n\n"
                                : "The auction closed with no bids. You may schedule a new auction.\n\n") +
                        "-- House Auction Platform"
        );
        mailSender.send(msg);
    }
    // ── Helper: format bid history enum to readable string ───────────────
    private String formatBidHistory(String history) {
        if (history == null) return "Not specified";
        return switch (history.toUpperCase()) {
            case "FIRST_TIME"   -> "First-time bidder";
            case "CLEAN"        -> "Clean record";
            case "HAS_DEFAULTS" -> "Has past defaults";
            default             -> history;
        };
    }
}