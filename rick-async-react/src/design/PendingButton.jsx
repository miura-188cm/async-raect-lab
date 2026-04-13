/**
 * このファイルは async react の「pending 状態を視覚化するボタン」を学ぶための部品。
 * action を受け取るときは useTransition で自動的に pending を管理し、
 * onClick 経由の同期操作のときは外から loading を注入される、という二系統を持つ。
 * 親コンポーネント（例：CompleteButton）が楽観的更新をしている間、
 * このボタンが shimmer アニメーションで「処理中」を伝える役割を担う。
 */
import { Button } from "@/components//ui/button";
import { IconButtonShimmer } from "./ButtonShimmer.jsx";
import { useTransition } from "react";

export default function PendingButton({ action, onClick, loading, children }) {
  // action が渡された場合は自前の transition で pending を計算。
  // onClick しか渡されない（= 親が transition を持っている）場合は、
  // 親から明示的に loading を渡してもらって pending を外部制御する。
  // 「誰が transition の主体か」をはっきりさせるためにこの二段構えになっている。
  const [_isPending, transition] = useTransition();
  const isPending = action != null ? _isPending : loading;

  function handleClick(e) {
    e.preventDefault();
    if (action) {
      // action がある＝このボタンが非同期処理の起点。自前で transition を開始する。
      transition(async () => {
        await action();
      });
    } else {
      // action がない＝親が楽観更新と transition を担当している。
      // ここではクリックを親に流すだけ。pending 表示は loading props で制御される。
      onClick && onClick(e);
    }
  }

  return (
    <Button
      className="relative overflow-hidden cursor-pointer"
      variant="outline"
      size="icon-lg"
      onClick={handleClick}
    >
      {/* IconButtonShimmer は isPending のとき shimmer アニメーションを重ねる。
          CSS 側の .pending が transition-delay を持つので、
          非常に短い処理ではアニメーション自体が発火せず、チラつかない。 */}
      <IconButtonShimmer isPending={isPending}>{children}</IconButtonShimmer>
    </Button>
  );
}
