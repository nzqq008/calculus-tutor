import { useQuery } from "@tanstack/react-query";
import { api, apiConfig } from "../api/client";
import { useIdentity } from "./identity";
export function useGraph() {
  return useQuery({
    queryKey: ["knowledge"],
    queryFn: ({ signal }) => api.graph(signal),
    enabled: !!apiConfig.base,
    staleTime: 60000,
  });
}
export function useMastery() {
  const {
    identity: { student },
  } = useIdentity();
  return useQuery({
    queryKey: ["student", student?.student_id, "mastery"],
    queryFn: ({ signal }) => api.mastery(student!, signal),
    enabled: !!student && !!apiConfig.base,
  });
}
export function useSession(id: string) {
  const {
    identity: { student },
  } = useIdentity();
  return useQuery({
    queryKey: ["student", student?.student_id, "session", id],
    queryFn: ({ signal }) => api.session(student!, id, signal),
    enabled: !!student && !!id && !!apiConfig.base,
  });
}
export function useSummary(id: string) {
  const {
    identity: { student },
  } = useIdentity();
  return useQuery({
    queryKey: ["student", student?.student_id, "summary", id],
    queryFn: ({ signal }) => api.summary(student!, id, signal),
    enabled: !!student && !!id && !!apiConfig.base,
  });
}
