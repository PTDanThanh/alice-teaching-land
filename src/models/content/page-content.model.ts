import "server-only";

import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HeroContent } from "@/schema/home-content.schema";
import type {
    IntroContent,
    IntroImage,
} from "@/schema/intro-content.schema";

export interface DocumentItemRecord {
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

export interface DocumentContent {
    enabled: boolean;
    documents: DocumentItemRecord[];
}



export interface PageContentRecord {
    key: "home";
    sections: {
        hero: HeroContent;
        intro?: IntroContent;
        document?: DocumentContent; // Thêm phần document vào sections
    };
    updatedBy: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}
const heroSchema = new Schema<HeroContent>(
    {
        enabled: {
            type: Boolean,
            required: true,
            default: true,
        },

        greeting: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        tagline: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },

        imageUrl: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },

        imageAlt: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        buttonLabel: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
        },

        buttonHref: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
    },
    {
        _id: false,
        strict: "throw",
    },
);

const introImageSchema = new Schema<IntroImage>(
    {
        id: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        imageUrl: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        imageAlt: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
    },
    { _id: false, strict: "throw" },
);

const introSchema = new Schema<IntroContent>(
    {
        enabled: {
            type: Boolean,
            required: true,
        },
        images: {
            type: [introImageSchema],
            default: [],
            validate: {
                validator: (images: IntroImage[]) => images.length <= 20,
                message: "Chỉ được thêm tối đa 20 ảnh.",
            },
        },
    },
    { _id: false, strict: "throw" },
);
// Schema cho từng item tài liệu
// Schema cho từng item tài liệu
const documentItemSchema = new Schema<DocumentItemRecord>(
    {
        id: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true, maxlength: 255 },
        description: { type: String, trim: true, maxlength: 500 },
        type: { type: String, enum: ["word", "powerpoint", "pdf"], required: true },
        language: { type: String, enum: ["en", "fr"], required: true },
        fileSize: { type: String, required: true, trim: true },
        createdAt: { type: String, required: true },
        status: { type: String, enum: ["published", "draft"], required: true, default: "draft" },
        downloadUrl: { type: String, required: true, trim: true },
    },
    { _id: false, strict: "throw" }
);
// Schema cho toàn bộ section document
const documentContentSchema = new Schema<DocumentContent>(
    {
        enabled: { type: Boolean, required: true, default: true },
        documents: {
            type: [documentItemSchema],
            default: [],
        },
    },
    { _id: false, strict: "throw" }
);

const sectionsSchema = new Schema<PageContentRecord["sections"]>(
    {
        hero: {
            type: heroSchema,
            required: true,
        },
        intro: {
            type: introSchema,
            default: undefined,
        },
    },
    {
        _id: false,
        strict: "throw",
    },
);

const pageContentSchema = new Schema<PageContentRecord>(
    {
        key: {
            type: String,
            enum: ["home"],
            required: true,
            unique: true,
            immutable: true,
        },

        sections: {
            type: sectionsSchema,
            required: true,
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "pageContents",
        strict: "throw",
    },
);

const PageContent =
    (mongoose.models.PageContent as
        | Model<PageContentRecord>
        | undefined) ??
    mongoose.model<PageContentRecord>(
        "PageContent",
        pageContentSchema,
    );

export default PageContent;