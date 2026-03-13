package com.zhilian.server.security;

import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.User;
import com.zhilian.server.mapper.AdminMapper;
import com.zhilian.server.mapper.UserMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtUtil jwtUtil;
    private final AdminMapper adminMapper;
    private final UserMapper userMapper;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, AdminMapper adminMapper, UserMapper userMapper) {
        this.jwtUtil = jwtUtil;
        this.adminMapper = adminMapper;
        this.userMapper = userMapper;
    }
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String token = getTokenFromRequest(request);
        System.out.println("JWT Filter - Token: " + (token != null ? "present" : "null"));
        
        if (StringUtils.hasText(token) && jwtUtil.validateToken(token)) {
            String role = jwtUtil.getRoleFromToken(token);
            System.out.println("JWT Filter - Role: " + role);
            
            if ("admin".equals(role) || "super_admin".equals(role)) {
                Long adminId = jwtUtil.getAdminIdFromToken(token);
                Admin admin = adminMapper.selectById(adminId);
                if (admin != null && "active".equals(admin.getStatus())) {
                    UsernamePasswordAuthenticationToken authentication = 
                            new UsernamePasswordAuthenticationToken(
                                    admin,
                                    null,
                                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + admin.getRole().toUpperCase()))
                            );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    System.out.println("JWT Filter - Admin authenticated");
                }
            } else if ("user".equals(role)) {
                Long userId = jwtUtil.getAdminIdFromToken(token);
                System.out.println("JWT Filter - UserId: " + userId);
                if (userId != null) {
                    UsernamePasswordAuthenticationToken authentication = 
                            new UsernamePasswordAuthenticationToken(
                                    userId.toString(),
                                    null,
                                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                    );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    System.out.println("JWT Filter - User authenticated");
                }
            }
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
