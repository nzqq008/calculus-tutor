import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
});
test.afterEach(({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});

async function capture(page: Page, name: string) {
  const folder = resolve("../.local/frontend-qa");
  mkdirSync(folder, { recursive: true });
  await page.screenshot({
    path: resolve(folder, `${name}.png`),
    fullPage: true,
  });
}

async function start(page: Page, name = "链式法则", challenge = true) {
  await page.goto("./");
  await page
    .getByTestId("knowledge-network")
    .getByText(name, { exact: true })
    .click();
  await page.getByRole("button", { name: "进入关卡学习" }).click();
  await expect(page.locator(".learning-main h1")).toHaveText(name);
  await expect(page.getByLabel("关卡基础学习")).toBeVisible();
  await expect(page.locator(".learning-main > .question-card")).toHaveCount(0);
  await expect(page.locator(".lesson-card .katex-error")).toHaveCount(0);
  if (challenge) await beginChallenge(page);
}
async function beginChallenge(page: Page) {
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/lesson/complete"),
  );
  await page.getByRole("button", { name: "学完了，开始挑战" }).click();
  expect((await response).status()).toBe(200);
  await expect(page.locator(".learning-main > .question-card")).toBeVisible();
}
async function answer(page: Page, choice = "B") {
  const card = page.locator(".learning-main > .question-card");
  const assignment = await card.getAttribute("data-assignment");
  await card.locator(`input[type=radio][value="${choice}"]`).check();
  const response = page.waitForResponse(
    (r) =>
      /\/sessions\/[^/]+\/answers$/.test(r.url()) &&
      r.request().method() === "POST",
  );
  await card.getByRole("button", { name: "提交答案", exact: true }).click();
  const received = await response;
  expect(received.status()).toBe(200);
  const state = await received.json();
  if (state.next_action === "answer_question")
    await expect(card).not.toHaveAttribute("data-assignment", assignment!);
  else if (state.next_action === "show_lesson")
    await expect(page.getByLabel("关卡基础学习")).toBeVisible();
  else if (state.next_action === "show_guidance")
    await expect(
      page.getByRole("button", { name: "我已阅读，开始复测" }),
    ).toBeVisible();
  else await expect(page.locator(".completion-card")).toBeVisible();
  return state;
}
async function teaching(page: Page) {
  await start(page);
  for (let i = 0; i < 5; i++) await answer(page, i === 0 ? "A" : "B");
  for (let i = 0; i < 4; i++) await answer(page);
  await expect(
    page.getByRole("button", { name: "我已阅读，开始复测" }),
  ).toBeVisible();
  await expect(page.getByLabel("本轮学习路径")).toContainText("漏乘内层导数");
}
async function completeGuidance(page: Page) {
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/guidance/complete"),
  );
  await page.getByRole("button", { name: "我已阅读，开始复测" }).click();
  expect((await response).status()).toBe(200);
  await expect(page.locator(".learning-main > .question-card")).toBeVisible();
}
test("真实后端首页加载且没有运行时错误", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "进入关卡学习" }),
  ).toBeVisible();
  await expect(page.locator(".concept-node")).toHaveCount(5);
  expect(errors).toEqual([]);
  await expect(page.locator("body")).not.toContainText(/K\d+-(M|G)\d+/);
  await capture(page, "home");
});

