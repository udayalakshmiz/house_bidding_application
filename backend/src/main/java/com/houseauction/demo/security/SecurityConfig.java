package com.houseauction.demo.security;

import com.houseauction.demo.config.CorsConfig;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final CorsConfig corsConfig;

    public SecurityConfig(JwtFilter jwtFilter, CorsConfig corsConfig) {
        this.jwtFilter  = jwtFilter;
        this.corsConfig = corsConfig;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        // ── Public ────────────────────────────────────────────────
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/password-reset/**").permitAll()
                        .requestMatchers("/api/huggingface/**").permitAll()  // ← ADDED
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/properties/approved").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auctions").permitAll()

                        // ── Properties ────────────────────────────────────────────
                        .requestMatchers(HttpMethod.GET,    "/api/properties/my").authenticated()
                        .requestMatchers(HttpMethod.GET,    "/api/properties/pending").authenticated()
                        .requestMatchers(HttpMethod.GET,    "/api/properties/deletion-requests").authenticated()
                        .requestMatchers(HttpMethod.PUT,    "/api/properties/*/resubmit").authenticated()
                        .requestMatchers(HttpMethod.PUT,    "/api/properties/*/approve").authenticated()
                        .requestMatchers(HttpMethod.PUT,    "/api/properties/*/reject").authenticated()
                        .requestMatchers(HttpMethod.PUT,    "/api/properties/*/approve-deletion").authenticated()
                        .requestMatchers(HttpMethod.PUT,    "/api/properties/*/reject-deletion").authenticated()
                        .requestMatchers(HttpMethod.POST,   "/api/properties/*/request-deletion").authenticated()
                        .requestMatchers(HttpMethod.GET,    "/api/properties/**").authenticated()
                        .requestMatchers(HttpMethod.POST,   "/api/properties").authenticated()
                        .requestMatchers(HttpMethod.PUT,    "/api/properties/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/properties/**")
                        .hasAnyAuthority("ROLE_AUCTIONEER", "ROLE_ADMIN")

                        // ── Auctions ──────────────────────────────────────────────
                        .requestMatchers(HttpMethod.POST, "/api/auctions").authenticated()
                        .requestMatchers(HttpMethod.GET,  "/api/auctions/**").authenticated()
                        .requestMatchers(HttpMethod.PUT,  "/api/auctions/**").authenticated()

                        // ── Auction Applications ──────────────────────────────────
                        // Bidder: apply & view own applications
                        .requestMatchers(HttpMethod.POST, "/api/auction-applications/*/apply")
                        .hasAnyAuthority("ROLE_BIDDER")
                        .requestMatchers(HttpMethod.GET,  "/api/auction-applications/my")
                        .hasAnyAuthority("ROLE_BIDDER")
                        .requestMatchers(HttpMethod.GET,  "/api/auction-applications/my/*")
                        .hasAnyAuthority("ROLE_BIDDER")
                        // Auctioneer OR Admin: view applicants, approve, reject
                        .requestMatchers(HttpMethod.GET,  "/api/auction-applications/auction/*")
                        .hasAnyAuthority("ROLE_AUCTIONEER", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.PUT,  "/api/auction-applications/*/approve")
                        .hasAnyAuthority("ROLE_AUCTIONEER", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.PUT,  "/api/auction-applications/*/reject")
                        .hasAnyAuthority("ROLE_AUCTIONEER", "ROLE_ADMIN")
                        // ── WebSocket ─────────────────────────────────────────────────────────
                        .requestMatchers("/ws-auction/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auctions/*/room-state").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}