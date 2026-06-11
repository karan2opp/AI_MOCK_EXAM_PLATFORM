import api from "@/utils/axios";

export const assignRoleService = async (data: { email: string; role: string }) => {
  const res = await api.post("/admin/assign-role", data);
  return res.data;
};

export const searchUserService = async (email: string) => {
  const res = await api.post("/admin/search-user", { email });
  return res.data;
};
