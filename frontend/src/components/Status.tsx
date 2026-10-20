import { AlertCircle, LoaderCircle, RotateCw } from "lucide-react";
import { ApiError } from "../api/client";
export function Loading({ text = "正在读取学习进度…" }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={20} className="spin" />
      {text}
    </div>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const message =
    error instanceof Error ? error.message : "加载失败，请稍后重试。";
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={19} />
      <div>
        <strong>暂时无法继续</strong>
        <p>{message}</p>
        {error instanceof ApiError && error.status === 403 && (
          <p>重置身份会清除本机保存的会话入口，请先确认是否需要保留。</p>
        )}
      </div>
      {retry && (
        <button className="button secondary small" onClick={retry}>
          <RotateCw size={15} />
          重试
        </button>
      )}
    </div>
  );
}
