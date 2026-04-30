package com.houseauction.demo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.houseauction.demo.dto.PropertyRequest;
import com.houseauction.demo.model.Property;
import com.houseauction.demo.service.PropertyService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    private final PropertyService propertyService;
    private final ObjectMapper objectMapper;

    public PropertyController(PropertyService propertyService,
                              ObjectMapper objectMapper) {
        this.propertyService = propertyService;
        this.objectMapper    = objectMapper;
    }

    // ── POST /api/properties ─────────────────────────────────────────────
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addProperty(
            @RequestPart(value = "data",     required = false) String dataJson,
            @RequestPart(value = "property", required = false) String propertyJson,
            @RequestPart(value = "image",    required = false) MultipartFile image,
            @RequestPart(value = "images",   required = false) List<MultipartFile> images,
            @RequestPart(value = "document", required = false) MultipartFile document,
            @RequestPart(value = "regCert",  required = false) MultipartFile regCert,
            @RequestPart(value = "legalDoc", required = false) MultipartFile legalDoc,
            @RequestPart(value = "video",    required = false) MultipartFile video,
            Principal principal) throws Exception {

        String json = (dataJson != null) ? dataJson : propertyJson;
        if (json == null) {
            return ResponseEntity.badRequest()
                    .body("Missing JSON part — send as 'data' or 'property'");
        }

        // use first of "images" list as primary if "image" not sent separately
        MultipartFile primaryImage = image;
        if (primaryImage == null && images != null && !images.isEmpty()) {
            primaryImage = images.get(0);
        }

        PropertyRequest req = objectMapper.readValue(json, PropertyRequest.class);
        Property saved = propertyService.addProperty(
                req, primaryImage, images, document, regCert, legalDoc,
                principal.getName());
        return ResponseEntity.ok(saved);
    }

    // ── GET /api/properties/my ───────────────────────────────────────────
    @GetMapping("/my")
    public ResponseEntity<List<Property>> myProperties(Principal principal) {
        return ResponseEntity.ok(
                propertyService.getMyProperties(principal.getName()));
    }

    // ── GET /api/properties/pending ──────────────────────────────────────
    @GetMapping("/pending")
    public ResponseEntity<List<Property>> getPending() {
        return ResponseEntity.ok(propertyService.getPending());
    }

    // ── PUT /api/properties/{id}/approve ─────────────────────────────────
    @PutMapping("/{id}/approve")
    public ResponseEntity<Property> approve(@PathVariable Long id) {
        return ResponseEntity.ok(propertyService.approve(id));
    }

    // ── PUT /api/properties/{id}/reject ──────────────────────────────────
    @PutMapping("/{id}/reject")
    public ResponseEntity<Property> reject(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
                propertyService.reject(id, body.get("reason")));
    }

    // ── GET /api/properties/approved ─────────────────────────────────────
    @GetMapping("/approved")
    public ResponseEntity<List<Property>> getApproved() {
        return ResponseEntity.ok(propertyService.getApproved());
    }

    // ── GET /api/properties/{id} ─────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Property> getById(@PathVariable Long id) {
        return ResponseEntity.ok(propertyService.getById(id));
    }

    // ── PUT /api/properties/{id}/resubmit ────────────────────────────────
    @PutMapping(value = "/{id}/resubmit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> resubmit(
            @PathVariable Long id,
            @RequestPart(value = "data",     required = false) String dataJson,
            @RequestPart(value = "property", required = false) String propertyJson,
            @RequestPart(value = "image",    required = false) MultipartFile image,
            @RequestPart(value = "images",   required = false) List<MultipartFile> images,
            @RequestPart(value = "document", required = false) MultipartFile document,
            @RequestPart(value = "regCert",  required = false) MultipartFile regCert,
            @RequestPart(value = "legalDoc", required = false) MultipartFile legalDoc,
            Principal principal) throws Exception {

        String json = (dataJson != null) ? dataJson : propertyJson;
        if (json == null) {
            return ResponseEntity.badRequest().body("Missing JSON part");
        }

        MultipartFile primaryImage = image;
        if (primaryImage == null && images != null && !images.isEmpty()) {
            primaryImage = images.get(0);
        }

        try {
            PropertyRequest req = objectMapper.readValue(json, PropertyRequest.class);
            Property updated = propertyService.resubmit(
                    id, req, primaryImage, images, document, regCert, legalDoc,
                    principal.getName());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage()); // ✅ returns 400 with message, not 403
        }
    }
    // ── DELETE /api/properties/{id} ──────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProperty(
            @PathVariable Long id,
            Principal principal) {
        propertyService.deleteProperty(id, principal.getName());
        return ResponseEntity.noContent().build();
    }
    // POST /api/properties/{id}/request-deletion (multipart: reason + proof file)

    // AFTER
    @PostMapping(value = "/{id}/request-deletion", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> requestDeletion(
            @PathVariable Long id,
            @RequestParam("reason") String reason,                             // ✅
            @RequestPart(value = "proof", required = false) MultipartFile proof,
            Principal principal) {
        try {
            Property p = propertyService.requestDeletion(id, reason, proof, principal.getName());
            return ResponseEntity.ok(p);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // GET /api/properties/deletion-requests
    @GetMapping("/deletion-requests")
    public ResponseEntity<List<Property>> getDeletionRequests() {
        return ResponseEntity.ok(propertyService.getDeletionRequests());
    }

    // PUT /api/properties/{id}/approve-deletion
    @PutMapping("/{id}/approve-deletion")
    public ResponseEntity<?> approveDeletion(@PathVariable Long id) {
        try {
            propertyService.approveDeletion(id);
            return ResponseEntity.ok("Property deleted successfully.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // PUT /api/properties/{id}/reject-deletion
    @PutMapping("/{id}/reject-deletion")
    public ResponseEntity<?> rejectDeletion(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        try {
            Property p = propertyService.rejectDeletion(id, body.get("reason"));
            return ResponseEntity.ok(p);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}