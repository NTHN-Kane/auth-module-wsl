package com.auth.module.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateAdminFileMetaRequest {

    @NotBlank
    private String processStatus;

    private String adminNote;
}