import { useCallback, useEffect, useRef, useState } from "react";
import { userApi } from "../api";

export type PaymentExitMode = "warn" | "silent";

type Options = {
  depositId: string;
  enabled: boolean;
  mode: PaymentExitMode;
  onCancelled?: () => void;
};

export function usePaymentExitGuard({ depositId, enabled, mode, onCancelled }: Options) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const cancellingRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const cancelOrder = useCallback(async () => {
    if (cancellingRef.current) return;
    cancellingRef.current = true;
    try {
      await userApi.cancelAbandoned(depositId);
    } catch {
      /* best effort */
    } finally {
      cancellingRef.current = false;
    }
  }, [depositId]);

  useEffect(() => {
    if (!enabled) return;

    window.history.pushState({ paymentExitGuard: depositId }, "");

    const onPopState = () => {
      if (!enabledRef.current) return;

      if (mode === "warn") {
        window.history.pushState({ paymentExitGuard: depositId }, "");
        setLeaveOpen(true);
        return;
      }

      void (async () => {
        await cancelOrder();
        onCancelled?.();
        window.history.back();
      })();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled, mode, depositId, cancelOrder, onCancelled]);

  useEffect(() => {
    if (!enabled || mode !== "warn") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled, mode]);

  const confirmLeave = useCallback(async () => {
    setLeaveOpen(false);
    await cancelOrder();
    onCancelled?.();
    window.history.go(-2);
  }, [cancelOrder, onCancelled]);

  const stayOnPage = useCallback(() => {
    setLeaveOpen(false);
  }, []);

  const leaveNow = useCallback(async () => {
    setLeaveOpen(false);
    await cancelOrder();
    onCancelled?.();
  }, [cancelOrder, onCancelled]);

  return { leaveOpen, confirmLeave, stayOnPage, leaveNow, cancelOrder };
}
