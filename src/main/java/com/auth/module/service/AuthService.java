package com.auth.module.service;

import com.auth.module.dto.*;
import com.auth.module.entity.BlacklistedToken;
import com.auth.module.entity.RefreshToken;
import com.auth.module.entity.Role;
import com.auth.module.entity.User;
import com.auth.module.repository.BlacklistedTokenRepository;
import com.auth.module.repository.RefreshTokenRepository;
import com.auth.module.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final BlacklistedTokenRepository blacklistedTokenRepository;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    // NOTE: Giữ nguyên logic login cũ, chỉ đổi toàn bộ message sang tiếng Việt
    public AuthResponse login(AuthRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new RuntimeException("Email không được để trống");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new RuntimeException("Mật khẩu không được để trống");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy email"));

        if (!user.isActive()) {
            throw new RuntimeException("Tài khoản đang bị khóa");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Sai mật khẩu");
        }

        String accessToken = jwtService.generateAccessToken(
                user.getEmail(),
                user.getUsername(),
                user.getRole().name(),
                user.getFirstName(),
                user.getLastName()
        );

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .build();
    }

    // NOTE: Giữ nguyên logic refresh cũ, chỉ đổi message sang tiếng Việt
    public AuthResponse refresh(String refreshTokenValue) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy refresh token"));

        if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
            throw new RuntimeException("Refresh token đã hết hạn");
        }

        User user = refreshToken.getUser();

        if (!user.isActive()) {
            throw new RuntimeException("Tài khoản đang bị khóa");
        }

        String newAccessToken = jwtService.generateAccessToken(
                user.getEmail(),
                user.getUsername(),
                user.getRole().name(),
                user.getFirstName(),
                user.getLastName()
        );

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshTokenValue)
                .build();
    }

    // NOTE: Giữ nguyên logic logout cũ, chỉ đổi message sang tiếng Việt
    public void logout(String accessToken) {
        if (!jwtService.isValid(accessToken)) {
            throw new RuntimeException("Token không hợp lệ");
        }

        if (!blacklistedTokenRepository.existsByToken(accessToken)) {
            blacklistedTokenRepository.save(
                    BlacklistedToken.builder()
                            .token(accessToken)
                            .expiryDate(jwtService.extractAllClaims(accessToken)
                                    .getExpiration()
                                    .toInstant())
                            .build()
            );
        }
    }

    // NOTE: Giữ nguyên create user cũ, chỉ mở rộng thêm các field cá nhân và đổi message sang tiếng Việt
    public UserResponse createUser(CreateUserRequest request) {
        validateCreateUserRequest(request);

        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new RuntimeException("Email đã tồn tại");
        }

        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        }

        if (request.getPhone() != null
                && !request.getPhone().isBlank()
                && userRepository.existsByPhone(request.getPhone().trim())) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }

        Role role = request.getRole() != null ? request.getRole() : Role.USER;
        boolean active = request.getActive() != null ? request.getActive() : true;

        User user = User.builder()
                .username(request.getUsername().trim())
                .email(request.getEmail().trim())
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())

                // NOTE MỚI: Thêm các field thông tin cá nhân thực tế
                .phone(normalizeNullable(request.getPhone()))
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .address(normalizeNullable(request.getAddress()))
                .department(normalizeNullable(request.getDepartment()))
                .position(normalizeNullable(request.getPosition()))

                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .active(active)
                .build();

        userRepository.save(user);

        return mapToUserResponse(user);
    }

    // NOTE: Giữ nguyên logic cập nhật role cũ, chỉ đổi message sang tiếng Việt
    public UserResponse updateRole(Long userId, UpdateRoleRequest request) {
        if (request.getRole() == null) {
            throw new RuntimeException("Role không được để trống");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        user.setRole(request.getRole());
        userRepository.save(user);

        return mapToUserResponse(user);
    }

    // NOTE: Giữ nguyên logic cập nhật trạng thái cũ, chỉ đổi message sang tiếng Việt
    public UserResponse updateActive(Long userId, UpdateActiveRequest request) {
        if (request.getActive() == null) {
            throw new RuntimeException("Trạng thái active không được để trống");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        user.setActive(request.getActive());
        userRepository.save(user);

        return mapToUserResponse(user);
    }

    // NOTE MỚI: Admin cập nhật đầy đủ thông tin cá nhân và thông tin hệ thống của user
    public UserResponse updateUser(Long userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // NOTE MỚI: Cập nhật username nếu có gửi lên
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String username = request.getUsername().trim();
            if (!username.equals(user.getUsername()) && userRepository.existsByUsername(username)) {
                throw new RuntimeException("Tên đăng nhập đã tồn tại");
            }
            user.setUsername(username);
        }

        // NOTE MỚI: Cập nhật email nếu có gửi lên
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String email = request.getEmail().trim();
            if (!email.equals(user.getEmail()) && userRepository.existsByEmail(email)) {
                throw new RuntimeException("Email đã tồn tại");
            }
            user.setEmail(email);
        }

        // NOTE MỚI: Cập nhật họ tên
        if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
            user.setFirstName(request.getFirstName().trim());
        }

        if (request.getLastName() != null && !request.getLastName().isBlank()) {
            user.setLastName(request.getLastName().trim());
        }

        // NOTE MỚI: Cập nhật số điện thoại
        if (request.getPhone() != null) {
            String phone = request.getPhone().trim();

            if (phone.isBlank()) {
                user.setPhone(null);
            } else {
                boolean isPhoneChanged = user.getPhone() == null || !phone.equals(user.getPhone());
                if (isPhoneChanged && userRepository.existsByPhone(phone)) {
                    throw new RuntimeException("Số điện thoại đã tồn tại");
                }
                user.setPhone(phone);
            }
        }

        // NOTE MỚI: Cập nhật ngày sinh, giới tính, địa chỉ, phòng ban, chức vụ
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }

        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }

        if (request.getAddress() != null) {
            user.setAddress(normalizeNullable(request.getAddress()));
        }

        if (request.getDepartment() != null) {
            user.setDepartment(normalizeNullable(request.getDepartment()));
        }

        if (request.getPosition() != null) {
            user.setPosition(normalizeNullable(request.getPosition()));
        }

        // NOTE MỚI: Admin được phép đổi mật khẩu cho user
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        // NOTE MỚI: Admin được cập nhật luôn role và active nếu có truyền lên
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }

        userRepository.save(user);
        return mapToUserResponse(user);
    }

    // NOTE MỚI: Admin xóa user
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        userRepository.delete(user);
    }

    // NOTE MỚI: Admin xem chi tiết 1 user
    public UserResponse getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        return mapToUserResponse(user);
    }

    // NOTE: Giữ nguyên function lấy tất cả user
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::mapToUserResponse)
                .toList();
    }

    // NOTE: Giữ nguyên validate cũ, chỉ đổi message sang tiếng Việt
    private void validateCreateUserRequest(CreateUserRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            throw new RuntimeException("Tên đăng nhập không được để trống");
        }

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new RuntimeException("Email không được để trống");
        }

        if (request.getFirstName() == null || request.getFirstName().isBlank()) {
            throw new RuntimeException("Tên không được để trống");
        }

        if (request.getLastName() == null || request.getLastName().isBlank()) {
            throw new RuntimeException("Họ không được để trống");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new RuntimeException("Mật khẩu không được để trống");
        }
    }

    // NOTE MỚI: Chuẩn hóa dữ liệu chuỗi nullable, tránh lưu chuỗi rỗng
    private String normalizeNullable(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    // NOTE: Giữ mapper cũ, chỉ bổ sung thêm các field cá nhân mới
    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())

                // NOTE MỚI: Trả thêm thông tin cá nhân mở rộng
                .phone(user.getPhone())
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender())
                .address(user.getAddress())
                .department(user.getDepartment())
                .position(user.getPosition())

                .role(user.getRole())
                .active(user.isActive())
                .build();
    }
}