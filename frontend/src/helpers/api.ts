import axios, { AxiosRequestConfig, Method } from "axios";
import { BACKEND_URL } from "./info";
import { LocalStorageManager } from "./info";
import { ReceivedData } from "./types";
import Api from "./axios";
import { narrowToastError } from "@/components/Chat/chat-utils";

type RequestOptions = {
    auth?: boolean;                    // default: false
    method?: Method;                   // default: GET
    headers?: Record<string, string>;  // additional headers
    params?: Record<string, any>;      // query parameters for GET
    data?: any;                         // body for POST/PUT
    dontNarrowError?: boolean;            // default: false
};




export async function makeRequest(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ReceivedData> {
  const {
    auth = false,
    method = "GET",
    headers = {},
    params,
    data,
  } = options;

  const finalHeaders: Record<string, string> = { ...headers };

  if (auth) {
    const token = LocalStorageManager.getToken();
    if (!token) {
      return { success: false, error: "No token found" } as any;
    }
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const config: AxiosRequestConfig = {
    url: endpoint,
    method,
    headers: finalHeaders,
    params,
    data,
  };

  try {
    const response = await Api.request(config);
    return response.data as ReceivedData;
  } catch (err: any) {
    console.error(`Request failed: ${method} ${endpoint}`, err);
    if (options.dontNarrowError !== true) {
      narrowToastError(err);
    }
    return {
      success: false,
      error: err?.response?.data?.error || err.message || "Unknown error",
    } as ReceivedData;
  }
}
