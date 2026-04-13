/**
 * このファイルは async React の「フォーム送信 + ページ遷移」における
 * Action / Transition / prefetch / Suspense fallback 戦略を学ぶための教材。
 * - submit ボタンは action prop パターンで、Action 内での await が pending に連動する
 * - ログイン POST 直後に prefetchLessons() で次ページのデータを先読みし、
 *   取得が間に合えば fallback を出さずに遷移できる
 * - 間に合わなければ新ページの Suspense fallback に着地する (Activity が使えない都合)
 */
import { useRouter } from "@/router/index.jsx";
import { login, prefetchLessons } from "@/data/index.js";
import { useState, ViewTransition } from "react";
import * as Design from "@/design";

const initialFieldData = {
  username: "hi@react.dev",
  password: "reactisgoodactually",
};

export default function Login() {
  const router = useRouter();
  const [fields, setFields] = useState(initialFieldData);

  async function submitAction() {
    /**
     * この関数は Action として呼ばれる = Transition 内で実行される。
     * Transition 内なら await が許され、await している間ずっと
     * action の pending が true のままになる。
     * つまり「POST の完了 + 遷移の完了」までボタンは自動でローディング表示になる。
     */
    await login(fields.username, fields.password);

    /**
     * ログイン成功後、遷移先 (ホーム) で必要になるレッスン一覧を先読みする。
     *
     * prefetchLessons は内部的に「最大 1s 待つが、超えたらデータ未解決のまま resolve する」
     * という設計になっている。
     * - 1s 以内に返った場合: 遷移時点でキャッシュが埋まっており、fallback を出さずにホームが描画できる
     * - 1s 超過した場合:     prefetch は解決済みとして進み、遷移先で改めて suspend し fallback を見せる
     *
     * Transition 内で await しているので、この「待ち時間」もボタンの pending に含まれる。
     * ユーザーから見ると「ログインボタンを押したら、成功してホームに着くまでが 1 連の操作」に見える。
     */
    await prefetchLessons();
    /**
     * 新しいページへの遷移。
     * ログインしないと取得できないリソースがあるため、ログイン前にホームを Activity で
     * ウォームアップしておく手は使えない (認証の壁の向こう側)。
     * したがって遷移直後に suspend した場合は Suspense の fallback 状態に素直に落ちる。
     * これが「POST 後 navigate の fallback 戦略」の現実解。
     */
    router.navigate("/");
  }
  return (
    <Design.LoginForm fields={fields} setFields={setFields}>
      {/*
         Design.Button は action prop パターン。
         action を渡すと内部で startTransition + pending 監視をしてくれるので、
         ここは submitAction を渡すだけでローディング表示と二重送信防止が自動で入る。
         「Action 内の await がそのままボタンの pending に紐づく」流れを体感するのが狙い。
      */}
      <Design.Button action={submitAction}>Login</Design.Button>
    </Design.LoginForm>
  );
}
