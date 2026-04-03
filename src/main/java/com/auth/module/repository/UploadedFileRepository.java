package com.auth.module.repository;

import com.auth.module.entity.FileProcessStatus;
import com.auth.module.entity.UploadedFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {

    boolean existsByFileHash(String fileHash);

    Optional<UploadedFile> findByFileHash(String fileHash);

    // [GIỮ NGUYÊN] tìm file theo tên
    Page<UploadedFile> findByDisplayNameContainingIgnoreCase(String keyword, Pageable pageable);

    // [ĐÃ THÊM] tìm file theo tên nhưng chỉ lấy file đang được phép hiện trong hệ thống
    Page<UploadedFile> findByVisibleInSystemTrueAndDisplayNameContainingIgnoreCase(String keyword, Pageable pageable);

    // [ĐÃ THÊM] lấy toàn bộ file đang được phép hiện trong hệ thống
    Page<UploadedFile> findByVisibleInSystemTrue(Pageable pageable);

    // [ĐÃ THÊM] kiểm tra thư mục còn file đang hiện trong hệ thống hay không trước khi xóa
    boolean existsByFolderIdAndVisibleInSystemTrue(Long folderId);

    // [GIỮ TƯƠNG THÍCH] nếu chỗ cũ còn đang gọi method này thì vẫn dùng được
    boolean existsByFolderId(Long folderId);

    // [ĐÃ THÊM] lấy các file chờ auto chuyển trạng thái sau 10 giây
    List<UploadedFile> findByProcessStatusAndUploadedAtLessThanEqual(
            FileProcessStatus processStatus,
            Instant uploadedAt
    );

    // [ĐÃ THÊM] lấy lịch sử upload của một user
    Page<UploadedFile> findByUploadedByIdOrderByUploadedAtDesc(Long uploadedById, Pageable pageable);

    // [ĐÃ THÊM] lấy toàn bộ lịch sử upload
    Page<UploadedFile> findAllByOrderByUploadedAtDesc(Pageable pageable);

    // [ĐÃ THÊM] user chỉ thấy file của mình
    Page<UploadedFile> findByUploadedBy_Email(String email, Pageable pageable);
}