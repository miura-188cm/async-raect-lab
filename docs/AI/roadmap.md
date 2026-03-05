# Async React 学習ロードマップ

rick-async-react の実装を分析し、React のみで完結する構成で段階的に学ぶ。
バックエンドは不要。データフェッチは `setTimeout` で遅延する擬似 fetch で代替する。

## 前提

- **React 19 experimental**（`"react": "experimental"`）
- バックエンドなし。擬似 fetch（Promise + setTimeout）でネットワーク遅延をシミュレート
- rick-async-react の `data/fake-data.js` のようにインメモリデータを直接操作する

### 擬似 fetch の例

```js
const lessons = [/* インメモリデータ */];

function fakeFetch(data, delay = 500) {
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
}
```

---

## Step 1: `use` + `Suspense` — 非同期データの読み取り

**学ぶこと:** `use()` で Promise を読み、`<Suspense>` で待機中のフォールバックを表示する

**参考:** `rick-async-react/src/app/Home.jsx:39`, `rick-async-react/src/data/index.js`

**実装目標:**

1. インメモリデータを返す擬似 fetch 関数を作る
2. Promise をキャッシュする仕組みを作る（`Map` でキー管理）
3. `use(promise)` でデータを取得するコンポーネントを書く
4. `<Suspense fallback={<Loading />}>` でラップする

**核心コード:**

```jsx
// データ層
let cache = new Map();
function getLessons(tab) {
  if (cache.has(tab)) return cache.get(tab);
  const promise = fakeFetch(filterByTab(lessons, tab));
  cache.set(tab, promise);
  return promise;
}

// コンポーネント
function LessonList({ tab }) {
  const items = use(getLessons(tab));
  return items.map(item => <div key={item.id}>{item.title}</div>);
}

// 親
<Suspense fallback={<Skeleton />}>
  <LessonList tab="all" />
</Suspense>
```

---

## Step 2: `startTransition` — フォールバック再表示を防ぐ

**学ぶこと:** タブ切替などで `startTransition` を使い、古いUIを表示し続ける

**参考:** `rick-async-react/src/design/TabList.jsx:10-13`

**実装目標:**

1. タブ切替の state を追加する
2. タブ変更時に `startTransition` でラップする
3. トランジション中はフォールバックではなく前のリストが表示され続けることを確認する

**核心コード:**

```jsx
function handleTabChange(newTab) {
  startTransition(() => {
    setTab(newTab);  // これによりキャッシュミス → suspend → でもフォールバックは出ない
  });
}
```

**確認ポイント:** `startTransition` を外すとフォールバックが再表示される

---

## Step 3: `useOptimistic` — 即時UI反映

**学ぶこと:** トランジション中に楽観的な値を即座にUIに反映する

**参考:** `rick-async-react/src/design/SearchInput.jsx:13-20`, `rick-async-react/src/design/TabList.jsx:7-15`

**実装目標:**

1. 検索入力を追加する
2. `useOptimistic` で入力値を即座に反映する
3. `optimistic !== actual` でペンディング判定する

**核心コード:**

```jsx
const [optimisticSearch, setOptimisticSearch] = useOptimistic(search);
const isPending = optimisticSearch !== search;

function handleChange(e) {
  const value = e.target.value;
  startTransition(async () => {
    setOptimisticSearch(value);   // 即座にUIに反映
    await changeSearch(value);    // 実際の更新（遅延あり）
  });
}
```

---

## Step 4: `useTransition` — ペンディング状態の取得

**学ぶこと:** `isPending` でローディングインジケーターを制御する

**参考:** `rick-async-react/src/design/Button.jsx:6-13`, `rick-async-react/src/design/PendingButton.jsx`

**実装目標:**

1. アクションボタン（完了トグルなど）を追加する
2. `useTransition` から `isPending` を取得する
3. ペンディング中にスピナーやシマー表示する

**核心コード:**

```jsx
function ActionButton({ action, children }) {
  const [isPending, startTransition] = useTransition();
  function handleClick() {
    startTransition(async () => {
      await action();
    });
  }
  return <button onClick={handleClick}>{isPending ? "..." : children}</button>;
}
```

---

## Step 5: Actions — mutation + revalidation

**学ぶこと:** データ変更 → キャッシュ無効化 → 再レンダーの流れ

**参考:** `rick-async-react/src/app/Home.jsx:97-116`, `rick-async-react/src/data/index.js:34-40`

**実装目標:**

1. 完了トグルの mutation を擬似 fetch で実装する
2. mutation 後に `revalidate()`（キャッシュクリア）する
3. `useOptimistic` と組み合わせて即座にチェックマークを表示し、裏でデータを同期する

**フロー:**

```
ボタンクリック → startTransition(async () => {
  setOptimistic(!complete)   // 即座にUI更新
  await fakeMutate(id)       // 擬似的にデータ変更
  revalidate()               // キャッシュクリア
  refresh()                  // 再レンダーで新データ取得
})
```

---

## Step 6: `ViewTransition` — アニメーション

**学ぶこと:** React の `<ViewTransition>` でリストやページ遷移をアニメーションする

**参考:** `rick-async-react/src/app/Home.jsx:53-76`, `rick-async-react/src/main.jsx:43-47`

**実装目標:**

1. リストアイテムを `<ViewTransition key={item.id}>` でラップする
2. 検索・タブ切替時にアイテムが移動・フェードするのを確認する
3. ページ遷移（ログイン→ホーム）に `<ViewTransition>` を適用する

---

## 実装順まとめ

| Step | テーマ | 新しく使う API | 依存 |
|------|--------|---------------|------|
| 1 | データフェッチ | `use`, `Suspense` | なし |
| 2 | トランジション | `startTransition` | Step 1 |
| 3 | 楽観的更新 | `useOptimistic` | Step 2 |
| 4 | ペンディング状態 | `useTransition` | Step 2 |
| 5 | mutation + revalidation | Step 1-4 の統合 | Step 1-4 |
| 6 | アニメーション | `ViewTransition` | Step 5 |

各 Step で `/src` に段階的に実装し、rick-async-react と見比べながら進める。
