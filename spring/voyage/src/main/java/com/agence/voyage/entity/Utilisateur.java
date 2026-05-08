package com.agence.voyage.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "UTILISATEUR")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column(name = "mot_de_passe", nullable = false)
    private String motDePasse;

    @Builder.Default
    @Column(nullable = false)
    private String role = "ROLE_USER";

    @Column(name = "date_inscription")
    private LocalDateTime dateInscription;

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL)
    @Builder.Default
    @JsonIgnore
    private List<Avis> avis = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (dateInscription == null) {
            dateInscription = LocalDateTime.now();
        }
    }
}