package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.dto.AdminProfileUpdateRequest;
import com.zhilian.server.dto.LoginRequest;
import com.zhilian.server.dto.LoginResponse;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.exception.BizException;
import com.zhilian.server.mapper.AdminMapper;
import com.zhilian.server.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Service
public class AdminService {

    private static final Set<String> ALLOWED_ADMIN_ROLES = new HashSet<>(Set.of("super_admin", "admin"));
    private static final Set<String> ALLOWED_ADMIN_STATUS = new HashSet<>(Set.of("active", "disabled"));
    
    private final AdminMapper adminMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AdminService(AdminMapper adminMapper, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.adminMapper = adminMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }
    
    public LoginResponse login(LoginRequest request) {
        LambdaQueryWrapper<Admin> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Admin::getUsername, request.getUsername());
        Admin admin = adminMapper.selectOne(wrapper);
        
        if (admin == null) {
            throw new RuntimeException("用户名或密码错误");
        }
        
        if (!passwordEncoder.matches(request.getPassword(), admin.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }
        
        if (!"active".equals(admin.getStatus())) {
            throw new RuntimeException("账号已被禁用");
        }
        
        // 更新最后登录时间
        admin.setLastLoginAt(LocalDateTime.now());
        adminMapper.updateById(admin);
        
        String token = jwtUtil.generateToken(admin.getId(), admin.getUsername(), admin.getRole());
        
        // 超级管理员返回所有权限
        String permissions = admin.getPermissions();
        if ("super_admin".equals(admin.getRole())) {
            permissions = "[\"users\",\"bookmarks\",\"discover\",\"categories\",\"articles\",\"logs\",\"settings\",\"admins\"]";
        }
        
        return new LoginResponse(token, admin.getUsername(), admin.getAvatar(), admin.getRole(), permissions);
    }
    
