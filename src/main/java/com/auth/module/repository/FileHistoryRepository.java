package com.auth.module.repository;

import com.auth.module.entity.FileHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FileHistoryRepository extends JpaRepository<FileHistory, Long> {

    // lấy toàn bộ lịch sử (admin)
    Page<FileHistory> findAllByOrderByPerformedAtDesc(Pageable pageable);

    // lấy lịch sử theo file
    Page<FileHistory> findByFileIdOrderByPerformedAtDesc(Long fileId, Pageable pageable);

    // [THÊM MỚI] user chỉ xem lịch sử các file do mình upload
    @Query("""
        SELECT h
        FROM FileHistory h
        JOIN UploadedFile f ON f.id = h.fileId
        WHERE LOWER(f.uploadedBy.email) = LOWER(:email)
        ORDER BY h.performedAt DESC
    """)
    Page<FileHistory> findAllByOwnerEmail(String email, Pageable pageable);

    // [THÊM MỚI] xóa 1 bản ghi lịch sử
    void deleteById(Long id);
}