"use client";

import { useState } from "react";
import Image from "next/image";
import type { IntroContent } from "@/schema/intro-content.schema";

type IntroProps = {
    content: IntroContent;
};

export default function Intro({ content }: IntroProps) {
    const [isHovered, setIsHovered] = useState(false);

    if (!content.enabled || content.images.length === 0) {
        return null;
    }

    return (
        <section
            aria-label="Dải ảnh đối tác"
            className="overflow-hidden bg-white py-10 -mt-6 md:-mt-4"
        >
            <style>{`
        @keyframes intro-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .intro-marquee-track {
          display: flex;
          width: max-content;
          animation: intro-marquee 18s linear infinite;
        }

        @media (min-width: 768px) {
          .intro-marquee-track {
            animation-duration: 10s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .intro-marquee-track {
            animation: none;
          }
        }
      `}</style>

            <div className="mx-auto mt-5 max-w-6xl px-4 md:mt-0">
                <div
                    className="relative mt-6 w-full overflow-hidden"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div
                        className="intro-marquee-track"
                        style={{
                            animationPlayState: isHovered ? "paused" : "running",
                        }}
                    >
                        {[0, 1].map((copyIndex) => (
                            <div
                                key={copyIndex}
                                aria-hidden={copyIndex === 1 ? true : undefined}
                                className="flex shrink-0 items-center"
                            >
                                {content.images.map((image) => (
                                    <div
                                        key={image.id}
                                        className="flex h-20 w-36 shrink-0 items-center justify-center px-3 transition-transform hover:scale-105"
                                    >
                                        <Image
                                            src={image.imageUrl}
                                            width={160}
                                            height={64}
                                            alt={copyIndex === 1 ? "" : image.imageAlt}
                                            className="max-h-16 max-w-full w-auto object-contain"
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}