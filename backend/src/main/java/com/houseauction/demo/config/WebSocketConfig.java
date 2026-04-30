package com.houseauction.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
                .addEndpoint("/ws-auction")       // ws://localhost:8081/ws-auction
                .setAllowedOriginPatterns("*")
                .withSockJS();                    // SockJS fallback
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // clients SUBSCRIBE to /topic/...
        registry.enableSimpleBroker("/topic");
        // clients SEND to /app/...
        registry.setApplicationDestinationPrefixes("/app");
    }
}