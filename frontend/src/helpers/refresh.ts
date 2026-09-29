import axios from "axios";
import { BACKEND_URL } from "@/helpers/info";


export default async function refreshToken() {
  try {
    const result = await axios.post(`${BACKEND_URL}/auth/refresh`, {}, {
      withCredentials: true,
    });
    if (result.data?.success && result.data.details?.token) {
      localStorage.setItem("token", result.data.details.token);
      return result.data.details.token;
    } else {
      console.error("Refresh token response missing token:", result.data);
      throw new Error("Invalid refresh token response");
    }
  } catch (error: any) {
    console.error("Error refreshing tokennn:", error.response?.data || error);
    throw error;
  }
}
