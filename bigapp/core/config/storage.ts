import path from "path";
import os from "os";

export const getLocalMediaRoot = () => {
  if (process.env.LOCAL_MEDIA_ROOT) return process.env.LOCAL_MEDIA_ROOT;
  return path.join(os.homedir(), ".bigapp", "media");
};

export const getPublicMediaBaseUrl = () => {
  if (process.env.LOCAL_MEDIA_PUBLIC_BASE_URL) return process.env.LOCAL_MEDIA_PUBLIC_BASE_URL;
  return "/api/media";
};
