// Strings for the 404 and error pages. Kept separate from the main dictionaries because the
// error boundary is a Client Component and must not pull in the full (server-only) dictionaries.
// The ".ts" extension lets the plain Node test runner resolve this import.
import { defaultLocale, hasLocale, type Locale } from "./config.ts";

export type StatusPageText = {
  notFound: { title: string; body: string; home: string; search: string };
  error: { title: string; body: string; retry: string; home: string; reference: string };
};

export const statusPages: Record<Locale, StatusPageText> = {
  ko: {
    notFound: {
      title: "페이지를 찾을 수 없어요",
      body: "주소가 잘못되었거나, 삭제되었거나 이동했을 수 있어요. 아래에서 다시 찾아보세요.",
      home: "홈으로",
      search: "병원 검색",
    },
    error: {
      title: "문제가 발생했어요",
      body: "일시적인 오류일 수 있어요. 다시 시도해도 계속되면 잠시 후 다시 방문해 주세요.",
      retry: "다시 시도",
      home: "홈으로",
      reference: "문의 시 참고 코드",
    },
  },
  en: {
    notFound: {
      title: "Page not found",
      body: "The address may be wrong, or the page may have been removed or moved. Try one of the options below.",
      home: "Go home",
      search: "Search clinics",
    },
    error: {
      title: "Something went wrong",
      body: "This may be a temporary problem. If it keeps happening, please come back in a moment.",
      retry: "Try again",
      home: "Go home",
      reference: "Reference code",
    },
  },
  ja: {
    notFound: {
      title: "ページが見つかりません",
      body: "URLが間違っているか、削除・移動された可能性があります。下のボタンからもう一度お探しください。",
      home: "ホームへ",
      search: "クリニックを検索",
    },
    error: {
      title: "問題が発生しました",
      body: "一時的なエラーの可能性があります。繰り返し発生する場合は、しばらくしてからもう一度お試しください。",
      retry: "再試行",
      home: "ホームへ",
      reference: "参照コード",
    },
  },
  zh: {
    notFound: {
      title: "找不到页面",
      body: "地址可能有误，或页面已被删除或移动。请通过下方按钮继续查找。",
      home: "返回首页",
      search: "搜索诊所",
    },
    error: {
      title: "出了点问题",
      body: "可能是暂时性错误。如果问题持续出现，请稍后再试。",
      retry: "重试",
      home: "返回首页",
      reference: "参考代码",
    },
  },
};

/** Text for a locale string coming from the URL; unknown values fall back to the default. */
export function statusPageText(lang: string | undefined): StatusPageText {
  return statusPages[lang && hasLocale(lang) ? lang : defaultLocale];
}
