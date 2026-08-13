'use client';

import { useEffect, useState } from 'react';

export function CompatibilityCard({ myId, myNickname, otherId, otherNickname }: { myId: string; myNickname: string; otherId: string; otherNickname: string }) {
  const [result, setResult] = useState<{ percent: number; sharedGenres: string[]; biggestDisagreement: string | null } | null>(null);

  useEffect(() => {
    fetch(`/api/compatibility?a=${myId}&b=${otherId}`)
      .then((r) => r.json())
      .then(setResult)
      .catch(() => {});
  }, [myId, otherId]);

  if (!result) return null;

  return (
    <div className="card p-4">
      <p className="text-center text-sm text-mist-300">
        {myNickname} + {otherNickname}
      </p>
      <p className="text-center font-display text-3xl font-bold text-dial-violetSoft">{result.percent}% Music Match</p>
      {result.sharedGenres.length > 0 && (
        <p className="mt-2 text-center text-xs text-mist-400">You both love {result.sharedGenres.join(', ')}</p>
      )}
      {result.biggestDisagreement && (
        <p className="mt-1 text-center text-xs text-mist-500">Biggest disagreement: {result.biggestDisagreement}</p>
      )}
    </div>
  );
}
