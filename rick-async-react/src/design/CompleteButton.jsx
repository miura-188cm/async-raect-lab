/**
 * このファイルは async react の「useOptimistic による楽観的更新」を学ぶための代表例。
 * サーバーへの action() が確定する前に、UI 上のチェック状態を先に切り替えて見せる。
 * startTransition の中で楽観値を更新 → 非同期 action を await する流れが核心。
 * action 完了（= 親の state 更新）後、useOptimistic が持っていた仮値は自動で破棄され、
 * 親から渡された確定値 complete に戻る。
 */
import { CircleCheckBig } from "lucide-react";
import { startTransition } from "react";
import PendingButton from "./PendingButton.jsx";
import { useOptimistic } from "react";
import { cn } from "@/lib/utils";

export default function CompleteButton({ complete, action }) {
  // useOptimistic は「確定値 complete」をベースに、transition 中だけ仮の値を上書きできるフック。
  // transition が終わると setOptimisticComplete で書き込んだ値は捨てられ、complete に自動で戻る。
  // だから「ロールバック処理」を自前で書く必要がなく、失敗時も勝手に元の表示へ復帰する。
  // 注: 保持しているのは「計算結果」ではなく「reducer への入力」で、毎レンダー passthrough と再合成される。
  const [optimisticComplete, setOptimisticComplete] = useOptimistic(complete);

  function clickAction() {
    // setOptimisticComplete は startTransition（または action）の中でしか呼べない。
    // これは「楽観更新は非同期遷移の一部である」という React の設計思想を反映したもの。
    // transition の外で呼ぶと警告が出る。
    startTransition(async () => {
      // 先に UI を反転させる（= 楽観的更新）。ユーザーにはクリック結果が即座に見える。
      setOptimisticComplete(!optimisticComplete);
      // その裏でサーバー通信を待つ。await 中ずっと transition は pending 扱い。
      await action();
      // action 解決後、親の complete が更新され、optimisticComplete は自動で捨てられる。
    });
  }

  return (
    <PendingButton action={clickAction}>
      {optimisticComplete ? (
        <CircleCheckBig
          className={cn({ "text-chart-2": optimisticComplete })}
          size={48}
        />
      ) : (
        <div></div>
      )}
    </PendingButton>
  );
}
