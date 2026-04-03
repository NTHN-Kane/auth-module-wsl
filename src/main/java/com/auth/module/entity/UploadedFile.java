package com.auth.module.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "uploaded_files",
        indexes = {
                @Index(name = "idx_uploaded_files_display_name", columnList = "displayName"),
                @Index(name = "idx_uploaded_files_uploaded_at", columnList = "uploadedAt"),
                @Index(name = "idx_uploaded_files_visible_in_system", columnList = "visibleInSystem"),
                @Index(name = "idx_uploaded_files_process_status", columnList = "processStatus")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_uploaded_files_hash", columnNames = {"fileHash"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadedFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tên file do user nhập để dễ tìm kiếm (không nhất thiết = tên file gốc)
    @Column(nullable = false, length = 255)
    private String displayName;

    // Định dạng do user chọn: DOC/EXCEL/PPT/PDF/OTHER...
    @Column(nullable = false, length = 50)
    private String fileType;

    // Tên file gốc từ máy user
    @Column(nullable = false, length = 255)
    private String originalFilename;

    // MIME type (nếu có)
    @Column(length = 150)
    private String contentType;

    // kích thước bytes
    @Column(nullable = false)
    private long sizeBytes;

    // đường dẫn file lưu trong hệ thống
    @Column(nullable = false, length = 500)
    private String storagePath;

    // hash để kiểm tra trùng toàn hệ thống
    @Column(nullable = false, length = 128)
    private String fileHash;

    @Column(nullable = false)
    private Instant uploadedAt;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_user_id", nullable = false)
    private User uploadedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private UserFolder folder;

    // [ĐÃ THÊM] mã file nghiệp vụ để admin dễ quản lý
    @Column(nullable = false, unique = true, length = 50)
    private String fileCode;

    // [ĐÃ THÊM] trạng thái xử lý file đầu vào
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FileProcessStatus processStatus;

    // [ĐÃ THÊM] ghi chú xử lý từ admin
    @Column(length = 1000)
    private String adminNote;

    // [ĐÃ THÊM MỚI]
    // true  = file được phép xuất hiện trong hệ thống chính (page Files, folder tree, download...)
    // false = file chỉ nằm trong lịch sử / hàng chờ xử lý / bị từ chối
    @Column(nullable = false)
    private Boolean visibleInSystem;
}