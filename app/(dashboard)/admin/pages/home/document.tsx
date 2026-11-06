"use client";

import { useState } from "react";
import {
    Search,
    FileText,
    Trash2,
    Send,
    CheckCircle2,
    Clock,
    Upload,
    FileEdit,
    RotateCcw,
    Pencil,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialDocuments, DocumentItem } from "@/data/document-content";

export default function AdminDocumentManagerPage() {
    const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
    const [activeTab, setActiveTab] = useState<"en" | "fr">("en");

    // States cho bộ lọc
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all"); // Thêm bộ lọc trạng thái
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // State phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Modal Import state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState<"word" | "powerpoint" | "pdf">("pdf");
    const [newDescription, setNewDescription] = useState("");

    // Modal Edit state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);

    // Lọc dữ liệu theo tab ngôn ngữ, tên, loại, trạng thái và ngày tháng
    const filteredDocuments = documents.filter((doc) => {
        const matchesLang = doc.language === activeTab;
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === "all" || doc.type === selectedType;
        const matchesStatus = selectedStatus === "all" || doc.status === selectedStatus;

        let matchesDate = true;
        if (fromDate && doc.createdAt < fromDate) matchesDate = false;
        if (toDate && doc.createdAt > toDate) matchesDate = false;

        return matchesLang && matchesSearch && matchesType && matchesStatus && matchesDate;
    });

    // Tính toán phân trang
    const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage) || 1;
    const paginatedDocuments = filteredDocuments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Toggle trạng thái xuất bản
    const togglePublishStatus = (id: string) => {
        setDocuments(documents.map(doc => {
            if (doc.id === id) {
                return { ...doc, status: doc.status === "published" ? "draft" : "published" };
            }
            return doc;
        }));
    };

    // Xóa tài liệu
    const handleDelete = (id: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa tài liệu này không?")) {
            setDocuments(documents.filter(doc => doc.id !== id));
        }
    };

    // Thêm tài liệu mới (Import file)
    const handleAddDocument = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        const newItem: DocumentItem & { description?: string } = {
            id: `doc-${Date.now()}`,
            title: newTitle,
            type: newType,
            language: activeTab,
            fileSize: "1.8 MB",
            createdAt: new Date().toISOString().split("T")[0],
            status: "draft",
            downloadUrl: "#",
            description: newDescription || "Giáo trình và tài liệu ôn luyện hữu ích.",
        };

        setDocuments([newItem as DocumentItem, ...documents]);
        setNewTitle("");
        setNewDescription("");
        setIsUploadModalOpen(false);
    };

    // Mở modal chỉnh sửa
    const handleOpenEditModal = (doc: DocumentItem) => {
        setEditingDoc({ ...doc });
        setIsEditModalOpen(true);
    };

    // Lưu cập nhật tài liệu từ Modal Edit
    const handleUpdateDocument = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDoc) return;

        setDocuments(documents.map(doc => doc.id === editingDoc.id ? editingDoc : doc));
        setIsEditModalOpen(false);
        setEditingDoc(null);
    };

    return (
        <div className="space-y-4 max-w-full mx-auto">
            {/* Header */}
            {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-[18px] font-bold tracking-tight text-slate-900">Quản Lý Tài Liệu Ngoại Ngữ</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Import, kiểm duyệt, phân loại và quản lý trạng thái xuất bản tài liệu học tập.
                    </p>
                </div>
            </div> */}

            {/* Tabs chuyển đổi ngôn ngữ */}
            <div className="flex items-center justify-between border-b border-slate-200">
                <div className="flex">
                    <button
                        onClick={() => { setActiveTab("en"); setCurrentPage(1); }}
                        className={`cursor-pointer py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${activeTab === "en"
                            ? "border-[#5143EF] text-[#5143EF]"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Tài Liệu Tiếng Anh ({documents.filter(d => d.language === "en").length})
                    </button>
                    <button
                        onClick={() => { setActiveTab("fr"); setCurrentPage(1); }}
                        className={`cursor-pointer py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${activeTab === "fr"
                            ? "border-[#5143EF] text-[#5143EF]"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Tài Liệu Tiếng Pháp ({documents.filter(d => d.language === "fr").length})
                    </button>
                </div>

                <div className="py-2">
                    <Button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="cursor-pointer bg-[#5143EF] hover:bg-[#4435DC] text-white"
                    >
                        <Upload className="mr-2 h-4 w-4" /> Import Tài Liệu
                    </Button>
                </div>
            </div>

            {/* Bộ lọc (Filters) bao gồm cả Trạng thái */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 rounded-xl ">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Tìm theo tên tài liệu..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="pl-9 bg-white"
                    />
                </div>

                <div>
                    <select
                        value={selectedType}
                        onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5143EF]"
                    >
                        <option value="all">Tất cả định dạng</option>
                        <option value="word">Word (.docx)</option>
                        <option value="powerpoint">PowerPoint (.pptx)</option>
                        <option value="pdf">PDF (.pdf)</option>
                    </select>
                </div>

                <div>
                    <select
                        value={selectedStatus}
                        onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5143EF]"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="published">Đã xuất bản</option>
                        <option value="draft">Bản nháp</option>
                    </select>
                </div>

                <div className="flex items-center gap-1">
                    <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                        className="cursor-pointer bg-white text-xs h-10"
                        title="Từ ngày"
                    />
                    <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                        className="cursor-pointer bg-white text-xs h-10"
                        title="Đến ngày"
                    />
                </div>

                <div className="flex items-center">
                    <Button
                        variant="outline"
                        onClick={() => { setSearchTerm(""); setSelectedType("all"); setSelectedStatus("all"); setFromDate(""); setToDate(""); setCurrentPage(1); }}
                        className="cursor-pointer text-xs"
                        title="Đặt lại bộ lọc"
                    >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    </Button>
                </div>
            </div>

            {/* Bảng hiển thị danh sách tài liệu */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="h-[480px] overflow-y-auto overflow-x-auto relative">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <th className="py-3 px-4">Tên Tài Liệu</th>
                                <th className="py-3 px-4">Mô Tả Ngắn</th>
                                <th className="py-3 px-4">Định Dạng</th>
                                <th className="py-3 px-4">Dung Lượng</th>
                                <th className="py-3 px-4">Ngày Tạo</th>
                                <th className="py-3 px-4">Trạng Thái</th>
                                <th className="py-3 px-4 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {paginatedDocuments.length > 0 ? (
                                paginatedDocuments.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                                            {doc.title}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500 text-xs max-w-xs truncate" title={doc.description || "Chưa có mô tả"}>
                                            {doc.description || "Chưa có mô tả"}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase ${doc.type === "word" ? "bg-blue-100 text-blue-700" :
                                                doc.type === "powerpoint" ? "bg-pink-100 text-pink-700" : "bg-amber-100 text-amber-700"
                                                }`}>
                                                {doc.type}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500 text-xs">{doc.fileSize}</td>
                                        <td className="py-3.5 px-4 text-slate-500 text-xs">{doc.createdAt}</td>
                                        <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${doc.status === "published"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-amber-50 text-amber-700 border border-amber-200"
                                                }`}>
                                                {doc.status === "published" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                {doc.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEditModal(doc)}
                                                className="cursor-pointer h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                                title="Chỉnh sửa"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => togglePublishStatus(doc.id)}
                                                className={`cursor-pointer text-xs h-8 ${doc.status === "published" ? "text-amber-600" : "text-emerald-600"}`}
                                            >
                                                {doc.status === "published" ? (
                                                    <>
                                                        <FileEdit className="h-3.5 w-3.5 mr-1" />
                                                        Chuyển Nháp
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="h-3.5 w-3.5 mr-1" />
                                                        Xuất Bản
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(doc.id)}
                                                className="cursor-pointer h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                                title="Xóa"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400">
                                        Không tìm thấy tài liệu nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Thanh Phân Trang (Pagination) */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                    <span className="text-xs text-slate-500">
                        Hiển thị trang <strong className="text-slate-700">{currentPage}</strong> / <strong className="text-slate-700">{totalPages}</strong> (Tổng số {filteredDocuments.length} tài liệu)
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="cursor-pointer h-8 text-xs"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Trước
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="cursor-pointer h-8 text-xs"
                        >
                            Sau <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal Import/Thêm mới tài liệu */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900">Import Tài Liệu Mới ({activeTab === "en" ? "Tiếng Anh" : "Tiếng Pháp"})</h3>
                        <form onSubmit={handleAddDocument} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Tên tài liệu</label>
                                <Input
                                    placeholder="Nhập tiêu đề tài liệu..."
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả ngắn hiển thị trên web</label>
                                <Input
                                    placeholder="Nhập mô tả ngắn..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Loại định dạng</label>
                                <select
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value as "word" | "powerpoint" | "pdf")}
                                    className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm"
                                >
                                    <option value="word">Word (.docx)</option>
                                    <option value="powerpoint">PowerPoint (.pptx)</option>
                                    <option value="pdf">PDF (.pdf)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Chọn file tệp (Mô phỏng)</label>
                                <Input type="file" className="cursor-pointer text-xs" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsUploadModalOpen(false)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#5143EF] cursor-pointer hover:bg-[#4435DC] text-white"
                                >
                                    Tải lên & Lưu
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Chỉnh Sửa Tài Liệu */}
            {isEditModalOpen && editingDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900">Chỉnh Sửa Tài Liệu</h3>
                        <form onSubmit={handleUpdateDocument} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Tên tài liệu</label>
                                <Input
                                    value={editingDoc.title}
                                    onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả ngắn hiển thị trên web</label>
                                <Input
                                    value={editingDoc.description || ""}
                                    onChange={(e) => setEditingDoc({ ...editingDoc, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Loại định dạng</label>
                                <select
                                    value={editingDoc.type}
                                    onChange={(e) => setEditingDoc({ ...editingDoc, type: e.target.value as "word" | "powerpoint" | "pdf" })}
                                    className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm"
                                >
                                    <option value="word">Word (.docx)</option>
                                    <option value="powerpoint">PowerPoint (.pptx)</option>
                                    <option value="pdf">PDF (.pdf)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditModalOpen(false)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#5143EF] cursor-pointer hover:bg-[#4435DC] text-white"
                                >
                                    Lưu Thay Đổi
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}