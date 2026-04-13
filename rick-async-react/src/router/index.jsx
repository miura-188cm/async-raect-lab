/**
 * このファイルは async react における「トランジションと連動するルーター」を学ぶための教材。
 * 通常の SPA ルーターは「URL を変える → state を変える → 再レンダー」だが、
 * async react ではデータ取得が走る間 UI を古いまま見せたい（= transition で描く）。
 * そのため「state を transition で更新 → DOM 更新完了後に URL を確定させる」という逆順になる。
 * Navigation API が使えるブラウザでは event.intercept() でこれをブラウザに伝え、
 * 使えないブラウザでは history.pushState を useLayoutEffect 内で呼ぶことで近似する。
 */

import {
  useState,
  createContext,
  use,
  useLayoutEffect,
  useEffect,
  startTransition,
  addTransitionType,
} from "react";
import { revalidate } from "../data/index.js";

// ここには 2 種類のルーター実装がある。
// ひとつは Navigation API を使うもの、もうひとつは window.history を使うもの。
// Navigation API はまだ全ブラウザで使えるわけではないため、フォールバックを用意している。

// どちらのルーターも基本戦略は同じ:
//   1. ナビゲーションを transition 内で state 更新として扱う
//   2. DOM の更新が完了した後、useLayoutEffect で pendingNav コールバックを呼ぶ
// これにより「React がトランジションで DOM を更新し終えてからナビゲーションを確定する」
// という順序が保証される。

// Navigation API 版では navigate イベントをインターセプトし、event.intercept() に渡した
// handler の中で state 更新を開始する。handler が返す Promise は pendingNav を resolve すると
// 完了するので、ブラウザは「React の描画が終わるまで」フォーカスリセットやスクロール復元を待ってくれる。
function NavigationRouter({ children }) {
  const [routerState, setRouterState] = useState(() => ({
    pendingNav: () => {},
    url: document.location.pathname,
    search: parseSearchParams(document.location.search),
  }));

  function navigate(url) {
    window.navigation.navigate(url);
  }

  function setParams(key, value) {
    const newParams = parseSearchParams(document.location.search);
    if (value !== "") {
      newParams[key] = value;
    } else {
      delete newParams[key];
    }
    const newUrlParams = new URLSearchParams(newParams).toString();

    window.navigation.navigate(
      document.location.pathname + (newUrlParams ? `?${newUrlParams}` : ""),
    );
  }

  // router.refresh()。revalidate() で Promise キャッシュを捨て、
  // state を「新しいオブジェクト参照」に差し替えることで再レンダーを強制する。
  // transition 内で行うのでフォールバックが出ることはなく、
  // 次のレンダーで getLessons が新しい Promise を作り直し、データが再取得される。
  // つまり「キャッシュ無効化 + 再レンダー起動」= Next.js の router.refresh() 相当。
  function refresh() {
    revalidate();
    startTransition(() => {
      setRouterState((prev) => {
        return {
          ...prev,
        };
      });
    });
  }

  useEffect(() => {
    function handleNavigate(event) {
      if (!event.canIntercept) {
        return;
      }
      const navigationType = event.navigationType;
      const previousIndex = window.navigation.currentEntry.index;
      const currURL = new URL(location.href);
      const newURL = new URL(event.destination.url);

      // パスが同じでクエリパラメータやハッシュだけが変わる場合、
      // ブラウザ既定のフォーカスリセットは邪魔になりがち（検索 UI から外されるなど）。
      // focusReset: "manual" を指定してアプリ側に委ねる。
      const onlyParamsOrHash =
        newURL.pathname === currURL.pathname &&
        (newURL.search !== currURL.search || newURL.hash !== currURL.hash);

      // event.intercept() はブラウザに「このナビゲーションは SPA 側で処理する」と伝える API。
      // handler が返す Promise が resolve するまで、ブラウザはナビゲーションを「進行中」とみなす。
      // ここで startTransition 内で state を更新することで、
      //   - React: 古い UI を表示したままバックグラウンドで新 UI を準備
      //   - ブラウザ: handler の Promise が完了するまで URL 確定やフォーカス移動を待機
      // という二者が噛み合い、トランジションとブラウザナビゲーションが同期する。
      event.intercept({
        handler() {
          let promise;
          startTransition(() => {
            // transition type を付けておくと、受け側の useTransition 等で
            // 「navigation-push / navigation-traverse」などの種別を判別できる。
            addTransitionType("navigation-" + navigationType);
            if (navigationType === "traverse") {
              // 履歴エントリの index 比較で「戻る」か「進む」かを判定。
              // アニメーション方向を変えたいときなどに利用できる情報。
              const nextIndex = event.destination.index;
              if (nextIndex > previousIndex) {
                addTransitionType("navigation-forward");
              } else if (nextIndex < previousIndex) {
                addTransitionType("navigation-back");
              }
            }
            // Promise の resolve 関数そのものを pendingNav として state に保存する。
            // この resolve が呼ばれるまで event.intercept は「完了待ち」状態が続き、
            // 実際の呼び出しは下の useLayoutEffect（＝コミット直後）で行う。
            promise = new Promise((resolve) => {
              setRouterState({
                url: newURL.pathname,
                search: parseSearchParams(newURL.search),
                pendingNav: resolve,
              });
            });
          });
          return promise;
        },
        focusReset: onlyParamsOrHash ? "manual" : "after-transition",
      });
    }

    window.navigation.addEventListener("navigate", handleNavigate);
    return () => {
      window.navigation.removeEventListener("navigate", handleNavigate);
    };
  }, []);

  const pendingNav = routerState.pendingNav;

  // commit 直後（DOM 反映後、paint 前）に pendingNav を呼ぶのがポイント。
  // useEffect だと paint 後になってしまい、ブラウザ側のフォーカスリセットが
  // 新 UI を「見る」前に走ってしまう可能性がある。useLayoutEffect で同期的に知らせる。
  useLayoutEffect(() => {
    pendingNav();
  }, [pendingNav]);

  return (
    <RouterContext
      value={{
        url: routerState.url,
        search: routerState.search,
        navigate,
        setParams,
        refresh,
        isPending: false,
        params: {},
      }}
    >
      {children}
    </RouterContext>
  );
}