    public Admin getCurrentAdmin(Long adminId) {
        Admin admin = adminMapper.selectById(adminId);
        if (admin == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "管理员不存在");
        }
        return admin;
    }

    public LoginResponse refreshToken(Long adminId) {
        Admin admin = adminMapper.selectById(adminId);
        if (admin == null || !"active".equals(admin.getStatus())) {
            throw new RuntimeException("管理员不存在或已禁用");
        }
        String token = jwtUtil.generateToken(admin.getId(), admin.getUsername(), admin.getRole());
        return new LoginResponse(token, admin.getUsername(), admin.getAvatar(), admin.getRole());
    }

    public Admin updateProfile(Long adminId, AdminProfileUpdateRequest request) {
        Admin admin = adminMapper.selectById(adminId);
        if (admin == null) {
            throw new RuntimeException("管理员不存在");
        }
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            LambdaQueryWrapper<Admin> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(Admin::getUsername, request.getUsername()).ne(Admin::getId, adminId);
            if (adminMapper.selectCount(wrapper) > 0) {
                throw new RuntimeException("用户名已存在");
            }
            admin.setUsername(request.getUsername());
        }
        if (request.getAvatar() != null) {
            admin.setAvatar(request.getAvatar());
        }
        admin.setUpdatedAt(LocalDateTime.now());
        adminMapper.updateById(admin);
        return admin;
    }
    
    public Page<Admin> getAdminList(int pageNum, int pageSize, String keyword, String sortField, String sortOrder) {
        Page<Admin> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Admin> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like(Admin::getUsername, keyword);
        }
        applySort(wrapper, sortField, sortOrder);
        return adminMapper.selectPage(page, wrapper);
    }
    
    public Admin createAdmin(Admin admin) {
        if (admin.getUsername() == null || admin.getUsername().isBlank()) {
            throw new RuntimeException("username 必填");
        }
        if (admin.getPassword() == null || admin.getPassword().isBlank()) {
            throw new RuntimeException("password 必填");
        }
        if (admin.getRole() != null && !ALLOWED_ADMIN_ROLES.contains(admin.getRole())) {
            throw new RuntimeException("role 仅支持 super_admin/admin");
        }

        // 检查用户名是否已存在
        LambdaQueryWrapper<Admin> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Admin::getUsername, admin.getUsername());
        if (adminMapper.selectCount(wrapper) > 0) {
            throw new RuntimeException("用户名已存在");
        }
        
        admin.setPassword(passwordEncoder.encode(admin.getPassword()));
        if (admin.getRole() == null || admin.getRole().isBlank()) {
            admin.setRole("admin");
        }
        admin.setStatus("active");
        admin.setCreatedAt(LocalDateTime.now());
        adminMapper.insert(admin);
        return admin;
    }
    
    public Admin updateAdmin(Long id, Admin admin) {
        Admin existing = adminMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "管理员不存在");
        }

        if (admin.getUsername() != null && admin.getUsername().isBlank()) {
            throw new RuntimeException("username 不能为空字符串");
        }
        if (admin.getRole() != null && !ALLOWED_ADMIN_ROLES.contains(admin.getRole())) {
            throw new RuntimeException("role 仅支持 super_admin/admin");
        }
        if (admin.getStatus() != null && !ALLOWED_ADMIN_STATUS.contains(admin.getStatus())) {
            throw new RuntimeException("status 仅支持 active/disabled");
        }
        
        if (admin.getUsername() != null) {
            existing.setUsername(admin.getUsername());
        }
        if (admin.getAvatar() != null) {
            existing.setAvatar(admin.getAvatar());
        }
        if (admin.getRole() != null) {
            existing.setRole(admin.getRole());
        }
        if (admin.getStatus() != null) {
            existing.setStatus(admin.getStatus());
        }
        
        existing.setUpdatedAt(LocalDateTime.now());
        adminMapper.updateById(existing);
        return existing;
    }
    
    public void deleteAdmin(Long id, Long operatorId) {
        if (id.equals(operatorId)) {
            throw new RuntimeException("不能删除当前登录管理员");
        }

        Admin existing = adminMapper.selectById(id);
        if (existing == null) {
            throw new RuntimeException("管理员不存在");
        }

        if ("super_admin".equals(existing.getRole())) {
            LambdaQueryWrapper<Admin> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(Admin::getRole, "super_admin").eq(Admin::getStatus, "active");
            long count = adminMapper.selectCount(wrapper);
            if (count <= 1) {
                throw new RuntimeException("至少保留一个激活状态的超级管理员");
            }
        }

        adminMapper.deleteById(id);
    }
    
    public void updatePassword(Long id, String oldPassword, String newPassword) {
        Admin admin = adminMapper.selectById(id);
        if (admin == null) {
            throw new RuntimeException("管理员不存在");
        }
        
        if (!passwordEncoder.matches(oldPassword, admin.getPassword())) {
            throw new RuntimeException("原密码错误");
        }
        
        admin.setPassword(passwordEncoder.encode(newPassword));
        admin.setUpdatedAt(LocalDateTime.now());
        adminMapper.updateById(admin);
    }

    public Admin updatePermissions(Long id, String permissions) {
        Admin admin = adminMapper.selectById(id);
        if (admin == null) {
            throw new RuntimeException("管理员不存在");
        }
        admin.setPermissions(permissions);
        admin.setUpdatedAt(LocalDateTime.now());
        adminMapper.updateById(admin);
        return admin;
    }

    private void applySort(LambdaQueryWrapper<Admin> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder) || "ascend".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "createdAt" : sortField;

        switch (field) {
            case "username" -> {
                if (asc) wrapper.orderByAsc(Admin::getUsername);
                else wrapper.orderByDesc(Admin::getUsername);
            }
            case "lastLoginAt" -> {
                if (asc) wrapper.orderByAsc(Admin::getLastLoginAt);
                else wrapper.orderByDesc(Admin::getLastLoginAt);
            }
            case "status" -> {
                if (asc) wrapper.orderByAsc(Admin::getStatus);
                else wrapper.orderByDesc(Admin::getStatus);
            }
            default -> {
                if (asc) wrapper.orderByAsc(Admin::getCreatedAt);
                else wrapper.orderByDesc(Admin::getCreatedAt);
            }
        }
    }
}
