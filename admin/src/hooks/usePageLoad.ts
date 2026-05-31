import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../lib/errors";

export function usePageLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    return loader()
      .then((result) => {
        setData(result);
        return result;
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setData(null);
        return null;
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, setData, setError };
}
