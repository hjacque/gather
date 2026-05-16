'use client';

export function Performance({ performance }: { performance: number | null }) {
  if (typeof performance !== 'number')
    return <div className="text-gray-500">{'-'}</div>;

  const isPositive = performance > 0;
  const isNegative = performance < 0;

  const textColor = isPositive
    ? 'text-green-500'
    : isNegative
      ? 'text-red-500'
      : 'text-gray-500';

  return (
    <div className={textColor}>
      {performance > 0 && '+'}
      {performance}%
    </div>
  );
}
