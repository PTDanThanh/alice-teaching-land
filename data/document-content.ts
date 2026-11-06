export interface DocumentItem {
    id: string;
    title: string;
    description?: string;
    type: "word" | "powerpoint" | "pdf";
    language: "en" | "fr";
    fileSize: string;
    createdAt: string;
    status: "published" | "draft";
    downloadUrl: string;
}

export const initialDocuments: DocumentItem[] = [
    {
        id: "doc-1",
        title: "Giáo trình Ngữ pháp Tiếng Anh căn bản",
        description: "Tổng hợp các chủ điểm ngữ pháp cốt lõi kèm bài tập ứng dụng.", // <--- Thêm mô tả mẫu
        type: "pdf",
        language: "en",
        fileSize: "2.4 MB",
        createdAt: "2026-10-15",
        status: "published",
        downloadUrl: "#",
    },
    {
        id: "doc-2",
        title: "Slide bài giảng từ vựng chuyên ngành Pháp",
        type: "powerpoint",
        language: "fr",
        fileSize: "5.1 MB",
        createdAt: "2026-10-18",
        status: "draft",
        downloadUrl: "#",
    },
];