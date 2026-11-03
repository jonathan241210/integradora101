import { adminApi } from "@/services/arca-api";
import { imagePreview } from "@/services/image-preview";
import { eventsConfig, type EventsViewModel } from "./events-management";
import { useContentViewModel } from "./useContentViewModel";

export function useEventsManagement(): EventsViewModel {
  return useContentViewModel(eventsConfig, adminApi, imagePreview);
}
