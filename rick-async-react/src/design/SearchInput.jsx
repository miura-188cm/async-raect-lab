/**
 * このファイルは async react の「useOptimistic で制御された入力欄」と
 * 「pending 表示をチラつかせない遅延表示」を学ぶための例。
 * 親から渡される確定値 value（検索済みクエリ）に対して、入力中の仮の値を
 * useOptimistic で重ねている。optimistic と確定値の差分 = pending 判定になる。
 * スピナーは index.css の .pending.long が持つ transition-delay: 1.5s により、
 * 短時間で終わる検索ではそもそも表示されない（= チラつき防止）。
 */
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import ButtonShimmer from "./ButtonShimmer.jsx";
import { startTransition, useOptimistic } from "react";
import { cn } from "@/lib/utils";

export default function SearchInput({ value, changeAction }) {
  // value は「サーバーで確定した検索クエリ」。inputValue は「今ユーザーが打った楽観値」。
  // 制御コンポーネントの value に optimistic を使うことで、
  // await 中も入力が固まらず（＝ React の transition が古い UI を捨てない間も）、
  // ユーザー体験上は即座に打った文字が反映される。
  const [inputValue, setInputValue] = useOptimistic(value);
  // 楽観値と確定値がズレている間＝まだサーバー反映が終わっていない＝pending。
  // useTransition の isPending を使わずにこう書くのは、
  // 「このコンポーネント自身がトリガーした transition だけでなく、
  //  親由来の value 更新が遅れている状況も含めて pending として扱いたい」から。
  const isPending = inputValue !== value;
  function handleChange(e) {
    const newValue = e.target.value;
    // 入力イベントごとに transition を開始。setInputValue は transition スコープ必須。
    startTransition(async () => {
      setInputValue(newValue);
      // 実際の検索実行（debounce やリクエストは changeAction 側で面倒を見る想定）。
      await changeAction(newValue);
      // 解決後、親の value が newValue に揃い、optimistic は破棄されて isPending = false へ。
    });
  }

  return (
    <div className="px-8">
      <InputGroup className="relative overflow-hidden">
        <InputGroupInput
          placeholder="Search..."
          value={inputValue}
          onChange={handleChange}
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        {/*
          pending / isPending / long の 3 つのクラスで「遅延つきフェードイン」を表現。
          .pending は opacity:0 + transition-delay:1.5s（long）。
          .pending.isPending になるとフェードインが始まるが、
          1.5 秒より早く pending が解けると transition が発火する前にクラスが外れるため、
          一瞬の検索ではスピナーが一切見えない（＝チラつきゼロ）という設計。
        */}
        <InputGroupAddon
          align="inline-end"
          className={cn("pending", { "isPending long": isPending })}
        >
          <Spinner />
        </InputGroupAddon>
        <ButtonShimmer isPending={isPending} long />
      </InputGroup>
    </div>
  );
}
