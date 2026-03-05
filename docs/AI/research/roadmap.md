# rick-async-react Home.jsx 研究プラン

## Context

rick-async-react の Home.jsx を中心に、async React の非同期パターンを研究する。
実装や実証は行わず、コードリーディングによる分析結果をまとめる。

## Home.jsx の 4 レイヤー構造

Home.jsx は 4 つのレイヤーで非同期を実現している:

### レイヤー 1: データ層 (`data/index.js`)
- **Suspense 対応キャッシュ**: `Map` で Promise をキャッシュし、同じ (tab, search) には同一 Promise を返す
- **`use()` との連携**: キャッシュ済み Promise を `use()` に渡すとコンポーネントが suspend する
- **revalidate**: キャッシュを全クリアし再 fetch を促す

### レイヤー 2: ルーター (`router/index.jsx`)
- **Navigation API / History API** で URL 状態を管理
- **全ての更新を `startTransition` でラップ** → フォールバック再表示を防ぐ
- `setParams()`, `refresh()`, `navigate()` を提供

### レイヤー 3: デザインコンポーネント (`design/*.jsx`)
- **Action props パターン**: `action`, `changeAction` を受け取り内部で transition を管理
- **`useOptimistic()`**: SearchInput, TabList で即時 UI 反映
- **`useTransition()`**: Button, PendingButton でペンディング状態を表示
- **遅延ローディング**: 150ms〜1.5s の遅延で高速操作時はローディング非表示

### レイヤー 4: ページコンポーネント (`app/Home.jsx`)
- アプリコードは **非同期の複雑さを意識しない**
- `searchAction`, `tabAction`, `completeAction` を定義するだけ
- Suspense fallback は初回のみ表示、以降は transition が抑制

## 非同期パターン一覧

| パターン | 使用箇所 | 役割 |
|---------|---------|------|
| `use()` | `Home.jsx:39` LessonList 内 | Promise を unwrap してデータ取得、suspend する |
| `Suspense` | `Home.jsx:140` LessonList のラッパー | suspend 中にフォールバック UI を表示（初回のみ） |
| `startTransition` | `router/index.jsx` 内で自動適用 | state 更新を transition でラップし、フォールバック再表示を防ぐ |
| `useOptimistic` | `SearchInput.jsx`, `TabList.jsx`, `CompleteButton.jsx` | transition 中に楽観的な値を即座に UI に反映 |
| `useTransition` | `Button.jsx`, `PendingButton.jsx` | `isPending` でローディングインジケーターを制御 |
| `ViewTransition` | `Home.jsx:43,53,62,64` | リストアイテムの移動・フェード・クロスフェードアニメーション |

## データフロー図解

### 初回ロード
```
Home render → LessonList render → use(getLessons("all", ""))
  → キャッシュミス → Promise 生成 & キャッシュ → suspend
  → Suspense が FallbackList を表示
  → Promise 解決 → LessonList 再 render → リスト表示
```

### タブ切替（transition あり）
```
ユーザーがタブクリック
  → TabList の changeAction 発火
  → useOptimistic で即座にタブ UI 更新
  → router.setParams("tab", value) → startTransition 内で state 更新
  → LessonList が新しい tab で render → use(getLessons(newTab, search))
  → キャッシュミス → suspend → でもフォールバックは出ない（transition 中）
  → 古い UI を表示し続ける + タブにシマー表示
  → Promise 解決 → 新しいリストに切り替え
```

### mutation（完了トグル）
```
ユーザーがチェックボタンクリック
  → CompleteButton の action 発火
  → useOptimistic で即座にチェックマーク表示
  → await data.mutateToggle(id)  （POST リクエスト）
  → mutation 内で revalidate()  （キャッシュ全クリア）
  → router.refresh()  （再 render トリガー）
  → LessonList が再 render → use(getLessons(...)) → 新しい Promise → suspend
  → transition 中なので古い UI 表示し続ける
  → Promise 解決 → 新データで UI 更新
```

## 読解対象ファイル

| ファイル | 分析内容 |
|---------|---------|
| `rick-async-react/src/app/Home.jsx` | コンポーネント構成、データフロー |
| `rick-async-react/src/data/index.js` | Suspense 対応キャッシュ、revalidation |
| `rick-async-react/src/data/fake-data.js` | インメモリデータ構造 |
| `rick-async-react/src/router/index.jsx` | Transition 統合ルーター |
| `rick-async-react/src/design/SearchInput.jsx` | useOptimistic パターン |
| `rick-async-react/src/design/TabList.jsx` | useOptimistic + action |
| `rick-async-react/src/design/CompleteButton.jsx` | mutation + optimistic |
| `rick-async-react/src/design/Button.jsx` | useTransition |
| `rick-async-react/src/design/PendingButton.jsx` | ペンディング状態管理 |

## 既存 roadmap (Step 1-6) との対応

| Step | テーマ | Home.jsx での対応箇所 |
|------|--------|---------------------|
| 1: `use` + `Suspense` | データフェッチ | `Home.jsx:39` + `Home.jsx:140` |
| 2: `startTransition` | フォールバック抑制 | `router/index.jsx` が自動適用、`Home.jsx:84-95` の action 経由 |
| 3: `useOptimistic` | 即時 UI 反映 | `SearchInput.jsx`, `TabList.jsx` の内部実装 |
| 4: `useTransition` | ペンディング状態 | `Button.jsx`, `PendingButton.jsx` の内部実装 |
| 5: mutation + revalidation | データ変更 | `Home.jsx:97-116` completeAction + `data/index.js` |
| 6: `ViewTransition` | アニメーション | `Home.jsx:43,53,62,64` |
