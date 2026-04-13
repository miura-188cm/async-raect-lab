/**
 * このファイルはアプリのエントリポイント。async React 的には
 * 「ページ単位の ViewTransition をどこで張るか」「Router / Layout / Page をどう組むか」
 * を学ぶための最小構成になっている。
 * - Router がグローバル state (URL / search / refresh) を提供する
 * - AppRouter が URL を見て描画するページを切り替える
 * - ページ単位で ViewTransition を張り、ルート遷移そのものをアニメ化する
 * - Layout は純粋な見た目の器 (Card など) で、データや遷移ロジックは持たない
 */
import React, { ViewTransition } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "./debugger.css";

import Home from "@/app/Home";
import Login from "@/app/Login";
import { Router, useRouter } from "@/router/index.jsx";
import { Card, CardContent } from "@/components/ui/card";
import { Github } from "lucide-react";
function Layout({ children }) {
  // 見た目だけを整える純粋な UI コンポーネント。
  // ルーティングやデータの関心は持たせず、どのページからも使えるようにしている。
  return (
    <>
      <a
        href="https://github.com/rickhanlonii/async-react"
        target="_blank"
        className="absolute top-4 right-4 hidden md:block"
      >
        <Github />
      </a>
      <div className="root flex-1 w-[475px] h-full overflow-hidden">
        <Card className="h-[610px] gap-2 flex flex-col border-solid border rounded-lg">
          <CardContent className="h-full px-0">
            <div className="flex flex-1 flex-col h-full">
              <div className="flex flex-col flex-1 gap-2 h-full">
                {children}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AppRouter() {
  const { url } = useRouter();

  /**
   * URL に応じてページを切り替えるだけの最小ルーター。
   * 各ページを ViewTransition で包み、key に url を渡しているのがポイント。
   * key が変わる = React から見て別要素 = ページ間のクロスフェードが自動で走る。
   * default="none" により、ページ内の普通の state 更新ではアニメを発生させず、
   * enter/exit="auto" で「入退場時だけ」トランジションさせている。
   */
  return (
    <>
      {url === "/" && (
        <ViewTransition key={url} default="none" enter="auto" exit="auto">
          <Layout heading={<div>Course Lessons</div>}>
            <Home />
          </Layout>
        </ViewTransition>
      )}
      {url === "/login" && (
        <ViewTransition key={url} default="none" enter="auto" exit="auto">
          <Layout>
            <div className="flex flex-col gap-6 p-12">
              <Card className="border-none">
                <Login />
              </Card>
            </div>
          </Layout>
        </ViewTransition>
      )}
    </>
  );
}

export default function App() {
  /**
   * Router がアプリ全体に URL / navigate / refresh / search を提供する。
   * async React のポイントは、この Router が内部で setState を Transition に包んでいること。
   * これにより navigate / setParams / refresh が Suspense の fallback を再表示せず、
   * 既存の UI を保持したまま新しい内容をバックグラウンドで準備する挙動になる。
   */
  return (
    <Router>
      <AppRouter />
    </Router>
  );
}

const root = createRoot(document.getElementById("root"), {});
root.render(<App />);
