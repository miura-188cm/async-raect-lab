/** 汎用の情報カード UI。async react の学習には直接関係しない表示用パーツ。 */
import { ItemMedia } from "@/components/ui/item";
import { ShieldAlertIcon } from "lucide-react";

export default function Card({ title, description }) {
  return (
    <div>
      <div>
        <ItemMedia variant="icon">
          <ShieldAlertIcon />
        </ItemMedia>
      </div>
      <h3 className="">{title}</h3>
      <p className="">{description}</p>
    </div>
  );
}