test("独立作答不泄露解法，提交后的诊断依据在桌面和手机上可阅读", async ({
  page,
}) => {
  await start(page);
  const question = page.locator(".learning-main > .question-card");
  await expect(question.getByRole("radio")).toHaveCount(3);
  await expect(question.locator(".option-reasoning")).toHaveCount(0);
  await expect(
    question.getByText("作答要求与思考步骤", { exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "detailed-question-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await answer(page, "C");
  for (let i = 0; i < 4; i++) await answer(page);
  await expect(page.getByLabel("当前诊断步骤")).toContainText("检查相关基础");
  for (let i = 0; i < 2; i++) await answer(page);
  await page.locator(".diagnosis-explanation > summary").click();
  const detail = page.locator(".diagnosis-detail");
  await expect(detail).toContainText("取值位置与内层的变化率");
  await detail.getByText("查看本轮作答依据", { exact: true }).click();
  await expect(detail.locator(".diagnosis-evidence")).toHaveCount(1);
  await expect(detail.locator(".diagnosis-evidence")).toContainText(
    "你选择的结果",
  );
  await detail
    .getByText("为什么这样排查，还要区分什么", { exact: true })
    .click();
  await expect(detail.locator("ol li")).toHaveCount(3);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await capture(page, "detailed-diagnosis-mobile");
  await page.setViewportSize({ width: 1280, height: 900 });
  await capture(page, "detailed-diagnosis-desktop");
});
for (const name of [
  "复合函数",
  "基本求导",
  "链式法则",
  "多层链式法则",
  "综合求导",
]) {
  test(`${name}直接掌握并更新真实知识网络`, async ({ page }) => {
    await start(page, name);
    for (let i = 0; i < 5; i++) await answer(page);
    await expect(
      page.getByRole("heading", { name: "关卡挑战通过" }),
    ).toBeVisible();
    await expect(page.locator(".concept-node.mastered")).toContainText(name);
    const inferredCount = {
      复合函数: 0,
      基本求导: 0,
      链式法则: 2,
      多层链式法则: 3,
      综合求导: 3,
    }[name];
    await expect(page.locator(".concept-node.inferred_mastered")).toHaveCount(
      inferredCount!,
    );
    await page.getByRole("link", { name: "查看学习报告", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "每一步，都算数。" }),
    ).toBeVisible();
    await expect(page.locator(".attempt-record")).toHaveCount(5);
    await expect(page.locator("body")).not.toContainText(/K\d+-(M|G)\d+/);
  });
}

test("知识图只有三种显示状态，外侧长连线及全部分支避开节点", async ({
  page,
}) => {
  await start(page, "综合求导");
  for (let i = 0; i < 5; i++) await answer(page);
  const graph = page.getByTestId("knowledge-network");
  const card = page.locator(".network-card");
  await expect(card.locator(".network-legend > span")).toHaveText([
    "待学习",
    "学习中",
    "已掌握",
  ]);
  await expect(graph.locator(".knowledge-connections > path")).toHaveCount(5);
  await expect(
    graph.locator(
      'path[data-route="outer"][data-source="K2"][data-target="K5"]',
    ),
  ).toHaveCount(1);
  await expect(graph.locator(".state-mastered")).toHaveCount(1);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(graph.locator(".knowledge-connections")).toHaveAttribute(
      "width",
      /\d+/,
    );
    await expect
      .poll(async () =>
        graph.evaluate((element) => {
          const svg = element.querySelector("svg")!;
          const origin = svg.getBoundingClientRect();
          const nodes = [...element.querySelectorAll(".concept-node")].map(
            (n) => n.getBoundingClientRect(),
          );
          if (
            Math.abs(
              Number(svg.getAttribute("width")) -
                element.getBoundingClientRect().width,
            ) > 1
          )
            return false;
          for (const path of element.querySelectorAll<SVGPathElement>(
            ".knowledge-connections > path",
          )) {
            for (
              let length = 5;
              length < path.getTotalLength() - 5;
              length += 4
            ) {
              const point = path.getPointAtLength(length);
              const x = point.x + origin.left,
                y = point.y + origin.top;
              if (
                nodes.some(
                  (n) =>
                    x > n.left + 2 &&
                    x < n.right - 2 &&
                    y > n.top + 2 &&
                    y < n.bottom - 2,
                )
              )
                return false;
            }
          }
          return true;
        }),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await card.screenshot({
      path: resolve(`../.local/frontend-qa/network-three-states-${width}.png`),
    });
  }
});
test("K3诊断、追问、刷新恢复、不同错误后的新指导、复测与掌握", async ({
  page,
}) => {
  await teaching(page);
  const firstText = await page
    .locator(".guidance-card .math-text")
    .first()
    .innerText();
  await expect(page.locator(".assistant-panel")).toHaveCount(0);
  await capture(page, "workspace-v3");
  await page.reload();
  await expect(page.locator(".guidance-card")).toBeVisible();
  await completeGuidance(page);
  await answer(page, "D");
  await expect(
    page.locator(".guidance-card .math-text").first(),
  ).not.toHaveText(firstText);
  await expect(page.locator("body")).not.toContainText(/K\d+-(M|G)\d+/);
  await completeGuidance(page);
  await answer(page);
  await answer(page);
  await expect(page.locator(".concept-node.mastered")).toHaveCount(0);
  await completeGuidance(page);
  await answer(page);
  await answer(page);
  await expect(
    page.getByRole("heading", { name: "关卡挑战通过" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "查看学习报告", exact: true }).click();
  await expect(page.locator(".attempt-record")).toHaveCount(14);
  await expect(page.locator(".inference-message")).toContainText(
    "复合函数、基本求导",
  );
  await capture(page, "report");
});
test("同层检查两项前置后分别完成完整关卡，再返回原目标", async ({ page }) => {
  await start(page);
  for (let i = 0; i < 5; i++) await answer(page, i === 0 ? "A" : "B");
  for (let i = 0; i < 3; i++) {
    await answer(page, "A");
    await expect(page.locator(".learning-main h1")).toHaveText("链式法则");
  }
  await answer(page, "A");
  await expect(page.locator(".learning-main h1")).toHaveText("复合函数");
  await expect(page.getByLabel("关卡基础学习")).toBeVisible();
  await page.reload();
  await beginChallenge(page);
  for (let i = 0; i < 5; i++) await answer(page);
  await expect(page.locator(".learning-main h1")).toHaveText("基本求导");
  await capture(page, "full-prerequisite-level");
  await beginChallenge(page);
  for (let i = 0; i < 5; i++) await answer(page);
  await expect(page.locator(".learning-main h1")).toHaveText("链式法则");
  await answer(page);
  await answer(page);
  await expect(page.locator(".completion-card")).toBeVisible();
  await expect(page.getByText("本次已提交 21 道题")).toBeVisible();
});
test("服务器已接收但响应丢失时自动重试，仍只推进一次", async ({ page }) => {
  await start(page, "复合函数");
  const payloads: string[] = [];
  page.on("request", (r) => {
    if (/\/answers$/.test(r.url())) payloads.push(r.postData() || "");
  });
  await page.route(
    "**/sessions/*/answers",
    async (route) => {
      await route.fetch();
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page.locator('.question-card input[value="B"]').check();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await expect(page.getByText("本次已提交 1 道题")).toBeVisible();
  await expect(page.getByRole("button", { name: "重试原提交" })).toHaveCount(0);
  expect(payloads).toHaveLength(2);
  expect(payloads[0]).toBe(payloads[1]);
});
test("真实过期提交自动同步，旧答案不会提交到新题", async ({ page }) => {
  await start(page, "复合函数");
  await page.route(
    "**/sessions/*/answers",
    async (route) => {
      await route.continue({
        postData: JSON.stringify({
          ...route.request().postDataJSON(),
          assignment_id: "expired-assignment",
        }),
      });
    },
    { times: 1 },
  );
  await page.locator('.question-card input[value="B"]').check();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await expect(
    page.getByText("学习进度已自动同步，请按当前页面继续。"),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "重试原提交" })).toHaveCount(0);
  await answer(page);
  await expect(page.getByText("本次已提交 1 道题")).toBeVisible();
});

test("真实表达式、多选与简答练习可连续提交，不改变测评结论", async ({
  page,
}) => {
  await start(page);
  await page.locator(".practice-details > summary").click();
  const practice = page.locator(".practice-section");
  for (const id of ["K3-P001", "K3-P002", "K3-P003"]) {
    await practice.getByLabel("选择练习").selectOption(id);
    await practice.getByRole("button", { name: "获取练习题" }).click();
    if (id.endsWith("001"))
      await practice
        .getByLabel("输入数学表达式")
        .fill("(4*x-1)*exp(2*x^2-x+3)");
    else if (id.endsWith("002")) {
      await practice.locator('input[value="A"]').check();
      await practice.locator('input[value="B"]').check();
    } else
      await practice
        .getByLabel("写下你的理解")
        .fill("内层输入也随 x 变化，所以两个变化率相乘。");
    const response = page.waitForResponse((r) =>
      r.url().endsWith("/practice/answers"),
    );
    await practice
      .getByRole("button", { name: "提交答案", exact: true })
      .click();
    expect((await response).status()).toBe(200);
    await expect(practice.locator(".feedback")).toBeVisible();
    await practice.getByRole("button", { name: "选择下一道练习" }).click();
  }
  await expect(page.getByText("0 / 5 已作答")).toBeVisible();
  await expect(page.locator(".concept-node.mastered")).toHaveCount(0);
  await answer(page);
});

test("知识节点跳转保留选择；本机学习记录恢复会话，身份重置需确认", async ({
  page,
}) => {
  await start(page);
  await answer(page);
  const sessionUrl = page.url();
  await page
    .getByTestId("knowledge-network")
    .getByText("复合函数", { exact: true })
    .click();
  await expect(page.locator(".concept-detail h2")).toHaveText("复合函数");
  await page.getByRole("link", { name: "学习工作台", exact: true }).click();
  await expect(page).toHaveURL(sessionUrl);
  await expect(page.getByText("本次已提交 1 道题")).toBeVisible();
  await page.getByRole("button", { name: "重置学习身份" }).click();
  await page.getByRole("dialog").press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "重置学习身份" }).click();
  await page.getByRole("button", { name: "确认重置", exact: true }).click();
  await expect(page.getByText("准备开始", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "学习工作台", exact: true }),
  ).toHaveCount(0);
});
test("无效答案复核后可重新辨析进入指导，不强行贴标签", async ({ page }) => {
  await start(page, "复合函数");
  await page.route(
    "**/sessions/*/answers",
    (route) =>
      route.continue({
        postData: JSON.stringify({
          ...route.request().postDataJSON(),
          answer: "invalid-option",
        }),
      }),
    { times: 1 },
  );
  await answer(page, "B");
  await expect(
    page.getByRole("heading", { name: "需要进一步帮助" }),
  ).toBeVisible();
  await expect(page.locator(".concept-node.mastered")).toHaveCount(0);
  await page.getByRole("button", { name: "重新识别并继续学习" }).click();
  await expect(page.locator(".learning-main > .question-card")).toBeVisible();
  await answer(page, "A");
  await expect(page.getByLabel("本轮学习路径")).toContainText(
    "分不清内层和外层函数",
  );
});
test("持续错误到轮数限制后显示暂停", async ({ page }) => {
  await teaching(page);
  for (let i = 0; i < 8; i++) {
    await completeGuidance(page);
    await answer(page, "A");
  }
  await expect(
    page.getByRole("heading", { name: "学习暂告一段落" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "本次学习已达到教学轮数限制。建议对照已有讲解复习，再寻求帮助。",
    ),
  ).toBeVisible();
});
test("后端离线显示真实错误，重试恢复；没有假结果", async ({ page }) => {
  await page.route("**/api/v1/knowledge-graph", (route) =>
    route.abort("failed"),
  );
  await page.goto("./");
  await expect(page.getByRole("alert")).toContainText("无法连接教学服务");
  await expect(page.locator(".concept-node")).toHaveCount(0);
  await page.unroute("**/api/v1/knowledge-graph");
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(page.locator(".concept-node")).toHaveCount(5);
});
test("移动端可答题，页面无横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await answer(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect(page.getByText("本次已提交 1 道题")).toBeVisible();
  await capture(page, "mobile");
});

