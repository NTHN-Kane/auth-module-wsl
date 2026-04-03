// [FILE: Login.tsx]

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility"; // [ĐÃ THÊM] icon hiện mật khẩu
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"; // [ĐÃ THÊM] icon ẩn mật khẩu
import api from "../api";
import AppSnackbar from "../components/AppSnackbar";
import { isAdmin } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // [ĐÃ THÊM] trạng thái hiện/ẩn mật khẩu

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  // [GIỮ NGUYÊN] logic login
  const handleLogin = async () => {
    setError(null);

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/login", {
        email,
        password,
      });

      const { accessToken, refreshToken } = res.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      setSnackbar({
        open: true,
        message: "Đăng nhập thành công",
        severity: "success",
      });

      // [GIỮ NGUYÊN] điều hướng theo role
      if (isAdmin()) {
        navigate("/admin");
      } else {
        navigate("/profile");
      }
    } catch (err: any) {
      setError(err?.response?.data || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100%", // [ĐÃ SỬA] cố định đúng 1 màn hình
        overflow: "hidden", // [ĐÃ THÊM] không cho scroll dọc
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 2, // [ĐÃ THÊM] chừa mép nhẹ cho đẹp
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Stack spacing={1} alignItems="center">
              <LockOutlinedIcon color="primary" />
              <Typography variant="h5" fontWeight={600}>
                Đăng nhập
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Nhập thông tin để truy cập hệ thống
              </Typography>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Email"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Mật khẩu"
                  type={showPassword ? "text" : "password"} // [ĐÃ SỬA] thêm toggle hiện/ẩn
                  fullWidth
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                  autoComplete="current-password"
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
            </Grid>
          
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? <CircularProgress size={22} /> : "Đăng nhập"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
