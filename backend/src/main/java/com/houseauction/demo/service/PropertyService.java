package com.houseauction.demo.service;

import com.houseauction.demo.dto.PropertyRequest;
import com.houseauction.demo.model.AuctionStatus;
import com.houseauction.demo.model.Property;
import com.houseauction.demo.model.PropertyStatus;
import com.houseauction.demo.model.User;
import com.houseauction.demo.repository.AuctionRepository;
import com.houseauction.demo.repository.PropertyRepository;
import com.houseauction.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepo;
    private final UserRepository userRepo;
    private final FileStorageService fileStorage;
    private final EmailService emailService;
    private final AuctionRepository auctionRepo;

    // ── Single constructor (no duplicates) ───────────────────────────────
    public PropertyService(PropertyRepository propertyRepo,
                           UserRepository userRepo,
                           FileStorageService fileStorage,
                           EmailService emailService,
                           AuctionRepository auctionRepo) {
        this.propertyRepo = propertyRepo;
        this.userRepo     = userRepo;
        this.fileStorage  = fileStorage;
        this.emailService = emailService;
        this.auctionRepo  = auctionRepo;
    }

    // ── Auctioneer: submit property ──────────────────────────────────────
    public Property addProperty(PropertyRequest req,
                                MultipartFile image,
                                List<MultipartFile> images,
                                MultipartFile document,
                                MultipartFile regCert,
                                MultipartFile legalDoc,
                                String auctioneerEmail) throws IOException {

        User auctioneer = userRepo.findByEmail(auctioneerEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + auctioneerEmail));

        Property p = new Property();
        p.setTitle(req.getTitle());
        p.setDescription(req.getDescription());
        p.setLocation(req.getLocation());
        p.setAddress(req.getAddress());
        p.setLatitude(req.getLatitude());
        p.setLongitude(req.getLongitude());
        p.setStartingPrice(req.getStartingPrice());
        p.setAuctioneer(auctioneer);
        p.setStatus(PropertyStatus.PENDING);

        p.setPropertyType(req.getPropertyType());
        p.setCategory(req.getCategory());
        p.setTotalArea(req.getTotalArea());
        p.setBuiltUpArea(req.getBuiltUpArea());
        p.setAddressLine1(req.getAddressLine1());
        p.setAddressLine2(req.getAddressLine2());
        p.setCity(req.getCity());
        p.setState(req.getState());
        p.setPincode(req.getPincode());
        p.setLandmark(req.getLandmark());
        p.setBedrooms(req.getBedrooms());
        p.setBathrooms(req.getBathrooms());
        p.setFloors(req.getFloors());
        p.setFloorNumber(req.getFloorNumber());
        p.setParking(req.getParking());
        p.setFurnishing(req.getFurnishing());
        p.setPropertyAge(req.getPropertyAge());
        p.setExpectedPrice(req.getExpectedPrice());
        p.setReservePrice(req.getReservePrice());
        p.setNegotiable(req.getNegotiable());
        p.setAuctionStartDate(req.getAuctionStartDate());
        p.setAuctionEndDate(req.getAuctionEndDate());
        p.setOwnerName(req.getOwnerName());
        p.setOwnerEmail(req.getOwnerEmail());
        p.setOwnerPhone(req.getOwnerPhone());
        p.setOwnerAltPhone(req.getOwnerAltPhone());
        p.setOwnerAddress(req.getOwnerAddress());
        p.setAmenities(req.getAmenities());
        p.setAvailabilityStatus(req.getAvailabilityStatus());
        p.setPropertyStatus(req.getPropertyStatus());

        if (image != null && !image.isEmpty())       p.setImageUrl(fileStorage.store(image));
        if (document != null && !document.isEmpty()) p.setDocumentUrl(fileStorage.store(document));
        if (regCert != null && !regCert.isEmpty())   p.setRegCertUrl(fileStorage.store(regCert));
        if (legalDoc != null && !legalDoc.isEmpty()) p.setLegalDocUrl(fileStorage.store(legalDoc));

        if (images != null && !images.isEmpty()) {
            StringBuilder urls = new StringBuilder();
            for (MultipartFile img : images) {
                if (img != null && !img.isEmpty()) {
                    if (!urls.isEmpty()) urls.append(",");
                    urls.append(fileStorage.store(img));
                }
            }
            p.setImageUrls(urls.toString());
        }

        Property saved = propertyRepo.save(p);
        try {
            emailService.notifyAdminNewProperty(saved);
            System.out.println("✅ Admin email sent for: " + saved.getTitle());
        } catch (Exception e) {
            System.err.println("❌ Admin email failed: " + e.getMessage());
        }
        return saved;
    }

    // ── Auctioneer: delete PENDING or REJECTED property ──────────────────
    public void deleteProperty(Long id, String auctioneerEmail) {
        Property p = propertyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found: " + id));
        if (!p.getAuctioneer().getEmail().equals(auctioneerEmail))
            throw new RuntimeException("Not authorized");
        if (p.getStatus() == PropertyStatus.APPROVED)
            throw new RuntimeException("Cannot delete an approved property directly.");
        propertyRepo.delete(p);
    }

    // ── Admin: approve ───────────────────────────────────────────────────
    public Property approve(Long id) {
        Property p = propertyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found: " + id));
        p.setStatus(PropertyStatus.APPROVED);
        p.setRejectionReason(null);
        Property saved = propertyRepo.save(p);
        try {
            emailService.notifyAuctioneerApproved(saved);
            System.out.println("✅ Approval email sent to: " + saved.getAuctioneer().getEmail());
        } catch (Exception e) {
            System.err.println("❌ Failed to send approval email: " + e.getMessage());
        }
        return saved;
    }

    // ── Admin: reject ────────────────────────────────────────────────────
    public Property reject(Long id, String reason) {
        Property p = propertyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found: " + id));
        p.setStatus(PropertyStatus.REJECTED);
        p.setRejectionReason(reason);
        Property saved = propertyRepo.save(p);
        try {
            emailService.notifyAuctioneerRejected(saved);
            System.out.println("✅ Rejection email sent to: " + saved.getAuctioneer().getEmail());
        } catch (Exception e) {
            System.err.println("❌ Failed to send rejection email: " + e.getMessage());
        }
        return saved;
    }

    // ── Queries ──────────────────────────────────────────────────────────
    public List<Property> getPending() {
        return propertyRepo.findByStatus(PropertyStatus.PENDING);
    }

    public List<Property> getApproved() {
        return propertyRepo.findByStatus(PropertyStatus.APPROVED);
    }

    public List<Property> getMyProperties(String email) {
        User auctioneer = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return propertyRepo.findByAuctioneer(auctioneer);
    }

    public Property getById(Long id) {
        return propertyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found: " + id));
    }

    // ── Auctioneer: resubmit REJECTED property ───────────────────────────
    // ── Auctioneer: resubmit REJECTED or edit PENDING property ───────────
    public Property resubmit(Long id, PropertyRequest req,
                             MultipartFile image, List<MultipartFile> images,
                             MultipartFile document, MultipartFile regCert,
                             MultipartFile legalDoc,
                             String auctioneerEmail) throws IOException {
        Property p = propertyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found: " + id));
        if (!p.getAuctioneer().getEmail().equals(auctioneerEmail))
            throw new RuntimeException("Not authorized");

        // ✅ Allow both PENDING (edit) and REJECTED (resubmit)
        if (p.getStatus() != PropertyStatus.REJECTED && p.getStatus() != PropertyStatus.PENDING)
            throw new RuntimeException("Only PENDING or REJECTED properties can be edited");

        p.setTitle(req.getTitle());
        p.setDescription(req.getDescription());
        p.setLocation(req.getLocation());
        p.setAddress(req.getAddress());
        p.setLatitude(req.getLatitude());
        p.setLongitude(req.getLongitude());
        p.setStartingPrice(req.getStartingPrice());
        p.setPropertyType(req.getPropertyType());
        p.setCategory(req.getCategory());
        p.setCity(req.getCity());
        p.setState(req.getState());
        p.setPincode(req.getPincode());
        p.setBedrooms(req.getBedrooms());
        p.setBathrooms(req.getBathrooms());
        p.setParking(req.getParking());
        p.setFurnishing(req.getFurnishing());
        p.setExpectedPrice(req.getExpectedPrice());
        p.setReservePrice(req.getReservePrice());
        p.setNegotiable(req.getNegotiable());
        p.setAuctionStartDate(req.getAuctionStartDate());
        p.setAuctionEndDate(req.getAuctionEndDate());
        p.setOwnerName(req.getOwnerName());
        p.setOwnerPhone(req.getOwnerPhone());
        p.setAmenities(req.getAmenities());

        // ✅ Only reset rejection reason if it was REJECTED
        if (p.getStatus() == PropertyStatus.REJECTED) {
            p.setStatus(PropertyStatus.PENDING);
            p.setRejectionReason(null);
        }
        // If already PENDING, keep status as PENDING — no change needed

        if (image != null && !image.isEmpty())       p.setImageUrl(fileStorage.store(image));
        if (document != null && !document.isEmpty()) p.setDocumentUrl(fileStorage.store(document));
        if (regCert != null && !regCert.isEmpty())   p.setRegCertUrl(fileStorage.store(regCert));
        if (legalDoc != null && !legalDoc.isEmpty()) p.setLegalDocUrl(fileStorage.store(legalDoc));

        if (images != null && !images.isEmpty()) {
            StringBuilder urls = new StringBuilder();
            for (MultipartFile img : images) {
                if (img != null && !img.isEmpty()) {
                    if (!urls.isEmpty()) urls.append(",");
                    urls.append(fileStorage.store(img));
                }
            }
            p.setImageUrls(urls.toString());
        }
        return propertyRepo.save(p);
    }

    // ── Auctioneer: request deletion of APPROVED property ────────────────
    public Property requestDeletion(Long id, String reason, MultipartFile proof,
                                    String auctioneerEmail) throws IOException {
        Property p = propertyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found: " + id));
        if (!p.getAuctioneer().getEmail().equals(auctioneerEmail))
            throw new RuntimeException("Not authorized.");
        if (p.getStatus() != PropertyStatus.APPROVED)
            throw new RuntimeException("Deletion request is only for APPROVED properties.");

        p.setStatus(PropertyStatus.DELETION_REQUESTED);
        p.setDeletionReason(reason);
        if (proof != null && !proof.isEmpty())
            p.setDeletionProofUrl(fileStorage.store(proof));

        return propertyRepo.save(p);
    }

    // ── Admin: get all deletion requests ─────────────────────────────────
    public List<Property> getDeletionRequests() {
        return propertyRepo.findByStatus(PropertyStatus.DELETION_REQUESTED);
    }

    // ── Admin: approve deletion → permanently delete ──────────────────────
    public void approveDeletion(Long id) {
        Property p = propertyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found: " + id));

        if (p.getStatus() != PropertyStatus.DELETION_REQUESTED)
            throw new RuntimeException("No deletion request found.");

        // Block deletion if auction is COMPLETED — bids were placed and settled
        boolean hasCompletedAuction = !auctionRepo
                .findByPropertyIdAndStatus(id, AuctionStatus.COMPLETED)
                .isEmpty();

        if (hasCompletedAuction)
            throw new RuntimeException(
                    "Cannot delete this property — it has a completed auction with settled bids.");

        // Safe to delete — remove linked auctions first, then property
        auctionRepo.deleteByPropertyId(id);
        propertyRepo.delete(p);
    }

    // ── Admin: reject deletion → restore to APPROVED ─────────────────────
    public Property rejectDeletion(Long id, String reason) {
        Property p = propertyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found: " + id));
        if (p.getStatus() != PropertyStatus.DELETION_REQUESTED)
            throw new RuntimeException("No deletion request found.");
        p.setStatus(PropertyStatus.APPROVED);
        p.setRejectionReason(reason);
        p.setDeletionReason(null);
        p.setDeletionProofUrl(null);
        return propertyRepo.save(p);
    }
}