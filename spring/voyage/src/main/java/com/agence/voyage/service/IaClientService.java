package com.agence.voyage.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.agence.voyage.entity.Voyage;
import com.agence.voyage.repository.VoyageRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@Service
@RequiredArgsConstructor
public class IaClientService {

    private final VoyageRepository voyageRepository;
    private final String IA_API_URL = "http://127.0.0.1:8001/api/ia/analyser";

    public List<Voyage> chercherVoyageAvecIA(String phraseUtilisateur) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000);
        factory.setReadTimeout(15000);
        RestTemplate restTemplate = new RestTemplate(factory);

        CriteresIA criteres = new CriteresIA();

        try {
            Map<String, String> requestBody = Map.of("texte", phraseUtilisateur);
            criteres = restTemplate.postForObject(IA_API_URL, requestBody, CriteresIA.class);
            System.out.println("🤖 IA a compris : " + criteres);

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS || e.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
                try {
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode root = mapper.readTree(e.getResponseBodyAsString());
                    String messageIa = root.path("detail").asText("Le service IA est saturé.");
                    System.err.println("⚠️ Alerte remontée par l'IA : " + messageIa);
                    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Le service d'intelligence artificielle est temporairement saturé.");
                } catch (Exception parseException) {
                    throw new RuntimeException("Le service d'intelligence artificielle est temporairement indisponible.");
                }
            }
            System.err.println("⚠️ Erreur HTTP inattendue : " + e.getMessage());
            return new ArrayList<>();

        } catch (ResourceAccessException e) {
            System.err.println("⚠️ L'IA est injoignable ou trop lente. Fallback activé !");
            return new ArrayList<>();

        } catch (Exception e) {
            System.err.println("⚠️ Erreur générale : " + e.getMessage());
            return new ArrayList<>();
        }

        // 👉 CORRECTION : Suppression totale du bloc qui bloquait les dates de début dans le passé

        String fuzzyDepart = criteres.getVilleDepart() != null ? "%" + criteres.getVilleDepart().toLowerCase() + "%" : null;
        String fuzzyArrivee = criteres.getVilleArrivee() != null ? "%" + criteres.getVilleArrivee().toLowerCase() + "%" : null;
        
        Integer maxSegments = criteres.getEscalesMax() != null ? criteres.getEscalesMax() + 1 : null;
        Integer minSegments = criteres.getEscalesMin() != null ? criteres.getEscalesMin() + 1 : null;
        
        List<Voyage> resultats = voyageRepository.rechercherParCriteresFuzzy(
                fuzzyDepart,
                fuzzyArrivee,
                criteres.getPrixMin(),
                criteres.getPrixMax(),
                minSegments,
                maxSegments,
                criteres.getDateDebut(),
                criteres.getDateFin(),
                criteres.getStatut() 
        );

        if (resultats.isEmpty()) {
            System.out.println("ℹ️ La recherche IA n'a trouvé aucun match exact.");
            return new ArrayList<>();
        }

        return resultats;
    }

    public String transcrireAudio(MultipartFile fichierAudio) {
        RestTemplate restTemplate = new RestTemplate();
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("fichier", fichierAudio.getResource());

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            Map<String, String> response = restTemplate.postForObject(
                "http://127.0.0.1:8001/api/ia/transcrire", 
                requestEntity, 
                Map.class
            );

            return response != null ? response.get("texte") : "";

        } catch (Exception e) {
            System.err.println("❌ Erreur transcription Spring : " + e.getMessage());
            return "";
        }
    }

    @Data
    @NoArgsConstructor
    public static class CriteresIA {
        @JsonProperty("ville_depart")
        private String villeDepart;
        @JsonProperty("ville_arrivee")
        private String villeArrivee;
        
        @JsonProperty("prix_min")
        private BigDecimal prixMin;
        @JsonProperty("prix_max")
        private BigDecimal prixMax;
        
        @JsonProperty("date_debut")
        private String dateDebut;
        @JsonProperty("date_fin")
        private String dateFin;
        
        @JsonProperty("escales_min")
        private Integer escalesMin;
        @JsonProperty("escales_max")
        private Integer escalesMax;

        @JsonProperty("statut")
        private String statut;
    }
}