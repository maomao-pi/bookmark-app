package com.zhilian.server.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.ALWAYS)
public class LoginResponse {
    private String token;
    private String username;
    private String avatar;
    private String role;
    private String permissions;
    
    public LoginResponse(String token, String username, String avatar, String role) {
        this.token = token;
        this.username = username;
        this.avatar = avatar;
        this.role = role;
    }
    
    public LoginResponse(String token, String username, String avatar, String role, String permissions) {
        this.token = token;
        this.username = username;
        this.avatar = avatar;
        this.role = role;
        this.permissions = permissions;
    }
}
