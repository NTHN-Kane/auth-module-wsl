package com.auth.module.dto;

import com.auth.module.entity.Gender;
import com.auth.module.entity.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private LocalDate dateOfBirth;
    private Gender gender;
    private String address;
    private String department;
    private String position;
    private Role role;
    private boolean active;
}