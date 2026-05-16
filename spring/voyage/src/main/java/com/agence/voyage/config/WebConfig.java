package com.agence.voyage.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Autorise Angular à communiquer avec Spring
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:4200")
                // 👉 CORRECTION : Ajout de "PATCH" à la fin
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH");
    }
}