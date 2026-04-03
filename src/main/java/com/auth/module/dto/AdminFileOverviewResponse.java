package com.auth.module.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AdminFileOverviewResponse {
    private long totalFileCount;
    private long totalElements;
    private int page;
    private int size;
    private int totalPages;
    private List<FileResponse> files;
}
