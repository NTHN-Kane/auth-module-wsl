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
  InputAdornment,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import PlaylistAddCheckCircleIcon from "@mui/icons-material/PlaylistAddCheckCircle";
import api from "../api";
import AppSnackbar from "../components/AppSnackbar";
import { isAdmin } from "../utils/auth";

type FileRow = {
  id: number;
  displayName: string;
  fileType: string;
  originalFilename: string;
  contentType: string | null;
  sizeBytes: number;
  uploadedAt: string;
  uploaderId: number;
  uploaderUsername: string;
  uploaderEmail: string;
  folderId: number | null;
  folderName: string | null;
  logicalPath: string | null;
  storagePath: string | null;
  fileCode: string | null;
  processStatus: string | null;
  adminNote: string | null;
  visibleInSystem?: boolean | null;
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

function extractFilename(contentDisposition?: string, fallback = "downloaded-file") {
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // ignore
    }
  }

  const basicMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (basicMatch?.[1]) return basicMatch[1];

  return fallback;
}

function getErrorMessage(err: any, fallback: string) {
  const data = err?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  return fallback;
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
    (file.contentType != null &&
      (file.contentType.startsWith("image/") ||
        file.contentType.includes("pdf") ||
        file.contentType.startsWith("text/")))
  );
}

function getStatusLabel(status?: string | null) {
  switch (status) {
    case "CHO_NHAN":
      return "Chờ nhận";
    case "DA_NHAN":
      return "Đã nhận";
    case "DANG_XU_LY":
      return "Đang xử lý";
    case "DA_HOAN_TAT":
      return "Đã hoàn tất";
    case "TU_CHOI":
      return "Từ chối";
    default:
      return "-";
  }
}

function getStatusColor(
  status?: string | null
): "default" | "warning" | "info" | "success" | "error" {
  switch (status) {
    case "CHO_NHAN":
      return "warning";
    case "DA_NHAN":
      return "info";
    case "DANG_XU_LY":
      return "warning";
    case "DA_HOAN_TAT":
      return "success";
    case "TU_CHOI":
      return "error";
    default:
      return "default";
  }
}

