package com.auth.module.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class FileHistoryResponse {

    private Long id;

    // file liên quan
    private Long fileId;
    private String fileCode;
    private String fileDisplayName;

    // hành động: UPLOAD / DELETE / DOWNLOAD / ...
    private String action;

    // người thực hiện
    private Long performedByUserId;
    private String performedByEmail;
    private String performedByUsername;

    // thời gian thực hiện
    private Instant performedAt;

    // ghi chú nghiệp vụ
    private String note;

    // dữ liệu trước và sau (nếu có)
    private String oldValue;
    private String newValue;
}