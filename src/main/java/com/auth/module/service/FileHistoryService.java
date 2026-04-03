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
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FileHistoryService {

    private final FileHistoryRepository fileHistoryRepository;
    private final UploadedFileRepository uploadedFileRepository;
    private final UserRepository userRepository;

    // [HÀM DÙNG CHUNG] ghi log lịch sử thao tác
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

    // [LẤY TOÀN BỘ LỊCH SỬ]
    // admin: xem tất cả
    // user: chỉ xem lịch sử của các file do mình upload
    public Page<FileHistoryResponse> getAll(String currentUserEmail, int page, int size) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "performedAt")
        );

        Page<FileHistory> result;

        if (actor.getRole() == Role.ADMIN) {
            result = fileHistoryRepository.findAllByOrderByPerformedAtDesc(pageable);
        } else {
            result = fileHistoryRepository.findAllByOwnerEmail(currentUserEmail, pageable);
        }

        return result.map(this::toResponse);
    }

    // [LẤY LỊCH SỬ THEO FILE]
    // admin: xem được mọi file
    // user: chỉ xem nếu file đó là file của mình
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

        if (actor.getRole() == Role.ADMIN) {
            return fileHistoryRepository.findByFileIdOrderByPerformedAtDesc(fileId, pageable)
                    .map(this::toResponse);
        }

        Optional<UploadedFile> fileOpt = uploadedFileRepository.findById(fileId);
        if (fileOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy file");
        }

        UploadedFile file = fileOpt.get();
        if (!file.getUploadedBy().getEmail().equalsIgnoreCase(currentUserEmail)) {
            throw new AccessDeniedException("Bạn không có quyền xem lịch sử của file này");
        }

        return fileHistoryRepository.findByFileIdOrderByPerformedAtDesc(fileId, pageable)
                .map(this::toResponse);
    }

    // [XÓA BẢN GHI LỊCH SỬ]
    // chỉ xóa record trong file_histories, không xóa file gốc
    // admin: xóa được mọi bản ghi
    // user: chỉ xóa được bản ghi thuộc file do mình upload
    public void deleteHistory(String currentUserEmail, Long id) {
        User actor = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        FileHistory history = fileHistoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi lịch sử"));

        if (actor.getRole() == Role.ADMIN) {
            fileHistoryRepository.delete(history);
            return;
        }

        UploadedFile file = uploadedFileRepository.findById(history.getFileId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy file liên quan tới lịch sử"));

        if (!file.getUploadedBy().getEmail().equalsIgnoreCase(currentUserEmail)) {
            throw new AccessDeniedException("Bạn không có quyền xóa bản ghi lịch sử này");
        }

        fileHistoryRepository.delete(history);
    }

    private FileHistoryResponse toResponse(FileHistory h) {
        UploadedFile file = uploadedFileRepository.findById(h.getFileId()).orElse(null);

        return FileHistoryResponse.builder()
                .id(h.getId())
                .fileId(h.getFileId())
                .fileCode(file != null ? file.getFileCode() : null)
                .fileDisplayName(file != null ? file.getDisplayName() : null)
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
}