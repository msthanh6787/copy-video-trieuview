
/**
 * Tự động xác định BASE_URL của API.
 * Nếu đang chạy trên các tên miền lạ (như Vercel), trỏ API về link Cloud Run gốc.
 */
export const getApiBaseUrl = () => {
  // Ưu tiên lấy từ biến môi trường nếu có
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    
    // Nếu là localhost hoặc hosting mặc định của AI Studio (run.app)
    if (host === 'localhost' || host.endsWith('run.app')) {
      return ''; // Dùng relative path
    }
    
    // Trường hợp chạy trên Vercel hoặc các domain khác
    // Đây là link Cloud Run gốc của ứng dụng (lấy từ metadata hoặc hardcode link Share)
    return 'https://ph-n-t-ch-video-tri-u-view-to-prompt-veo3-i-l-i-t-741709708206.asia-southeast1.run.app';
  }
  
  return '';
};