test("指导请求中断后可重试，学习搭子不再出现", async ({ page }) => {
  await page.route("**/sessions/*/guidance", (route) => route.abort("failed"));
  await start(page);
  for (let i = 0; i < 5; i++) await answer(page, i === 0 ? "A" : "B");
  for (let i = 0; i < 3; i++) await answer(page);
  const card = page.locator(".learning-main > .question-card");
  await card.locator('input[value="B"]').check();
  await card.getByRole("button", { name: "提交答案", exact: true }).click();
  await expect(page.locator(".learning-main [role=alert]")).toContainText(
    "无法连接教学服务",
  );
  await page.unroute("**/sessions/*/guidance");
  await page
    .locator(".learning-main")
    .getByRole("button", { name: "重试", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "我已阅读，开始复测" }),
  ).toBeVisible();
  await expect(page.locator(".assistant-panel")).toHaveCount(0);
  await expect(page.getByLabel("向教学助手提问")).toHaveCount(0);
});

test("不存在的知识点和无效会话显示真实后端错误", async ({ page }) => {
  await start(page);
  const url = new URL(page.url());
  url.hash = "/?concept=missing-concept";
  await page.goto(url.href);
  await expect(page.locator(".concept-detail [role=alert]")).toContainText(
    "不存在",
  );
  url.hash = "/learn/missing-session";
  await page.goto(url.href);
  await expect(page.getByRole("alert").first()).toContainText(
    "学习身份已失效或无权访问",
  );
  await expect(page.locator(".question-card")).toHaveCount(0);
});

