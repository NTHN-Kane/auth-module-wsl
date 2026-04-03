package com.auth.module.dto;

import com.auth.module.entity.Role;
import lombok.Data;

@Data
public class UpdateRoleRequest {
    private Role role;
}