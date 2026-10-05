export type ActivityCategory = "learning" | "sharing";

export interface ActivityPost {
  slug: string;
  title: string;
  excerpt: string;
  category: ActivityCategory;
  updatedAt: string;
  image: string | null;
  content: {
    heading: string;
    text: string;
  }[];
}

export const activityCategoryLabels: Record<
  ActivityCategory,
  string
> = {
  learning: "Góc học tập",
  sharing: "Chia sẻ",
};

export const activityPosts: ActivityPost[] = [
  {
    slug: "phuong-phap-hoc-tieng-anh",
    title: "Chia sẻ phương pháp học tiếng Anh đầy cảm hứng",
    excerpt:
      "Bắt đầu từ những mục tiêu nhỏ, tìm cách học phù hợp và tạo một nhịp học mà bạn có thể duy trì mỗi ngày.",
    category: "sharing",
    updatedAt: "2026-09-23",
    image: null,
    content: [
      {
        heading: "Bắt đầu từ mục tiêu của bạn",
        text:
          "Bạn muốn giao tiếp tự tin hơn, đọc hiểu tài liệu hay chuẩn bị cho một kỳ thi? Xác định mục tiêu giúp bạn chọn nội dung học phù hợp và tránh ôm đồm quá nhiều kiến thức cùng lúc.",
      },
      {
        heading: "Kết hợp nhiều cách luyện tập",
        text:
          "Bạn có thể học từ mới qua flashcard, nghe một đoạn hội thoại ngắn rồi thử đặt câu với những từ vừa học. Việc sử dụng kiến thức trong tình huống cụ thể giúp buổi học có ý nghĩa hơn.",
      },
      {
        heading: "Giữ một nhịp học vừa sức",
        text:
          "Hãy chọn thời lượng phù hợp với lịch sinh hoạt của bạn. Một buổi học ngắn nhưng có mục tiêu rõ ràng sẽ giúp bạn dễ bắt đầu và duy trì thói quen hơn.",
      },
    ],
  },
  {
    slug: "hoc-tu-vung-bang-flashcard",
    title: "5 cách học từ vựng hiệu quả bằng flashcard",
    excerpt:
      "Khám phá cách dùng flashcard để ôn từ đúng lúc, luyện nhớ chủ động và áp dụng từ mới vào tình huống thực tế.",
    category: "learning",
    updatedAt: "2026-09-23",
    image: null,
    content: [
      {
        heading: "1. Chia bộ thẻ thành các nhóm nhỏ",
        text:
          "Bắt đầu với một nhóm từ vừa sức thay vì học toàn bộ bộ thẻ trong một lần. Bạn có thể chia theo chủ đề như chào hỏi, công việc hoặc du lịch.",
      },
      {
        heading: "2. Thử nhớ trước khi lật thẻ",
        text:
          "Khi nhìn thấy từ, hãy tự nói hoặc viết nghĩa trước khi xem đáp án. Sau đó kiểm tra xem mình nhớ chính xác đến đâu.",
      },
      {
        heading: "3. Đặt câu với từ mới",
        text:
          "Viết một câu liên quan đến cuộc sống của bạn. Cách này giúp bạn luyện sử dụng từ thay vì chỉ nhận diện nghĩa.",
      },
      {
        heading: "4. Quay lại những từ còn khó",
        text:
          "Ghi lại các từ bạn thường nhầm và dành thêm thời gian ôn chúng. Đừng chỉ học lại những từ đã quá quen thuộc.",
      },
      {
        heading: "5. Đổi thứ tự thẻ",
        text:
          "Trộn thẻ khi ôn tập để kiểm tra khả năng nhớ từng từ mà không dựa vào thứ tự của bộ thẻ.",
      },
    ],
  },
  {
    slug: "ngoai-ngu-mo-ra-co-hoi",
    title: "Học ngoại ngữ sẽ thay đổi thế nào?",
    excerpt:
      "Từ việc tự tin bắt chuyện đến cơ hội học tập và làm việc, cùng tìm hiểu những trải nghiệm khi biết thêm một ngôn ngữ.",
    category: "learning",
    updatedAt: "2026-09-23",
    image: null,
    content: [
      {
        heading: "Khám phá những cách diễn đạt mới",
        text:
          "Học một ngôn ngữ cũng là dịp tìm hiểu cách con người diễn đạt suy nghĩ và cảm xúc trong một nền văn hóa khác.",
      },
      {
        heading: "Tiếp cận thêm nguồn học tập",
        text:
          "Bạn có thể thử đọc bài viết, xem video hoặc nghe nội dung bằng ngôn ngữ đang học. Hãy chọn tài liệu phù hợp với trình độ để tránh cảm giác quá tải.",
      },
      {
        heading: "Tự tin qua từng bước nhỏ",
        text:
          "Hiểu một câu nói hoặc hoàn thành một cuộc hội thoại ngắn đều là những cột mốc đáng ghi nhận trong quá trình học.",
      },
    ],
  },
  {
    slug: "thoi-quen-hoc-ngoai-ngu",
    title: "Cách xây dựng thói quen học ngoại ngữ",
    excerpt:
      "Bắt đầu với những mục tiêu nhỏ và một lịch học phù hợp để việc luyện tập mỗi ngày trở nên dễ duy trì hơn.",
    category: "sharing",
    updatedAt: "2026-09-23",
    image: null,
    content: [
      {
        heading: "Chọn một thời điểm quen thuộc",
        text:
          "Bạn có thể dành thời gian học sau bữa sáng hoặc trước khi kết thúc ngày. Chọn thời điểm phù hợp với lịch của mình thay vì cố theo một lịch quá khó duy trì.",
      },
      {
        heading: "Chuẩn bị sẵn nội dung",
        text:
          "Chọn trước bộ từ vựng hoặc bài học cho buổi tiếp theo để bạn không mất nhiều thời gian quyết định khi bắt đầu.",
      },
      {
        heading: "Điều chỉnh khi cần",
        text:
          "Nếu bỏ lỡ một buổi học, hãy tiếp tục ở buổi sau. Bạn có thể giảm thời lượng hoặc thay đổi nội dung để lịch học phù hợp hơn.",
      },
    ],
  },
  {
    slug: "hanh-trinh-hoc-tieng-phap",
    title: "Hành trình chinh phục tiếng Pháp",
    excerpt:
      "Theo chân một người mới học tiếng Pháp, từ những câu chào đầu tiên đến niềm vui khi hiểu và sử dụng ngôn ngữ.",
    category: "sharing",
    updatedAt: "2026-09-23",
    image: null,
    content: [
      {
        heading: "Những câu chào đầu tiên",
        text:
          "Bắt đầu với Bonjour, Merci và Au revoir để làm quen với những cách diễn đạt cơ bản. Thử nghe rồi nhắc lại trong các tình huống đơn giản.",
      },
      {
        heading: "Luyện tập theo chủ đề",
        text:
          "Bạn có thể học các nhóm từ về bản thân, gia đình hoặc sở thích, sau đó ghép thành những câu giới thiệu ngắn.",
      },
      {
        heading: "Ghi nhận sự tiến bộ",
        text:
          "Hãy lưu lại những câu bạn đã có thể sử dụng. Khi nhìn lại, bạn sẽ nhận ra mình đã đi xa hơn so với lúc bắt đầu.",
      },
    ],
  },
];

export const featuredActivitySlug = "phuong-phap-hoc-tieng-anh";

export function getActivityBySlug(slug: string) {
  return activityPosts.find((post) => post.slug === slug);
}

export function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
  }).format(new Date(value));
}