test("先学习后测评，刷新保留阶段且没有学习搭子", async ({ page }) => {
  const questionRequests: string[] = [];
  page.on("request", (r) => {
    if (/\/sessions\/[^/]+\/question$/.test(r.url()))
      questionRequests.push(r.url());
  });
  await start(page, "链式法则", false);
  await expect(page.getByLabel("关卡进度")).toContainText("先学习");
  await expect(
    page.locator(".concept-node.mastered,.concept-node.inferred_mastered"),
  ).toHaveCount(0);
  await expect(page.locator(".assistant-panel")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("关卡基础学习")).toBeVisible();
  expect(questionRequests).toHaveLength(0);
  await capture(page, "foundation-lesson");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await capture(page, "foundation-mobile");
  await beginChallenge(page);
  await expect(page.getByLabel("关卡基础学习")).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await page.locator(".learning-main").boundingBox())?.y ?? 9999,
    )
    .toBeLessThan(120);
  await expect(page.getByText("本次已提交 0 道题")).toBeVisible();
  const assignment = await page
    .locator(".learning-main > .question-card")
    .getAttribute("data-assignment");
  await page.reload();
  await expect(page.locator(".learning-main > .question-card")).toHaveAttribute(
    "data-assignment",
    assignment!,
  );
  await expect(page.getByLabel("关卡基础学习")).toHaveCount(0);
});

