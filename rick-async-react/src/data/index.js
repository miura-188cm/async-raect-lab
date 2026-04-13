/**
 * このファイルは async react における「Promise キャッシュによるデータ取得」を学ぶための教材。
 * use フックは与えられた Promise を読む hook だが、レンダーのたびに新しい Promise を
 * 生成してしまうと毎回 Suspense が走って無限ループ相当になる。
 * そこで「同じキーに対しては同じ Promise インスタンスを返す」キャッシュが必要になる。
 * ここではその最小構成と、ミューテーション後にキャッシュを捨てる revalidate パターンを示す。
 */

import { delayedFetch } from "./debug.jsx";

// Suspense 対応のデータ取得のためのキャッシュ。
// use(promise) は「同一の Promise」であることを前提に安定したサスペンドを実現するため、
// リクエストごとに Promise を作り直すのではなく、ここで使い回す。
let lessonsCache = new Map();

// キャッシュを丸ごと作り直すことで revalidate を表現する。
// Map をクリアするのではなく新しい Map を代入しているのは、
// 古い参照を握っている側に影響を与えないため（副作用を局所化）。
export function revalidate() {
  lessonsCache = new Map();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// アプリ起動直後などに前もってデータ取得を始めておくための関数。
// 最大 1 秒だけ待って、それ以上かかるならレンダリングを先に進める（ウォーターフォール回避）。
// ここでも Promise を lessonsCache に登録しておくことで、後続の getLessons が
// 同じ Promise を use して即座にサスペンドを解決できるようにしている。
export function prefetchLessons() {
  const promise = delayedFetch(`/lessons?tab=all&q=`);
  lessonsCache.set("all", promise);
  return Promise.race([promise, delay(1000)]);
}

// コンポーネントから呼ばれるデータ取得口。
// 重要なのは「同じ (tab, search) なら同じ Promise を返す」という不変条件。
// これがないと use(getLessons(...)) は再レンダーごとに別 Promise をサスペンドし、
// React は無限にフォールバックを出し続けてしまう。
export function getLessons(tab, search) {
  const key = tab + search;
  if (lessonsCache.has(key)) {
    return lessonsCache.get(key);
  }

  const promise = delayedFetch(
    `/lessons?tab=${tab || "all"}&q=${search || ""}`,
  );
  lessonsCache.set(key, promise);
  return promise;
}

// ミューテーション（書き込み）系。getLessons が「読み」でキャッシュを使うのに対し、
// こちらはサーバー状態を書き換えるのでキャッシュを無効化（revalidate）する必要がある。
// toggle 完了後に revalidate を呼ぶことで、次の読み取りが新しい Promise を生成し直す。
export async function mutateToggle(id) {
  return delayedFetch(`/lesson/${id}/toggle`, {
    method: "POST",
  }).then(() => {
    revalidate();
  });
}

// ログインもサーバー側のセッション状態を変えるため、
// 以前取得したデータは他ユーザー視点のものかもしれない。よって revalidate でキャッシュを捨てる。
// getLessons が「読み取り」、mutateToggle が「特定リソースの書き換え」、login が「認証状態変化」と、
// 目的は違えど「サーバー状態が変わったら読み取りキャッシュは信用できない」という原則は共通。
export async function login() {
  return delayedFetch("/login", {
    method: "POST",
  }).then(() => {
    revalidate();
  });
}
