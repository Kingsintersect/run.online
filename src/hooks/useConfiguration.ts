import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
   configurationKeys,
   configurationMutationOptions,
   configurationQueryOptions,
} from "@/services/configurationApi";
import type { SettingsQueryParams, UpdateSettingPayload } from "@/types/school";

export function useSettings(params?: SettingsQueryParams) {
   return useQuery({
      ...configurationQueryOptions.settings(params),
      staleTime: 1000 * 60 * 5,
   });
}

export function useSettingDetail(id: number) {
   return useQuery({
      ...configurationQueryOptions.settingDetail(id),
      enabled: id > 0,
      staleTime: 1000 * 60 * 2,
   });
}

export function useCreateSetting() {
   const qc = useQueryClient();
   return useMutation({
      ...configurationMutationOptions.create(),
      onSuccess: async () => {
         await qc.invalidateQueries({ queryKey: configurationKeys.settings() });
      },
   });
}

export function useUpdateSetting() {
   const qc = useQueryClient();
   return useMutation({
      ...configurationMutationOptions.update(),
      onSuccess: async (_, variables: { id: number; payload: UpdateSettingPayload }) => {
         await Promise.all([
            qc.invalidateQueries({ queryKey: configurationKeys.settings() }),
            qc.invalidateQueries({ queryKey: configurationKeys.settingDetail(variables.id) }),
         ]);
      },
   });
}

export function useDeleteSetting() {
   const qc = useQueryClient();
   return useMutation({
      ...configurationMutationOptions.remove(),
      onSuccess: async () => {
         await qc.invalidateQueries({ queryKey: configurationKeys.settings() });
      },
   });
}
