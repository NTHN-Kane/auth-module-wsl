import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import GroupsIcon from "@mui/icons-material/Groups";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { isAuthenticated, isAdmin } from "../utils/auth";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const loggedIn = isAuthenticated();
  const admin = isAdmin();

  return (
    <Stack spacing={3}>
      <Card elevation={0}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={2}>
                <Chip label="Internal Access Platform" color="primary" variant="outlined" sx={{ width: "fit-content" }} />
                <Typography variant="h4">Quản lý truy cập nội bộ rõ ràng và nhất quán</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
                  Nền tảng tập trung cho xác thực người dùng, phân quyền truy cập và quản lý tài liệu nội bộ
                  theo mô hình an toàn, dễ kiểm soát.
                </Typography>

                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  {!loggedIn ? (
                    <Button variant="contained" onClick={() => navigate("/login")}>
                      Đăng nhập
                    </Button>
                  ) : admin ? (
                    <Button variant="contained" onClick={() => navigate("/admin")}>
                      Mở trang quản trị
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={() => navigate("/profile")}>
                      Xem hồ sơ cá nhân
                    </Button>
                  )}

                  {loggedIn && (
                    <Button variant="outlined" onClick={() => navigate("/files")}>
                      Mở File Explorer
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Trạng thái truy cập
                  </Typography>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Xác thực</Typography>
                    <Chip label="JWT" size="small" color="primary" variant="outlined" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Phân quyền</Typography>
                    <Chip label="Role-based" size="small" variant="outlined" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Quản lý file</Typography>
                    <Chip label="Folder-aware" size="small" variant="outlined" />
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0}>
            <CardContent sx={{ p: 2.5 }}>
              <VerifiedUserIcon color="primary" sx={{ mb: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                Đăng nhập bằng email
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chỉ tài khoản đã được cấp quyền mới có thể truy cập hệ thống nội bộ.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0}>
            <CardContent sx={{ p: 2.5 }}>
              <AdminPanelSettingsIcon color="primary" sx={{ mb: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                Phân quyền tập trung
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quyền truy cập được quản lý tập trung theo vai trò và trạng thái tài khoản.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0}>
            <CardContent sx={{ p: 2.5 }}>
              <SecurityIcon color="primary" sx={{ mb: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                Bảo mật vận hành
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Phiên đăng nhập và vòng đời token được kiểm soát để đảm bảo an toàn truy cập.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
            <GroupsIcon color="primary" />
            <Typography variant="body2" color="text.secondary">
              Nếu bạn cần quyền truy cập, liên hệ quản trị viên hệ thống để được cấp tài khoản phù hợp.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Home;
