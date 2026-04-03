package com.auth.module.entity;

// enum mô tả các hành động xảy ra với file (KHÔNG phải trạng thái)
public enum FileHistoryAction {

    // user upload file
    UPLOAD,

    // user cập nhật metadata (tên hiển thị, loại file...)
    UPDATE_META,

    // user hoặc admin xóa file
    DELETE,

    // user tải file xuống
    DOWNLOAD,

    // admin duyệt file (cho phép hiển thị hệ thống)
    APPROVE,

    // admin từ chối file
    REJECT
}