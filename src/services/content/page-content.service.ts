import "server-only";

import { Types } from "mongoose";

import connectToDatabase from "@/lib/mongodb";
import { defaultHeroContent } from "@/data/home-content";
import {
  heroContentSchema,
  type HeroContent,
} from "@/schema/home-content.schema";
import PageContent, {
  type PageContentRecord,
  type DocumentContent,
  type DocumentItemRecord,
} from "@/src/models/content/page-content.model";

import {
  introContentSchema,
  type IntroContent,
} from "@/schema/intro-content.schema";

import { defaultIntroContent } from "@/data/intro-content";

const defaultDocumentContent: DocumentContent = {
  enabled: true,
  documents: [],
};

export type HomeContentResponse = {
  key: "home";
  sections: {
    hero: HeroContent;
    intro: IntroContent;
    document: DocumentContent;
  };
  updatedBy: string | null;
  updatedAt: string | null;
};

function serializeHomeContent(
  page: PageContentRecord,
): HomeContentResponse {
  const hero = page.sections.hero;

  function serializeIntro(
    intro: IntroContent | undefined,
  ): IntroContent {
    if (!intro) {
      return introContentSchema.parse(defaultIntroContent);
    }

    return introContentSchema.parse({
      enabled: intro.enabled,
      images: intro.images.map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        imageAlt: image.imageAlt,
      })),
    });
  }

  function serializeDocument(
    documentSection: DocumentContent | undefined,
  ): DocumentContent {
    if (!documentSection) {
      return defaultDocumentContent;
    }
    return {
      enabled: documentSection.enabled,
      documents: documentSection.documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        type: doc.type,
        language: doc.language,
        fileSize: doc.fileSize,
        createdAt: doc.createdAt,
        status: doc.status,
        downloadUrl: doc.downloadUrl,
      })),
    };
  }
  // Tạo object thuần, không đưa subdocument Mongoose vào Zod.
  const content = heroContentSchema.parse({
    enabled: hero.enabled,
    greeting: hero.greeting,
    tagline: hero.tagline,
    title: hero.title,
    description: hero.description,
    imageUrl: hero.imageUrl,
    imageAlt: hero.imageAlt,
    buttonLabel: hero.buttonLabel,
    buttonHref: hero.buttonHref,
  });

  return {
    key: "home",
    sections: {
      hero: content,
      intro: serializeIntro(page.sections.intro),
      document: serializeDocument(page.sections.document)
    },
    updatedBy: page.updatedBy
      ? String(page.updatedBy)
      : null,
    updatedAt: page.updatedAt.toISOString(),
  };
}

export async function getHomeContent(): Promise<HomeContentResponse> {
  await connectToDatabase();

  const page = await PageContent.findOne({ key: "home" }).exec();

  if (!page) {
    return {
      key: "home",
      sections: {
        hero: { ...defaultHeroContent },
        intro: introContentSchema.parse(defaultIntroContent),
        document: defaultDocumentContent,
      },
      updatedBy: null,
      updatedAt: null,
    };
  }

  return serializeHomeContent(page);
}

export async function updateHomeHero(
  input: unknown,
  adminUserId: string,
): Promise<HomeContentResponse> {
  const hero = heroContentSchema.parse(input);

  if (!/^[a-f0-9]{24}$/i.test(adminUserId)) {
    throw new Error("ID người cập nhật không hợp lệ.");
  }

  await connectToDatabase();

  const page = await PageContent.findOneAndUpdate(
    { key: "home" },
    {
      $set: {
        "sections.hero": hero,
        updatedBy: new Types.ObjectId(adminUserId),
      },
      $setOnInsert: {
        key: "home",
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).exec();

  if (!page) {
    throw new Error("Không thể lưu nội dung trang chủ.");
  }

  return serializeHomeContent(page);
}

export async function updateHomeIntro(
  input: unknown,
  adminId: string,
): Promise<HomeContentResponse> {
  const intro = introContentSchema.parse(input);

  if (!/^[a-f0-9]{24}$/i.test(adminId)) {
    throw new Error("ID quản trị viên không hợp lệ.");
  }

  await connectToDatabase();

  const page = await PageContent.findOneAndUpdate(
    { key: "home" },
    {
      $set: {
        "sections.intro": intro,
        updatedBy: new Types.ObjectId(adminId),
      },
      $setOnInsert: {
        key: "home",
        "sections.hero": heroContentSchema.parse(defaultHeroContent),
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).exec();

  if (!page) {
    throw new Error("Không thể lưu nội dung Intro.");
  }

  return serializeHomeContent(page);
}

// Thêm hàm update dành riêng cho phần Document từ trang Admin
export async function updateHomeDocument(
  documentsInput: DocumentItemRecord[],
  adminId: string,
): Promise<HomeContentResponse> {
  if (!/^[a-f0-9]{24}$/i.test(adminId)) {
    throw new Error("ID quản trị viên không hợp lệ.");
  }

  await connectToDatabase();

  const documentPayload: DocumentContent = {
    enabled: true,
    documents: documentsInput,
  };

  const page = await PageContent.findOneAndUpdate(
    { key: "home" },
    {
      $set: {
        "sections.document": documentPayload,
        updatedBy: new Types.ObjectId(adminId),
      },
      $setOnInsert: {
        key: "home",
        "sections.hero": heroContentSchema.parse(defaultHeroContent),
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).exec();

  if (!page) {
    throw new Error("Không thể lưu danh sách tài liệu.");
  }

  return serializeHomeContent(page);
}