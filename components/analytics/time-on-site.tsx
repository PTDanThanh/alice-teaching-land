"use client";

import { useEffect } from "react";
import axios from "axios";

import { apiClient } from "@/lib/http";

const API_PATH = "/api/analytics/time-on-site";
const BEACON_URL = "/api/analytics/time-on-site";
const HEARTBEAT_MS = 30_000;

export default function TimeOnSiteTracker() {
    useEffect(() => {
        const tabId = crypto.randomUUID();

        let disposed = false;
        let stoppedForAuth = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        // Tuần tự hóa request thường để tránh heartbeat chồng nhau.
        let queue: Promise<void> = Promise.resolve();

        function send(event: "heartbeat" | "stop") {
            queue = queue
                .then(async () => {
                    if (disposed || stoppedForAuth) return;

                    // Tab có thể đã bị ẩn khi request còn chờ trong queue.
                    if (
                        event === "heartbeat" &&
                        document.visibilityState !== "visible"
                    ) {
                        return;
                    }

                    await apiClient.post(API_PATH, { tabId, event });
                })
                .catch((error: unknown) => {
                    if (
                        axios.isAxiosError(error) &&
                        error.response?.status === 401
                    ) {
                        stoppedForAuth = true;
                    }

                    // Lỗi analytics không chặn giao diện website.
                });
        }

        function sendStopBeacon() {
            const body = new Blob(
                [JSON.stringify({ tabId, event: "stop" })],
                { type: "application/json" },
            );

            const queued = navigator.sendBeacon(BEACON_URL, body);

            if (!queued) {
                void fetch(BEACON_URL, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tabId, event: "stop" }),
                    keepalive: true,
                }).catch(() => undefined);
            }
        }

        function scheduleHeartbeat() {
            timer = setTimeout(() => {
                if (disposed) return;

                if (document.visibilityState === "visible") {
                    send("heartbeat");
                }

                scheduleHeartbeat();
            }, HEARTBEAT_MS);
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                send("heartbeat");
            } else {
                send("stop");
            }
        }


        function handlePageHide() {
            sendStopBeacon();
        }

        function handlePageShow() {
            if (document.visibilityState === "visible") {
                send("heartbeat");
            }
        }

        if (document.visibilityState === "visible") {
            send("heartbeat");
        }

        scheduleHeartbeat();

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );
        window.addEventListener("pagehide", handlePageHide);
        window.addEventListener("pageshow", handlePageShow);

        return () => {
            disposed = true;

            if (timer) clearTimeout(timer);

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener("pageshow", handlePageShow);

            sendStopBeacon();
        };
    }, []);

    return null;
}