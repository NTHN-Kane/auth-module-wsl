import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import api from "../api";
import AppSnackbar from "../components/AppSnackbar";
import FolderExplorerTree from "../components/files/FolderExplorerTree";
import { getCurrentEmail, isAdmin } from "../utils/auth";
import UploadHistoryDialog from "../components/files/UploadHistoryDialog";
import HistoryIcon from "@mui/icons-material/History";

type FileRow = {
  id: number;
  displayName: string;
  fileType: string;
  originalFilename: string;
  contentType: string | null;
  sizeBytes: number;
  uploadedAt: string;
  uploaderUsername: string;
  uploaderEmail: string;
  folderId: number | null;
  folderName: string | null;
  logicalPath: string | null;
  storagePath: string | null;
};

type FolderItem = {
  id: number;
  name: string;
  parentId: number | null;
  ownerId: number;
  ownerEmail: string;
  logicalPath: string;
  createdAt: string;
};

type AdminOverviewResponse = {
  totalFileCount: number;
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
  files: FileRow[];
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

const fileTypes = ["DOC", "EXCEL", "PPT", "PDF", "IMAGE", "TXT"];

const ALLOWED_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".ppt",
  ".pptx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
]);

function isAllowedUploadFile(file: File | null) {
  if (!file) return false;

  const name = file.name.toLowerCase();
  const dotIndex = name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? name.substring(dotIndex) : "";

  return ALLOWED_EXTENSIONS.has(ext);
}

function extractFilename(contentDisposition?: string, fallback = "downloaded-file") {
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // Ignore decode errors and keep fallback logic below.
    }
  }

  const basicMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (basicMatch?.[1]) return basicMatch[1];

  return fallback;
}

function detectFileType(file: File | null): string {
  if (!file) return "OTHER";

  const filename = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();

  if (filename.endsWith(".doc") || filename.endsWith(".docx")) return "DOC";
  if (filename.endsWith(".xls") || filename.endsWith(".xlsx") || filename.endsWith(".csv"))
    return "EXCEL";
  if (filename.endsWith(".ppt") || filename.endsWith(".pptx")) return "PPT";
  if (filename.endsWith(".pdf")) return "PDF";
  if (
    filename.endsWith(".png") ||
    filename.endsWith(".jpg") ||
    filename.endsWith(".jpeg") ||
    filename.endsWith(".gif") ||
    filename.endsWith(".webp") ||
    mime.startsWith("image/")
  ) {
    return "IMAGE";
  }
  if (filename.endsWith(".txt") || mime.startsWith("text/plain")) return "TXT";

  return "OTHER";
}

function getExplorerTypeLabel(file: FileRow | null) {
  if (!file) return "-";

  switch (file.fileType) {
    case "DOC":
      return "Microsoft Word Document";
    case "EXCEL":
      return "Microsoft Excel Worksheet";
    case "PPT":
      return "Microsoft PowerPoint Presentation";
    case "PDF":
      return "PDF Document";
    case "IMAGE":
      return "Image File";
    case "ZIP":
      return "ZIP Archive";
    case "TXT":
      return "Text Document";
    default:
      return file.contentType || "File";
  }
}

function canPreviewFile(file: FileRow | null) {
  if (!file) return false;

  return (
    file.fileType === "PDF" ||
    file.fileType === "IMAGE" ||
    file.fileType === "TXT" ||
    file.fileType === "DOC" ||
    file.fileType === "EXCEL" ||
    file.fileType === "PPT" ||
    (file.contentType != null &&
      (file.contentType.startsWith("image/") ||
        file.contentType.includes("pdf") ||
        file.contentType.startsWith("text/") ||
        file.contentType.includes("word") ||
        file.contentType.includes("excel") ||
        file.contentType.includes("powerpoint")))
  );
}

const FilePropertiesRow: React.FC<{ label: string; value?: string | number | null }> = ({
  label,
  value,
}) => {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "140px 1fr" },
        gap: 1.5,
        alignItems: "start",
        py: 1.25,
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>

      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {value == null || value === "" ? "-" : String(value)}
      </Typography>
    </Box>
  );
};

