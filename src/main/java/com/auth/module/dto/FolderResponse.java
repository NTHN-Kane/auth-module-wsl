package com.auth.module.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class FolderResponse {
    private Long id;
    private String name;
    private Long parentId;
    private Long ownerId;
    private String ownerEmail;
    private String logicalPath;
    private Instant createdAt;
}
