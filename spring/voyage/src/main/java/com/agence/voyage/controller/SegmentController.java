package com.agence.voyage.controller;

import com.agence.voyage.entity.Segment;
import com.agence.voyage.service.SegmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/segments")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SegmentController {

    private final SegmentService segmentService;

    @PostMapping
    public ResponseEntity<Segment> creer(@RequestBody Segment segment) {
        return ResponseEntity.status(HttpStatus.CREATED).body(segmentService.creer(segment));
    }

    @GetMapping
    public ResponseEntity<List<Segment>> listerTous() {
        return ResponseEntity.ok(segmentService.recupererTous());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Segment> recupererParId(@PathVariable Long id) {
        return ResponseEntity.ok(segmentService.recupererParId(id));
    }

    @GetMapping("/voyage/{voyageId}")
    public ResponseEntity<List<Segment>> recupererParVoyage(@PathVariable Long voyageId) {
        return ResponseEntity.ok(segmentService.recupererParVoyage(voyageId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Segment> modifier(@PathVariable Long id, @RequestBody Segment segmentDetails) {
        return ResponseEntity.ok(segmentService.modifier(id, segmentDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        segmentService.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}