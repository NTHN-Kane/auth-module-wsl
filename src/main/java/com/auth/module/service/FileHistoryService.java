package com.auth.module.service;

import com.auth.module.dto.FileHistoryResponse;
import com.auth.module.entity.FileHistory;
import com.auth.module.entity.FileHistoryAction;
import com.auth.module.entity.Role;
import com.auth.module.entity.UploadedFile;
import com.auth.module.entity.User;
import com.auth.module.repository.FileHistoryRepository;
import com.auth.module.repository.UploadedFileRepository;
import com.auth.module.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FileHistoryService {

    private final FileHistoryRepository fileHistoryRepository;
    private final UploadedFileRepository uploadedFileRepository;
    private final UserRepository userRepository;

    // [SỬA] ghi log lịch sử thao tác + lưu snapshot để không phụ thuộc file gốc
    public void log(
            UploadedFile file,
            User actor,
            FileHistoryAction action,
            String note,
            String oldValue,
            String newValue
    ) {
        fileHistoryRepository.save(
                FileHistory.builder()
                        .fileId(file.getId())
                        .fileCodeSnapshot(file.getFileCode())
                        .fileDisplayNameSnapshot(file.getDisplayName())
                        .processStatusSnapshot(
                                file.getProcessStatus() != null ? file.getProcessStatus().name() : null
                        )
                        .action(action.name())
                        .performedByUserId(actor.getId())
                        .performedByEmail(actor.getEmail())
                        .performedByUsername(actor.getUsername())
                        .performedAt(Instant.now())
                        .note(note)
                        .oldValue(oldValue)
                        .newValue(newValue)
                        .build()
        );
    }

    // [SỬA] admin xem tất cả, user vẫn xem được lịch sử file của mình
    // kể cả khi file gốc đã bị xóa khỏi uploaded_files
    public Page<FileHistoryResponse> getAll(String currentUserEmail, int page, int size) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "performedAt")
        );

        if (actor.getRole() == Role.ADMIN) {
            return fileHistoryRepository.findAll(pageable).map(this::toResponse);
        }

        List<FileHistory> allHistories = fileHistoryRepository.findAll(
                Sort.by(Sort.Direction.DESC, "performedAt")
        );

        List<FileHistory> filtered = allHistories.stream()
                .filter(history -> userOwnsHistory(currentUserEmail, history))
                .filter(history -> shouldShowHistoryToUser(currentUserEmail, history))
                .toList();

        return toPagedResponse(filtered, pageable);
    }

    // [SỬA] user vẫn xem được lịch sử theo file kể cả file gốc đã bị xóa
    public Page<FileHistoryResponse> getByFileId(
            String currentUserEmail,
            Long fileId,
            int page,
            int size
    ) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "performedAt")
        );

        Page<FileHistory> rawPage = fileHistoryRepository.findByFileIdOrderByPerformedAtDesc(fileId, pageable);

        if (actor.getRole() == Role.ADMIN) {
            return rawPage.map(this::toResponse);
        }

        if (!userOwnsFile(currentUserEmail, fileId)) {
            throw new AccessDeniedException("Bạn không có quyền xem lịch sử của file này");
        }

        List<FileHistory> allFileHistories = fileHistoryRepository
                .findByFileIdOrderByPerformedAtDesc(fileId, PageRequest.of(0, 1000))
                .getContent()
                .stream()
                .filter(history -> shouldShowHistoryToUser(currentUserEmail, history))
                .toList();

        return toPagedResponse(allFileHistories, pageable);
    }

    // [SỬA] user vẫn xóa được bản ghi lịch sử thuộc file của mình
    // ngay cả khi file gốc không còn trong uploaded_files
    public void deleteHistory(String currentUserEmail, Long id) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        FileHistory history = fileHistoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi lịch sử"));

        if (actor.getRole() == Role.ADMIN) {
            fileHistoryRepository.delete(history);
            return;
        }

        if (!userOwnsHistory(currentUserEmail, history)) {
            throw new AccessDeniedException("Bạn không có quyền xóa bản ghi lịch sử này");
        }

        fileHistoryRepository.delete(history);
    }

    // [SỬA] ưu tiên snapshot, fallback sang file hiện tại nếu cần
    private FileHistoryResponse toResponse(FileHistory h) {
        UploadedFile file = uploadedFileRepository.findById(h.getFileId()).orElse(null);

        String fileCode = h.getFileCodeSnapshot();
        if ((fileCode == null || fileCode.isBlank()) && file != null) {
            fileCode = file.getFileCode();
        }

        String fileDisplayName = h.getFileDisplayNameSnapshot();
        if ((fileDisplayName == null || fileDisplayName.isBlank()) && file != null) {
            fileDisplayName = file.getDisplayName();
        }

        String processStatus = h.getProcessStatusSnapshot();
        if ((processStatus == null || processStatus.isBlank()) && file != null && file.getProcessStatus() != null) {
            processStatus = file.getProcessStatus().name();
        }

        return FileHistoryResponse.builder()
                .id(h.getId())
                .fileId(h.getFileId())
                .fileCode(fileCode)
                .fileDisplayName(fileDisplayName)
                .processStatus(processStatus)
                .action(h.getAction())
                .performedByUserId(h.getPerformedByUserId())
                .performedByEmail(h.getPerformedByEmail())
                .performedByUsername(h.getPerformedByUsername())
                .performedAt(h.getPerformedAt())
                .note(h.getNote())
                .oldValue(h.getOldValue())
                .newValue(h.getNewValue())
                .build();
    }

    // [THÊM] kiểm tra user có phải owner của file không
    private boolean userOwnsFile(String currentUserEmail, Long fileId) {
        Optional<UploadedFile> fileOpt = uploadedFileRepository.findById(fileId);

        if (fileOpt.isPresent()) {
            UploadedFile file = fileOpt.get();
            return file.getUploadedBy() != null
                    && file.getUploadedBy().getEmail() != null
                    && file.getUploadedBy().getEmail().equalsIgnoreCase(currentUserEmail);
        }

        return findUploaderEmailFromHistory(fileId)
                .map(email -> email.equalsIgnoreCase(currentUserEmail))
                .orElse(false);
    }

    // [THÊM] kiểm tra bản ghi history có thuộc file của user không
    private boolean userOwnsHistory(String currentUserEmail, FileHistory history) {
        return userOwnsFile(currentUserEmail, history.getFileId());
    }

    // [THÊM] tìm uploader từ history UPLOAD để support trường hợp file gốc đã bị xóa
    private Optional<String> findUploaderEmailFromHistory(Long fileId) {
        List<FileHistory> histories = fileHistoryRepository
                .findByFileIdOrderByPerformedAtDesc(fileId, PageRequest.of(0, 1000))
                .getContent();

        return histories.stream()
                .filter(history -> FileHistoryAction.UPLOAD.name().equalsIgnoreCase(history.getAction()))
                .map(FileHistory::getPerformedByEmail)
                .filter(email -> email != null && !email.isBlank())
                .reduce((older, newerIgnored) -> older);
    }

    // [THÊM] user không cần thấy action DELETE nếu do admin xóa file
    private boolean shouldShowHistoryToUser(String currentUserEmail, FileHistory history) {
        if (!FileHistoryAction.DELETE.name().equalsIgnoreCase(history.getAction())) {
            return true;
        }

        if (history.getPerformedByEmail() != null
                && history.getPerformedByEmail().equalsIgnoreCase(currentUserEmail)) {
            return true;
        }

        User performer = userRepository.findByEmail(history.getPerformedByEmail()).orElse(null);
        return performer == null || performer.getRole() != Role.ADMIN;
    }

    // [THÊM] phân trang thủ công sau khi filter
    private Page<FileHistoryResponse> toPagedResponse(List<FileHistory> histories, Pageable pageable) {
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), histories.size());

        List<FileHistoryResponse> content = start >= histories.size()
                ? List.of()
                : histories.subList(start, end).stream()
                .map(this::toResponse)
                .toList();

        return new PageImpl<>(content, pageable, histories.size());
    }
}