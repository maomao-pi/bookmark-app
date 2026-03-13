package com.zhilian.server.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.PageData;
import com.zhilian.server.dto.UserDetailResponse;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.User;
import com.zhilian.server.service.OperationLogService;
import com.zhilian.server.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@Validated
public class UserController {
    
    private final UserService userService;
    private final OperationLogService operationLogService;

    public UserController(UserService userService, OperationLogService operationLogService) {
        this.userService = userService;
        this.operationLogService = operationLogService;
    }
    
    @GetMapping
    public ApiResponse<PageData<User>> getUserList(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "pageNum 必须大于等于 1") int pageNum,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "pageSize 必须大于等于 1") @Max(value = 100, message = "pageSize 不能超过 100") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder) {
        Page<User> page = userService.getUserList(pageNum, pageSize, keyword, sortField, sortOrder);
        return ApiResponse.success(PageData.from(page));
    }
    
    @GetMapping("/{id}")
    public ApiResponse<User> getUser(@PathVariable @Positive(message = "id 必须大于 0") Long id) {
        User user = userService.getUserById(id);
        return ApiResponse.success(user);
    }

    @GetMapping("/{id}/detail")
    public ApiResponse<UserDetailResponse> getUserDetail(@PathVariable @Positive(message = "id 必须大于 0") Long id) {
        UserDetailResponse detail = userService.getUserDetail(id);
        return ApiResponse.success(detail);
    }
    
    @PostMapping
    public ApiResponse<User> createUser(@RequestBody User user,
                                        Authentication authentication,
                                        HttpServletRequest request) {
        User created = userService.createUser(user);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "CREATE_USER", "user", created.getId(), request.getRemoteAddr(), "success",
                Map.of("username", created.getUsername()));
        return ApiResponse.success(created);
    }
    
    @PutMapping("/{id}")
    public ApiResponse<User> updateUser(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                        @RequestBody User user,
                                        Authentication authentication,
                                        HttpServletRequest request) {
        User updated = userService.updateUser(id, user);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "UPDATE_USER", "user", id, request.getRemoteAddr(), "success",
                Map.of("updatedFields", "partial"));
        return ApiResponse.success(updated);
    }
    
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteUser(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                        Authentication authentication,
                                        HttpServletRequest request) {
        userService.deleteUser(id);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "DELETE_USER", "user", id, request.getRemoteAddr(), "success");
        return ApiResponse.success();
    }
    
    @PutMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                          @RequestParam @Pattern(regexp = "^(active|disabled)$", message = "status 仅支持 active/disabled") String status,
                                          Authentication authentication,
                                          HttpServletRequest request) {
        userService.updateStatus(id, status);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "UPDATE_USER_STATUS", "user", id, request.getRemoteAddr(), "success",
                Map.of("status", status));
        return ApiResponse.success();
    }
}
