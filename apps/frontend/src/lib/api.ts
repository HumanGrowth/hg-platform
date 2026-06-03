import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // TODO: integrar Sentry y refresh-token flow en B1-06
    return Promise.reject(err);
  },
);
