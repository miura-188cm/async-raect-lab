/**
 * このファイルは async react の「タブ切り替えを楽観的更新で即応させる」パターンを学ぶ例。
 * タブをクリックした瞬間に optimisticTab をその値へ書き換え、見た目上は即切り替わる。
 * その裏で changeAction（= サーバー or 親側の状態更新）が走り、
 * 完了したら optimistic は自動で破棄され、activeTab が新値になる。
 * クリックしたタブだけに shimmer を出すことで、どのタブが読み込み中かを視覚化している。
 */
import { startTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components//ui/tabs";
import ButtonShimmer from "./ButtonShimmer.jsx";
import { useOptimistic } from "react";

export default function TabList({ activeTab, changeAction, children }) {
  // activeTab はサーバー（または親）で確定している値。
  // optimisticTab はクリック直後だけ使う仮の値。transition 完了で捨てられる。
  const [optimisticTab, setActiveTab] = useOptimistic(activeTab);

  function onTabClick(newValue) {
    // 楽観的更新は必ず startTransition の中で。
    // transition とセットにする理由：
    //  1) setActiveTab は transition 外では呼べない制約がある
    //  2) await 中も古い UI を壊さない（React が新 UI の準備を裏で進める）
    //  3) pending 表示を正しく制御できる（isPending の計算が意味を持つ）
    startTransition(async () => {
      setActiveTab(newValue);
      await changeAction(newValue);
    });
  }
  // 楽観値と確定値のズレ＝まだ切り替え中。
  // 以下の ButtonShimmer に渡して「クリックされた側のタブ」にだけシマーを出す。
  const isPending = optimisticTab !== activeTab;
  return (
    <Tabs
      activationMode="manual"
      // value には optimisticTab を渡す。これで「クリック直後に見た目が切り替わる」が実現。
      value={optimisticTab}
      onValueChange={onTabClick}
      className="relative w-full h-full"
    >
      <div className="px-8">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="relative overflow-hidden">
            All
            {/* isPending && optimisticTab === "all"：
                今ローディング中で、かつユーザーが押したのが all タブのときだけ shimmer を出す。 */}
            <ButtonShimmer isPending={isPending && optimisticTab === "all"} />
          </TabsTrigger>
          <TabsTrigger value="wip" className="relative overflow-hidden">
            In Progress
            <ButtonShimmer isPending={isPending && optimisticTab === "wip"} />
          </TabsTrigger>
          <TabsTrigger value="done" className="relative overflow-hidden">
            Complete
            <ButtonShimmer isPending={isPending && optimisticTab === "done"} />
          </TabsTrigger>
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}
