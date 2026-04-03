package com.auth.module.controller;

import com.auth.module.dto.FileHistoryResponse;
import com.auth.module.service.FileHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/file-histories")
@RequiredArgsConstructor
public class FileHistoryController {

    private final FileHistoryService fileHistoryService;

    // lấy toàn bộ lịch sử thao tác file
    // admin: xem tất cả
    // user: chỉ xem lịch sử các file do mình upload
    @GetMapping
    public Page<FileHistoryResponse> getAll(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return fileHistoryService.getAll(authentication.getName(), page, size);
    }

    // lấy lịch sử thao tác của 1 file
    @GetMapping("/file/{fileId}")
    public Page<FileHistoryResponse> getByFileId(
            Authentication authentication,
            @PathVariable Long fileId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return fileHistoryService.getByFileId(authentication.getName(), fileId, page, size);
    }

    // xóa 1 bản ghi lịch sử
    // chỉ xóa record trong file_histories, không xóa file gốc
    @DeleteMapping("/{id}")
    public void deleteHistory(
            Authentication authentication,
            @PathVariable Long id
    ) {
        fileHistoryService.deleteHistory(authentication.getName(), id);
    }
}