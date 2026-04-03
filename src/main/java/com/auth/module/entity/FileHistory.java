package com.auth.module.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "file_histories",
        indexes = {
                @Index(name = "idx_file_histories_file_id", columnList = "fileId"),
                @Index(name = "idx_file_histories_performed_by_user_id", columnList = "performedByUserId"),
                @Index(name = "idx_file_histories_performed_at", columnList = "performedAt")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // id file được thao tác
    @Column(nullable = false)
    private Long fileId;

    // hành động đã xảy ra: UPLOAD / UPDATE_META / DELETE / DOWNLOAD / APPROVE / REJECT
    @Column(nullable = false, length = 50)
    private String action;

    // người thực hiện thao tác
    @Column(nullable = false)
    private Long performedByUserId;

    @Column(nullable = false, length = 255)
    private String performedByEmail;

    @Column(nullable = false, length = 100)
    private String performedByUsername;

    // thời điểm thao tác
    @Column(nullable = false)
    private Instant performedAt;

    // ghi chú nghiệp vụ ngắn
    @Column(length = 1000)
    private String note;

    // dữ liệu cũ trước khi thay đổi (nếu có)
    @Column(length = 2000)
    private String oldValue;

    // dữ liệu mới sau khi thay đổi (nếu có)
    @Column(length = 2000)
    private String newValue;
}