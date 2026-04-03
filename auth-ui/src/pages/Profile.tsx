import React from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import BadgeIcon from "@mui/icons-material/Badge";
import EmailIcon from "@mui/icons-material/Email";
import SecurityIcon from "@mui/icons-material/Security";
import {
  getCurrentEmail,
  getCurrentFullName,
  getCurrentRole,
  getCurrentUsername,
} from "../utils/auth";

const Profile: React.FC = () => {
  const email = getCurrentEmail();
  const role = getCurrentRole();
  const username = getCurrentUsername();

  const fallbackUsername =
    username || (email && email.includes("@") ? email.split("@")[0] : null) || "user";

  const fullName = getCurrentFullName() || fallbackUsername || "User";

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card elevation={0} sx={{ border: "1px solid #e2e8f0", height: "100%" }}>
          <CardContent sx={{ p: 3.5 }}>
            <Stack spacing={2.5} alignItems="center">
              <Avatar
                sx={{
                  width: 88,
                  height: 88,
                  backgroundColor: "primary.main",
                }}
              >
                <AccountCircleIcon sx={{ fontSize: 46 }} />
              </Avatar>

              <Box textAlign="center">
                <Typography variant="h5" sx={{ lineHeight: 1.25 }}>
                  {fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  @{fallbackUsername}
                </Typography>
              </Box>

              <Chip
                label={role || "USER"}
                color={role === "ADMIN" ? "primary" : "default"}
                variant={role === "ADMIN" ? "filled" : "outlined"}
                size="small"
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card elevation={0} sx={{ border: "1px solid #e2e8f0" }}>
          <CardContent sx={{ p: 3.5 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Thông tin tài khoản</Typography>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <BadgeIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Full name
                    </Typography>
                    <Typography variant="body2">{fullName}</Typography>
                  </Box>
                </Stack>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <BadgeIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Username
                    </Typography>
                    <Typography variant="body2">{fallbackUsername}</Typography>
                  </Box>
                </Stack>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <EmailIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body2">{email || "-"}</Typography>
                  </Box>
                </Stack>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <SecurityIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Role
                    </Typography>
                    <Typography variant="body2">{role || "-"}</Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Profile;
