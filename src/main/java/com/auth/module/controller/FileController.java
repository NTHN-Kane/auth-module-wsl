package com.auth.module.controller;

import com.auth.module.dto.AdminFileOverviewResponse;
import com.auth.module.dto.CreateFolderRequest;
import com.auth.module.dto.FileResponse;
import com.auth.module.dto.FolderResponse;
import com.auth.module.dto.UpdateAdminFileMetaRequest;
import com.auth.module.dto.UpdateFileMetaRequest;
import com.auth.module.dto.UpdateFolderRequest;
import com.auth.module.entity.UploadedFile;
import com.auth.module.service.FileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @GetMapping
    public Page<FileResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return fileService.listFiles(q, page, size);
    }

    @GetMapping("/admin/overview")
    public AdminFileOverviewResponse adminOverview(
            Authentication authentication,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return fileService.getAdminOverview(authentication.getName(), q, page, size);
    }

    @PostMapping("/folders")
    public FolderResponse createFolder(
            Authentication authentication,
            @RequestBody CreateFolderRequest request
    ) {
        return fileService.createFolder(authentication.getName(), request);
    }

    @GetMapping("/folders")
    public List<FolderResponse> listMyFolders(Authentication authentication) {
        return fileService.listMyFolders(authentication.getName());
    }

    // [ĐÃ THÊM] API sửa tên thư mục
    @PutMapping("/folders/{id}")
    public FolderResponse updateFolder(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody UpdateFolderRequest request
    ) {
        return fileService.updateFolder(authentication.getName(), id, request);
    }

    // [ĐÃ THÊM] API xóa thư mục
    @DeleteMapping("/folders/{id}")
    public void deleteFolder(
            Authentication authentication,
            @PathVariable Long id
    ) {
        fileService.deleteFolder(authentication.getName(), id);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileResponse upload(
            Authentication authentication,
            @RequestParam String displayName,
            @RequestParam String fileType,
            @RequestParam(required = false) Long folderId,
            @RequestPart("file") MultipartFile file
    ) {
        String uploaderEmail = authentication.getName();
        return fileService.upload(uploaderEmail, displayName, fileType, folderId, file);
    }

    @PutMapping("/{id}")
    public FileResponse updateMeta(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody UpdateFileMetaRequest req
    ) {
        return fileService.updateMeta(authentication.getName(), id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(Authentication authentication, @PathVariable Long id) {
        fileService.delete(authentication.getName(), id);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(
            @PathVariable Long id,
            Authentication authentication
    ) {
        UploadedFile f = fileService.getEntity(id);
        Resource res = fileService.download(id, authentication.getName());

        String filename = fileService.buildDownloadFilename(f);

        MediaType mt = (f.getContentType() != null && !f.getContentType().isBlank())
                ? MediaType.parseMediaType(f.getContentType())
                : MediaType.APPLICATION_OCTET_STREAM;

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(mt)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "Content-Disposition")
                .body(res);
    }

    // [ĐÃ THÊM] admin cập nhật trạng thái và ghi chú file đầu vào
    @PutMapping("/admin/{id}/meta")
    public ResponseEntity<FileResponse> updateAdminFileMeta(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAdminFileMetaRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(fileService.updateAdminFileMeta(id, request, authentication));
    }

    // [ĐÃ THÊM MỚI] lịch sử upload
    @GetMapping("/history")
    public Page<FileResponse> getUploadHistory(
            Authentication authentication,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return fileService.getUploadHistory(authentication.getName(), q, page, size);
    }

    // [ĐÃ THÊM MỚI] xóa lịch sử upload
    @DeleteMapping("/history/{id}")
    public void deleteUploadHistory(
            Authentication authentication,
            @PathVariable Long id
    ) {
        fileService.deleteUploadHistory(authentication.getName(), id);
    }
}