import type { PlatformConnector } from "./types";
import type { ParseResult } from "@/core/types/normalized";

export const tiktokConnector: PlatformConnector = {
  source: "tiktok",
  modes: ["export_upload", "portability_push"],

  async *parseExport(files) {
    let recordCount = 0;

    for await (const entry of files.entries()) {
      if (!entry.path.endsWith(".json")) continue;

      let data: Record<string, unknown>;
      try {
        const buf = await entry.buffer();
        data = JSON.parse(buf.toString());
      } catch {
        continue;
      }

      // Single-file format: user_data.json with nested sections
      const profile = data.Profile as Record<string, unknown> | undefined;
      if (profile) {
        const info = (profile["Profile Information"] as Record<string, unknown>)
          ?.ProfileMap as Record<string, unknown> | undefined;
        if (info) {
          yield {
            kind: "account",
            sourceId: `tt-account-${info.userName ?? "self"}`,
            data: {
              username: info.userName,
              displayName: info.nickName,
              bio: info.bioDescription,
              avatarUrl: info.profilePhoto,
            },
            mediaRefs: info.profilePhoto ? [info.profilePhoto as string] : [],
          };
        }
      }

      // Videos / Posts
      const videos = data["Video"] as Record<string, unknown> | undefined;
      const videoList = (videos?.Videos as Record<string, unknown>)
        ?.VideoList as Record<string, unknown>[] | undefined;

      if (videoList) {
        for (const vid of videoList) {
          recordCount++;
          yield {
            kind: "post",
            sourceId: (vid.Link as string) ?? `tt-vid-${recordCount}`,
            sourceTimestamp: vid.Date ? new Date(vid.Date as string) : undefined,
            data: {
              text: vid.Description ?? "",
              mediaUrls: vid.Link ? [vid.Link as string] : [],
              likes: vid.Likes,
            },
            mediaRefs: vid.Link ? [vid.Link as string] : [],
          };
        }
      }

      // Comments
      const comments = data["Comment"] as Record<string, unknown> | undefined;
      const commentList = (comments?.Comments as Record<string, unknown>)
        ?.CommentsList as Record<string, unknown>[] | undefined;

      if (commentList) {
        for (const c of commentList) {
          recordCount++;
          yield {
            kind: "comment",
            sourceId: `tt-comment-${recordCount}`,
            sourceTimestamp: c.Date ? new Date(c.Date as string) : undefined,
            data: { text: c.Comment, authorName: "self" },
            mediaRefs: [],
          };
        }
      }

      // Multi-file format: Activity/Like List.json etc.
      const likeList = data.ItemFavoriteList as Record<string, unknown>[] | undefined;
      if (likeList) {
        for (const item of likeList) {
          recordCount++;
          yield {
            kind: "reaction",
            sourceId: (item.Link as string) ?? `tt-like-${recordCount}`,
            sourceTimestamp: item.Date ? new Date(item.Date as string) : undefined,
            data: { targetUrl: item.Link },
            mediaRefs: [],
          };
        }
      }
    }
  },
};
