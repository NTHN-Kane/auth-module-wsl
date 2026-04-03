package com.auth.module.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class FileResponse {
    private Long id;
    private String displayName;
    private String fileType;
    private String originalFilename;
    private String contentType;
    private long sizeBytes;
    private Instant uploadedAt;

    private Long uploaderId;
    private String uploaderUsername;
    private String uploaderEmail;

    private Long folderId;
    private String folderName;
    private String logicalPath;
    private String storagePath;

    private String fileCode;
    private String processStatus;
    private String adminNote;

    // [ĐÃ THÊM MỚI]
    // true  = file được phép xuất hiện trong hệ thống chính
    // false = file chỉ nằm trong lịch sử / hàng chờ xử lý / bị từ chối
    private Boolean visibleInSystem;
}