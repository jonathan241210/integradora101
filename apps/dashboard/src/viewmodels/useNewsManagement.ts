import { adminApi } from "@/services/arca-api";
import { imagePreview } from "@/services/image-preview";
import { newsConfig, type NewsViewModel } from "./news-management";
import { useContentViewModel } from "./useContentViewModel";

export function useNewsManagement(): NewsViewModel {
  return useContentViewModel(newsConfig, adminApi, imagePreview);
}
