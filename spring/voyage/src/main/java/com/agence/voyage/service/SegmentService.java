package com.agence.voyage.service;

import com.agence.voyage.entity.Segment;
import com.agence.voyage.repository.SegmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SegmentService {

    private final SegmentRepository segmentRepository;

    // CREATE
    public Segment creer(Segment segment) {
        return segmentRepository.save(segment);
    }

    // READ
    public List<Segment> recupererTous() {
        return segmentRepository.findAll();
    }

    public Segment recupererParId(Long id) {
        return segmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Segment non trouvé avec l'id : " + id));
    }

    public List<Segment> recupererParVoyage(Long voyageId) {
        return segmentRepository.findByVoyageIdOrderByOrdreAsc(voyageId);
    }

    // UPDATE
    public Segment modifier(Long id, Segment segmentDetails) {
        Segment segment = recupererParId(id);
        segment.setOrdre(segmentDetails.getOrdre());
        segment.setVilleDepart(segmentDetails.getVilleDepart());
        segment.setVilleArrivee(segmentDetails.getVilleArrivee());
        segment.setHeureDepart(segmentDetails.getHeureDepart());
        segment.setHeureArrivee(segmentDetails.getHeureArrivee());
        return segmentRepository.save(segment);
    }

    // DELETE
    public void supprimer(Long id) {
        segmentRepository.deleteById(id);
    }
}