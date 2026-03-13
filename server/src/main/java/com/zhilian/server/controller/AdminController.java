package com.zhilian.server.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.AdminProfileUpdateRequest;
import com.zhilian.server.dto.LoginRequest;
import com.zhilian.server.dto.LoginResponse;
import com.zhilian.server.dto.PageData;
import com.zhilian.server.dto.UpdatePasswordRequest;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.service.AdminService;
import com.zhilian.server.service.OperationLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@Validated
public class AdminController {
    
    private final AdminService adminService;
    private final OperationLogService operationLogService;

    public AdminController(AdminService adminService, OperationLogService operationLogService) {
        this.adminService = adminService;
        this.operationLogService = operationLogService;
    }
    
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            LoginResponse response = adminService.login(request);
            try {
                operationLogService.logByUsername(request.getUsername(), "LOGIN", "admin", null, "success",
                        Map.of("username", request.getUsername()));
            } catch (Exception ignored) {
            }
            return ApiResponse.success(response);
        } catch (Exception e) {
            String reason = e.getMessage() == null ? "login_failed" : e.getMessage();
            try {
                operationLogService.logByUsername(request.getUsername(), "LOGIN", "admin", null, "failed",
                        Map.of("username", request.getUsername(), "reason", reason));
            } catch (Exception ignored) {
            }
            return ApiResponse.error(ErrorCode.UNAUTHORIZED, reason);
        }
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(Authentication authentication, HttpServletRequest request) {
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "LOGOUT", "admin", admin.getId(), request.getRemoteAddr(), "success",
                Map.of("username", admin.getUsername()));
        return ApiResponse.success();
    }

    @PostMapping("/refresh-token")
    public ApiResponse<LoginResponse> refreshToken(Authentication authentication) {
        Admin admin = (Admin) authentication.getPrincipal();
        LoginResponse response = adminService.refreshToken(admin.getId());
        return ApiResponse.success(response);
    }
    
    @GetMapping("/profile")
    public ApiResponse<Admin> getProfile(Authentication authentication) {
        Admin admin = (Admin) authentication.getPrincipal();
        Admin current = adminService.getCurrentAdmin(admin.getId());
        current.setPassword(null);
        return ApiResponse.success(current);
    }

    @PutMapping("/profile")
    public ApiResponse<Admin> updateProfile(Authentication authentication, @Valid @RequestBody AdminProfileUpdateRequest request,
                                            HttpServletRequest httpRequest) {
        Admin admin = (Admin) authentication.getPrincipal();
        Admin updated = adminService.updateProfile(admin.getId(), request);
        updated.setPassword(null);
        operationLogService.log(admin.getId(), "UPDATE_PROFILE", "admin", admin.getId(), httpRequest.getRemoteAddr(), "success",
                Map.of("updatedFields", "partial"));
        return ApiResponse.success(updated);
    }
    
    @GetMapping("/list")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<PageData<Admin>> getAdminList(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "pageNum 必须大于等于 1") int pageNum,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "pageSize 必须大于等于 1") @Max(value = 100, message = "pageSize 不能超过 100") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder) {
        Page<Admin> page = adminService.getAdminList(pageNum, pageSize, keyword, sortField, sortOrder);
        page.getRecords().forEach(a -> a.setPassword(null));
        return ApiResponse.success(PageData.from(page));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Admin> createAdmin(@RequestBody Admin admin,
                                          Authentication authentication,
                                          HttpServletRequest request) {
        Admin created = adminService.createAdmin(admin);
        created.setPassword(null);
        Admin operator = (Admin) authentication.getPrincipal();
        operationLogService.log(operator.getId(), "CREATE_ADMIN", "admin", created.getId(), request.getRemoteAddr(), "success",
                Map.of("username", created.getUsername()));
        return ApiResponse.success(created);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Admin> updateAdmin(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                          @RequestBody Admin admin,
                                          Authentication authentication,
                                          HttpServletRequest request) {
        Admin updated = adminService.updateAdmin(id, admin);
        updated.setPassword(null);
        Admin operator = (Admin) authentication.getPrincipal();
        operationLogService.log(operator.getId(), "UPDATE_ADMIN", "admin", id, request.getRemoteAddr(), "success",
                Map.of("updatedFields", "partial"));
        return ApiResponse.success(updated);
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Void> deleteAdmin(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                         Authentication authentication,
                                         HttpServletRequest request) {
        Admin operator = (Admin) authentication.getPrincipal();
        adminService.deleteAdmin(id, operator.getId());
        operationLogService.log(operator.getId(), "DELETE_ADMIN", "admin", id, request.getRemoteAddr(), "success");
        return ApiResponse.success();
    }
    
    @PutMapping("/password")
    public ApiResponse<Void> updatePassword(Authentication authentication, @Valid @RequestBody UpdatePasswordRequest request,
                                            HttpServletRequest httpRequest) {
        Admin admin = (Admin) authentication.getPrincipal();
        adminService.updatePassword(admin.getId(), request.getOldPassword(), request.getNewPassword());
        operationLogService.log(admin.getId(), "UPDATE_PASSWORD", "admin", admin.getId(), httpRequest.getRemoteAddr(), "success",
                Map.of("username", admin.getUsername()));
        return ApiResponse.success();
    }

    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Admin> updatePermissions(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                               @RequestBody Map<String, String> request,
                                               Authentication authentication,
                                               HttpServletRequest httpRequest) {
        String permissions = request.get("permissions");
        Admin updated = adminService.updatePermissions(id, permissions);
        updated.setPassword(null);
        Admin operator = (Admin) authentication.getPrincipal();
        operationLogService.log(operator.getId(), "UPDATE_PERMISSIONS", "admin", id, httpRequest.getRemoteAddr(), "success");
        return ApiResponse.success(updated);
    }
}
