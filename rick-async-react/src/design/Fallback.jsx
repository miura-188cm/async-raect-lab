/**
 * このファイルは async react の「Suspense の fallback として使うスケルトン UI」を学ぶ例。
 * use(promise) や lazy データ取得で子コンポーネントがサスペンドした際、
 * Suspense はこの FallbackList を描画する。レイアウトを本物とほぼ同じ高さ／幅に揃えることで、
 * データ解決後のレイアウトシフトを防ぐのが設計意図。
 * ViewTransition で包んでいるのは、fallback → 本物の切り替えをアニメーション対象にするため。
 */
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components//ui/item";
import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// 1 行分のスケルトン。実際の LessonCard と同じ構造・サイズで並べることで、
// Suspense 解除時に要素位置がズレないようにしている。
export function FallbackListItem() {
  return (
    <Item variant="ghost">
      <ItemMedia className="h-12 w-12" variant="ghost">
        <Skeleton className="h-[40px] w-[40px]" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <Skeleton className="h-[19px] w-24" />
        </ItemTitle>
        <Skeleton className="h-[21px] w-32" />
      </ItemContent>
      <ItemActions>
        <div className="h-[40px] w-[40px] flex items-center justify-center">
          <Skeleton className="h-[40px] w-[40px]" />
        </div>
      </ItemActions>
    </Item>
  );
}

export default function FallbackList() {
  // ViewTransition：React の実験的 API。Suspense の fallback → 本体への
  // 切り替えを CSS の ::view-transition で滑らかに見せるために包んでいる。
  // （index.css 側で ::view-transition-old/new のアニメーションが定義されている）
  return (
    <ViewTransition>
      <div className="flex flex-col pl-4 pr-4">
        <div>
          <FallbackListItem />
        </div>
        <FallbackListItem />
        <div>
          <FallbackListItem />
        </div>
        <div>
          <FallbackListItem />
        </div>
        <div>
          <FallbackListItem />
        </div>
        <div>
          <FallbackListItem />
        </div>
      </div>
    </ViewTransition>
  );
}
