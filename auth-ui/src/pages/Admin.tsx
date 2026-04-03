import { useEffect, useMemo, useState } from "react";
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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Grid,
  Switch,
  Typography,
  FormControlLabel,
  TextField,
  IconButton,
  InputAdornment,
  Divider,
  Paper,
} from "@mui/material";

import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import api from "../api";
import AppSnackbar from "../components/AppSnackbar";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";

type UserItem = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  department?: string;
  position?: string;
  role: "USER" | "ADMIN";
  active: boolean;
};

export default function Admin() {
  const [rows, setRows] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const [roleValue, setRoleValue] = useState<"USER" | "ADMIN">("USER");
  const [activeValue, setActiveValue] = useState(true);

  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    department: "",
    position: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // ================= FETCH =================
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/admin/users");
      setRows(res.data);
    } catch {
      setSnackbar({
        open: true,
        message: "Không tải được danh sách user",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ================= OPEN EDIT =================
  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setRoleValue(user.role);
    setActiveValue(user.active);

    setEditForm({
      username: user.username || "",
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "",
      address: user.address || "",
      department: user.department || "",
      position: user.position || "",
      password: "",
    });

    setOpenDialog(true);
  };

  const handleCloseEdit = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setShowPassword(false);
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  // ================= SAVE =================
  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      await api.put(`/auth/admin/users/${selectedUser.id}`, {
        ...editForm,
        role: roleValue,
        active: activeValue,
      });

      setSnackbar({
        open: true,
        message: "Cập nhật thành công",
        severity: "success",
      });

      handleCloseEdit();
      fetchUsers();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.response?.data || "Cập nhật thất bại",
        severity: "error",
      });
    }
  };

  // ================= COLUMNS =================
  const columns: GridColDef[] = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 80 },
      { field: "username", headerName: "Username", width: 150 },
      { field: "email", headerName: "Email", width: 200 },
      {
        field: "role",
        headerName: "Role",
        width: 120,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={params.value === "ADMIN" ? "error" : "default"}
            size="small"
          />
        ),
      },
      {
        field: "active",
        headerName: "Trạng thái",
        width: 140,
        renderCell: (params) => (
          <Chip
            label={params.value ? "Active" : "Inactive"}
            color={params.value ? "success" : "default"}
            size="small"
          />
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 100,
        renderCell: (params) => (
          <IconButton onClick={() => handleOpenEdit(params.row)}>
            <EditIcon />
          </IconButton>
        ),
      },
    ],
    []
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* HEADER */}
        <Card sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <AdminPanelSettingsIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Quản lý tài khoản
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Xem và chỉnh sửa thông tin người dùng trong hệ thống
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
          <CardContent>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              autoHeight
              pageSizeOptions={[5, 10, 20]}
            />
          </CardContent>
        </Card>
      </Stack>

      {/* ================= DIALOG ================= */}
      <Dialog open={openDialog} onClose={handleCloseEdit} fullWidth maxWidth="lg">
        <DialogTitle sx={{ fontWeight: 700 }}>Cập nhật user</DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            {/* SECTION 1 */}
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography fontWeight={700}>Thông tin tài khoản</Typography>
              <Divider sx={{ my: 1 }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Username" fullWidth value={editForm.username} onChange={(e) => handleEditFormChange("username", e.target.value)} />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Email" fullWidth value={editForm.email} onChange={(e) => handleEditFormChange("email", e.target.value)} />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Mật khẩu mới"
                    type={showPassword ? "text" : "password"}
                    fullWidth
                    value={editForm.password}
                    onChange={(e) => handleEditFormChange("password", e.target.value)}
                    helperText="Để trống nếu không đổi"
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword((p) => !p)}>
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* SECTION 2 */}
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography fontWeight={700}>Thông tin cá nhân</Typography>
              <Divider sx={{ my: 1 }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Họ" fullWidth value={editForm.firstName} onChange={(e) => handleEditFormChange("firstName", e.target.value)} />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Tên" fullWidth value={editForm.lastName} onChange={(e) => handleEditFormChange("lastName", e.target.value)} />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="SĐT" fullWidth value={editForm.phone} onChange={(e) => handleEditFormChange("phone", e.target.value)} />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField type="date" label="Ngày sinh" fullWidth value={editForm.dateOfBirth} onChange={(e) => handleEditFormChange("dateOfBirth", e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField label="Địa chỉ" fullWidth value={editForm.address} onChange={(e) => handleEditFormChange("address", e.target.value)} />
                </Grid>
              </Grid>
            </Paper>

            {/* SECTION 3 */}
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography fontWeight={700}>Phân quyền & trạng thái</Typography>
              <Divider sx={{ my: 1 }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select value={roleValue} label="Role" onChange={(e) => setRoleValue(e.target.value as any)}>
                      <MenuItem value="USER">USER</MenuItem>
                      <MenuItem value="ADMIN">ADMIN</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={<Switch checked={activeValue} onChange={(e) => setActiveValue(e.target.checked)} />}
                    label={activeValue ? "Active" : "Inactive"}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEdit}>Hủy</Button>
          <Button variant="contained" onClick={handleSave}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </Box>
  );
}