const DetailRow: React.FC<{ label: string; value?: string | number | null }> = ({
  label,
  value,
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: "160px 1fr" },
      gap: 1.5,
      py: 1.25,
      borderBottom: "1px solid #e5e7eb",
      alignItems: "start",
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

export default function AdminInputFiles() {
  const admin = isAdmin();

  const [rows, setRows] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [totalFileCount, setTotalFileCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");

  const [openEdit, setOpenEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<FileRow | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editType, setEditType] = useState("DOC");

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileRow | null>(null);

  const [openDetail, setOpenDetail] = useState(false);
  const [detailFile, setDetailFile] = useState<FileRow | null>(null);

  const [openUpdateMeta, setOpenUpdateMeta] = useState(false);
  const [metaTarget, setMetaTarget] = useState<FileRow | null>(null);
  const [metaStatus, setMetaStatus] = useState("DANG_XU_LY");
  const [metaNote, setMetaNote] = useState("");

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

  const closeSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const visibleRows = useMemo(() => {
    let baseRows = rows;

    if (statusFilter) {
      baseRows = baseRows.filter((row) => row.processStatus === statusFilter);
    }

    return baseRows;
  }, [rows, statusFilter]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get<AdminOverviewResponse>("/files/admin/overview", {
        params: { q: keyword || undefined, page: 0, size: 500 },
      });

      setRows(res.data?.files ?? []);
      setTotalFileCount(res.data?.totalFileCount ?? 0);
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: getErrorMessage(err, "Không tải được danh sách file đầu vào"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFiles();
  }, []);

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
        message: getErrorMessage(err, "Tải file thất bại"),
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
        message: getErrorMessage(err, "Xem trước file thất bại"),
      });
    }
  };

  const handleOpenEdit = (row: FileRow) => {
    setEditTarget(row);
    setEditDisplayName(row.displayName);
    setEditType(row.fileType);
    setOpenEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget?.id) return;

    try {
      await api.put(`/files/${editTarget.id}`, {
        displayName: editDisplayName,
        fileType: editType,
      });

      setSnackbar({
        open: true,
        severity: "success",
        message: "Cập nhật file thành công",
      });

      setOpenEdit(false);
      setEditTarget(null);
      setEditDisplayName("");
      setEditType("DOC");
      await fetchFiles();
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: getErrorMessage(err, "Cập nhật file thất bại"),
      });
    }
  };

  const handleOpenDelete = (row: FileRow) => {
    setDeleteTarget(row);
    setOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      await api.delete(`/files/${deleteTarget.id}`);

      setSnackbar({
        open: true,
        severity: "success",
        message: "Xóa file thành công",
      });

      setOpenDelete(false);
      setDeleteTarget(null);
      await fetchFiles();
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: getErrorMessage(err, "Xóa file thất bại"),
      });
    }
  };

  const handleOpenUpdateMeta = (row: FileRow) => {
    setMetaTarget(row);
    setMetaStatus(row.processStatus || "DANG_XU_LY");
    setMetaNote(row.adminNote || "");
    setOpenUpdateMeta(true);
  };

  const handleUpdateMeta = async () => {
    if (!metaTarget?.id) return;

    try {
      await api.put(`/files/admin/${metaTarget.id}/meta`, {
        processStatus: metaStatus,
        adminNote: metaNote,
      });

      setSnackbar({
        open: true,
        severity: "success",
        message: "Cập nhật trạng thái file thành công",
      });

      setOpenUpdateMeta(false);
      setMetaTarget(null);
      await fetchFiles();
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: getErrorMessage(err, "Cập nhật trạng thái thất bại"),
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
      {
        field: "fileCode",
        headerName: "Mã file",
        width: 160,
        valueGetter: (_value, row) => row.fileCode || "-",
      },
      {
        field: "displayName",
        headerName: "Tên tài liệu / file",
        flex: 1,
        minWidth: 220,
      },
      {
        field: "fileType",
        headerName: "Loại file",
        width: 120,
      },
      {
        field: "owner",
        headerName: "Người gửi",
        flex: 1,
        minWidth: 220,
        valueGetter: (_value, row) => `${row.uploaderUsername} • ${row.uploaderEmail}`,
      },
      {
        field: "uploadedAt",
        headerName: "Ngày nhận",
        width: 180,
        valueFormatter: (value) => new Date(String(value)).toLocaleString(),
      },
      {
        field: "processStatus",
        headerName: "Trạng thái",
        width: 160,
        renderCell: (params) => (
          <Chip
            size="small"
            label={getStatusLabel(params.row.processStatus)}
            color={getStatusColor(params.row.processStatus)}
            variant="outlined"
          />
        ),
      },
      {
        field: "systemVisibility",
        headerName: "Lên hệ thống",
        width: 140,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.visibleInSystem ? "Có" : "Chưa"}
            color={params.row.visibleInSystem ? "success" : "default"}
            variant="outlined"
          />
        ),
      },
      {
        field: "sizeBytes",
        headerName: "Dung lượng",
        width: 130,
        valueFormatter: (value) => formatBytes(Number(value)),
      },
      {
        field: "adminNote",
        headerName: "Ghi chú",
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row) => row.adminNote || "-",
      },
    ],
    []
  );

  if (!admin) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700}>
              Không có quyền truy cập
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Trang này chỉ dành cho admin.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Card elevation={0} sx={{ borderRadius: 5, border: "1px solid #e2e8f0" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", md: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <FolderOpenIcon color="primary" />
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      Quản lý file đầu vào
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Trang này chỉ dùng để kiểm duyệt và theo dõi trạng thái file đầu vào.
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`Tổng file hệ thống: ${totalFileCount}`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip label={`Kết quả hiển thị: ${visibleRows.length}`} variant="outlined" />

                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => void fetchFiles()}
                    sx={{ borderRadius: 3 }}
                  >
                    Làm mới
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2.5 }} />

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

                    <FormControl fullWidth>
                      <InputLabel>Trạng thái</InputLabel>
                      <Select
                        label="Trạng thái"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="DA_NHAN">Đã nhận</MenuItem>
                        <MenuItem value="DANG_XU_LY">Đang xử lý</MenuItem>
                        <MenuItem value="DA_HOAN_TAT">Đã hoàn tất</MenuItem>
                        <MenuItem value="TU_CHOI">Từ chối</MenuItem>
                      </Select>
                    </FormControl>

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
                        onRowDoubleClick={(params) => {
                          setDetailFile(params.row);
                          setOpenDetail(true);
                        }}
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
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa thông tin file</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên file"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Loại file</InputLabel>
              <Select
                label="Loại file"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
              >
                <MenuItem value="DOC">DOC</MenuItem>
                <MenuItem value="EXCEL">EXCEL</MenuItem>
                <MenuItem value="PPT">PPT</MenuItem>
                <MenuItem value="PDF">PDF</MenuItem>
                <MenuItem value="IMAGE">IMAGE</MenuItem>
                <MenuItem value="TXT">TXT</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="caption" color="text.secondary">
              * Chỉ sửa metadata, không thay file vật lý.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Hủy</Button>
          <Button variant="contained" onClick={() => void handleSaveEdit()}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} fullWidth maxWidth="xs">
        <DialogTitle>Xóa file</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn chắc chắn muốn xóa file <strong>{deleteTarget?.displayName || "-"}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Hủy</Button>
          <Button variant="contained" color="error" onClick={() => void handleConfirmDelete()}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openUpdateMeta} onClose={() => setOpenUpdateMeta(false)} fullWidth maxWidth="sm">
        <DialogTitle>Cập nhật xử lý file đầu vào</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Mã file"
              value={metaTarget?.fileCode || ""}
              fullWidth
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="Tên tài liệu"
              value={metaTarget?.displayName || ""}
              fullWidth
              InputProps={{ readOnly: true }}
            />

            <TextField
              select
              label="Trạng thái"
              value={metaStatus}
              onChange={(e) => setMetaStatus(e.target.value)}
              fullWidth
            >
              <MenuItem value="DA_NHAN">Đã nhận</MenuItem>
              <MenuItem value="DANG_XU_LY">Đang xử lý</MenuItem>
              <MenuItem value="DA_HOAN_TAT">Đã hoàn tất</MenuItem>
              <MenuItem value="TU_CHOI">Từ chối</MenuItem>
            </TextField>

            <TextField
              label="Ghi chú"
              value={metaNote}
              onChange={(e) => setMetaNote(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpdateMeta(false)}>Hủy</Button>
          <Button variant="contained" onClick={() => void handleUpdateMeta()}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} fullWidth maxWidth="sm">
        <DialogTitle>Thông tin chi tiết file</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <DetailRow label="Mã file" value={detailFile?.fileCode || "-"} />
            <DetailRow label="Tên file hệ thống" value={detailFile?.displayName || "-"} />
            <DetailRow label="Tên file gốc" value={detailFile?.originalFilename || "-"} />
            <DetailRow label="Loại file" value={getExplorerTypeLabel(detailFile)} />
            <DetailRow label="Định dạng hệ thống" value={detailFile?.fileType || "-"} />
            <DetailRow
              label="Trạng thái"
              value={detailFile ? getStatusLabel(detailFile.processStatus) : "-"}
            />
            <DetailRow
              label="Lên hệ thống"
              value={detailFile?.visibleInSystem ? "Có" : "Chưa"}
            />
            <DetailRow label="Ghi chú" value={detailFile?.adminNote || "-"} />
            <DetailRow label="Thư mục" value={detailFile?.folderName || "Hệ thống"} />
            <DetailRow label="Đường dẫn logic" value={detailFile?.logicalPath || "/"} />
            <DetailRow
              label="Dung lượng"
              value={detailFile ? formatBytes(detailFile.sizeBytes) : "-"}
            />
            <DetailRow
              label="Ngày nhận"
              value={detailFile?.uploadedAt ? new Date(detailFile.uploadedAt).toLocaleString() : "-"}
            />
            <DetailRow
              label="Người gửi"
              value={
                detailFile
                  ? `${detailFile.uploaderUsername} • ${detailFile.uploaderEmail}`
                  : "-"
              }
            />
            <DetailRow label="Storage path" value={detailFile?.storagePath || "-"} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (detailFile) {
                void handlePreview(detailFile);
              }
            }}
            disabled={!canPreviewFile(detailFile)}
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
            minWidth: 250,
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

        <MenuItem
          onClick={() => {
            if (fileContextMenu?.row) {
              handleOpenUpdateMeta(fileContextMenu.row);
            }
            handleCloseFileContextMenu();
          }}
        >
          <ListItemIcon>
            <PlaylistAddCheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Cập nhật trạng thái" />
        </MenuItem>

        <Box sx={{ my: 0.5, borderTop: "1px solid #e5e7eb" }} />

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

        <Box sx={{ my: 0.5, borderTop: "1px solid #e5e7eb" }} />

        <MenuItem
          onClick={() => {
            if (fileContextMenu?.row) {
              setDetailFile(fileContextMenu.row);
              setOpenDetail(true);
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

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={closeSnackbar}
      />
    </>
  );
}