test("基础讲解加载失败可重试，开启挑战的响应丢失仍恢复真实阶段", async ({
  page,
}) => {
  await page.route("**/sessions/*/lesson", (route) => route.abort("failed"));
  await page.goto("./");
  await page.getByRole("button", { name: "进入关卡学习" }).click();
  await expect(page.locator(".learning-main [role=alert]")).toContainText(
    "无法连接教学服务",
  );
  await expect(
    page.getByRole("button", { name: "学完了，开始挑战" }),
  ).toHaveCount(0);
  await expect(page.locator(".question-card")).toHaveCount(0);
  await page.unroute("**/sessions/*/lesson");
  await page
    .locator(".learning-main")
    .getByRole("button", { name: "重试", exact: true })
    .click();
  await expect(page.getByLabel("关卡基础学习")).toBeVisible();
  await page.route(
    "**/sessions/*/lesson/complete",
    async (route) => {
      await route.fetch();
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "学完了，开始挑战" }).click();
  await expect(page.locator(".learning-main > .question-card")).toBeVisible();
  await expect(page.getByText("本次已提交 0 道题")).toBeVisible();
  await expect(page.locator(".concept-node.assessing")).toContainText(
    "链式法则",
  );
  await answer(page);
  await expect(page.getByText("本次已提交 1 道题")).toBeVisible();
});