const Files: React.FC = () => {
  const admin = isAdmin();
  const currentEmail = getCurrentEmail();

  const [rows, setRows] = useState<FileRow[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [selectedFolderId, setSelectedFolderId] = useState("ALL");

  const [openCreateFolder, setOpenCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [openEditFolder, setOpenEditFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  const [openDeleteFolder, setOpenDeleteFolder] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<FolderItem | null>(null);

  const [openUpload, setOpenUpload] = useState(false);
  const [uploadDisplayName, setUploadDisplayName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editType, setEditType] = useState("DOC");

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [openDetail, setOpenDetail] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRow | null>(null);

  const [adminTotalFileCount, setAdminTotalFileCount] = useState<number | null>(null);
  const [openHistory, setOpenHistory] = useState(false);

  const [fileContextMenu, setFileContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    row: FileRow | null;
  } | null>(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info" | "warning",
  });

  const closeSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  const visibleRows = useMemo(() => {
    if (selectedFolderId === "SYSTEM") {
      return rows;
    }

    if (selectedFolderId === "ALL") {
      return rows.filter((row) => row.uploaderEmail === currentEmail);
    }

    return rows.filter((row) => String(row.folderId ?? "") === selectedFolderId);
  }, [rows, selectedFolderId, currentEmail]);

  const fetchFolders = async () => {
    try {
      const res = await api.get<FolderItem[]>("/files/folders");
      setFolders(res.data ?? []);
    } catch {
      // Keep file module usable even if folder list fails.
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      if (admin) {
        const res = await api.get<AdminOverviewResponse>("/files/admin/overview", {
          params: { q: keyword || undefined, page: 0, size: 500 },
        });

        setRows(res.data?.files ?? []);
        setAdminTotalFileCount(res.data?.totalFileCount ?? 0);
      } else {
        const res = await api.get("/files", {
          params: { q: keyword || undefined, page: 0, size: 500 },
        });
        setRows(res.data?.content ?? []);
        setAdminTotalFileCount(null);
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.response?.data || "Không tải được danh sách file",
      });
    } finally {
      setLoading(false);
    }
  };

  const reloadData = async () => {
    await Promise.all([fetchFiles(), fetchFolders()]);
  };

  useEffect(() => {
    void reloadData();
  }, []);

  useEffect(() => {
    if (selectedFolderId === "ALL" || selectedFolderId === "SYSTEM") {
      return;
    }

    const exists = folders.some((folder) => String(folder.id) === selectedFolderId);
    if (!exists) {
      setSelectedFolderId("ALL");
    }
  }, [folders, selectedFolderId]);

  const handleOpenDetail = (row: FileRow) => {
    setSelectedFile(row);
    setOpenDetail(true);
  };

  const handleDownload = async (row: FileRow) => {
    try {
      const res = await api.get(`/files/${row.id}/download`, {
        responseType: "blob",
      });

      const extension = row.originalFilename?.match(/\.[^/.]+$/)?.[0] || "";
      const fallbackName = row.displayName
        ? row.displayName.includes(".")
          ? row.displayName
          : `${row.displayName}${extension}`
        : `file-${row.id}${extension}`;

      const filename = extractFilename(res.headers["content-disposition"], fallbackName);

      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || row.contentType || "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.response?.data || "Tải file thất bại",
      });
    }
  };

  const handlePreview = async (row: FileRow) => {
    if (!canPreviewFile(row)) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "File này hiện chưa hỗ trợ xem trước trực tiếp",
      });
      return;
    }

    try {
      const res = await api.get(`/files/${row.id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || row.contentType || "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.response?.data || "Xem trước file thất bại",
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Nhập tên thư mục",
      });
      return;
    }

    try {
      const payload = {
        name: newFolderName.trim(),
        parentId:
          selectedFolderId !== "ALL" && selectedFolderId !== "SYSTEM"
            ? Number(selectedFolderId)
            : null,
      };

      const res = await api.post<FolderItem>("/files/folders", payload);

      setSnackbar({
        open: true,
        severity: "success",
        message: "Tạo thư mục thành công",
      });

      const createdFolder = res.data;

      setOpenCreateFolder(false);
      setNewFolderName("");

      await reloadData();

      if (createdFolder?.id != null) {
        setSelectedFolderId(String(createdFolder.id));
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.response?.data || "Tạo thư mục thất bại",
      });
    }
  };

  const handleOpenEditFolder = (folder: FolderItem) => {
    setEditingFolder(folder);
    setEditFolderName(folder.name);
    setOpenEditFolder(true);
  };

  const handleOpenDeleteFolder = (folder: FolderItem) => {
    setDeletingFolder(folder);
    setOpenDeleteFolder(true);
  };

  const handleSaveEditFolder = async () => {
    if (!editingFolder?.id) return;

    if (!editFolderName.trim()) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Nhập tên thư mục",
      });
      return;
    }

    try {
      await api.put(`/files/folders/${editingFolder.id}`, {
        name: editFolderName.trim(),
      });

      setSnackbar({
        open: true,
        severity: "success",
        message: "Cập nhật thư mục thành công",
      });

      setOpenEditFolder(false);
      setEditingFolder(null);
      setEditFolderName("");

      await reloadData();
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.response?.data || "Cập nhật thư mục thất bại",
      });
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deletingFolder?.id) return;

    try {
      await api.delete(`/files/folders/${deletingFolder.id}`);

      setSnackbar({
        open: true,
        severity: "success",
        message: "Xóa thư mục thành công",
      });

      if (selectedFolderId === String(deletingFolder.id)) {
        setSelectedFolderId("ALL");
      }

      setOpenDeleteFolder(false);
      setDeletingFolder(null);

      await reloadData();
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.response?.data || "Xóa thư mục thất bại",
      });
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Chọn file trước khi upload",
      });
      return;
    }

    if (!uploadDisplayName.trim()) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Nhập tên file (displayName)",
      });
      return;
    }

    if (!isAllowedUploadFile(uploadFile)) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "File không nằm trong danh sách định dạng được phép",
      });
      return;
    }

    const detectedType = detectFileType(uploadFile);

    if (detectedType === "OTHER") {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Không xác định được loại file hợp lệ để upload",
      });
      return;
    }

    const form = new FormData();
    form.append("displayName", uploadDisplayName.trim());
    form.append("fileType", detectedType);

    if (selectedFolderId !== "ALL" && selectedFolderId !== "SYSTEM") {
      form.append("folderId", selectedFolderId);
    }

    form.append("file", uploadFile);

    try {
      await api.post("/files", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSnackbar({
        open: true,
        severity: "success",
        message: "Upload file thành công",
      });

      setOpenUpload(false);
      setUploadDisplayName("");
      setUploadFile(null);
      await reloadData();
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.response?.data || "Upload file thất bại",
      });
    }
  };

  const handleOpenEdit = (row: FileRow) => {
    setEditId(row.id);
    setEditDisplayName(row.displayName);
    setEditType(row.fileType);
    setOpenEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editId) return;

    try {
      await api.put(`/files/${editId}`, {
        displayName: editDisplayName,
        fileType: editType,
      });

      setSnackbar({
        open: true,
        severity: "success",
        message: "Cập nhật file thành công",
      });

      setOpenEdit(false);
      setEditId(null);
      setEditDisplayName("");
      setEditType("DOC");
      await reloadData();
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.response?.data || "Cập nhật file thất bại",
      });
    }
  };

  const handleOpenDelete = (row: FileRow) => {
    setDeleteId(row.id);
    setOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/files/${deleteId}`);

      setSnackbar({
        open: true,
        severity: "success",
        message: "Xóa file thành công",
      });

      setOpenDelete(false);
      setDeleteId(null);
      await reloadData();
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.response?.data || "Xóa file thất bại",
      });
    }
  };

  const handleOpenFileContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    rowId: number
  ) => {
    event.preventDefault();

    const row = visibleRows.find((item) => String(item.id) === String(rowId));
    if (!row) return;

    setFileContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      row,
    });
  };

  const handleCloseFileContextMenu = () => {
    setFileContextMenu(null);
  };

  const columns: GridColDef<FileRow>[] = useMemo(
    () => [
      {
        field: "stt",
        headerName: "STT",
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      { field: "displayName", headerName: "Tên file", flex: 1, minWidth: 220 },
      {
        field: "sizeBytes",
        headerName: "Dung lượng",
        width: 130,
        valueFormatter: (value) => formatBytes(Number(value)),
      },
      {
        field: "uploadedAt",
        headerName: "Ngày upload",
        width: 190,
        valueFormatter: (value) => new Date(String(value)).toLocaleString(),
      },
      ...(admin
        ? [
            {
              field: "uploader",
              headerName: "Owner",
              flex: 1,
              minWidth: 240,
              valueGetter: (_value: any, row: FileRow) =>
                `${row.uploaderUsername} • ${row.uploaderEmail}`,
            } satisfies GridColDef<FileRow>,
          ]
        : []),
    ],
    [admin]
  );

  return (
    <>
      <Stack spacing={3}>
        <Card elevation={0} sx={{ borderRadius: 5, border: "1px solid #e2e8f0" }}>
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h5">File Management</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tìm kiếm file theo kiểu explorer với thông tin thư mục và đường dẫn logic.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                {admin && (
                  <Chip
                    color="secondary"
                    variant="outlined"
                    label={`Tổng file hệ thống: ${adminTotalFileCount ?? 0}`}
                  />
                )}
                <Chip variant="outlined" label={`Kết quả hiển thị: ${visibleRows.length}`} />

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={reloadData}
                  sx={{ borderRadius: 3 }}
                >
                  Làm mới
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => setOpenHistory(true)}
                  sx={{ borderRadius: 3 }}
                >
                  Lịch sử
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<CreateNewFolderIcon />}
                  onClick={() => setOpenCreateFolder(true)}
                  sx={{ borderRadius: 3 }}
                >
                  Tạo thư mục
                </Button>

                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={() => setOpenUpload(true)}
                  sx={{ borderRadius: 3 }}
                >
                  Upload
                </Button>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FolderOpenIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight={600}>
                          Thư mục
                        </Typography>
                      </Stack>

                      <FolderExplorerTree
                        folders={folders}
                        rows={rows.map((r) => ({ id: r.id, folderId: r.folderId }))}
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={setSelectedFolderId}
                        onEditFolder={handleOpenEditFolder}
                        onDeleteFolder={handleOpenDeleteFolder}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 9 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack spacing={2}>
                      <TextField
                        placeholder="Tìm kiếm theo tên file..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            void fetchFiles();
                          }
                        }}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Box sx={{ width: "100%" }}>
                        <DataGrid
                          rows={visibleRows}
                          columns={columns}
                          loading={loading}
                          autoHeight
                          pageSizeOptions={[5, 10, 20, 50]}
                          initialState={{
                            pagination: {
                              paginationModel: {
                                pageSize,
                                page: 0,
                              },
                            },
                          }}
                          onPaginationModelChange={(model) => {
                            setPageSize(model.pageSize);
                          }}
                          disableRowSelectionOnClick
                          onRowDoubleClick={(params) => handleOpenDetail(params.row)}
                          slotProps={{
                            row: {
                              onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => {
                                const rowId = event.currentTarget.getAttribute("data-id");
                                if (!rowId) return;
                                handleOpenFileContextMenu(event, Number(rowId));
                              },
                            },
                          }}
                          sx={{
                            border: "none",
                            "& .MuiDataGrid-columnHeaders": {
                              backgroundColor: "#f8fafc",
                              fontWeight: 700,
                            },
                            "& .MuiDataGrid-row": {
                              cursor: "context-menu",
                            },
                          }}
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={openCreateFolder} onClose={() => setOpenCreateFolder(false)} fullWidth maxWidth="xs">
        <DialogTitle>Tạo thư mục</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên thư mục"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateFolder(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateFolder}>
            Tạo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditFolder} onClose={() => setOpenEditFolder(false)} fullWidth maxWidth="xs">
        <DialogTitle>Đổi tên thư mục</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên thư mục"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenEditFolder(false);
              setEditingFolder(null);
              setEditFolderName("");
            }}
          >
            Hủy
          </Button>
          <Button variant="contained" onClick={handleSaveEditFolder}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteFolder}
        onClose={() => {
          setOpenDeleteFolder(false);
          setDeletingFolder(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Xóa thư mục</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn chắc chắn muốn xóa thư mục <strong>{deletingFolder?.name || "-"}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenDeleteFolder(false);
              setDeletingFolder(null);
            }}
          >
            Hủy
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeleteFolder}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} fullWidth maxWidth="sm">
        <DialogTitle>Upload file</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên file (displayName)"
              value={uploadDisplayName}
              onChange={(e) => setUploadDisplayName(e.target.value)}
              fullWidth
            />

            <Button variant="outlined" component="label" sx={{ borderRadius: 3 }}>
              Chọn file
              <input
                hidden
                type="file"
                accept={ALLOWED_ACCEPT}
                onClick={(e) => {
                  (e.currentTarget as HTMLInputElement).value = "";
                }}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;

                  if (!file) {
                    setUploadFile(null);
                    return;
                  }

                  if (!isAllowedUploadFile(file)) {
                    setUploadFile(null);
                    setSnackbar({
                      open: true,
                      severity: "warning",
                      message:
                        "Chỉ được chọn file: PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, TXT, PNG, JPG, JPEG, GIF, WEBP",
                    });
                    return;
                  }

                  setUploadFile(file);

                  if (!uploadDisplayName.trim()) {
                    const rawName = file.name.replace(/\.[^/.]+$/, "");
                    setUploadDisplayName(rawName);
                  }
                }}
              />
            </Button>

            <Typography variant="body2" color="text.secondary">
              File đã chọn: {uploadFile ? uploadFile.name : "(chưa chọn)"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Định dạng nhận diện: {uploadFile ? detectFileType(uploadFile) : "(chưa có)"}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpload(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleUpload}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa thông tin file</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên file (displayName)"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Định dạng (fileType)</InputLabel>
              <Select
                label="Định dạng (fileType)"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
              >
                {fileTypes.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="caption" color="text.secondary">
              * Chỉ sửa metadata, không thay file vật lý.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} fullWidth maxWidth="xs">
        <DialogTitle>Xóa file</DialogTitle>
        <DialogContent>
          <Typography>Bạn chắc chắn muốn xóa file này?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Hủy</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} fullWidth maxWidth="sm">
        <DialogTitle>Thông tin chi tiết file</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <FilePropertiesRow label="Tên file hiển thị" value={selectedFile?.displayName || "-"} />
            <FilePropertiesRow label="Tên file gốc" value={selectedFile?.originalFilename || "-"} />
            <FilePropertiesRow label="Loại file" value={getExplorerTypeLabel(selectedFile)} />
            <FilePropertiesRow label="Định dạng hệ thống" value={selectedFile?.fileType || "-"} />
            <FilePropertiesRow
              label="Vị trí thư mục"
              value={
                selectedFile?.folderName === "ROOT"
                  ? "Hệ thống"
                  : selectedFile?.folderName || "Hệ thống"
              }
            />
            <FilePropertiesRow label="Đường dẫn logic" value={selectedFile?.logicalPath || "/"} />
            <FilePropertiesRow
              label="Dung lượng"
              value={selectedFile ? formatBytes(selectedFile.sizeBytes) : "-"}
            />
            <FilePropertiesRow
              label="Ngày tạo upload"
              value={selectedFile?.uploadedAt ? new Date(selectedFile.uploadedAt).toLocaleString() : "-"}
            />
            <FilePropertiesRow
              label="Owner"
              value={
                selectedFile
                  ? `${selectedFile.uploaderUsername} • ${selectedFile.uploaderEmail}`
                  : "-"
              }
            />

            {admin && (
              <FilePropertiesRow
                label="Storage reference"
                value={selectedFile?.storagePath || "(không có)"}
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              if (selectedFile) {
                void handlePreview(selectedFile);
              }
            }}
            disabled={!canPreviewFile(selectedFile)}
          >
            Xem trước
          </Button>
          <Button onClick={() => setOpenDetail(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Menu
        open={!!fileContextMenu}
        onClose={handleCloseFileContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          fileContextMenu
            ? { top: fileContextMenu.mouseY, left: fileContextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          elevation: 6,
          sx: {
            minWidth: 240,
            borderRadius: 2,
            mt: 0.5,
            boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
            "& .MuiMenuItem-root": {
              py: 1.1,
              px: 1.5,
            },
            "& .MuiListItemIcon-root": {
              minWidth: 36,
              color: "text.secondary",
            },
            "& .MuiMenuItem-root:hover": {
              backgroundColor: "#f1f3f4",
            },
          },
        }}
      >
        <MenuItem
          disabled={!canPreviewFile(fileContextMenu?.row ?? null)}
          onClick={() => {
            if (fileContextMenu?.row) {
              void handlePreview(fileContextMenu.row);
            }
            handleCloseFileContextMenu();
          }}
        >
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Xem trước" />
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (fileContextMenu?.row) {
              void handleDownload(fileContextMenu.row);
            }
            handleCloseFileContextMenu();
          }}
        >
          <ListItemIcon>
            <DownloadOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Tải xuống" />
        </MenuItem>

        {(admin || currentEmail === fileContextMenu?.row?.uploaderEmail) && (
          <MenuItem
            onClick={() => {
              if (fileContextMenu?.row) {
                handleOpenEdit(fileContextMenu.row);
              }
              handleCloseFileContextMenu();
            }}
          >
            <ListItemIcon>
              <DriveFileRenameOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Đổi tên" />
          </MenuItem>
        )}

        {(admin || currentEmail === fileContextMenu?.row?.uploaderEmail) && (
          <Box sx={{ my: 0.5, borderTop: "1px solid #e5e7eb" }} />
        )}

        {(admin || currentEmail === fileContextMenu?.row?.uploaderEmail) && (
          <MenuItem
            onClick={() => {
              if (fileContextMenu?.row) {
                handleOpenDelete(fileContextMenu.row);
              }
              handleCloseFileContextMenu();
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
            <ListItemText primary="Xóa" />
          </MenuItem>
        )}

        <Box sx={{ my: 0.5, borderTop: "1px solid #e5e7eb" }} />

        <MenuItem
          onClick={() => {
            if (fileContextMenu?.row) {
              handleOpenDetail(fileContextMenu.row);
            }
            handleCloseFileContextMenu();
          }}
        >
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Thông tin chi tiết" />
        </MenuItem>
      </Menu>

      <UploadHistoryDialog
        open={openHistory}
        onClose={() => setOpenHistory(false)}
      />

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={closeSnackbar}
      />
    </>
  );
};

export default Files;