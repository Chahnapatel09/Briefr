import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export interface DigestMeta {
    digest_id: string;
    user_email: string;
    s3_key: string;
    target_time: string;
    created_at: string;
}

export const digestsApi = {
    // Fetch all digest metadata for the current user
    fetchAll: async (token: string): Promise<DigestMeta[]> => {
        const response = await axios.get(`${API_BASE_URL}/auth/digests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Fetch the raw HTML content of a specific digest
    fetchRawHtml: async (token: string, digestId: string): Promise<string> => {
        const response = await axios.get(`${API_BASE_URL}/auth/digests/${digestId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Trigger a new digest generation
    triggerEngine: async (token: string): Promise<any> => {
        const response = await axios.post(`${API_BASE_URL}/auth/digests/trigger`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Delete a single story from a digest
    deleteStory: async (token: string, digestId: string, storyLink: string, storyTitle: string): Promise<any> => {
        const response = await axios.post(`${API_BASE_URL}/tools/delete-story`, {
            digest_id: digestId,
            story_link: storyLink,
            story_title: storyTitle
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};
