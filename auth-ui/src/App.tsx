import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link as RouterLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Files from "./pages/Files";
import AdminInputFiles from "./pages/AdminInputFiles"; // [ĐÃ THÊM] trang riêng quản lý file đầu vào
import api from "./api";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  clearTokens,
  getCurrentEmail,
  getCurrentRole,
  isAdmin,
  isAuthenticated,
} from "./utils/auth";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const loggedIn = isAuthenticated();
  const admin = isAdmin();
  const role = getCurrentRole();
  const email = getCurrentEmail();

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Clear local tokens regardless of backend logout errors.
    } finally {
      clearTokens();
      navigate("/login");
    }
  };

  const navStyle = (path: string) => ({
    color: location.pathname === path ? "#1d4ed8" : "#334155",
    backgroundColor: location.pathname === path ? "#eff6ff" : "transparent",
    border: location.pathname === path ? "1px solid #bfdbfe" : "1px solid transparent",
    px: 1.5,
  });

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        color: "#0f172a",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", gap: 2, minHeight: "64px" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1,
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            IA
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.1, fontWeight: 650 }}>
              Internal Auth
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
              Account & File Management
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button component={RouterLink} to="/" sx={navStyle("/")}>
            Home
          </Button>

          {!loggedIn && (
            <Button component={RouterLink} to="/login" sx={navStyle("/login")}>
              Login
            </Button>
          )}

          {loggedIn && (
            <Button component={RouterLink} to="/profile" sx={navStyle("/profile")}>
              Profile
            </Button>
          )}

          {loggedIn && (
            <Button component={RouterLink} to="/files" sx={navStyle("/files")}>
              Files
            </Button>
          )}

          {loggedIn && admin && (
            <>
              <Button component={RouterLink} to="/admin" sx={navStyle("/admin")}>
                Admin
              </Button>

              <Button component={RouterLink} to="/users/create" sx={navStyle("/users/create")}>
                Create User
              </Button>

              <Button
                component={RouterLink}
                to="/admin/input-files"
                sx={navStyle("/admin/input-files")}
              >
                Input Files
              </Button>
            </>
          )}

          {loggedIn && (
            <>
              <Chip
                label={`${role || "USER"}${email ? ` • ${email}` : ""}`}
                variant="outlined"
                size="small"
              />
              <Button variant="contained" onClick={logout}>
                Logout
              </Button>
            </>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

function AppContent() {
  return (
    <>
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/create"
            element={
              <ProtectedRoute adminOnly>
                <Register />
              </ProtectedRoute>
            }
          />

          <Route
            path="/files"
            element={
              <ProtectedRoute>
                <Files />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/input-files"
            element={
              <ProtectedRoute adminOnly>
                <AdminInputFiles />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Container>
    </>
  );
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;