import { Card } from "@/components/card";

export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 break-words text-[2rem] font-semibold leading-tight text-stone-900 xl:text-3xl">
        {value}
      </p>
    </Card>
  );
}
