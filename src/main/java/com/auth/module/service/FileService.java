package com.auth.module.service;

import com.auth.module.dto.AdminFileOverviewResponse;
import com.auth.module.dto.CreateFolderRequest;
import com.auth.module.dto.FileResponse;
import com.auth.module.dto.FolderResponse;
import com.auth.module.dto.UpdateAdminFileMetaRequest;
import com.auth.module.dto.UpdateFileMetaRequest;
import com.auth.module.dto.UpdateFolderRequest;
import com.auth.module.entity.FileHistoryAction;
import com.auth.module.entity.FileProcessStatus;
import com.auth.module.entity.Role;
import com.auth.module.entity.UploadedFile;
import com.auth.module.entity.User;
import com.auth.module.entity.UserFolder;
import com.auth.module.repository.UploadedFileRepository;
import com.auth.module.repository.UserFolderRepository;
import com.auth.module.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileService {

    private static final String ROOT_FOLDER_NAME = "ROOT";

    private final UploadedFileRepository uploadedFileRepository;
    private final UserRepository userRepository;
    private final UserFolderRepository userFolderRepository;
    private final FileHistoryService fileHistoryService;

    @Value("${app.file.storage-dir:./storage/uploads}")
    private String storageDir;

    // whitelist định dạng file được phép upload
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
            ".pdf", ".doc", ".docx",
            ".xls", ".xlsx", ".csv",
            ".ppt", ".pptx",
            ".txt",
            ".png", ".jpg", ".jpeg", ".gif", ".webp"
    );

    // whitelist MIME type
    private static final List<String> ALLOWED_MIME_TYPES = List.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp"
    );

    public Page<FileResponse> listFiles(String q, int page, int size) {
        // page Files chỉ hiển thị file đã được phép xuất hiện trong hệ thống
        return listFilesInternal(q, page, size, false, true);
    }

    public AdminFileOverviewResponse getAdminOverview(String currentUserEmail, String q, int page, int size) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        if (actor.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Chỉ quản trị viên mới được xem tổng quan file");
        }

        // admin overview nhìn thấy toàn bộ file, kể cả chưa lên hệ thống hoặc bị từ chối
        Page<FileResponse> result = listFilesInternal(q, page, size, true, false);

        return AdminFileOverviewResponse.builder()
                .totalFileCount(uploadedFileRepository.count())
                .totalElements(result.getTotalElements())
                .page(result.getNumber())
                .size(result.getSize())
                .totalPages(result.getTotalPages())
                .files(result.getContent())
                .build();
    }

    public FolderResponse createFolder(String currentUserEmail, CreateFolderRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new RuntimeException("Tên thư mục là bắt buộc");
        }

        User owner = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        String folderName = req.getName().trim();
        UserFolder parent = null;

        if (req.getParentId() != null) {
            parent = userFolderRepository.findByIdAndOwnerId(req.getParentId(), owner.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy thư mục cha trong không gian thư mục của bạn"));

            if (userFolderRepository.existsByOwnerIdAndParentIdAndNameIgnoreCase(owner.getId(), parent.getId(), folderName)) {
                throw new RuntimeException("Thư mục đã tồn tại ở vị trí này");
            }
        } else if (userFolderRepository.existsByOwnerIdAndParentIsNullAndNameIgnoreCase(owner.getId(), folderName)) {
            throw new RuntimeException("Thư mục đã tồn tại ở vị trí này");
        }

        UserFolder saved = userFolderRepository.save(
                UserFolder.builder()
                        .name(folderName)
                        .owner(owner)
                        .parent(parent)
                        .createdAt(Instant.now())
                        .build()
        );

        return toFolderResponse(saved);
    }

    public FolderResponse updateFolder(String currentUserEmail, Long folderId, UpdateFolderRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new RuntimeException("Tên thư mục là bắt buộc");
        }

        User owner = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        UserFolder folder = userFolderRepository.findByIdAndOwnerId(folderId, owner.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thư mục trong không gian thư mục của bạn"));

        if (folder.getParent() == null && ROOT_FOLDER_NAME.equalsIgnoreCase(folder.getName())) {
            throw new RuntimeException("Không thể đổi tên thư mục ROOT");
        }

        String newName = req.getName().trim();

        if (folder.getName().equalsIgnoreCase(newName)) {
            return toFolderResponse(folder);
        }

        if (folder.getParent() != null) {
            boolean duplicated = userFolderRepository.existsByOwnerIdAndParentIdAndNameIgnoreCaseAndIdNot(
                    owner.getId(),
                    folder.getParent().getId(),
                    newName,
                    folder.getId()
            );

            if (duplicated) {
                throw new RuntimeException("Thư mục đã tồn tại ở vị trí này");
            }
        } else {
            boolean duplicated = userFolderRepository.existsByOwnerIdAndParentIsNullAndNameIgnoreCaseAndIdNot(
                    owner.getId(),
                    newName,
                    folder.getId()
            );

            if (duplicated) {
                throw new RuntimeException("Thư mục đã tồn tại ở vị trí này");
            }
        }

        folder.setName(newName);
        UserFolder saved = userFolderRepository.save(folder);

        return toFolderResponse(saved);
    }

    public void deleteFolder(String currentUserEmail, Long folderId) {
        User owner = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        UserFolder folder = userFolderRepository.findByIdAndOwnerId(folderId, owner.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thư mục trong không gian thư mục của bạn"));

        if (folder.getParent() == null && ROOT_FOLDER_NAME.equalsIgnoreCase(folder.getName())) {
            throw new RuntimeException("Không thể xóa thư mục ROOT");
        }

        if (userFolderRepository.existsByOwnerIdAndParentId(owner.getId(), folder.getId())) {
            throw new RuntimeException("Không thể xóa thư mục vì vẫn còn thư mục con");
        }

        if (uploadedFileRepository.existsByFolderIdAndVisibleInSystemTrue(folder.getId())) {
            throw new RuntimeException("Không thể xóa thư mục vì vẫn còn file bên trong");
        }

        userFolderRepository.delete(folder);
    }

    public List<FolderResponse> listMyFolders(String currentUserEmail) {
        User owner = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        return userFolderRepository.findByOwnerIdOrderByCreatedAtAsc(owner.getId())
                .stream()
                .map(this::toFolderResponse)
                .toList();
    }

    // lịch sử upload cũ
    public Page<FileResponse> getUploadHistory(String currentUserEmail, String q, int page, int size) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        Sort sort = Sort.by(Sort.Direction.DESC, "uploadedAt");
        List<UploadedFile> allFiles = uploadedFileRepository.findAll(sort);

        String keyword = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);

        List<UploadedFile> filtered = allFiles.stream()
                .filter(file -> actor.getRole() == Role.ADMIN
                        || file.getUploadedBy().getEmail().equalsIgnoreCase(currentUserEmail))
                .filter(file -> {
                    if (keyword.isBlank()) {
                        return true;
                    }

                    boolean matchDisplayName = file.getDisplayName() != null
                            && file.getDisplayName().toLowerCase(Locale.ROOT).contains(keyword);

                    boolean matchFileCode = file.getFileCode() != null
                            && file.getFileCode().toLowerCase(Locale.ROOT).contains(keyword);

                    boolean matchUploader = file.getUploadedBy() != null
                            && (
                            (file.getUploadedBy().getEmail() != null
                                    && file.getUploadedBy().getEmail().toLowerCase(Locale.ROOT).contains(keyword))
                                    || (file.getUploadedBy().getUsername() != null
                                    && file.getUploadedBy().getUsername().toLowerCase(Locale.ROOT).contains(keyword))
                    );

                    return matchDisplayName || matchFileCode || matchUploader;
                })
                .toList();

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int start = safePage * safeSize;
        int end = Math.min(start + safeSize, filtered.size());

        List<FileResponse> content = start >= filtered.size()
                ? List.of()
                : filtered.subList(start, end).stream()
                .map(file -> toResponse(file, true))
                .toList();

        return new PageImpl<>(
                content,
                PageRequest.of(safePage, safeSize, sort),
                filtered.size()
        );
    }

    // xóa lịch sử upload cũ
    public void deleteUploadHistory(String currentUserEmail, Long id) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        UploadedFile file = uploadedFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi lịch sử"));

        if (actor.getRole() != Role.ADMIN
                && !file.getUploadedBy().getEmail().equalsIgnoreCase(currentUserEmail)) {
            throw new AccessDeniedException("Bạn không có quyền xóa lịch sử upload này");
        }

        if (Boolean.TRUE.equals(file.getVisibleInSystem())
                || file.getProcessStatus() == FileProcessStatus.DA_HOAN_TAT) {
            throw new RuntimeException(
                    "Chưa thể xóa riêng lịch sử của file đang hiện trong hệ thống. " +
                            "Muốn hỗ trợ chức năng này cần tách bảng history riêng hoặc thêm cờ ẩn lịch sử."
            );
        }

        try {
            Files.deleteIfExists(resolveAndValidateStoragePath(file));
        } catch (IOException ignored) {
            // vẫn xóa metadata lịch sử nếu file vật lý không còn
        }

        uploadedFileRepository.delete(file);
    }

    private void validateFileUpload(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        String contentType = file.getContentType();

        if (originalName == null || originalName.isBlank()) {
            throw new RuntimeException("Tên file không hợp lệ");
        }

        String extension = extractExtension(originalName).toLowerCase(Locale.ROOT);

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new RuntimeException("Định dạng file không được phép: " + extension);
        }

        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new RuntimeException("Loại file không hợp lệ hoặc không được hỗ trợ");
        }
    }

    public FileResponse upload(
            String uploaderEmail,
            String displayName,
            String fileType,
            Long folderId,
            MultipartFile file
    ) {
        if (displayName == null || displayName.isBlank()) {
            throw new RuntimeException("Tên file hiển thị là bắt buộc");
        }
        if (fileType == null || fileType.isBlank()) {
            throw new RuntimeException("Loại file là bắt buộc");
        }
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File tải lên là bắt buộc");
        }

        validateFileUpload(file);

        User uploader = userRepository.findByEmail(uploaderEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người tải lên"));

        UserFolder targetFolder = (folderId == null)
                ? getOrCreateRootFolder(uploader)
                : userFolderRepository.findByIdAndOwnerId(folderId, uploader.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thư mục trong không gian thư mục của bạn"));

        String hash = sha256Hex(file);

        UploadedFile existed = uploadedFileRepository.findByFileHash(hash).orElse(null);
        if (existed != null) {
            throw new RuntimeException("File đã tồn tại trong hệ thống: " + existed.getDisplayName());
        }

        Path base = Paths.get(storageDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(base);
        } catch (IOException e) {
            throw new RuntimeException("Không thể tạo thư mục lưu trữ");
        }

        String safeOriginal = sanitizeFilename(file.getOriginalFilename());

        String extension = extractExtension(safeOriginal);
        String normalizedDisplayName = normalizeFilename(displayName);
        String storedBaseName = normalizedDisplayName.isBlank() ? "file" : normalizedDisplayName;
        String storedName = UUID.randomUUID() + "__" + storedBaseName + extension;
        Path dest = base.resolve(storedName);

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Không thể lưu file");
        }

        FileProcessStatus initialStatus;
        boolean visibleInSystem;

        if (uploader.getRole() == Role.ADMIN) {
            initialStatus = FileProcessStatus.DA_HOAN_TAT;
            visibleInSystem = true;
        } else {
            initialStatus = FileProcessStatus.DA_NHAN;
            visibleInSystem = false;
        }

        UploadedFile saved = uploadedFileRepository.save(
                UploadedFile.builder()
                        .displayName(displayName.trim())
                        .fileType(fileType.trim().toUpperCase(Locale.ROOT))
                        .originalFilename(safeOriginal)
                        .contentType(file.getContentType())
                        .sizeBytes(file.getSize())
                        .storagePath(dest.toString())
                        .fileHash(hash)
                        .uploadedAt(Instant.now())
                        .uploadedBy(uploader)
                        .folder(targetFolder)
                        .fileCode(generateFileCode())
                        .processStatus(initialStatus)
                        .adminNote(null)
                        .visibleInSystem(visibleInSystem)
                        .build()
        );

        fileHistoryService.log(
                saved,
                uploader,
                FileHistoryAction.UPLOAD,
                "Tải file lên hệ thống",
                null,
                null
        );

        return toResponse(saved, false);
    }

    private String generateFileCode() {
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        long count = uploadedFileRepository.count() + 1;
        return String.format("IN-%s-%03d", date, count);
    }

    public FileResponse updateMeta(String currentUserEmail, Long id, UpdateFileMetaRequest req) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        UploadedFile f = uploadedFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy file"));

        ensureCanModify(actor, f);

        String oldValue = "displayName=" + f.getDisplayName() + ", fileType=" + f.getFileType();

        if (req.getDisplayName() != null && !req.getDisplayName().isBlank()) {
            f.setDisplayName(req.getDisplayName().trim());
        }
        if (req.getFileType() != null && !req.getFileType().isBlank()) {
            f.setFileType(req.getFileType().trim().toUpperCase(Locale.ROOT));
        }

        uploadedFileRepository.save(f);

        String newValue = "displayName=" + f.getDisplayName() + ", fileType=" + f.getFileType();

        fileHistoryService.log(
                f,
                actor,
                FileHistoryAction.UPDATE_META,
                "Cập nhật metadata file",
                oldValue,
                newValue
        );

        return toResponse(f, false);
    }

    public FileResponse updateAdminFileMeta(
            Long id,
            UpdateAdminFileMetaRequest request,
            Authentication authentication
    ) {
        User currentUser = getCurrentUser(authentication);

        if (currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Bạn không có quyền cập nhật metadata file đầu vào");
        }

        UploadedFile file = uploadedFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy file"));

        String oldValue = "processStatus=" + file.getProcessStatus()
                + ", adminNote=" + file.getAdminNote()
                + ", visibleInSystem=" + file.getVisibleInSystem();

        if (request.getProcessStatus() == null || request.getProcessStatus().isBlank()) {
            throw new RuntimeException("Trạng thái không được để trống");
        }

        FileProcessStatus targetStatus;
        try {
            targetStatus = FileProcessStatus.valueOf(request.getProcessStatus().trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw new RuntimeException("Trạng thái không hợp lệ");
        }

        String trimmedAdminNote = request.getAdminNote() != null
                ? request.getAdminNote().trim()
                : null;

        applyWorkflowTransition(file, targetStatus, trimmedAdminNote);

        UploadedFile saved = uploadedFileRepository.save(file);

        String newValue = "processStatus=" + saved.getProcessStatus()
                + ", adminNote=" + saved.getAdminNote()
                + ", visibleInSystem=" + saved.getVisibleInSystem();

        if (targetStatus == FileProcessStatus.DA_HOAN_TAT) {
            fileHistoryService.log(
                    saved,
                    currentUser,
                    FileHistoryAction.APPROVE,
                    "Admin duyệt file",
                    oldValue,
                    newValue
            );
        } else if (targetStatus == FileProcessStatus.TU_CHOI) {
            fileHistoryService.log(
                    saved,
                    currentUser,
                    FileHistoryAction.REJECT,
                    "Admin từ chối file",
                    oldValue,
                    newValue
            );
        } else {
            fileHistoryService.log(
                    saved,
                    currentUser,
                    FileHistoryAction.UPDATE_META,
                    "Admin cập nhật trạng thái xử lý file",
                    oldValue,
                    newValue
            );
        }

        return toResponse(saved, true);
    }

    public void delete(String currentUserEmail, Long id) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        UploadedFile f = uploadedFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy file"));

        ensureCanModify(actor, f);

        fileHistoryService.log(
                f,
                actor,
                FileHistoryAction.DELETE,
                "Xóa file",
                "displayName=" + f.getDisplayName() + ", fileType=" + f.getFileType(),
                null
        );

        try {
            Files.deleteIfExists(resolveAndValidateStoragePath(f));
        } catch (IOException ignored) {
            // if physical file cannot be deleted, metadata is still removed to avoid blocking user.
        }

        uploadedFileRepository.delete(f);
    }

    // giữ hàm cũ để tương thích nếu chỗ khác còn gọi
    public Resource download(Long id) {
        UploadedFile f = uploadedFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy file"));

        Path path = resolveAndValidateStoragePath(f);
        if (!Files.exists(path)) {
            throw new RuntimeException("File đã lưu không còn tồn tại trong hệ thống");
        }

        return new FileSystemResource(path.toFile());
    }

    // hàm mới: log đúng người đang tải file
    public Resource download(Long id, String currentUserEmail) {
        UploadedFile f = uploadedFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy file"));

        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        Path path = resolveAndValidateStoragePath(f);
        if (!Files.exists(path)) {
            throw new RuntimeException("File đã lưu không còn tồn tại trong hệ thống");
        }

        fileHistoryService.log(
                f,
                actor,
                FileHistoryAction.DOWNLOAD,
                "Tải file xuống",
                null,
                null
        );

        return new FileSystemResource(path.toFile());
    }

    public UploadedFile getEntity(Long id) {
        return uploadedFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy file"));
    }

    public String buildDownloadFilename(UploadedFile file) {
        String baseName = sanitizeDownloadFilename(file.getDisplayName());

        if (baseName == null || baseName.isBlank()) {
            baseName = "file-" + file.getId();
        }

        String extension = extractExtension(file.getOriginalFilename());

        if (hasExtension(baseName)) {
            return baseName;
        }

        return baseName + extension;
    }

    private static String sanitizeDownloadFilename(String name) {
        if (name == null || name.isBlank()) {
            return "file";
        }

        String sanitized = name.trim()
                .replaceAll("[\\\\/:*?\"<>|\\r\\n\\t]", " ")
                .replaceAll("\\s{2,}", " ")
                .replaceAll("^[\\.\\s]+|[\\.\\s]+$", "");

        return sanitized.isBlank() ? "file" : sanitized;
    }

    private Page<FileResponse> listFilesInternal(
            String q,
            int page,
            int size,
            boolean includeStoragePath,
            boolean onlyVisibleInSystem
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "uploadedAt")
        );

        Page<UploadedFile> result;

        if (onlyVisibleInSystem) {
            if (q == null || q.isBlank()) {
                result = uploadedFileRepository.findByVisibleInSystemTrue(pageable);
            } else {
                result = uploadedFileRepository.findByVisibleInSystemTrueAndDisplayNameContainingIgnoreCase(
                        q.trim(),
                        pageable
                );
            }
        } else {
            if (q == null || q.isBlank()) {
                result = uploadedFileRepository.findAll(pageable);
            } else {
                result = uploadedFileRepository.findByDisplayNameContainingIgnoreCase(q.trim(), pageable);
            }
        }

        return result.map(file -> toResponse(file, includeStoragePath));
    }

    private UserFolder getOrCreateRootFolder(User owner) {
        return userFolderRepository.findByOwnerIdAndParentIsNullAndNameIgnoreCase(owner.getId(), ROOT_FOLDER_NAME)
                .orElseGet(() -> userFolderRepository.save(
                        UserFolder.builder()
                                .name(ROOT_FOLDER_NAME)
                                .owner(owner)
                                .parent(null)
                                .createdAt(Instant.now())
                                .build()
                ));
    }

    private FileResponse toResponse(UploadedFile f, boolean includeStoragePath) {
        UserFolder folder = f.getFolder();

        return FileResponse.builder()
                .id(f.getId())
                .displayName(f.getDisplayName())
                .fileType(f.getFileType())
                .originalFilename(f.getOriginalFilename())
                .contentType(f.getContentType())
                .sizeBytes(f.getSizeBytes())
                .uploadedAt(f.getUploadedAt())
                .uploaderId(f.getUploadedBy().getId())
                .uploaderUsername(f.getUploadedBy().getUsername())
                .uploaderEmail(f.getUploadedBy().getEmail())
                .folderId(folder != null ? folder.getId() : null)
                .folderName(folder != null ? folder.getName() : null)
                .logicalPath(buildFolderPath(folder))
                .storagePath(includeStoragePath ? f.getStoragePath() : null)
                .fileCode(f.getFileCode())
                .processStatus(f.getProcessStatus() != null ? f.getProcessStatus().name() : null)
                .adminNote(f.getAdminNote())
                .visibleInSystem(f.getVisibleInSystem())
                .build();
    }

    private FolderResponse toFolderResponse(UserFolder folder) {
        return FolderResponse.builder()
                .id(folder.getId())
                .name(folder.getName())
                .parentId(folder.getParent() != null ? folder.getParent().getId() : null)
                .ownerId(folder.getOwner().getId())
                .ownerEmail(folder.getOwner().getEmail())
                .logicalPath(buildFolderPath(folder))
                .createdAt(folder.getCreatedAt())
                .build();
    }

    private String buildFolderPath(UserFolder folder) {
        if (folder == null) {
            return "/";
        }

        ArrayDeque<String> names = new ArrayDeque<>();
        UserFolder cursor = folder;
        while (cursor != null) {
            names.push(cursor.getName());
            cursor = cursor.getParent();
        }

        return "/" + String.join("/", names);
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new RuntimeException("Không xác định được người dùng hiện tại");
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));
    }

    @Scheduled(fixedDelay = 5000)
    public void autoMoveReceivedFilesToProcessing() {
        Instant threshold = Instant.now().minusSeconds(10);

        List<UploadedFile> waitingFiles =
                uploadedFileRepository.findByProcessStatusAndUploadedAtLessThanEqual(
                        FileProcessStatus.DA_NHAN,
                        threshold
                );

        if (waitingFiles.isEmpty()) {
            return;
        }

        for (UploadedFile file : waitingFiles) {
            if (Boolean.TRUE.equals(file.getVisibleInSystem())) {
                continue;
            }

            FileProcessStatus oldStatus = file.getProcessStatus();

            if (oldStatus != FileProcessStatus.DA_NHAN) {
                continue;
            }

            file.setProcessStatus(FileProcessStatus.DANG_XU_LY);

            UploadedFile saved = uploadedFileRepository.save(file);

            User uploader = saved.getUploadedBy();
            if (uploader != null) {
                fileHistoryService.log(
                        saved,
                        uploader,
                        FileHistoryAction.UPDATE_META,
                        "Hệ thống tự động chuyển file sang trạng thái đang xử lý",
                        "processStatus=" + oldStatus + ", visibleInSystem=" + saved.getVisibleInSystem(),
                        "processStatus=" + saved.getProcessStatus() + ", visibleInSystem=" + saved.getVisibleInSystem()
                );
            }
        }
    }

    // [THÊM MỚI] siết các rule chuyển trạng thái để admin không set bừa
    private void applyWorkflowTransition(
            UploadedFile file,
            FileProcessStatus targetStatus,
            String adminNote
    ) {
        FileProcessStatus currentStatus = file.getProcessStatus();

        if (currentStatus == null) {
            throw new RuntimeException("File chưa có trạng thái hiện tại hợp lệ");
        }

        if (targetStatus == FileProcessStatus.CHO_NHAN) {
            throw new RuntimeException("Không cho phép chuyển file về trạng thái CHO_NHAN");
        }

        if (currentStatus == targetStatus) {
            file.setAdminNote(adminNote);
            return;
        }

        switch (currentStatus) {
            case DA_NHAN -> {
                if (targetStatus != FileProcessStatus.DANG_XU_LY
                        && targetStatus != FileProcessStatus.DA_HOAN_TAT
                        && targetStatus != FileProcessStatus.TU_CHOI) {
                    throw new RuntimeException("Không thể chuyển từ DA_NHAN sang trạng thái này");
                }
            }
            case DANG_XU_LY -> {
                if (targetStatus != FileProcessStatus.DA_HOAN_TAT
                        && targetStatus != FileProcessStatus.TU_CHOI) {
                    throw new RuntimeException("Không thể chuyển từ DANG_XU_LY sang trạng thái này");
                }
            }
            case DA_HOAN_TAT -> {
                throw new RuntimeException("File đã hoàn tất, không thể chuyển ngược trạng thái");
            }
            case TU_CHOI -> {
                throw new RuntimeException("File đã bị từ chối, không thể chuyển ngược trạng thái");
            }
            default -> throw new RuntimeException("Trạng thái hiện tại không được hỗ trợ");
        }

        file.setProcessStatus(targetStatus);
        file.setAdminNote(adminNote);

        if (targetStatus == FileProcessStatus.DA_HOAN_TAT) {
            file.setVisibleInSystem(true);
        } else if (targetStatus == FileProcessStatus.TU_CHOI) {
            file.setVisibleInSystem(false);
        }
        // DA_NHAN -> DANG_XU_LY giữ visibleInSystem=false như cũ
    }

    private static String sha256Hex(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) {
                digest.update(buf, 0, n);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo mã băm cho file");
        }
    }

    private static String sanitizeFilename(String name) {
        if (name == null || name.isBlank()) {
            return "file";
        }
        return name.replaceAll("[\\\\/\\r\\n\\t]", "_");
    }

    private static String extractExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            return "";
        }

        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == filename.length() - 1) {
            return "";
        }

        return filename.substring(lastDot);
    }

    private static boolean hasExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            return false;
        }

        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 && lastDot < filename.length() - 1;
    }

    private static String normalizeFilename(String input) {
        if (input == null || input.isBlank()) {
            return "file";
        }

        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");

        normalized = normalized
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("\\s+", "_")
                .replaceAll("[^a-z0-9._-]", "_")
                .replaceAll("_{2,}", "_")
                .replaceAll("^[_\\.\\-]+|[_\\.\\-]+$", "");

        return normalized.isBlank() ? "file" : normalized;
    }

    private void ensureCanModify(User actor, UploadedFile file) {
        if (actor.getRole() == Role.ADMIN) {
            return;
        }

        if (!actor.getId().equals(file.getUploadedBy().getId())) {
            throw new AccessDeniedException("Chỉ người tải lên hoặc quản trị viên mới được chỉnh sửa file này");
        }
    }

    private Path resolveAndValidateStoragePath(UploadedFile file) {
        Path base = Paths.get(storageDir).toAbsolutePath().normalize();
        Path actual = Paths.get(file.getStoragePath()).toAbsolutePath().normalize();

        if (!actual.startsWith(base)) {
            throw new RuntimeException("Đường dẫn lưu trữ file không hợp lệ");
        }

        return actual;
    }
}