const milestones = [
    {
        id: "start",
        title: "Khởi đầu",
        description: "Xác định mục tiêu học ngoại ngữ.",
    },
    {
        id: "discover",
        title: "Làm quen",
        description: "Khám phá phát âm và từ vựng cơ bản.",
    },
    {
        id: "foundation",
        title: "Xây nền tảng",
        description: "Học những cấu trúc thường dùng.",
    },
    {
        id: "practice",
        title: "Luyện tập",
        description: "Củng cố kiến thức qua bài tập.",
    },
    {
        id: "memorize",
        title: "Ghi nhớ",
        description: "Ôn từ vựng cùng các bộ flashcard.",
    },
    {
        id: "apply",
        title: "Ứng dụng",
        description: "Đưa ngoại ngữ vào tình huống thực tế.",
    },
    {
        id: "progress",
        title: "Tiến bộ",
        description: "Duy trì việc học và khám phá thêm.",
    },
];

export default function TimelineSection() {
    return (
        <section
            aria-label="Các bước học ngoại ngữ"
            className="bg-white px-4 py-12 sm:px-6 lg:py-16"
        >
            <div className="relative mx-auto max-w-[1440px]">
                {/* Đường nối dọc trên điện thoại */}
                <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-3 top-0 w-0.5 bg-[#CCB8FF] md:hidden"
                />

                {/* Đường nối ngang trên máy tính */}
                <div
                    aria-hidden="true"
                    className="absolute left-0 right-0 top-1/2 hidden h-0.5 -translate-y-1/2 bg-[#CCB8FF] md:block"
                />

                <ol className="relative grid gap-5 md:grid-cols-7 md:gap-2">
                    {milestones.map((milestone, index) => {
                        const isAbove = index % 2 === 0;

                        return (
                            <li
                                key={milestone.id}
                                className="relative pl-10 md:grid md:grid-rows-[1fr_32px_1fr] md:pl-0"
                            >
                                {/* Điểm đánh dấu trên đường nối */}
                                <span
                                    aria-hidden="true"
                                    className="absolute left-1.5 top-6 h-3 w-3 rounded-full bg-[#9255FF] ring-4 ring-white md:relative md:left-auto md:top-auto md:col-start-1 md:row-start-2 md:self-center md:justify-self-center"
                                />

                                {/* Nội dung xen kẽ trên và dưới */}
                                <div
                                    className={`rounded-2xl border border-[#EAE3FF] bg-[#F6F3FF] p-5 width-md:col-start-1 ${isAbove
                                        ? "md:row-start-1 md:mb-3 md:self-end"
                                        : "md:row-start-3 md:mt-3 md:self-start"
                                        }`}
                                >
                                    <span className="text-xs font-bold text-[#5143EF]">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>

                                    <h2 className="mt-2 text-sm font-bold text-slate-900">
                                        {milestone.title}
                                    </h2>

                                    <p className="mt-2 text-xs leading-5 text-slate-600">
                                        {milestone.description}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}