package com.agence.voyage.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        
        // Autorise Angular ET React à communiquer avec Spring
        registry.addMapping("/**")
                // 👉 AJOUT ICI : On déclare les deux ports
                .allowedOrigins("http://localhost:4200", "http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH");
    }
}