// History API 版では pendingNav の中で history.pushState を呼ぶ。
// つまり「React が DOM を更新し終わってから初めて URL バーが書き換わる」順序。
// 理想的ではない（URL 変更が遅延する）が、Navigation API が無いブラウザではこれが限界。
// back/forward には popstate イベントで対応する。
function HistoryRouter({ children }) {
  const [routerState, setRouterState] = useState({
    pendingNav: () => {},
    url: document.location.pathname,
    search: parseSearchParams(document.location.search),
  });

  function navigate(url) {
    startTransition(() => {
      setRouterState(() => {
        return {
          url,
          search: {},
          // pushState は pendingNav として遅延実行する。
          // state 更新（＝新ルートのレンダー）が完了して DOM に反映された後で
          // URL を確定することで、「URL だけ進んで中身は古い」状態を避ける。
          pendingNav() {
            window.history.pushState({}, "", url);
          },
        };
      });
    });
  }

  function setParams(key, value) {
    startTransition(() => {
      setRouterState((prev) => {
        const newParams = { ...prev.search };
        if (value !== "") {
          newParams[key] = value;
        } else {
          delete newParams[key];
        }
        return {
          url: prev.url,
          search: newParams,
          pendingNav() {
            const newUrlParams = new URLSearchParams(newParams).toString();
            window.history.pushState(
              {},
              "",
              prev.url + (newUrlParams ? `?${newUrlParams}` : ""),
            );
          },
        };
      });
    });
  }

  // Navigation 版と同じく、キャッシュを捨てて再レンダーを促す。
  function refresh() {
    revalidate();
    startTransition(() => {
      setRouterState((prev) => {
        return {
          ...prev,
        };
      });
    });
  }

  useEffect(() => {
    function handlePopState() {
      // popstate も startTransition で囲むが、React はこれを同期的に flush する。
      // これは仕様として妥当で、理由は:
      //   - ブラウザは既に URL を戻してしまっているため、UI と URL の不一致時間を最小化したい
      //   - 結果、キャッシュミス時は Suspense フォールバックが出る
      // これは「コンポーネントのアンマウント時にキャッシュをクリアする」設計が
      // なぜ悪手かを端的に示すケースでもある（戻るたびに空キャッシュでフォールバック地獄になる）。
      startTransition(() => {
        setRouterState({
          url: document.location.pathname,
          search: parseSearchParams(document.location.search),
          pendingNav() {
            // 何もしない。URL はブラウザによって既に更新済み。
          },
        });
      });
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const pendingNav = routerState.pendingNav;

  useLayoutEffect(() => {
    pendingNav();
  }, [pendingNav]);

  return (
    <RouterContext
      value={{
        url: routerState.url,
        search: routerState.search,
        navigate,
        setParams,
        refresh,
      }}
    >
      {children}
    </RouterContext>
  );
}

// ブラウザが Navigation API をサポートしていれば優先的に使う。
// （window.navigation オブジェクトの有無で判定）
let SelectedRouter = HistoryRouter;
if (typeof navigation === "object") {
  SelectedRouter = NavigationRouter;
}

export const Router = SelectedRouter;

// Router Context の設計意図:
// - url/search: 現在位置の読み取り用
// - navigate/setParams: URL を変える側の操作
// - refresh: データ層のキャッシュを無効化して再取得を促す操作
// この 3 系統を 1 つの Context に束ねることで、ルーティングとデータ取得が
// 一体となった API として提供される（Next.js の useRouter に近い設計）。
const RouterContext = createContext({
  url: "/",
  search: {},
  navigate: () => {},
  setParams: () => {},
  refresh: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
// TODO: このルールで hook を export できない理由を調べる。
export function useRouter() {
  // useContext ではなく use を使っているのは、async react スタイルへの統一のため。
  // use は Context にも Promise にも使える統一 API。
  return use(RouterContext);
}

function parseSearchParams(queryString) {
  const params = new URLSearchParams(
    queryString.startsWith("?") ? queryString : `?${queryString}`,
  );
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}
