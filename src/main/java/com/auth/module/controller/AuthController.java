package com.auth.module.controller;

import com.auth.module.dto.*;
import com.auth.module.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // NOTE: Giữ nguyên logic đăng nhập cũ
    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest request) {
        return authService.login(request);
    }

    // NOTE: Giữ nguyên logic refresh token cũ
    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestParam String refreshToken) {
        return authService.refresh(refreshToken);
    }

    // NOTE: Chỉ đổi message lỗi sang tiếng Việt, không đổi logic logout cũ
    @PostMapping("/logout")
    public void logout(@RequestHeader("Authorization") String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new RuntimeException("Header Authorization phải bắt đầu bằng Bearer");
        }

        String token = header.substring(7);
        authService.logout(token);
    }

    // NOTE: Giữ nguyên function profile cũ
    @GetMapping("/profile")
    public String profile(Authentication authentication) {
        return "Xin chào " + authentication.getName();
    }

    // NOTE: Giữ nguyên dashboard admin cũ, chỉ đổi message sang tiếng Việt
    @GetMapping("/admin/dashboard")
    public String adminDashboard() {
        return "Chào mừng ADMIN";
    }

    // NOTE: Giữ nguyên create user cũ, nhưng request sẽ được mở rộng thêm field cá nhân
    @PostMapping("/admin/users")
    public UserResponse createUser(@RequestBody CreateUserRequest request) {
        return authService.createUser(request);
    }

    // NOTE: Giữ nguyên update role cũ
    @PatchMapping("/admin/users/{id}/role")
    public UserResponse updateRole(
            @PathVariable Long id,
            @RequestBody UpdateRoleRequest request
    ) {
        return authService.updateRole(id, request);
    }

    // NOTE: Giữ nguyên update active cũ
    @PatchMapping("/admin/users/{id}/active")
    public UserResponse updateActive(
            @PathVariable Long id,
            @RequestBody UpdateActiveRequest request
    ) {
        return authService.updateActive(id, request);
    }

    // NOTE: Giữ nguyên lấy danh sách user cũ
    @GetMapping("/admin/users")
    public List<UserResponse> getAllUsers() {
        return authService.getAllUsers();
    }

    // NOTE MỚI: Admin xem chi tiết 1 user theo id
    @GetMapping("/admin/users/{id}")
    public UserResponse getUserById(@PathVariable Long id) {
        return authService.getUserById(id);
    }

    // NOTE MỚI: Admin cập nhật đầy đủ thông tin cá nhân user
    @PutMapping("/admin/users/{id}")
    public UserResponse updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request
    ) {
        return authService.updateUser(id, request);
    }

    // NOTE MỚI: Admin xóa user
    @DeleteMapping("/admin/users/{id}")
    public void deleteUser(@PathVariable Long id) {
        authService.deleteUser(id);
    }
}