import React, { useEffect, useMemo, useState } from "react";
import { Box, Menu, MenuItem, Typography } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

type FolderItem = {
  id: number;
  name: string;
  parentId: number | null;
  ownerId: number;
  ownerEmail: string;
  logicalPath: string;
  createdAt: string;
};

type FileRow = {
  id: number;
  folderId: number | null;
};

type TreeNode = {
  id: string;
  name: string;
  folder: FolderItem;
  children: TreeNode[];
};

type Props = {
  folders: FolderItem[];
  rows: FileRow[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onEditFolder: (folder: FolderItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
};

// [ĐÃ SỬA] bỏ folder ROOT khỏi tree vì "Thư mục của tôi" đã đóng vai trò xem tổng quát
function buildFolderTree(folders: FolderItem[]): TreeNode[] {
  const visibleFolders = folders.filter((folder) => folder.name !== "ROOT");
  const map = new Map<number, TreeNode>();

  visibleFolders.forEach((folder) => {
    map.set(folder.id, {
      id: String(folder.id),
      name: folder.name,
      folder,
      children: [],
    });
  });

  const roots: TreeNode[] = [];

  visibleFolders.forEach((folder) => {
    const node = map.get(folder.id)!;

    if (folder.parentId != null && map.has(folder.parentId)) {
      map.get(folder.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

const FolderExplorerTree: React.FC<Props> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
}) => {
  const treeData = useMemo(() => buildFolderTree(folders), [folders]);

  // [ĐÃ GIỮ] quản lý trạng thái mở/đóng thư mục
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // [ĐÃ THÊM] state menu chuột phải cho thư mục
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    folder: FolderItem | null;
  } | null>(null);

  // [ĐÃ SỬA] chỉ giữ expanded cho các folder còn tồn tại, không auto xổ hết như trước
  useEffect(() => {
    setExpandedItems((prev) => {
      const validIds = new Set(treeData.map((node) => node.id));

      const collectValidChildIds = (nodes: TreeNode[], acc: Set<string>) => {
        nodes.forEach((node) => {
          acc.add(node.id);
          if (node.children.length > 0) {
            collectValidChildIds(node.children, acc);
          }
        });
      };

      const allValidIds = new Set<string>();
      collectValidChildIds(treeData, allValidIds);

      return prev.filter((id) => validIds.has(id) || allValidIds.has(id));
    });
  }, [treeData]);

  const handleSelectAll = () => {
    onSelectFolder("ALL");
  };

  // [ĐÃ THÊM] chuột phải vào folder thì mở menu sửa/xóa
  const handleOpenContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    folder: FolderItem
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      folder,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // [ĐÃ SỬA] logic click:
  // - click lần 1 vào folder chưa chọn => chọn + nếu có con thì mở ra
  // - click lần 2 vào chính folder đang chọn => nếu đang mở thì thu lại, nếu đang đóng thì mở ra
  // áp dụng cho mọi cấp
  const handleFolderClick = (node: TreeNode) => {
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedItems.includes(node.id);

    onSelectFolder(node.id);

    if (!hasChildren) {
      return;
    }

    // [ĐÃ SỬA] lần 1: nếu chưa chọn thì chỉ mở ra, không thu
    if (!isSelected) {
      if (!isExpanded) {
        setExpandedItems((prev) => Array.from(new Set([...prev, node.id])));
      }
      return;
    }

    // [ĐÃ SỬA] lần 2 trên cùng folder: toggle mở/thu
    if (isExpanded) {
      setExpandedItems((prev) => prev.filter((id) => id !== node.id));
    } else {
      setExpandedItems((prev) => Array.from(new Set([...prev, node.id])));
    }
  };

  const renderTree = (nodes: TreeNode[]) =>
    nodes.map((node) => {
      const isSelected = selectedFolderId === node.id;

      return (
        <TreeItem
          key={node.id}
          itemId={node.id}
          label={
            <Box
              onClick={(e) => {
                e.stopPropagation();
                handleFolderClick(node);
              }}
              onContextMenu={(e) => handleOpenContextMenu(e, node.folder)}
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                pr: 1,
                cursor: "pointer",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                {/* [ĐÃ SỬA] đổi icon folder sang màu vàng */}
                <FolderIcon fontSize="small" sx={{ color: "#f4b400" }} />
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ fontWeight: isSelected ? 600 : 400 }}
                >
                  {node.name}
                </Typography>
              </Box>
            </Box>
          }
        >
          {node.children.length > 0 ? renderTree(node.children) : null}
        </TreeItem>
      );
    });

  return (
    <Box>
      <Box
        onClick={() => onSelectFolder("SYSTEM")}
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 2,
          cursor: "pointer",
          mb: 1,
          backgroundColor: selectedFolderId === "SYSTEM" ? "#1976d2" : "transparent",
          color: selectedFolderId === "SYSTEM" ? "#fff" : "inherit",
          "&:hover": {
            backgroundColor:
              selectedFolderId === "SYSTEM" ? "#1565c0" : "rgba(0,0,0,0.04)",
          },
        }}
      >
        <Typography variant="body2">🌐 Hệ thống</Typography>
      </Box>

      <Box
        onClick={handleSelectAll}
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 2,
          cursor: "pointer",
          mb: 1,
          backgroundColor: selectedFolderId === "ALL" ? "#1976d2" : "transparent",
          color: selectedFolderId === "ALL" ? "#fff" : "inherit",
          "&:hover": {
            backgroundColor:
              selectedFolderId === "ALL" ? "#1565c0" : "rgba(0,0,0,0.04)",
          },
        }}
      >
        <Typography variant="body2">📁 Thư mục của tôi</Typography>
      </Box>

      <SimpleTreeView
        selectedItems={
          selectedFolderId === "ALL" || selectedFolderId === "SYSTEM"
            ? null
            : selectedFolderId
        }
        expandedItems={expandedItems}
        onSelectedItemsChange={(_event, itemId) => {
          if (!itemId) return;
          onSelectFolder(String(itemId));
        }}
        onExpandedItemsChange={(_event, itemIds) => {
          // [ĐÃ GIỮ] vẫn cho click mũi tên expand/collapse bình thường
          const nextItems = Array.isArray(itemIds) ? itemIds.map(String) : [];
          setExpandedItems(nextItems);
        }}
        slots={{
          expandIcon: ChevronRightIcon,
          collapseIcon: ExpandMoreIcon,
        }}
        sx={{
          "& .MuiTreeItem-content": {
            borderRadius: 2,
            px: 1,
            py: 0.5,
            mr: 0.5,
          },
          "& .MuiTreeItem-content.Mui-selected": {
            backgroundColor: "#1976d2 !important",
            color: "#fff",
          },
          "& .MuiTreeItem-content:hover": {
            backgroundColor: "rgba(0,0,0,0.04)",
          },
          "& .MuiTreeItem-groupTransition": {
            marginLeft: 0.75,
            paddingLeft: 0.75,
            borderLeft: "1px solid #e2e8f0",
          },
        }}
      >
        {renderTree(treeData)}
      </SimpleTreeView>

      {/* [ĐÃ THÊM] menu chuột phải thay cho nút sửa/xóa hiện trực tiếp */}
      <Menu
        open={!!contextMenu}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          elevation: 6,
          sx: {
            minWidth: 220,
            borderRadius: 2,
            mt: 0.5,
            boxShadow: "0 8px 24px rgba(0,0,0,0.16)",

            "& .MuiMenuItem-root": {
              py: 1.25,
              px: 1.5,
              borderRadius: 1,
              mx: 0.75,
              my: 0.25,
            },

            "& .MuiListItemIcon-root": {
              minWidth: 36,
            },
          },
        }}
      >
        {/* Đổi tên */}
        <MenuItem
          onClick={() => {
            if (contextMenu?.folder) {
              onEditFolder(contextMenu.folder);
            }
            handleCloseContextMenu();
          }}
        >
          <ListItemIcon>
            <DriveFileRenameOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Đổi tên thư mục" />
        </MenuItem>

        {/* Xóa */}
        <MenuItem
          onClick={() => {
            if (contextMenu?.folder) {
              onDeleteFolder(contextMenu.folder);
            }
            handleCloseContextMenu();
          }}
          sx={{
            color: "error.main",
            "& .MuiListItemIcon-root": {
              color: "error.main",
            },
          }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Xóa thư mục" />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default FolderExplorerTree;