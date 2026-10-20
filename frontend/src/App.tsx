import { useState } from "react";
import { HashRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import { BookOpen, Leaf, RotateCcw, X } from "lucide-react";
import { Home } from "./pages/Home";
import { Learn } from "./pages/Learn";
import { Report } from "./pages/Report";
import { useIdentity } from "./state/identity";

export default function App() {
  const { identity, reset, storageError } = useIdentity();
  const [confirm, setConfirm] = useState(false);
  return (
    <HashRouter>
      <a
        className="skip-link"
        href="#content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("content")?.focus();
        }}
      >
        跳到主要内容
      </a>
      <header className="app-header">
        <Link to="/" className="brand">
          <span>
            <Leaf size={23} />
          </span>
          <div>
            微积分学习室<small>CALCULUS TUTOR</small>
          </div>
        </Link>
        <nav aria-label="主要导航">
          <NavLink to="/" end>
            知识探索
          </NavLink>
          {identity.current && (
            <>
              <NavLink to={`/learn/${identity.current}`}>学习工作台</NavLink>
              <NavLink to={`/report/${identity.current}`}>学习报告</NavLink>
            </>
          )}
        </nav>
        <div className="header-identity">
          <span className="identity-label">
            <i />
            {identity.student ? "匿名学习中" : "准备开始"}
          </span>
          {identity.student && (
            <button
              className="icon-button"
              aria-label="重置学习身份"
              onClick={() => setConfirm(true)}
            >
              <RotateCcw size={17} />
            </button>
          )}
        </div>
      </header>
      <div id="content" className="app-content" tabIndex={-1}>
        {storageError && (
          <div role="alert" className="notice">
            浏览器未允许保存身份。当前页面可以继续使用，刷新后可能无法恢复。
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn/:sessionId" element={<Learn />} />
          <Route path="/report/:sessionId" element={<Report />} />
          <Route
            path="*"
            element={
              <div className="card empty-state">
                <h1>没有找到这个页面</h1>
                <Link className="button primary" to="/">
                  返回首页
                </Link>
              </div>
            }
          />
        </Routes>
      </div>
      <footer className="app-footer">
        <span>
          <BookOpen size={16} />
          微积分学习室
        </span>
        <p>以测评为依据，以理解为目的。</p>
        <span>个性化教学 Demo</span>
      </footer>
      {confirm && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            className="card reset-dialog"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setConfirm(false);
                return;
              }
              if (e.key === "Tab") {
                const buttons =
                  e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
                if (e.shiftKey && document.activeElement === buttons[0]) {
                  e.preventDefault();
                  buttons[buttons.length - 1]?.focus();
                } else if (
                  !e.shiftKey &&
                  document.activeElement === buttons[buttons.length - 1]
                ) {
                  e.preventDefault();
                  buttons[0]?.focus();
                }
              }
            }}
          >
            <button
              className="icon-button close-dialog"
              aria-label="取消重置"
              onClick={() => setConfirm(false)}
            >
              <X size={20} />
            </button>
            <h2 id="reset-title">重置本机学习身份？</h2>
            <p>
              这会清除当前浏览器保存的身份与会话入口，不会删除服务器记录。由于没有账号系统，重置后将无法通过原令牌找回这些记录。
            </p>
            <div className="button-row">
              <button
                className="button secondary"
                autoFocus
                onClick={() => setConfirm(false)}
              >
                保留身份
              </button>
              <button
                className="button danger"
                onClick={() => {
                  reset();
                  setConfirm(false);
                  window.location.hash = "/";
                }}
              >
                确认重置
              </button>
            </div>
          </section>
        </div>
      )}
    </HashRouter>
  );
}
