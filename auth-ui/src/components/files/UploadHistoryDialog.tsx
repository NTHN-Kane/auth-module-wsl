import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import api from "../../api";
import AppSnackbar from "../AppSnackbar";

type FileHistoryRow = {
  id: number;
  fileId: number;
  fileCode: string | null;
  fileDisplayName: string | null;
  action: string;
  performedByUserId: number;
  performedByEmail: string;
  performedByUsername: string;
  performedAt: string;
  note: string | null;
  oldValue: string | null;
  newValue: string | null;
};

type FileHistoryResponse = {
  content: FileHistoryRow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type UploadHistoryDialogProps = {
  open: boolean;
  onClose: () => void;
};

function getActionLabel(action?: string | null) {
  switch (action) {
    case "UPLOAD":
      return "Upload";
    case "UPDATE_META":
      return "Cập nhật";
    case "DELETE":
      return "Xóa file";
    case "DOWNLOAD":
      return "Tải xuống";
    case "APPROVE":
      return "Duyệt";
    case "REJECT":
      return "Từ chối";
    default:
      return "-";
  }
}

function getActionColor(
  action?: string | null
): "default" | "primary" | "info" | "success" | "warning" | "error" {
  switch (action) {
    case "UPLOAD":
      return "primary";
    case "UPDATE_META":
      return "info";
    case "DOWNLOAD":
      return "info";
    case "APPROVE":
      return "success";
    case "REJECT":
      return "warning";
    case "DELETE":
      return "error";
    default:
      return "default";
  }
}

function getErrorMessage(err: any, fallback: string) {
  const data = err?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  return fallback;
}

const DetailRow: React.FC<{ label: string; value?: string | null }> = ({
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
    <Typography
      variant="body2"
      sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
    >
      {value == null || value === "" ? "-" : String(value)}
    </Typography>
  </Box>
);

const UploadHistoryDialog: React.FC<UploadHistoryDialogProps> = ({
  open,
  onClose,
}) => {
  const [rows, setRows] = useState<FileHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileHistoryRow | null>(null);

  const [openDetail, setOpenDetail] = useState(false);
  const [detailTarget, setDetailTarget] = useState<FileHistoryRow | null>(null);

  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionTarget, setActionTarget] = useState<FileHistoryRow | null>(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info" | "warning",
  });

  const closeSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get<FileHistoryResponse>("/file-histories", {
        params: {
          page: 0,
          size: 500,
        },
      });

      setRows(res.data?.content ?? []);
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: getErrorMessage(err, "Không tải được lịch sử thao tác file"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void fetchHistory();
    }
  }, [open]);

  const visibleRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((row) => {
      return (
        String(row.id).includes(q) ||
        String(row.fileId).includes(q) ||
        (row.fileCode || "").toLowerCase().includes(q) ||
        (row.fileDisplayName || "").toLowerCase().includes(q) ||
        (row.action || "").toLowerCase().includes(q) ||
        (getActionLabel(row.action) || "").toLowerCase().includes(q) ||
        (row.note || "").toLowerCase().includes(q) ||
        (row.oldValue || "").toLowerCase().includes(q) ||
        (row.newValue || "").toLowerCase().includes(q)
      );
    });
  }, [rows, keyword]);

  const handleOpenActionMenu = (
    event: React.MouseEvent<HTMLElement>,
    row: FileHistoryRow
  ) => {
    setActionMenuAnchor(event.currentTarget);
    setActionTarget(row);
  };

  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
    setActionTarget(null);
  };

  const handleOpenDelete = (row: FileHistoryRow) => {
    setDeleteTarget(row);
    setOpenDelete(true);
  };

  const handleOpenDetail = (row: FileHistoryRow) => {
    setDetailTarget(row);
    setOpenDetail(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      await api.delete(`/file-histories/${deleteTarget.id}`);

      setSnackbar({
        open: true,
        severity: "success",
        message: "Xóa bản ghi lịch sử thành công",
      });

      setOpenDelete(false);
      setDeleteTarget(null);
      await fetchHistory();
    } catch (err: any) {
      setSnackbar({
        open: true,
        severity: "error",
        message: getErrorMessage(err, "Xóa bản ghi lịch sử thất bại"),
      });
    }
  };

  const columns: GridColDef<FileHistoryRow>[] = useMemo(
    () => [
      {
        field: "stt",
        headerName: "STT",
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (params) =>
          params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      {
        field: "fileCode",
        headerName: "Mã file",
        width: 150,
        valueGetter: (_value, row) => row.fileCode || `#${row.fileId}`,
      },
      {
        field: "fileDisplayName",
        headerName: "Tên file",
        flex: 1,
        minWidth: 260,
        valueGetter: (_value, row) => row.fileDisplayName || "-",
      },
      {
        field: "performedAt",
        headerName: "Thời gian",
        width: 190,
        valueFormatter: (value) => new Date(String(value)).toLocaleString(),
      },
      {
        field: "note",
        headerName: "Ghi chú",
        flex: 1,
        minWidth: 260,
        valueGetter: (_value, row) => row.note || "-",
      },
      {
        field: "action",
        headerName: "Trạng thái",
        width: 150,
        renderCell: (params) => (
          <Chip
            size="small"
            label={getActionLabel(params.row.action)}
            color={getActionColor(params.row.action)}
            variant="outlined"
          />
        ),
      },
      {
        field: "menu",
        headerName: "",
        width: 80,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Button
            size="small"
            variant="text"
            onClick={(e) => handleOpenActionMenu(e, params.row)}
            sx={{ minWidth: "unset", px: 1 }}
          >
            <MoreVertIcon />
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle>Lịch sử thao tác file</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                Lưu toàn bộ thao tác trên file như upload, cập nhật metadata, tải xuống, duyệt, từ chối, xóa file.
              </Typography>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => void fetchHistory()}
                sx={{ borderRadius: 3 }}
              >
                Làm mới
              </Button>
            </Stack>

            <TextField
              placeholder="Tìm theo mã file, tên file, trạng thái, ghi chú..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void fetchHistory();
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
                sx={{
                  border: "none",
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#f8fafc",
                    fontWeight: 700,
                  },
                }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseActionMenu}
      >
        <MenuItem
          onClick={() => {
            if (actionTarget) {
              handleOpenDetail(actionTarget);
            }
            handleCloseActionMenu();
          }}
        >
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Xem chi tiết" />
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (actionTarget) {
              handleOpenDelete(actionTarget);
            }
            handleCloseActionMenu();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "error.main" }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Xóa" />
        </MenuItem>
      </Menu>

      <Dialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Xóa bản ghi lịch sử</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn chắc chắn muốn xóa bản ghi lịch sử{" "}
            <strong>#{deleteTarget?.id || "-"}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirmDelete()}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Chi tiết bản ghi lịch sử</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <DetailRow label="ID log" value={String(detailTarget?.id ?? "-")} />
            <DetailRow
              label="Mã file"
              value={detailTarget?.fileCode || String(detailTarget?.fileId ?? "-")}
            />
            <DetailRow label="Tên file" value={detailTarget?.fileDisplayName || "-"} />
            <DetailRow label="Trạng thái" value={getActionLabel(detailTarget?.action)} />
            <DetailRow
              label="Thời gian"
              value={
                detailTarget?.performedAt
                  ? new Date(detailTarget.performedAt).toLocaleString()
                  : "-"
              }
            />
            <DetailRow
              label="Người thao tác"
              value={
                detailTarget
                  ? `${detailTarget.performedByUsername} • ${detailTarget.performedByEmail}`
                  : "-"
              }
            />
            <DetailRow label="Ghi chú" value={detailTarget?.note || "-"} />
            <DetailRow label="Giá trị cũ" value={detailTarget?.oldValue || "-"} />
            <DetailRow label="Giá trị mới" value={detailTarget?.newValue || "-"} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetail(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={closeSnackbar}
      />
    </>
  );
};

export default UploadHistoryDialog;