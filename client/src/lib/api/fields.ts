import api from "./client";

export async function syncFields(appId: string, payload: any) {
    return api.post(`/apps/${appId}/sync-fields/`, payload);
}
