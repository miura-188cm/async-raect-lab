/**
 * このファイルは async React の「一覧画面における Suspense / use / Transition / ViewTransition」
 * の組み合わせを学ぶための教材。
 * - use(promise) でデータ取得を宣言的に書き、初回は Suspense 境界の fallback を見せる
 * - タブ切替や検索は Action(=Transition) で行い、2 回目以降は fallback を出さず
 *   既存の UI を保持したまま pending / optimistic 状態で更新する
 * - ViewTransition を root / lesson / button の 3 層で重ねることで、
 *   リスト全体のクロスフェードと個別アイテムの FLIP アニメを両立させる
 * - mutate(書き込み) -> revalidate(キャッシュ破棄) -> refresh(再フェッチ) の流れが見本
 */
import { Suspense, use, ViewTransition } from "react";
import * as Design from "@/design";
import { useRouter } from "@/router/index.jsx";
import * as data from "@/data/index.js";

function Lesson({ item, completeAction }) {
  async function action() {
    await completeAction(item.id);
  }
  return (
    <Design.LessonCard item={item}>
      {/*
         Design.CompleteButton は action prop パターンを採用している。
         action を渡すとボタン側が内部で startTransition して呼び出してくれるので、
         ここでは完了トグルのビジネスロジックを渡すだけでよい。
         action が 150ms を超えて pending のままならローディング表示に自動で切り替わり、
         ユーザーは「自分の操作が受理された」ことを視覚的に把握できる。
      */}
      <Design.CompleteButton
        complete={item.complete}
        action={action}
      ></Design.CompleteButton>
    </Design.LessonCard>
  );
}

function LessonList({ tab, search, completeAction }) {
  /**
   * data.getLessons は Suspense 対応のフェッチ関数。
   *
   * ポイントは「Promise そのものをキャッシュして返す」こと。
   * - 初回呼び出し: fetch を起動し、pending な Promise を生成してキャッシュに入れて返す
   * - 2 回目以降 (同じ tab+search): 既にキャッシュされた Promise(resolved) を返す
   *
   * use(promise) は、その Promise が pending のときコンポーネントを suspend させ、
   * 一番近い Suspense 境界の fallback を表示させる。resolved になったら値を同期的に返す。
   * これによりコンポーネントは「非同期の待機」を意識せずに値を受け取れる。
   *
   * キャッシュしている以上、mutate 後は明示的にキャッシュを捨てないと古いデータを見続ける。
   * その役割を担うのが completeAction 内で呼ぶ router.refresh() (内部で revalidate される)。
   */
  const lessons = use(data.getLessons(tab, search));

  if (lessons.length === 0) {
    return (
      <ViewTransition key="empty" default="none" enter="auto" exit="auto">
        <Design.EmptyList />
      </ViewTransition>
    );
  }

  return (
    /**
     * 最外層の ViewTransition: 「結果あり <-> 結果なし」の切替をクロスフェードさせるため。
     * key を "results"/"empty" と変えることで、React が別要素とみなしてトランジションが走る。
     */
    <ViewTransition key="results" default="none" enter="auto" exit="auto">
      <Design.List>
        {lessons.map((item) => (
          /**
           * 中間層の ViewTransition (key={item.id}):
           * 検索やタブ切替でリストの中身が入れ替わったとき、
           * 同じ id の要素は「移動」として FLIP アニメさせ、
           * 新規要素は fade-in、消える要素は fade-out させる。
           * key を安定した id にするのが肝で、ここを index にするとアニメが破綻する。
           */
          <ViewTransition key={item.id}>
            <div>
              {/*
                 最内層の ViewTransition (default="none"):
                 Lesson の中でボタンを押した際の内部的な UI 変化 (チェック状態など) に
                 勝手にトランジションがかからないよう default を無効化する「受け皿」。
                 多層にすることで「外側の並び替えアニメ」と「内側の個別アニメ」を分離できる。
              */}
              <ViewTransition default="none">
                <Lesson
                  id={item.id}
                  item={item}
                  completeAction={completeAction}
                />
              </ViewTransition>
            </div>
          </ViewTransition>
        ))}
      </Design.List>
    </ViewTransition>
  );
}

export default function Home() {
  const router = useRouter();
  const search = router.search.q || "";
  const tab = router.search.tab || "all";

  function searchAction(value) {
    /**
     * これは Action として呼ばれる (SearchInput が内部で startTransition する)。
     * つまり URL パラメータ更新は Transition に包まれるため、
     * LessonList が再 suspend しても Suspense の fallback ではなく
     * 「既存の一覧を残したまま pending 表示」になる。
     */
    router.setParams("q", value);
  }
  function tabAction(value) {
    /**
     * tab 切替も同様。Transition 内での state 更新なので、
     * 既存のリストを保持しつつ新しいタブの結果がバックグラウンドで準備される。
     */
    router.setParams("tab", value);
  }

  async function completeAction(id) {
    /**
     * この関数は Action として呼ばれる = 全体が Transition に包まれている。
     * Transition 内では await が許され、await 中も pending 状態が維持されるため、
     * 「書き込み -> 再取得 -> 再描画」が全部終わるまでボタンはローディング状態になる。
     *
     * この「mutation の await が自然に書ける」ことが、async React のキモ。
     */
    await data.mutateToggle(id);

    /**
     * 書き込みが終わったのでデータキャッシュを無効化し、最新を取り直す必要がある。
     * この教材では router と data layer が連携しており、
     * router.refresh() が内部で data.revalidate() 相当を呼び、
     * 現在ルートの再レンダーで getLessons がフレッシュな Promise を返すようになる。
     *
     * startTransition で包む必要はない。既に Action 内 (=Transition 内) だし、
     * router 自体も内部で setState を Transition で包んでいるため。
     */
    router.refresh();
  }
  return (
    <>
      {/*
         Design.SearchInput も action prop パターン。
         内部で useOptimistic を使って入力値を即時反映しつつ、
         実際の URL 更新 (= Transition) が 1.5s を超えて pending ならローディングを出す。
         ユーザーから見ると「入力はサクサク、結果反映は少し遅れる」が違和感なく表現される。
      */}
      <Design.SearchInput value={search} changeAction={searchAction} />
      {/*
         Design.TabList も action prop パターン。
         押した直後にタブの選択状態を optimistic に切り替え、
         150ms を超えて新タブのデータがまだ来ないときはタブ自体にローディングを出す。
      */}
      <Design.TabList activeTab={tab} changeAction={tabAction}>
        {/*
           Suspense 境界はここ 1 箇所だけ。
           この fallback が見えるのは「初回ロードで Promise がまだ解決していないとき」のみ。
           タブ切替や検索は Transition 内の更新なので、React は
           「新しい内容が suspend しても既存の UI を剥がさない」方針で動作し、
           fallback を再表示せずに optimistic / pending で代替する。
           これが async React における「初回は fallback / 更新時はそのまま」のパターン。
        */}
        <Suspense fallback={<Design.FallbackList />}>
          <LessonList
            tab={tab}
            search={search}
            completeAction={completeAction}
          />
        </Suspense>
      </Design.TabList>
    </>
  );
}