test("重复遇到同一题使用新分配，不出现旧进度冲突", async ({ page }) => {
  await teaching(page);
  await completeGuidance(page);
  const card = page.locator(".learning-main > .question-card");
  const first = await card.getAttribute("data-assignment");
  for (let i = 0; i < 3; i++) {
    await answer(page, "A");
    await completeGuidance(page);
  }
  expect(await card.getAttribute("data-assignment")).not.toBe(first);
  await answer(page);
  await answer(page);
  await expect(page.locator(".completion-card")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("连续响应丢失后刷新，自动恢复暂存提交且不重复计入", async ({ page }) => {
  await start(page, "复合函数");
  const payloads: string[] = [];
  page.on("request", (r) => {
    if (/\/answers$/.test(r.url())) payloads.push(r.postData() || "");
  });
  await page.route(
    "**/sessions/*/answers",
    async (route) => {
      await route.fetch();
      await route.abort("failed");
    },
    { times: 2 },
  );
  await page.locator('.question-card input[value="B"]').check();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await expect(page.getByRole("button", { name: "重试原提交" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("本次已提交 1 道题")).toBeVisible();
  await expect(page.getByRole("button", { name: "重试原提交" })).toHaveCount(0);
  expect(payloads).toHaveLength(3);
  expect(new Set(payloads).size).toBe(1);
  await answer(page);
  await expect(page.getByText("本次已提交 2 道题")).toBeVisible();
});

test("前置完整测评未通过才检查更前置，刷新保留多层路径", async ({ page }) => {
  await start(page, "多层链式法则");
  for (let i = 0; i < 5; i++) await answer(page, i === 0 ? "A" : "B");
  await answer(page, "A");
  await answer(page, "A");
  await expect(page.locator(".learning-main h1")).toHaveText("链式法则");
  await beginChallenge(page);
  for (let i = 0; i < 5; i++) await answer(page, i === 0 ? "A" : "B");
  for (const choice of ["A", "A", "B", "B"]) await answer(page, choice);
  await expect(page.locator(".learning-main h1")).toHaveText("复合函数");
  await page.reload();
  await expect(page.getByLabel("当前学习路线")).toContainText("多层链式法则");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, "full-level-deep-mobile");
  await beginChallenge(page);
  for (let i = 0; i < 5; i++) await answer(page);
  await expect(page.locator(".learning-main h1")).toHaveText("链式法则");
  await answer(page);
  await answer(page);
  await expect(page.locator(".learning-main h1")).toHaveText("多层链式法则");
  await answer(page);
  await answer(page);
  await expect(page.locator(".completion-card")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("返回知识点继续原记录，明确选择后才开启新一轮", async ({ page }) => {
  await start(page);
  await answer(page);
  const current = page.url();
  await page.getByRole("link", { name: "学习首页", exact: true }).click();
  await page.getByRole("button", { name: "继续本关学习" }).click();
  await expect(page).toHaveURL(current);
  await expect(page.getByText("本次已提交 1 道题")).toBeVisible();
  await page.getByRole("link", { name: "学习首页", exact: true }).click();
  await page
    .getByRole("button", { name: "从头开始新一轮（保留原记录）" })
    .click();
  await expect(page).not.toHaveURL(current);
  await expect(page.getByLabel("关卡基础学习")).toBeVisible();
});

test("手机首次进入收起地图，技能标签中文且没有学习搭子", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page, "复合函数", false);
  await expect(page.locator(".knowledge-browser")).not.toHaveAttribute("open");
  await expect(page.getByLabel("关键技能进度")).toContainText("复合顺序");
  await expect(page.getByLabel("关键技能进度")).not.toContainText(
    "composition_order",
  );
  await expect(page.locator(".assistant-panel")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, "focused-mobile-entry");
});
