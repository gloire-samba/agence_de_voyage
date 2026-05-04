package com.agence.voyage.controller;

import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PostConstruct;

import java.util.Map;

@RestController
@RequestMapping("/api/paiement")
public class PaiementController {

    // Spring va chercher la valeur dans application-secret.properties
    @Value("${stripe.api.secretKey}")
    private String stripeSecretKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    @PostMapping("/create-intent")
    public Map<String, String> createPaymentIntent(@RequestBody Map<String, Object> data) throws Exception {
        
        // 1. On récupère le prix envoyé par Angular
        Number prixTotal = (Number) data.get("prixTotal");
        
        // 2. PIÈGE CLASSIQUE : Stripe travaille TOUJOURS en centimes !
        long montantCentimes = (long) (prixTotal.doubleValue() * 100);

        // 3. On demande le "ticket" à Stripe
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(montantCentimes)
                .setCurrency("eur")
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                )
                .build();

        PaymentIntent intent = PaymentIntent.create(params);
        
        // 4. On renvoie le ticket secret à Angular
        return Map.of("clientSecret", intent.getClientSecret());
    }
}