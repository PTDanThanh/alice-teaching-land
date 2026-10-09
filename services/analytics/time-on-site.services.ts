import "server-only";

import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/src/models/auth/user.model";

type PresenceEvent = "heartbeat" | "stop";

const LEASE_MS = 45_000;

export async function recordTimeOnSite(
    userId: string,
    tabId: string,
    event: PresenceEvent,
) {
    await connectToDatabase();

    // Dùng collection trực tiếp để chạy pipeline;
    // dữ liệu đầu vào đã được route kiểm tra.
    await User.collection.updateOne(
        {
            _id: new Types.ObjectId(userId),
            isActive: true,
        },
        [
            // Lấy danh sách tab và mốc đã tính trước đó.
            {
                $set: {
                    _tosTabs: { $ifNull: ["$timeOnSiteTabs", []] },
                    _tosFrom: {
                        $ifNull: ["$timeOnSiteAccountedAt", "$$NOW"],
                    },
                },
            },

            // Thời điểm kết thúc xa nhất của các tab.
            {
                $set: {
                    _tosUntil: {
                        $reduce: {
                            input: "$_tosTabs",
                            initialValue: "$_tosFrom",
                            in: {
                                $max: ["$$value", "$$this.expiresAt"],
                            },
                        },
                    },
                },
            },

            // Chỉ cộng phần thời gian chưa được ghi nhận.
            {
                $set: {
                    totalTimeOnSiteSeconds: {
                        $add: [
                            { $ifNull: ["$totalTimeOnSiteSeconds", 0] },
                            {
                                $divide: [
                                    {
                                        $max: [
                                            0,
                                            {
                                                $subtract: [
                                                    { $min: ["$$NOW", "$_tosUntil"] },
                                                    "$_tosFrom",
                                                ],
                                            },
                                        ],
                                    },
                                    1000,
                                ],
                            },
                        ],
                    },

                    timeOnSiteAccountedAt: "$$NOW",

                    // Loại tab hết hạn và bản ghi cũ của tab hiện tại.
                    timeOnSiteTabs: {
                        $filter: {
                            input: "$_tosTabs",
                            as: "tab",
                            cond: {
                                $and: [
                                    { $gt: ["$$tab.expiresAt", "$$NOW"] },
                                    { $ne: ["$$tab.tabId", { $literal: tabId }] },
                                ],
                            },
                        },
                    },
                },
            },

            // Heartbeat gia hạn tab; stop chỉ loại tab.
            ...(event === "heartbeat"
                ? [
                    {
                        $set: {
                            timeOnSiteTabs: {
                                $concatArrays: [
                                    "$timeOnSiteTabs",
                                    [
                                        {
                                            tabId: { $literal: tabId },
                                            expiresAt: {
                                                $add: ["$$NOW", LEASE_MS],
                                            },
                                        },
                                    ],
                                ],
                            },
                        },
                    },
                ]
                : []),

            // Xóa trường tính toán tạm.
            {
                $unset: ["_tosTabs", "_tosFrom", "_tosUntil"],
            },
        ],
    );
}