package com.projeto.comunidade.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// As regras de negócio lançam RuntimeException com uma mensagem para o usuário;
// aqui ela vira uma resposta 400 que o front-end pode exibir.
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> tratar(RuntimeException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}
