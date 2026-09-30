"use client";
import { useState } from "react";
// import { useTranslations } from "next-intl";
import Image from "next/image";

export default function Intro() {
    // const t = useTranslations("Partners");
    const logos = [
        "/partners/logo-1.jpg",
        "/partners/logo-2.jpg",
        "/partners/logo-3.jpg",
        "/partners/logo-4.jpg",
        "/partners/logo-5.jpg",
        "/partners/logo-6.jpg",
        "/partners/logo-7.jpg",
        "/partners/logo-8.jpg",
        "/partners/logo-9.jpg",
        "/partners/logo-10.jpg",
    ];

    //   const partnerUrls = [
    //     "https://vnsteel.vn/",
    //     "https://mateximhaiphong.com.vn/",
    //     "https://cevimetal.com.vn/",
    //     "https://www.itochu.co.jp/en/index.html",
    //     "https://www.thsvc.com.vn/#gsc.tab=0",
    //     "https://thepachau.com/",
    //     "https://www.hungthinhcorp.com.vn/",
    //     "https://hamaco.vn/",
    //     "https://theptaydo.com/",
    //     "https://www.facebook.com/p/Cty-TNHH-TM-DV-Ph%C6%B0%C6%A1ng-V%C5%A9-100025637965646/",
    //   ];

    const duplicatedLogos = [...logos, ...logos];
    const [isHovered, setIsHovered] = useState(false);

    return (
        <section className="bg-white py-10 overflow-hidden md:-mt-4 -mt-6">
            {/* Nhúng đoạn CSS Keyframes này để xử lý dải chạy vô tận */}
            <style>{`
  @keyframes marquee-infinite {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
  }
  .marquee-container {
    display: flex;
    /* Mặc định cho Smartphone: 18s giúp dải logo trượt chậm rãi, dễ quan sát */
    animation: marquee-infinite 9s linear infinite; 
  }

  @media (min-width: 768px) {
    .marquee-container {
      /* Màn hình lớn hơn thì chạy nhanh hơn một chút */
      animation-duration: 10s; 
    }
  }
`}</style>

            <div className="mx-auto max-w-6xl px-4 text-center mt-5 md:mt-0">
                <h2 className="text-xl md:text-2xl font-bold font-helvetica uppercase text-emerald-900 mt-0 md:whitespace-normal whitespace-nowrap">

                </h2>

                <div className="flex items-center justify-center gap-2 overflow-hidden mt-6">
                    <div
                        className="flex overflow-hidden relative cursor-pointer w-full"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {/* Thay motion.div bằng div thường kèm CSS Animation */}
                        <div
                            className="marquee-container"
                            style={{
                                animationPlayState: isHovered ? "paused" : "running",
                            }}
                        >
                            {duplicatedLogos.map((logo, i) => {
                                // Lấy link chuẩn theo chỉ số index thực tế (từ 0 đến 9)
                                // const linkUrl = partnerUrls[i % logos.length] || "#";

                                return (
                                    /* 3. ĐỔI THẺ DIV THÀNH THẺ <a> CHUẨN ĐỂ HIỆN PREVIEW URL GÓC DƯỚI TRÌNH DUYỆT */
                                    <a
                                        key={i}
                                        // href={linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-20 w-50 -mx-8 flex-shrink-0 flex items-center justify-center transition-transform hover:scale-105"
                                    >
                                        <Image
                                            src={logo}
                                            width={160}
                                            height={64}
                                            alt={`Partner ${(i % logos.length) + 1}`}
                                            className="max-h-16 w-auto object-contain transition-all duration-300"
                                        />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
