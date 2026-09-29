import axios from "axios";
import { BACKEND_URL } from "@/helpers/info";
import refreshToken from "@/helpers/refresh";


type Token = string | null;

const Api = axios.create({
	baseURL: BACKEND_URL,
	withCredentials: true,
});

// Set up request interceptor to include token in headers
Api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let backlog: any[] = []; // this is for storing requests while we refresh the token
let isAvailable = false; // this to keep track if the refresh token in progress


// this function will go throught the request inside the backlog and retry them
// if we have the token we retry with the new token else we reject the request
// then we clearn the backlog
const processBacklog = (error: any, token: Token) => {
	backlog.forEach((log: any) => {
		if (token)
			log.resolve(token);
		else
			log.reject(error);
	});
	backlog = [];
}

// this interceptor will run after the response is received
Api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const OriginalRequest = error.config;

    // Only attempt refresh for 401 errors and if we haven't already tried
    if (error.response?.status === 401 && !OriginalRequest._retry) {
      // If a refresh is already in progress, wait for it
      if (isAvailable) {
        try {
          const token = await new Promise((resolve, reject) => {
            backlog.push({ resolve, reject });
          });
          OriginalRequest.headers['Authorization'] = 'Bearer ' + token;
          return Api(OriginalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      OriginalRequest._retry = true;
      isAvailable = true;

      try {
        const newToken = await refreshToken();
        if (newToken) {
          localStorage.setItem("token", newToken);
          // Update the original request with new token
          OriginalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          processBacklog(null, newToken);
          isAvailable = false;
          return Api(OriginalRequest);
        } else {
          throw new Error("No token received from refresh");
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        processBacklog(refreshError, null);
        isAvailable = false;
        // Clear token and redirect on refresh failure
        localStorage.removeItem("token");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default Api;
