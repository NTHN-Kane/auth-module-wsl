package com.auth.module.dto;

import lombok.Data;

@Data
public class CreateFolderRequest {
    private String name;
    private Long parentId;
}
