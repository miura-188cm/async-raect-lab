/**
 * このファイルは async react の「useTransition の最小例」を学ぶためのもの。
 * useTransition は非同期処理の進行中かどうかを isPending で教えてくれるフック。
 * action を transition の中で await することで、完了まで自動的に isPending = true になる。
 * 楽観的更新は使わず、単純にスピナーを出すだけの素朴なパターン。
 */
import { useTransition } from "react";
import { Button as ShaButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function Button({ children, action }) {
  // isPending は transition の中で await している間だけ true。
  // React 19 の useTransition は async 関数を受け取れるので、
  // 自分で setState(true)/setState(false) する必要はない。
  const [isPending, transition] = useTransition();

  function handleClick(e) {
    e.stopPropagation();
    // transition の中で await することで、action が解決するまで isPending が true になる。
    // この「await の存続期間 = pending の存続期間」が React 19 の async transition の肝。
    transition(async () => {
      await action();
    });
  }
  return (
    <ShaButton onClick={handleClick}>
      {isPending ? <Spinner /> : children}
    </ShaButton>
  );
}
