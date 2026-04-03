import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Grid,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import api from "../api";
import AppSnackbar from "../components/AppSnackbar";

export default function Register() {
  const [form, setForm] = useState({
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
    role: "USER",
    active: true,
  });

  const [showPassword, setShowPassword] = useState(false); // [ĐÃ THÊM] hiện/ẩn mật khẩu
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  // [GIỮ NGUYÊN] logic cập nhật form
  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // [GIỮ NGUYÊN] logic tạo user
  const handleCreateUser = async () => {
    try {
      setLoading(true);

      await api.post("/auth/admin/users", form);

      setSnackbar({
        open: true,
        message: "Tạo tài khoản thành công",
        severity: "success",
      });

      setForm({
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
        role: "USER",
        active: true,
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.response?.data || "Tạo tài khoản thất bại",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const profileCompletion = useMemo(() => {
    const fields = [
      form.username,
      form.email,
      form.firstName,
      form.lastName,
      form.phone,
      form.dateOfBirth,
      form.gender,
      form.address,
      form.department,
      form.position,
      form.password,
      form.role,
    ];

    const filled = fields.filter((item) => String(item ?? "").trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  const fullNamePreview = `${form.firstName} ${form.lastName}`.trim() || "Chưa có họ tên";

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid #e2e8f0",
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(255,255,255,1) 55%)",
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: "primary.main",
                    color: "#fff",
                    boxShadow: "0 10px 24px rgba(37,99,235,0.22)",
                  }}
                >
                  <PersonAddAlt1Icon />
                </Box>

                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Tạo tài khoản người dùng
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tạo tài khoản nội bộ với thông tin cá nhân, phân quyền và trạng thái hoạt động.
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  icon={<CheckCircleOutlineIcon />}
                  color="primary"
                  variant="outlined"
                  label={`Hoàn thiện biểu mẫu: ${profileCompletion}%`}
                />
                <Chip
                  variant="outlined"
                  label={form.active ? "Tài khoản sẽ được kích hoạt" : "Tài khoản đang tắt"}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Cột trái: Form */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={3}>
              {/* Thông tin tài khoản */}
              <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <BadgeOutlinedIcon color="primary" />
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          Thông tin tài khoản
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Các thông tin dùng để đăng nhập và nhận diện tài khoản trong hệ thống.
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider />

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Username"
                          fullWidth
                          value={form.username}
                          onChange={(e) => handleChange("username", e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Email"
                          fullWidth
                          value={form.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Mật khẩu"
                          type={showPassword ? "text" : "password"}
                          fullWidth
                          value={form.password}
                          onChange={(e) => handleChange("password", e.target.value)}
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    edge="end"
                                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                  >
                                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Role</InputLabel>
                          <Select
                            label="Role"
                            value={form.role}
                            onChange={(e) => handleChange("role", e.target.value)}
                          >
                            <MenuItem value="USER">USER</MenuItem>
                            <MenuItem value="ADMIN">ADMIN</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            p: 2,
                            backgroundColor: form.active ? "rgba(34,197,94,0.04)" : "#fafafa",
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Switch
                                checked={form.active}
                                onChange={(e) => handleChange("active", e.target.checked)}
                              />
                            }
                            label={
                              <Box>
                                <Typography fontWeight={600}>
                                  {form.active
                                    ? "Tài khoản đang active"
                                    : "Tài khoản đang inactive"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Bật để user có thể đăng nhập ngay sau khi được tạo.
                                </Typography>
                              </Box>
                            }
                            sx={{ alignItems: "flex-start", m: 0 }}
                          />
                        </Paper>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>

              {/* Thông tin cá nhân */}
              <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <AccountCircleOutlinedIcon color="primary" />
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          Thông tin cá nhân
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Hồ sơ cơ bản của user để quản lý nội bộ và tra cứu thuận tiện hơn.
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider />

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Họ"
                          fullWidth
                          value={form.firstName}
                          onChange={(e) => handleChange("firstName", e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Tên"
                          fullWidth
                          value={form.lastName}
                          onChange={(e) => handleChange("lastName", e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Số điện thoại"
                          fullWidth
                          value={form.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Ngày sinh"
                          type="date"
                          fullWidth
                          value={form.dateOfBirth}
                          onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Giới tính</InputLabel>
                          <Select
                            label="Giới tính"
                            value={form.gender}
                            onChange={(e) => handleChange("gender", e.target.value)}
                          >
                            <MenuItem value="">Chưa chọn</MenuItem>
                            <MenuItem value="MALE">Nam</MenuItem>
                            <MenuItem value="FEMALE">Nữ</MenuItem>
                            <MenuItem value="OTHER">Khác</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Phòng ban"
                          fullWidth
                          value={form.department}
                          onChange={(e) => handleChange("department", e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Chức vụ"
                          fullWidth
                          value={form.position}
                          onChange={(e) => handleChange("position", e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Địa chỉ"
                          fullWidth
                          value={form.address}
                          onChange={(e) => handleChange("address", e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>

              {/* Action bar */}
              <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <Box>
                      <Typography fontWeight={700}>Sẵn sàng tạo tài khoản</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Kiểm tra lại thông tin trước khi lưu vào hệ thống.
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.5}>
                      <Button
                        variant="outlined"
                        onClick={() =>
                          setForm({
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
                            role: "USER",
                            active: true,
                          })
                        }
                        disabled={loading}
                      >
                        Làm trống
                      </Button>

                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleCreateUser}
                        disabled={loading}
                        sx={{
                          minWidth: 180,
                          borderRadius: 3,
                          boxShadow: "0 10px 24px rgba(37,99,235,0.22)",
                        }}
                      >
                        {loading ? "Đang tạo..." : "Tạo tài khoản"}
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Cột phải: Preview / hướng dẫn */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={3} sx={{ position: { lg: "sticky" }, top: { lg: 24 } }}>
              <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <AdminPanelSettingsOutlinedIcon color="primary" />
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          Xem nhanh tài khoản
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Bản xem trước thông tin sẽ được tạo.
                        </Typography>
                      </Box>
                    </Stack>

                    <Paper
                      variant="outlined"
                      sx={{
                        borderRadius: 4,
                        p: 2.5,
                        background:
                          "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(255,255,255,1) 100%)",
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Typography variant="overline" color="text.secondary">
                          USER PREVIEW
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          {fullNamePreview}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {form.email || "Chưa có email"}
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 1 }}>
                          <Chip size="small" label={form.role || "USER"} color="primary" />
                          <Chip
                            size="small"
                            label={form.active ? "Active" : "Inactive"}
                            color={form.active ? "success" : "default"}
                          />
                          <Chip
                            size="small"
                            variant="outlined"
                            label={form.department || "Chưa có phòng ban"}
                          />
                        </Stack>
                      </Stack>
                    </Paper>

                    <Stack spacing={1.5}>
                      <Typography fontWeight={700}>Gợi ý nhập liệu</Typography>

                      <Alert severity="info" sx={{ borderRadius: 3 }}>
                        Username và email nên là duy nhất để tránh trùng tài khoản.
                      </Alert>

                      <Alert severity="warning" sx={{ borderRadius: 3 }}>
                        Chỉ nên cấp role ADMIN cho các tài khoản quản trị thật sự cần thiết.
                      </Alert>

                      <Alert severity="success" sx={{ borderRadius: 3 }}>
                        Có thể để active ngay nếu user được phép đăng nhập sau khi tạo.
                      </Alert>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Stack>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}