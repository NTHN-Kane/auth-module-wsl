package com.auth.module.repository;

import com.auth.module.entity.UserFolder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserFolderRepository extends JpaRepository<UserFolder, Long> {

    Optional<UserFolder> findByOwnerIdAndParentIsNullAndNameIgnoreCase(Long ownerId, String name);

    Optional<UserFolder> findByIdAndOwnerId(Long folderId, Long ownerId);

    boolean existsByOwnerIdAndParentIdAndNameIgnoreCase(Long ownerId, Long parentId, String name);

    boolean existsByOwnerIdAndParentIsNullAndNameIgnoreCase(Long ownerId, String name);

    List<UserFolder> findByOwnerIdOrderByCreatedAtAsc(Long ownerId);

     // [ĐÃ THÊM] kiểm tra trùng tên thư mục cùng cấp khi rename (có loại trừ chính nó)
    boolean existsByOwnerIdAndParentIdAndNameIgnoreCaseAndIdNot(Long ownerId, Long parentId, String name, Long id);

    // [ĐÃ THÊM] kiểm tra trùng tên thư mục top-level khi rename (có loại trừ chính nó)
    boolean existsByOwnerIdAndParentIsNullAndNameIgnoreCaseAndIdNot(Long ownerId, String name, Long id);

    // [ĐÃ THÊM] kiểm tra thư mục có thư mục con hay không
    boolean existsByOwnerIdAndParentId(Long ownerId, Long parentId);
}
