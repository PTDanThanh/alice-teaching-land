import type { Metadata } from "next";

import ActivityFeed from "./activity-feed";

export const metadata: Metadata = {
    title: "Hoạt động | Alice In Teachingland",
    description:
        "Khám phá các hoạt động, câu chuyện và mẹo học ngoại ngữ cùng Alice In Teachingland.",
};

export default function ActivitiesPage() {
    return <ActivityFeed />;
}